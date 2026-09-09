import { sql } from '../db/index.js';

export interface CapabilityCheckResult {
  authorized: boolean;
  allowed: boolean;
  reason?: string;
  fallbackBenchmark?: string;
  fallbackBenchmarkCode?: string;
  closestResolution?: string;
}

/**
 * Validates whether a dataset or source can legitimately provide an attribute at the requested resolution.
 * Programmatically prevents invalid cross-tabs and unauthorized usage (Section 40).
 */
export async function checkDatasetCapability(
  datasetCodeOrId: string,
  attributeGroup: string,
  requestedResolution?: string
): Promise<CapabilityCheckResult> {
  // 1. Resolve dataset or source
  const [ds] = await sql`
    SELECT d.id as dataset_id, d.dataset_code, d.name as dataset_name, d.source_id,
           s.friendly_code as source_friendly_code, s.name as source_name
    FROM datasets d
    JOIN sources s ON s.id = d.source_id
    WHERE d.id = ${datasetCodeOrId} 
       OR d.dataset_code = ${datasetCodeOrId}
       OR s.friendly_code = ${datasetCodeOrId}
       OR s.id = ${datasetCodeOrId}
    LIMIT 1;
  `;

  if (!ds) {
    return {
      authorized: false,
      allowed: false,
      reason: `Unknown dataset or source code: '${datasetCodeOrId}'`
    };
  }

  // 2. Check granular dataset_capabilities table first
  const [cap] = await sql`
    SELECT is_provided, supported_resolutions, notes, constraints
    FROM dataset_capabilities
    WHERE dataset_id = ${ds.dataset_id} AND attribute_group = ${attributeGroup}
    LIMIT 1;
  `;

  if (cap) {
    if (!cap.is_provided) {
      return {
        authorized: false,
        allowed: false,
        reason: cap.notes || `Attribute '${attributeGroup}' is explicitly NOT provided by '${ds.dataset_name}' (${ds.dataset_code || ds.source_friendly_code}).`,
        fallbackBenchmark: cap.constraints || undefined,
        fallbackBenchmarkCode: cap.constraints || undefined
      };
    }

    if (requestedResolution && cap.supported_resolutions && cap.supported_resolutions.length > 0) {
      if (!cap.supported_resolutions.includes(requestedResolution)) {
        return {
          authorized: false,
          allowed: false,
          reason: `Requested resolution '${requestedResolution}' is not supported for '${attributeGroup}' in '${ds.dataset_name}'. Supported: ${cap.supported_resolutions.join(', ')}.`,
          closestResolution: cap.supported_resolutions[0],
          fallbackBenchmark: cap.constraints || undefined,
          fallbackBenchmarkCode: cap.constraints || undefined
        };
      }
    }

    return { authorized: true, allowed: true };
  }

  // 3. Fallback to legacy source_capabilities table if dataset_capabilities hasn't specified this attribute
  const [srcCap] = await sql`
    SELECT is_authorized, supported_resolutions, notes
    FROM source_capabilities
    WHERE source_id = ${ds.source_id} AND attribute_group = ${attributeGroup}
    LIMIT 1;
  `;

  if (srcCap) {
    if (!srcCap.is_authorized) {
      return {
        authorized: false,
        allowed: false,
        reason: `Attribute '${attributeGroup}' is NOT authorized for source '${ds.source_name}': ${srcCap.notes}`
      };
    }

    if (requestedResolution && srcCap.supported_resolutions && srcCap.supported_resolutions.length > 0) {
      if (!srcCap.supported_resolutions.includes(requestedResolution)) {
        return {
          authorized: false,
          allowed: false,
          reason: `Requested resolution '${requestedResolution}' is not supported by '${ds.source_name}' (Supported: ${srcCap.supported_resolutions.join(', ')})`,
          closestResolution: srcCap.supported_resolutions[0]
        };
      }
    }

    return { authorized: true, allowed: true };
  }

  // If no capability rule is found, default to rejection for strict programmatic safety
  return {
    authorized: false,
    allowed: false,
    reason: `No authorized capability rule found for dataset '${ds.dataset_code || ds.dataset_id}' and attribute group '${attributeGroup}'. Access denied by default.`
  };
}

/**
 * Records a demand-driven coverage gap when a user requests an observation not available at municipal resolution (Section 39).
 */
export async function recordCoverageGap(params: {
  requestedMetric: string;
  requestedGeography: string;
  closestAvailableGeography?: string;
  sourcesChecked: string[];
  reason: 'MISSING_INGESTION' | 'UNAVAILABLE_UPSTREAM' | 'SAMPLE_SUPPRESSED';
  fallbackBenchmarkCode?: string;
  userContext?: string;
}): Promise<number> {
  const [row] = await sql`
    INSERT INTO coverage_gaps (
      requested_metric, requested_geography, closest_available_geography,
      sources_checked, reason, fallback_benchmark_code, user_context
    )
    VALUES (
      ${params.requestedMetric}, ${params.requestedGeography}, ${params.closestAvailableGeography || null},
      ${params.sourcesChecked}, ${params.reason}, ${params.fallbackBenchmarkCode || null}, ${params.userContext || null}
    )
    RETURNING id;
  `;
  return row?.id;
}

/**
 * Records a discrepancy between two legitimate sources for auditing without silent overwrites (Section 36).
 */
export async function recordSourceDisagreement(params: {
  metricId: string;
  geographyId: string;
  referencePeriod: string;
  sourceAId: string;
  valueA: number;
  sourceBId: string;
  valueB: number;
  preferredSourceId?: string;
  selectionRationale?: string;
}): Promise<number> {
  const discrepancyPct = params.valueA !== 0
    ? Math.abs((params.valueA - params.valueB) / params.valueA) * 100
    : 0;

  // Resolve source IDs if friendly codes were passed
  const [sourceA] = await sql`SELECT id FROM sources WHERE id = ${params.sourceAId} OR friendly_code = ${params.sourceAId} LIMIT 1`;
  const [sourceB] = await sql`SELECT id FROM sources WHERE id = ${params.sourceBId} OR friendly_code = ${params.sourceBId} LIMIT 1`;
  const [preferredSource] = params.preferredSourceId 
    ? await sql`SELECT id FROM sources WHERE id = ${params.preferredSourceId} OR friendly_code = ${params.preferredSourceId} LIMIT 1`
    : [null];

  const resolvedSourceAId = sourceA?.id || params.sourceAId;
  const resolvedSourceBId = sourceB?.id || params.sourceBId;
  const resolvedPrefId = preferredSource?.id || params.preferredSourceId || null;

  const [row] = await sql`
    INSERT INTO source_disagreements (
      metric_id, geography_id, reference_period,
      source_a_id, value_a, source_b_id, value_b, discrepancy_pct,
      preferred_source_id, selection_rationale
    )
    VALUES (
      ${params.metricId}, ${params.geographyId}, ${params.referencePeriod},
      ${resolvedSourceAId}, ${params.valueA}, ${resolvedSourceBId}, ${params.valueB}, ${discrepancyPct.toFixed(2)},
      ${resolvedPrefId}, ${params.selectionRationale || null}
    )
    RETURNING id;
  `;
  return row?.id;
}

/**
 * Returns comprehensive provenance for any metric and geography observation.
 */
export async function getDetailedProvenance(metricId: string, geographyId: string) {
  const [row] = await sql`
    SELECT 
      o.id as observation_id,
      o.metric_id,
      m.name as metric_name,
      m.category,
      m.subcategory,
      m.unit,
      m.default_classification,
      m.definition,
      m.formula,
      m.limitations,
      o.reference_year,
      o.value_numeric,
      o.value_text,
      o.geographic_resolution,
      o.is_benchmark,
      o.benchmark_label,
      o.metric_classification,
      o.confidence,
      o.is_estimate,
      o.methodology_notes,
      o.vintage_date,
      o.effective_date,
      o.revision_number,
      o.is_superseded,
      s.id as source_id,
      COALESCE(s.friendly_code, 'STATCAN') as source_friendly_code,
      s.name as source_name,
      s.organization_type,
      COALESCE(d.dataset_code, s.official_dataset_id) as official_dataset_id,
      COALESCE(d.official_publisher, s.official_publisher, 'Statistics Canada') as official_publisher,
      COALESCE(d.source_url, s.website_url) as source_url,
      COALESCE(d.doi, s.doi) as doi,
      COALESCE(d.update_frequency, s.frequency) as frequency,
      s.supported_geography,
      COALESCE(s.licence_rules, 'Statistics Canada Open Licence') as licence_rules,
      s.cache_policy,
      d.id as dataset_id,
      d.name as dataset_name,
      d.dataset_code,
      d.reference_period,
      d.release_date,
      d.checksum,
      d.etag,
      d.stale_after_days
    FROM observations o
    JOIN metrics_definitions m ON m.id = o.metric_id
    JOIN sources s ON s.id = o.source_id
    JOIN datasets d ON d.id = o.dataset_id
    WHERE o.metric_id = ${metricId} AND o.geography_id = ${geographyId}
    ORDER BY o.is_superseded ASC, o.reference_year DESC
    LIMIT 1;
  `;

  return row || null;
}
