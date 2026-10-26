import { businessCountsData } from '../ingestion/adapters/statcan-business-counts.js';

export interface AuditedCompetitorResult {
  count?: number;
  source: string;
  classification: 'OBSERVED' | 'BENCHMARK' | 'UNAVAILABLE';
}

/**
 * Honest Competitor Auditing against StatCan Table 33-10-1097-01
 * 
 * Rules:
 * 1. Specific observed counts are marked 'OBSERVED'.
 * 2. Broad sector aggregates (e.g. NAICS 48-49) are marked 'BENCHMARK' and explicitly
 *    disclosed as sector-wide rather than individual competitor storefronts.
 * 3. Never invent or impute constant fallback numbers (e.g. 12% retail or 16).
 *    Missing data is returned as undefined with 'UNAVAILABLE' classification.
 */
export function getAuditedCompetitorCount(geoId: string, categoryId: string): AuditedCompetitorResult {
  const city = businessCountsData.find(b => b.geoId.toLowerCase() === geoId.toLowerCase());
  if (city) {
    const s = (city.sectors as unknown) as Record<string, Record<string, number>>;
    if (categoryId === 'pizza_store' && s['NAICS_72']?.pizza) {
      return {
        count: s['NAICS_72'].pizza,
        source: 'StatCan Table 33-10-1097-01 (NAICS 722513 Limited-Service Pizza)',
        classification: 'OBSERVED'
      };
    }
    if ((categoryId === 'logistics_warehouse' || categoryId === 'retail_shipping_counter') && s['NAICS_48_49']?.total) {
      return {
        count: s['NAICS_48_49'].total,
        source: 'StatCan Table 33-10-1097-01 (NAICS 48-49 Broad Transportation & Warehousing Sector Benchmark — not direct courier storefronts)',
        classification: 'BENCHMARK'
      };
    }
    if (categoryId === 'child_daycare' && s['NAICS_62']?.daycare) {
      return {
        count: s['NAICS_62'].daycare,
        source: 'StatCan Table 33-10-1097-01 (NAICS 624410 Child Care Services)',
        classification: 'OBSERVED'
      };
    }
    if (categoryId === 'full_service_restaurant' && s['NAICS_72']?.fullService) {
      return {
        count: s['NAICS_72'].fullService,
        source: 'StatCan Table 33-10-1097-01 (NAICS 722511 Full-Service Restaurants)',
        classification: 'OBSERVED'
      };
    }
    if (categoryId === 'convenience_store' && s['NAICS_44_45']?.convenience) {
      return {
        count: s['NAICS_44_45'].convenience,
        source: 'StatCan Table 33-10-1097-01 (NAICS 445120 Convenience Retailers)',
        classification: 'OBSERVED'
      };
    }
  }
  return {
    count: undefined,
    source: 'UNAVAILABLE (Specific NAICS category count not recorded in StatCan Table 33-10-1097-01 for this geography)',
    classification: 'UNAVAILABLE'
  };
}
