import { sql } from '../db/index.js';

export interface EvaluatedSourceRecord {
  id: string;
  researchQuestion: string;
  metricCovered: string;
  provider: string;
  officialDatasetCode: string;
  websiteUrl: string;
  supportedGeography: string;
  frequency: string;
  licensing: string;
  authorityRank: number; // 1 = highest statutory/official
  coverageGapsAndLimitations: string;
}

export async function evaluateSourceRegistry(): Promise<EvaluatedSourceRecord[]> {
  const dbSources = await sql`
    SELECT 
      id, friendly_code, name, organization_type, official_dataset_id, 
      website_url, frequency, supported_geography, licence_rules, priority_rank
    FROM sources
    ORDER BY priority_rank ASC
    LIMIT 15;
  `;

  const curatedMappings: Record<string, { question: string; metric: string; limitations: string }> = {
    statcan: {
      question: 'What is the residential demographic baseline and household size?',
      metric: 'Population counts, age cohorts, dwelling types, household size',
      limitations: 'Official Census conducted every 5 years (2021 baseline); does not reflect high-frequency post-2024 migration without provincial estimate reconciliation.'
    },
    statcan_business_counts: {
      question: 'How many direct competing pizza & food service establishments are officially registered?',
      metric: 'Employer business counts by NAICS 722511/722512 (June 2026)',
      limitations: 'Captures legal business register entities; small non-employer home kitchens or ghost kitchens operating under co-working commercial kitchens may lag.'
    },
    statcan_spending: {
      question: 'How much do local households allocate annually to food away from home?',
      metric: 'Survey of Household Spending (SHS) Table 11-10-0222-01 average expenditure',
      limitations: 'Sampled at provincial/CMA levels and modeled to CSDs via demographic weighting; actual sub-neighborhood spending can vary with micro-wealth pockets.'
    },
    commercial_real_estate: {
      question: 'What are the prevailing market Net Rent and TMI (taxes, maintenance, insurance) rates?',
      metric: 'Gross & Net lease rates per sq ft, quarterly vacancy rates',
      limitations: 'Commercial brokerage reports capture strip-plaza and streetfront medians; individual landlord TI (tenant improvement) allowances require direct lease negotiation.'
    },
    ontario_mmah: {
      question: 'What is the municipal property tax rate and long-term official planning corridor?',
      metric: 'FIR Schedule 22 tax ratios and Official Plan strategic growth zones',
      limitations: 'Statutory municipal filings reflect institutional policy; physical tenant permitting requires local building department site-plan review.'
    }
  };

  return dbSources.map(s => {
    const key = (s.id as string).toLowerCase();
    const meta = curatedMappings[key] || {
      question: 'General territorial and market characteristic verification',
      metric: 'Standardized administrative metrics',
      limitations: 'Administrative registry data requires cross-referencing with on-site commercial real estate inspection.'
    };

    return {
      id: s.id as string,
      researchQuestion: meta.question,
      metricCovered: meta.metric,
      provider: s.name as string,
      officialDatasetCode: (s.friendly_code || s.official_dataset_id || 'STATUTORY') as string,
      websiteUrl: s.website_url as string,
      supportedGeography: s.supported_geography as string,
      frequency: s.frequency as string,
      licensing: s.licence_rules as string,
      authorityRank: Number(s.priority_rank || 1),
      coverageGapsAndLimitations: meta.limitations
    };
  });
}
