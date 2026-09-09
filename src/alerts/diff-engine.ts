import { sql } from '../db/index.js';
import type { AuditEvent, ListingDiffInput, IndicatorDiffInput, MunicipalBudgetDiffInput } from './types.js';

/**
 * Persists an audit event to the persistent ledger
 */
export async function persistAuditEvent(event: AuditEvent): Promise<AuditEvent> {
  const [persisted] = await sql<AuditEvent[]>`
    INSERT INTO audit_events (
      event_type,
      entity_type,
      entity_id,
      geography_id,
      category_id,
      title,
      description,
      old_value,
      new_value,
      delta_pct,
      metadata,
      occurred_at
    ) VALUES (
      ${event.event_type},
      ${event.entity_type},
      ${event.entity_id},
      ${event.geography_id || null},
      ${event.category_id || null},
      ${event.title},
      ${event.description || null},
      ${event.old_value !== undefined ? event.old_value : null},
      ${event.new_value !== undefined ? event.new_value : null},
      ${event.delta_pct !== undefined ? event.delta_pct : null},
      ${event.metadata ? JSON.stringify(event.metadata) : null},
      ${event.occurred_at ? new Date(event.occurred_at) : new Date()}
    )
    RETURNING *;
  `;

  return {
    ...persisted,
    old_value: persisted.old_value !== null && persisted.old_value !== undefined ? Number(persisted.old_value) : null,
    new_value: persisted.new_value !== null && persisted.new_value !== undefined ? Number(persisted.new_value) : null,
    delta_pct: persisted.delta_pct !== null && persisted.delta_pct !== undefined ? Number(persisted.delta_pct) : null,
  };
}

/**
 * Detects diffs in commercial business-for-sale listings:
 * - New listings
 * - Price changes (increases/drops with exact delta percentage)
 * - Relistings
 * - Commercial lease rate changes
 */
export async function detectListingDiff(newListing: ListingDiffInput): Promise<AuditEvent | null> {
  const [existing] = await sql`
    SELECT id, listing_uid, business_name, asking_price, monthly_rent, status, geography_id, category_id
    FROM business_listings
    WHERE listing_uid = ${newListing.listing_id}
    LIMIT 1;
  `;

  if (!existing) {
    // Brand new listing event
    const event: AuditEvent = {
      event_type: 'LISTING_NEW',
      entity_type: 'business_listing',
      entity_id: newListing.listing_id,
      geography_id: newListing.geography_id,
      category_id: newListing.category_id || null,
      title: `New Business Listing: ${newListing.business_name}`,
      description: `New commercial listing entered the market for $${newListing.asking_price.toLocaleString()} in ${newListing.geography_id}.`,
      old_value: null,
      new_value: newListing.asking_price,
      delta_pct: null,
      metadata: {
        business_name: newListing.business_name,
        status: newListing.status,
        monthly_rent: newListing.monthly_rent
      }
    };
    return await persistAuditEvent(event);
  }

  const oldPrice = Number(existing.asking_price);
  const newPrice = Number(newListing.asking_price);

  // Check for Relisting event (was inactive/expired/terminated, now ACTIVE)
  if (existing.status !== 'ACTIVE' && newListing.status === 'ACTIVE') {
    const event: AuditEvent = {
      event_type: 'LISTING_RELIST',
      entity_type: 'business_listing',
      entity_id: newListing.listing_id,
      geography_id: newListing.geography_id,
      category_id: newListing.category_id || existing.category_id,
      title: `Listing Relisted: ${newListing.business_name}`,
      description: `Listing transitioned from ${existing.status} to ACTIVE at $${newPrice.toLocaleString()}.`,
      old_value: oldPrice,
      new_value: newPrice,
      delta_pct: oldPrice > 0 ? Number((((newPrice - oldPrice) / oldPrice) * 100).toFixed(2)) : null,
      metadata: {
        previous_status: existing.status,
        current_status: newListing.status
      }
    };
    return await persistAuditEvent(event);
  }

  // Check for Price Change
  if (oldPrice !== newPrice) {
    const delta = oldPrice > 0 ? Number((((newPrice - oldPrice) / oldPrice) * 100).toFixed(2)) : 0;
    const direction = delta < 0 ? 'Price Drop' : 'Price Increase';
    const event: AuditEvent = {
      event_type: 'LISTING_PRICE_CHANGE',
      entity_type: 'business_listing',
      entity_id: newListing.listing_id,
      geography_id: newListing.geography_id,
      category_id: newListing.category_id || existing.category_id,
      title: `${direction} (${delta}%): ${newListing.business_name}`,
      description: `Asking price changed from $${oldPrice.toLocaleString()} to $${newPrice.toLocaleString()} (${delta > 0 ? '+' : ''}${delta}%).`,
      old_value: oldPrice,
      new_value: newPrice,
      delta_pct: delta,
      metadata: {
        business_name: newListing.business_name,
        price_drop: delta < 0,
        absolute_difference: newPrice - oldPrice
      }
    };
    return await persistAuditEvent(event);
  }

  // Check for Commercial Lease Rate Change
  if (
    newListing.monthly_rent !== undefined &&
    existing.monthly_rent !== null &&
    Number(existing.monthly_rent) !== Number(newListing.monthly_rent)
  ) {
    const oldLease = Number(existing.monthly_rent);
    const newLease = Number(newListing.monthly_rent);
    const delta = oldLease > 0 ? Number((((newLease - oldLease) / oldLease) * 100).toFixed(2)) : 0;
    const event: AuditEvent = {
      event_type: 'COMMERCIAL_LEASE_CHANGE',
      entity_type: 'commercial_lease',
      entity_id: newListing.listing_id,
      geography_id: newListing.geography_id,
      category_id: newListing.category_id || existing.category_id,
      title: `Commercial Lease Rate Change: ${newListing.business_name}`,
      description: `Commercial monthly rent shifted from $${oldLease.toLocaleString()} to $${newLease.toLocaleString()} (${delta}%).`,
      old_value: oldLease,
      new_value: newLease,
      delta_pct: delta,
      metadata: {
        business_name: newListing.business_name
      }
    };
    return await persistAuditEvent(event);
  }

  return null;
}

/**
 * Detects material demographic and economic indicator changes
 */
export async function detectIndicatorDiff(input: IndicatorDiffInput): Promise<AuditEvent | null> {
  const [existing] = await sql`
    SELECT value_numeric, reference_year
    FROM observations
    WHERE geography_id = ${input.geography_id}
      AND metric_id = ${input.metric_id}
    ORDER BY reference_year DESC
    LIMIT 1;
  `;

  if (!existing) {
    const event: AuditEvent = {
      event_type: 'ECONOMIC_INDICATOR_CHANGE',
      entity_type: 'observation',
      entity_id: `${input.geography_id}:${input.metric_id}:${input.reference_year}`,
      geography_id: input.geography_id,
      title: `New Indicator Observation: ${input.metric_id} in ${input.geography_id}`,
      description: `Initial metric recording of ${input.new_value} for ${input.metric_id} (${input.reference_year}).`,
      old_value: null,
      new_value: input.new_value,
      delta_pct: null,
      metadata: {
        metric_id: input.metric_id,
        reference_year: input.reference_year,
        source_id: input.source_id,
        dataset_id: input.dataset_id
      }
    };
    return await persistAuditEvent(event);
  }

  const oldVal = Number(existing.value_numeric);
  const newVal = Number(input.new_value);

  if (oldVal !== newVal) {
    const delta = oldVal !== 0 ? Number((((newVal - oldVal) / Math.abs(oldVal)) * 100).toFixed(2)) : 0;
    const event: AuditEvent = {
      event_type: 'ECONOMIC_INDICATOR_CHANGE',
      entity_type: 'observation',
      entity_id: `${input.geography_id}:${input.metric_id}:${input.reference_year}`,
      geography_id: input.geography_id,
      title: `Indicator Update (${delta > 0 ? '+' : ''}${delta}%): ${input.metric_id} in ${input.geography_id}`,
      description: `${input.metric_id} shifted from ${oldVal} to ${newVal} (${delta > 0 ? '+' : ''}${delta}%).`,
      old_value: oldVal,
      new_value: newVal,
      delta_pct: delta,
      metadata: {
        metric_id: input.metric_id,
        reference_year: input.reference_year,
        previous_year: existing.reference_year
      }
    };
    return await persistAuditEvent(event);
  }

  return null;
}

/**
 * Detects municipal budget filings and category shifts
 */
export async function detectBudgetDiff(input: MunicipalBudgetDiffInput): Promise<AuditEvent | null> {
  const [existing] = await sql`
    SELECT amount_dollars, fiscal_year
    FROM municipal_finances
    WHERE geography_id = ${input.geography_id}
      AND account_category = ${input.account_category}
    ORDER BY fiscal_year DESC
    LIMIT 1;
  `;

  const oldAmount = existing ? Number(existing.amount_dollars) : null;
  const newAmount = Number(input.amount_dollars);
  const delta = oldAmount && oldAmount > 0 
    ? Number((((newAmount - oldAmount) / oldAmount) * 100).toFixed(2)) 
    : null;

  const event: AuditEvent = {
    event_type: 'MUNICIPAL_BUDGET_NEW',
    entity_type: 'municipal_finance',
    entity_id: `${input.geography_id}:fin:${input.fiscal_year}:${input.account_category}`,
    geography_id: input.geography_id,
    title: `Municipal Budget Update: ${input.account_category} (${input.geography_id})`,
    description: `Budget for ${input.account_category} set to $${newAmount.toLocaleString()} for FY${input.fiscal_year}${delta !== null ? ` (${delta > 0 ? '+' : ''}${delta}% vs prior year)` : ''}.`,
    old_value: oldAmount,
    new_value: newAmount,
    delta_pct: delta,
    metadata: {
      fiscal_year: input.fiscal_year,
      account_category: input.account_category,
      schedule_code: input.schedule_code
    }
  };

  return await persistAuditEvent(event);
}

/**
 * Logs a Statistics Canada dataset release event
 */
export async function detectDatasetRelease(
  datasetId: string,
  title: string,
  metadata: Record<string, any>
): Promise<AuditEvent> {
  const event: AuditEvent = {
    event_type: 'STATCAN_RELEASE',
    entity_type: 'dataset',
    entity_id: datasetId,
    geography_id: 'PR_35',
    title: `Statistics Canada Release: ${title}`,
    description: `Authoritative dataset revision or release published: ${title} (${datasetId}).`,
    old_value: null,
    new_value: null,
    delta_pct: null,
    metadata
  };

  return await persistAuditEvent(event);
}
