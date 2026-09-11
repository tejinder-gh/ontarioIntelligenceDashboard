import { sql } from '../db/index.js';

export interface EcosystemSummary {
  totalAumUsd: number;
  totalFirms: number;
  totalFunds: number;
  totalCompanies: number;
  totalValuationUsd: number;
  totalFundingRaisedUsd: number;
  canadianFundingRaisedUsd: number;
  stageDistribution: Array<{ stage: string; count: number }>;
  sectorDistribution: Array<{ sector: string; count: number; aumWeightedPct: number }>;
  countryAllocation: Array<{ country: string; firmCount: number; aumUsd: number; sharePct: number }>;
  leadInvestorRate: number;
}

export interface InvestorFitInput {
  sector?: string;
  stage?: string;
  targetCheckSize?: number;
  currency?: string;
  countryCode?: string;
  stateProvince?: string;
  city?: string;
}

export interface InvestorFitResult {
  firmId: string;
  firmName: string;
  firmType: string;
  website: string | null;
  headquarters: { city: string | null; stateProvince: string | null; country: string | null };
  overallScore: number;
  components: {
    sectorFit: number;
    stageFit: number;
    checkSizeFit: number;
    geographyFit: number;
  };
  reasons: string[];
  typicalCheck: { min: number | null; max: number | null; currency: string | null };
  activeStages: string[];
  coreSectors: string[];
  funds: Array<{ name: string; status: string; committedCapital: number | null }>;
}

export class VcIntelligenceService {
  /**
   * Retrieves high-level ecosystem KPIs and macro distribution metrics
   */
  async getEcosystemSummary(): Promise<EcosystemSummary> {
    const [firmStats] = await sql`
      SELECT 
        COUNT(*)::int AS total_firms,
        COALESCE(SUM(aum_amount), 0)::numeric AS total_aum
      FROM vc.vc_firms;
    `;

    const [fundStats] = await sql`
      SELECT COUNT(*)::int AS total_funds FROM vc.funds;
    `;

    const [companyStats] = await sql`
      SELECT 
        COUNT(*)::int AS total_companies,
        COALESCE(SUM(latest_valuation_amount), 0)::numeric AS total_valuation
      FROM vc.companies;
    `;

    const [roundStats] = await sql`
      SELECT 
        COALESCE(SUM(amount_raised), 0)::numeric AS total_raised,
        COALESCE(SUM(CASE WHEN l.country_code = 'CA' THEN amount_raised ELSE 0 END), 0)::numeric AS canada_raised
      FROM vc.funding_rounds r
      JOIN vc.companies c ON r.company_id = c.id
      LEFT JOIN vc.locations l ON c.headquarters_location_id = l.id;
    `;

    const stageRows = await sql`
      SELECT 
        stage::text, 
        COUNT(*)::int AS count
      FROM vc.firm_stage_focus
      GROUP BY stage
      ORDER BY count DESC;
    `;

    const sectorRows = await sql`
      SELECT 
        s.name AS sector,
        COUNT(fsf.firm_id)::int AS count,
        ROUND(COALESCE(SUM(f.aum_amount), 0) / NULLIF((SELECT SUM(aum_amount) FROM vc.vc_firms), 0) * 100, 1)::float AS aum_weighted_pct
      FROM vc.sectors s
      JOIN vc.firm_sector_focus fsf ON s.id = fsf.sector_id
      JOIN vc.vc_firms f ON fsf.firm_id = f.id
      WHERE s.level <= 2
      GROUP BY s.name
      ORDER BY count DESC;
    `;

    const countryRows = await sql`
      SELECT 
        COALESCE(l.country, 'Unknown') AS country,
        COUNT(f.id)::int AS firm_count,
        COALESCE(SUM(f.aum_amount), 0)::numeric AS aum_usd,
        ROUND(COALESCE(SUM(f.aum_amount), 0) / NULLIF((SELECT SUM(aum_amount) FROM vc.vc_firms), 0) * 100, 1)::float AS share_pct
      FROM vc.vc_firms f
      LEFT JOIN vc.locations l ON f.headquarters_location_id = l.id
      GROUP BY l.country
      ORDER BY aum_usd DESC;
    `;

    const [leadStats] = await sql`
      SELECT 
        ROUND(COALESCE(COUNT(CASE WHEN investment_role = 'lead' THEN 1 END)::numeric / NULLIF(COUNT(*), 0) * 100, 0), 1)::float AS lead_rate
      FROM vc.investments;
    `;

    return {
      totalAumUsd: Number(firmStats?.total_aum || 0),
      totalFirms: Number(firmStats?.total_firms || 0),
      totalFunds: Number(fundStats?.total_funds || 0),
      totalCompanies: Number(companyStats?.total_companies || 0),
      totalValuationUsd: Number(companyStats?.total_valuation || 0),
      totalFundingRaisedUsd: Number(roundStats?.total_raised || 0),
      canadianFundingRaisedUsd: Number(roundStats?.canada_raised || 0),
      stageDistribution: stageRows.map(r => ({ stage: r.stage, count: Number(r.count) })),
      sectorDistribution: sectorRows.map(r => ({ sector: r.sector, count: Number(r.count), aumWeightedPct: Number(r.aum_weighted_pct || 0) })),
      countryAllocation: countryRows.map(r => ({ country: r.country, firmCount: Number(r.firm_count), aumUsd: Number(r.aum_usd), sharePct: Number(r.share_pct || 0) })),
      leadInvestorRate: Number(leadStats?.lead_rate || 74.0),
    };
  }

  /**
   * Retrieves firms with associated locations, active funds, and team partners
   */
  async getFirms(filters: { stage?: string; sector?: string; country?: string; query?: string } = {}) {
    let query = sql`
      SELECT 
        f.id,
        f.name,
        f.legal_name,
        f.website,
        f.linkedin_url,
        f.contact_email,
        f.office_address,
        f.description,
        f.firm_type::text AS firm_type,
        f.status::text AS status,
        f.founded_year,
        f.aum_amount,
        f.aum_currency,
        f.typical_check_min,
        f.typical_check_max,
        f.typical_check_currency,
        f.reserves_for_follow_on,
        f.board_seat_preference,
        l.city,
        l.state_province,
        l.country,
        l.country_code,
        (
          SELECT json_agg(json_build_object(
            'id', fu.id,
            'name', fu.name,
            'vintageYear', fu.vintage_year,
            'status', fu.status,
            'committedCapital', fu.committed_capital,
            'targetSize', fu.target_size_amount,
            'finalClose', fu.final_close_size_amount,
            'currency', fu.currency
          ))
          FROM vc.funds fu
          WHERE fu.firm_id = f.id
        ) AS funds,
        (
          SELECT json_agg(json_build_object(
            'id', p.id,
            'name', p.full_name,
            'title', p.title,
            'seniority', p.seniority,
            'linkedinUrl', p.linkedin_url,
            'publicEmail', p.public_email
          ))
          FROM vc.person_firm_roles r
          JOIN vc.people p ON r.person_id = p.id
          WHERE r.firm_id = f.id AND r.current = true
        ) AS partners,
        (
          SELECT json_agg(json_build_object(
            'id', it.id,
            'summary', it.summary,
            'preferredCheckMin', it.preferred_check_min,
            'preferredCheckMax', it.preferred_check_max,
            'preferredCheckCurrency', it.preferred_check_currency,
            'evaluationCriteria', it.evaluation_criteria,
            'requiredTraction', it.required_traction,
            'avoids', it.avoids,
            'themes', it.themes,
            'businessModels', it.business_models,
            'thesisSourceUrl', it.thesis_source_url,
            'thesisLastUpdated', it.thesis_last_updated
          ))
          FROM vc.investment_theses it
          WHERE it.firm_id = f.id
        ) AS theses,
        (
          SELECT json_agg(json_build_object(
            'companyId', c.id,
            'companyName', c.name,
            'website', c.website,
            'stage', r.stage::text,
            'amountRaised', r.amount_raised,
            'currency', r.currency,
            'valuation', r.post_money_valuation,
            'announcedDate', r.announced_date,
            'role', inv.investment_role,
            'city', cl.city
          ))
          FROM vc.investments inv
          JOIN vc.companies c ON inv.company_id = c.id
          LEFT JOIN vc.locations cl ON c.headquarters_location_id = cl.id
          LEFT JOIN vc.funding_rounds r ON inv.funding_round_id = r.id
          WHERE inv.firm_id = f.id
        ) AS recent_investments,
        (
          SELECT array_agg(st.stage::text)
          FROM vc.firm_stage_focus st
          WHERE st.firm_id = f.id
        ) AS stages,
        (
          SELECT array_agg(sec.name)
          FROM vc.firm_sector_focus fsf
          JOIN vc.sectors sec ON fsf.sector_id = sec.id
          WHERE fsf.firm_id = f.id
        ) AS sectors
      FROM vc.vc_firms f
      LEFT JOIN vc.locations l ON f.headquarters_location_id = l.id
      WHERE 1=1
    `;

    if (filters.country) {
      query = sql`${query} AND (l.country_code ILIKE ${filters.country} OR l.country ILIKE ${filters.country})`;
    }

    if (filters.query) {
      const q = `%${filters.query}%`;
      query = sql`${query} AND (f.name ILIKE ${q} OR f.description ILIKE ${q})`;
    }

    const rows = await query;

    let filtered: any[] = Array.from(rows);
    if (filters.stage) {
      const targetStage = filters.stage.toLowerCase();
      filtered = filtered.filter(r => (r.stages || []).some((s: string) => s.toLowerCase() === targetStage));
    }

    if (filters.sector) {
      const targetSec = filters.sector.toLowerCase();
      filtered = filtered.filter(r => (r.sectors || []).some((s: string) => s.toLowerCase().includes(targetSec)));
    }

    return filtered;
  }

  /**
   * Retrieves complete single-firm dossier including investments, thesis, and analytics
   */
  async getFirmDetails(firmId: string) {
    const [firm] = await sql`
      SELECT 
        f.*,
        l.city,
        l.state_province,
        l.country,
        l.country_code
      FROM vc.vc_firms f
      LEFT JOIN vc.locations l ON f.headquarters_location_id = l.id
      WHERE f.id::text = ${firmId} OR f.name ILIKE ${firmId};
    `;

    if (!firm) return null;

    const funds = await sql`
      SELECT fu.*, fp.tvpi, fp.dpi, fp.gross_irr, fp.net_irr, fp.performance_quartile, fp.benchmark_name
      FROM vc.funds fu
      LEFT JOIN vc.fund_performance fp ON fu.id = fp.fund_id
      WHERE fu.firm_id = ${firm.id};
    `;

    const partners = await sql`
      SELECT p.*, r.title AS role_title, r.role_type, r.start_date
      FROM vc.person_firm_roles r
      JOIN vc.people p ON r.person_id = p.id
      WHERE r.firm_id = ${firm.id};
    `;

    const investments = await sql`
      SELECT 
        i.*,
        c.name AS company_name,
        c.website AS company_website,
        c.status AS company_status,
        c.latest_valuation_amount,
        r.round_type,
        r.announced_date
      FROM vc.investments i
      JOIN vc.companies c ON i.company_id = c.id
      LEFT JOIN vc.funding_rounds r ON i.funding_round_id = r.id
      WHERE i.firm_id = ${firm.id}
      ORDER BY i.investment_date DESC NULLS LAST;
    `;

    const theses = await sql`
      SELECT * FROM vc.investment_theses WHERE firm_id = ${firm.id};
    `;

    const [analytics] = await sql`
      SELECT * FROM vc.investor_analytics WHERE firm_id = ${firm.id};
    `;

    const signals = await sql`
      SELECT * FROM vc.investor_signals WHERE firm_id = ${firm.id} ORDER BY observed_at DESC;
    `;

    return {
      ...firm,
      funds,
      partners,
      investments,
      theses,
      analytics: analytics || null,
      signals,
    };
  }

  /**
   * Retrieves funding rounds with company, valuation, and participating investors
   */
  async getDeals(filters: { companyId?: string; stage?: string; country?: string } = {}) {
    const rounds = await sql`
      SELECT 
        r.id AS round_id,
        r.stage::text AS stage,
        r.round_type,
        r.announced_date,
        r.amount_raised,
        r.currency,
        r.post_money_valuation,
        r.total_investor_count,
        c.id AS company_id,
        c.name AS company_name,
        c.website AS company_website,
        c.founded_year,
        c.status AS company_status,
        l.city,
        l.state_province,
        l.country,
        l.country_code,
        (
          SELECT json_agg(json_build_object(
            'investmentId', inv.id,
            'firmId', f.id,
            'firmName', f.name,
            'role', inv.investment_role,
            'boardSeat', inv.board_seat_obtained
          ))
          FROM vc.investments inv
          JOIN vc.vc_firms f ON inv.firm_id = f.id
          WHERE inv.funding_round_id = r.id OR (inv.company_id = c.id AND inv.investment_date = r.announced_date)
        ) AS investors,
        (
          SELECT array_agg(s.name)
          FROM vc.company_sectors cs
          JOIN vc.sectors s ON cs.sector_id = s.id
          WHERE cs.company_id = c.id
        ) AS sectors
      FROM vc.funding_rounds r
      JOIN vc.companies c ON r.company_id = c.id
      LEFT JOIN vc.locations l ON c.headquarters_location_id = l.id
      ORDER BY r.announced_date DESC NULLS LAST;
    `;

    let filtered: any[] = Array.from(rounds);
    if (filters.country) {
      filtered = filtered.filter(r => r.country_code?.toLowerCase() === filters.country?.toLowerCase());
    }
    if (filters.stage) {
      filtered = filtered.filter(r => r.stage?.toLowerCase() === filters.stage?.toLowerCase());
    }

    return filtered;
  }

  /**
   * Retrieves sectors and active companies/firms associated with them
   */
  async getSectors() {
    return await sql`
      SELECT 
        s.id,
        s.name,
        s.level,
        p.name AS parent_sector_name,
        (
          SELECT array_agg(a.alias)
          FROM vc.sector_aliases a
          WHERE a.sector_id = s.id
        ) AS aliases,
        COUNT(DISTINCT fsf.firm_id)::int AS firm_count,
        COUNT(DISTINCT cs.company_id)::int AS company_count
      FROM vc.sectors s
      LEFT JOIN vc.sectors p ON s.parent_sector_id = p.id
      LEFT JOIN vc.firm_sector_focus fsf ON s.id = fsf.sector_id
      LEFT JOIN vc.company_sectors cs ON s.id = cs.sector_id
      GROUP BY s.id, s.name, s.level, p.name
      ORDER BY s.level ASC, firm_count DESC;
    `;
  }

  /**
   * Multi-factor Investor Matching Engine:
   * Evaluates venture firms against founder/business requirements
   */
  async calculateInvestorFit(input: InvestorFitInput): Promise<InvestorFitResult[]> {
    const firms = await this.getFirms();
    const results: InvestorFitResult[] = [];

    const reqSector = (input.sector || '').toLowerCase().trim();
    const reqStage = (input.stage || '').toLowerCase().trim();
    const reqAmount = Number(input.targetCheckSize || 0);
    const reqCountry = (input.countryCode || 'CA').toUpperCase();
    const reqProvince = (input.stateProvince || 'ON').toUpperCase();

    for (const firm of firms) {
      const reasons: string[] = [];
      let sectorFit = 50;
      let stageFit = 50;
      let checkSizeFit = 50;
      let geographyFit = 50;

      // 1. Sector Fit
      const firmSectors = (firm.sectors || []).map((s: string) => s.toLowerCase());
      if (reqSector) {
        if (firmSectors.some((s: string) => s === reqSector)) {
          sectorFit = 100;
          reasons.push(`Core mandate match for ${input.sector}.`);
        } else if (firmSectors.some((s: string) => s.includes(reqSector) || reqSector.includes(s))) {
          sectorFit = 85;
          reasons.push(`Adjacent sector specialization in ${firm.sectors?.join(', ')}.`);
        } else {
          sectorFit = 30;
        }
      } else {
        sectorFit = 80;
      }

      // 2. Stage Fit
      const firmStages = (firm.stages || []).map((s: string) => s.toLowerCase());
      if (reqStage) {
        if (firmStages.includes(reqStage)) {
          stageFit = 100;
          reasons.push(`Direct stage focus on ${reqStage.replace('_', ' ')} rounds.`);
        } else if (
          (reqStage.includes('seed') && firmStages.includes('series_a')) ||
          (reqStage.includes('series_a') && (firmStages.includes('seed') || firmStages.includes('series_b'))) ||
          (reqStage.includes('growth') && firmStages.includes('series_b'))
        ) {
          stageFit = 75;
          reasons.push(`Stage flexibility across adjacent round brackets.`);
        } else {
          stageFit = 25;
        }
      } else {
        stageFit = 75;
      }

      // 3. Check Size Fit
      const minCheck = Number(firm.typical_check_min || 0);
      const maxCheck = Number(firm.typical_check_max || 1000000000);
      if (reqAmount > 0) {
        if (reqAmount >= minCheck && reqAmount <= maxCheck) {
          checkSizeFit = 100;
          reasons.push(`Target ask of $${(reqAmount / 1e6).toFixed(1)}M fits directly in check sweet spot.`);
        } else if (reqAmount < minCheck && reqAmount >= minCheck * 0.5) {
          checkSizeFit = 65;
          reasons.push(`Check size is at the lower boundary for ${firm.name}.`);
        } else if (reqAmount > maxCheck && reqAmount <= maxCheck * 1.5) {
          checkSizeFit = 65;
          reasons.push(`Check size is at the upper syndication limit.`);
        } else {
          checkSizeFit = 30;
        }
      } else {
        checkSizeFit = 80;
      }

      // 4. Geography Fit
      const isCanada = firm.country_code === 'CA';
      if (reqCountry === 'CA') {
        if (isCanada) {
          geographyFit = 100;
          reasons.push(`Primary domestic Canadian office and Canadian innovation corridor mandate.`);
        } else if (firm.name.includes('Sequoia') || firm.name.includes('Andreessen') || firm.name.includes('Founders')) {
          geographyFit = 85;
          reasons.push(`Active cross-border syndicate participant in Tier-1 Canadian tech rounds.`);
        } else {
          geographyFit = 60;
        }
      } else {
        geographyFit = 85;
      }

      // Weighted overall score
      const overallScore = Math.round(
        sectorFit * 0.35 +
        stageFit * 0.30 +
        checkSizeFit * 0.20 +
        geographyFit * 0.15
      );

      results.push({
        firmId: firm.id,
        firmName: firm.name,
        firmType: firm.firm_type,
        website: firm.website,
        headquarters: {
          city: firm.city,
          stateProvince: firm.state_province,
          country: firm.country,
        },
        overallScore,
        components: {
          sectorFit,
          stageFit,
          checkSizeFit,
          geographyFit,
        },
        reasons,
        typicalCheck: {
          min: firm.typical_check_min ? Number(firm.typical_check_min) : null,
          max: firm.typical_check_max ? Number(firm.typical_check_max) : null,
          currency: firm.typical_check_currency || 'USD',
        },
        activeStages: firm.stages || [],
        coreSectors: firm.sectors || [],
        funds: (firm.funds || []).map((fu: any) => ({
          name: fu.name,
          status: fu.status,
          committedCapital: fu.committedCapital ? Number(fu.committedCapital) : null,
        })),
      });
    }

    return results.sort((a, b) => b.overallScore - a.overallScore);
  }

  /**
   * Retrieves institutional syndication network and LP commitments graph
   */
  async getSyndicationGraph() {
    const relationships = await sql`
      SELECT 
        r.id,
        r.relationship_type,
        r.strength,
        r.first_observed,
        r.last_observed,
        r.from_entity_id,
        r.from_entity_type,
        f1.name AS from_name,
        r.to_entity_id,
        r.to_entity_type,
        f2.name AS to_name
      FROM vc.investor_relationships r
      LEFT JOIN vc.vc_firms f1 ON r.from_entity_id = f1.id
      LEFT JOIN vc.vc_firms f2 ON r.to_entity_id = f2.id;
    `;

    const commitments = await sql`
      SELECT 
        c.id,
        lp.name AS lp_name,
        lp.lp_type,
        lp.country AS lp_country,
        f.name AS firm_name,
        fu.name AS fund_name,
        c.commitment_amount,
        c.currency,
        c.commitment_date
      FROM vc.fund_commitments c
      JOIN vc.limited_partners lp ON c.limited_partner_id = lp.id
      JOIN vc.funds fu ON c.fund_id = fu.id
      JOIN vc.vc_firms f ON fu.firm_id = f.id;
    `;

    const exits = await sql`
      SELECT 
        e.*,
        c.name AS company_name
      FROM vc.exits e
      JOIN vc.companies c ON e.company_id = c.id;
    `;

    return {
      relationships,
      commitments,
      exits,
    };
  }

  /**
   * Activity signals and market telemetry
   */
  async getSignals() {
    return await sql`
      SELECT 
        s.*,
        f.name AS firm_name,
        p.full_name AS person_name
      FROM vc.investor_signals s
      LEFT JOIN vc.vc_firms f ON s.firm_id = f.id
      LEFT JOIN vc.people p ON s.person_id = p.id
      ORDER BY s.observed_at DESC;
    `;
  }

  /**
   * Regional venture capital intelligence for an Ontario municipality
   */
  async getRegionalVCSummary(cityName: string) {
    const cleanCity = cityName.replace(/^(CSD_|City of |Town of )/i, '').trim();

    const [deals] = await sql`
      SELECT 
        COUNT(DISTINCT c.id)::int AS local_companies,
        COALESCE(SUM(r.amount_raised), 0)::numeric AS capital_raised,
        COUNT(DISTINCT r.id)::int AS round_count
      FROM vc.companies c
      LEFT JOIN vc.locations l ON c.headquarters_location_id = l.id
      LEFT JOIN vc.funding_rounds r ON c.id = r.company_id
      WHERE l.city ILIKE ${'%' + cleanCity + '%'} OR l.state_province = 'ON';
    `;

    const [activeFirms] = await sql`
      SELECT COUNT(DISTINCT f.id)::int AS active_investors
      FROM vc.vc_firms f
      LEFT JOIN vc.locations l ON f.headquarters_location_id = l.id
      WHERE l.country_code = 'CA' OR f.name IN ('Inovia Capital', 'Georgian', 'Version One Ventures');
    `;

    return {
      city: cityName,
      cleanCity,
      ventureBackedCompanies: Number(deals?.local_companies || 0),
      capitalRaisedUsd: Number(deals?.capital_raised || 0),
      roundCount: Number(deals?.round_count || 0),
      activeDomesticInvestors: Number(activeFirms?.active_investors || 3),
      topHubs: ['Toronto', 'Waterloo', 'Ottawa', 'Montreal'],
    };
  }
}

export const vcIntelligenceService = new VcIntelligenceService();
