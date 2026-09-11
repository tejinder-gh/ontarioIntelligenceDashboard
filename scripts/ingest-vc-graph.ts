import { createHash } from 'crypto';
import { readFileSync } from 'fs';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ontario_economic_intelligence';

const sql = postgres(DATABASE_URL, {
  max: 5,
  idle_timeout: 10,
  connect_timeout: 10,
  onnotice: () => {},
});

function toUuid(str: string): string {
  if (!str) return '00000000-0000-0000-0000-000000000000';
  // Standard UUID regex
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str;
  }
  const hex = createHash('md5').update(str).digest('hex');
  return `${hex.substring(0, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}-${hex.substring(16, 20)}-${hex.substring(20, 32)}`;
}

async function run() {
  console.log('Reading data/vc-intelligence-graph.json...');
  const raw = readFileSync('data/vc-intelligence-graph.json', 'utf-8');
  const data = JSON.parse(raw);

  console.log('Connecting to database and setting schema search path to vc, public...');
  await sql`SET search_path TO vc, public;`;

  // Start transaction
  await sql.begin(async (tx) => {
    // 1. Locations
    console.log('1. Ingesting locations...');
    const locationMap = new Map<string, string>(); // key -> uuid

    async function getOrCreateLocation(loc: any): Promise<string | null> {
      if (!loc) return null;
      const key = `${loc.countryCode || ''}|${loc.stateProvince || ''}|${loc.city || ''}`;
      if (locationMap.has(key)) return locationMap.get(key)!;
      const uuid = toUuid(`loc_${key}`);
      await tx`
        INSERT INTO vc.locations (id, country_code, country, region, state_province, city)
        VALUES (${uuid}, ${loc.countryCode || null}, ${loc.country || null}, ${loc.region || null}, ${loc.stateProvince || null}, ${loc.city || null})
        ON CONFLICT (id) DO UPDATE SET
          country_code = EXCLUDED.country_code,
          country = EXCLUDED.country,
          region = EXCLUDED.region,
          state_province = EXCLUDED.state_province,
          city = EXCLUDED.city;
      `;
      locationMap.set(key, uuid);
      return uuid;
    }

    for (const firm of data.vcFirms || []) {
      if (firm.headquarters) await getOrCreateLocation(firm.headquarters);
    }
    for (const comp of data.companies || []) {
      if (comp.headquarters) await getOrCreateLocation(comp.headquarters);
    }

    // 2. Sectors (sort by level so parents exist first)
    console.log('2. Ingesting sectors and aliases...');
    const sectors = (data.sectors || []).slice().sort((a: any, b: any) => (a.level || 1) - (b.level || 1));
    for (const sec of sectors) {
      const secUuid = toUuid(sec.id);
      const parentUuid = sec.parentSectorId ? toUuid(sec.parentSectorId) : null;
      await tx`
        INSERT INTO vc.sectors (id, name, parent_sector_id, level)
        VALUES (${secUuid}, ${sec.name}, ${parentUuid}, ${sec.level || 1})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          parent_sector_id = EXCLUDED.parent_sector_id,
          level = EXCLUDED.level;
      `;

      if (sec.aliases && Array.isArray(sec.aliases)) {
        for (const alias of sec.aliases) {
          await tx`
            INSERT INTO vc.sector_aliases (sector_id, alias)
            VALUES (${secUuid}, ${alias})
            ON CONFLICT (sector_id, alias) DO NOTHING;
          `;
        }
      }
    }

    // Helper for Sources & Entity Sources
    async function ingestSourceMetadata(entityType: string, entityId: string, meta: any) {
      if (!meta || !meta.sources || !Array.isArray(meta.sources)) return;
      for (const s of meta.sources) {
        const sourceUuid = toUuid(s.url || `${s.publisher}_${s.title}`);
        const confidence = meta.confidence || 'unknown';
        await tx`
          INSERT INTO vc.sources (id, source_type, url, publisher, title, accessed_at, confidence)
          VALUES (
            ${sourceUuid},
            ${s.sourceType || 'unknown'},
            ${s.url || null},
            ${s.publisher || null},
            ${s.title || null},
            ${s.accessedAt ? new Date(s.accessedAt) : new Date()},
            ${confidence}
          )
          ON CONFLICT (id) DO UPDATE SET
            source_type = EXCLUDED.source_type,
            url = EXCLUDED.url,
            publisher = EXCLUDED.publisher,
            title = EXCLUDED.title,
            accessed_at = EXCLUDED.accessed_at,
            confidence = EXCLUDED.confidence;
        `;

        await tx`
          INSERT INTO vc.entity_sources (entity_type, entity_id, source_id, confidence)
          VALUES (
            ${entityType},
            ${entityId},
            ${sourceUuid},
            ${confidence === 'verified' ? 1.0 : confidence === 'high' ? 0.85 : 0.6}
          )
          ON CONFLICT DO NOTHING;
        `;
      }
    }

    // 3. VC Firms
    console.log('3. Ingesting VC Firms...');
    for (const firm of data.vcFirms || []) {
      const firmUuid = toUuid(firm.id);
      const hqLocationId = firm.headquarters ? await getOrCreateLocation(firm.headquarters) : null;
      const aum = firm.assetsUnderManagement?.amount || null;
      const aumCurr = firm.assetsUnderManagement?.currency || null;
      const checkMin = firm.typicalCheckSize?.min?.amount || null;
      const checkMax = firm.typicalCheckSize?.max?.amount || null;
      const checkCurr = firm.typicalCheckSize?.min?.currency || null;

      await tx`
        INSERT INTO vc.vc_firms (
          id, name, legal_name, website, linkedin_url, contact_email, office_address, description,
          firm_type, status, founded_year, headquarters_location_id,
          aum_amount, aum_currency, typical_check_min, typical_check_max, typical_check_currency,
          reserves_for_follow_on, board_seat_preference
        )
        VALUES (
          ${firmUuid}, ${firm.name}, ${firm.legalName || null}, ${firm.website || null},
          ${firm.linkedinUrl || null}, ${firm.contactEmail || null}, ${firm.officeAddress || null}, ${firm.description || null},
          ${firm.firmType || 'venture_capital'}, ${firm.status || 'active'},
          ${firm.foundedYear || null}, ${hqLocationId},
          ${aum}, ${aumCurr}, ${checkMin}, ${checkMax}, ${checkCurr},
          ${firm.reservesForFollowOn ?? null}, ${firm.boardSeatPreference ?? null}
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          legal_name = EXCLUDED.legal_name,
          website = EXCLUDED.website,
          linkedin_url = EXCLUDED.linkedin_url,
          contact_email = EXCLUDED.contact_email,
          office_address = EXCLUDED.office_address,
          description = EXCLUDED.description,
          firm_type = EXCLUDED.firm_type,
          status = EXCLUDED.status,
          founded_year = EXCLUDED.founded_year,
          headquarters_location_id = EXCLUDED.headquarters_location_id,
          aum_amount = EXCLUDED.aum_amount,
          aum_currency = EXCLUDED.aum_currency,
          typical_check_min = EXCLUDED.typical_check_min,
          typical_check_max = EXCLUDED.typical_check_max,
          typical_check_currency = EXCLUDED.typical_check_currency,
          reserves_for_follow_on = EXCLUDED.reserves_for_follow_on,
          board_seat_preference = EXCLUDED.board_seat_preference;
      `;

      // Aliases
      if (firm.aliases && Array.isArray(firm.aliases)) {
        for (const alias of firm.aliases) {
          await tx`
            INSERT INTO vc.vc_firm_aliases (firm_id, alias)
            VALUES (${firmUuid}, ${alias})
            ON CONFLICT (firm_id, alias) DO NOTHING;
          `;
        }
      }

      // Stages
      if (firm.stages && Array.isArray(firm.stages)) {
        for (const st of firm.stages) {
          await tx`
            INSERT INTO vc.firm_stage_focus (firm_id, stage, preference)
            VALUES (${firmUuid}, ${st}, 'core')
            ON CONFLICT (firm_id, stage) DO NOTHING;
          `;
        }
      }

      // Sectors
      if (firm.sectors && Array.isArray(firm.sectors)) {
        for (const s of firm.sectors) {
          const secUuid = toUuid(s.sectorId);
          await tx`
            INSERT INTO vc.firm_sector_focus (firm_id, sector_id, preference)
            VALUES (${firmUuid}, ${secUuid}, ${s.preference || 'core'})
            ON CONFLICT (firm_id, sector_id) DO UPDATE SET preference = EXCLUDED.preference;
          `;
        }
      }

      // Geographies
      if (firm.geographies && Array.isArray(firm.geographies)) {
        for (const g of firm.geographies) {
          await tx`
            INSERT INTO vc.firm_geography_focus (firm_id, country_code, region, preference)
            VALUES (${firmUuid}, ${g.countryCode || null}, ${g.region || null}, ${g.preference || 'primary'});
          `;
        }
      }

      // Provenance
      await ingestSourceMetadata('firm', firmUuid, firm.sourceMetadata);
    }

    // 4. Funds
    console.log('4. Ingesting Funds...');
    for (const fund of data.funds || []) {
      const fundUuid = toUuid(fund.id);
      const firmUuid = toUuid(fund.firmId);
      const committed = fund.committedCapital?.amount || null;
      const targetSize = fund.targetSize?.amount || null;
      const finalClose = fund.finalCloseSize?.amount || null;
      const curr = fund.committedCapital?.currency || fund.targetSize?.currency || fund.finalCloseSize?.currency || 'USD';

      await tx`
        INSERT INTO vc.funds (
          id, firm_id, name, fund_number, vintage_year, status,
          target_size_amount, final_close_size_amount, committed_capital, currency
        )
        VALUES (
          ${fundUuid}, ${firmUuid}, ${fund.name}, ${fund.fundNumber || null},
          ${fund.vintageYear || null}, ${fund.status || 'unknown'},
          ${targetSize}, ${finalClose}, ${committed}, ${curr}
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          fund_number = EXCLUDED.fund_number,
          vintage_year = EXCLUDED.vintage_year,
          status = EXCLUDED.status,
          target_size_amount = EXCLUDED.target_size_amount,
          final_close_size_amount = EXCLUDED.final_close_size_amount,
          committed_capital = EXCLUDED.committed_capital,
          currency = EXCLUDED.currency;
      `;

      await ingestSourceMetadata('fund', fundUuid, fund.sourceMetadata);
    }

    // 5. Fund Performance
    console.log('5. Ingesting Fund Performance...');
    for (const perf of data.fundPerformance || []) {
      const fundUuid = toUuid(perf.fundId);
      await tx`
        INSERT INTO vc.fund_performance (
          fund_id, as_of_date, tvpi, dpi, gross_irr, net_irr,
          performance_quartile, benchmark_name, data_quality
        )
        VALUES (
          ${fundUuid}, ${perf.asOfDate}, ${perf.totalValueToPaidIn || null},
          ${perf.distributedToPaidIn || null}, ${perf.grossIRR || null},
          ${perf.netIRR || null}, ${perf.performanceQuartile || null},
          ${perf.benchmarkName || null}, ${perf.dataQuality || null}
        )
        ON CONFLICT (fund_id, as_of_date) DO UPDATE SET
          tvpi = EXCLUDED.tvpi,
          dpi = EXCLUDED.dpi,
          gross_irr = EXCLUDED.gross_irr,
          net_irr = EXCLUDED.net_irr,
          performance_quartile = EXCLUDED.performance_quartile,
          benchmark_name = EXCLUDED.benchmark_name,
          data_quality = EXCLUDED.data_quality;
      `;
    }

    // 6. People & Roles
    console.log('6. Ingesting People & Roles...');
    for (const person of data.people || []) {
      const personUuid = toUuid(person.id);
      await tx`
        INSERT INTO vc.people (
          id, first_name, last_name, full_name, linkedin_url,
          title, seniority, founder_background, operator_background, public_email
        )
        VALUES (
          ${personUuid}, ${person.firstName || null}, ${person.lastName || null},
          ${person.fullName || person.name || 'Unknown'}, ${person.linkedinUrl || null}, ${person.title || null},
          ${person.seniority || null}, ${person.founderBackground ?? null},
          ${person.operatorBackground ?? null}, ${person.publicEmail || null}
        )
        ON CONFLICT (id) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          full_name = EXCLUDED.full_name,
          linkedin_url = EXCLUDED.linkedin_url,
          title = EXCLUDED.title,
          seniority = EXCLUDED.seniority,
          founder_background = EXCLUDED.founder_background,
          operator_background = EXCLUDED.operator_background,
          public_email = EXCLUDED.public_email;
      `;

      await ingestSourceMetadata('person', personUuid, person.sourceMetadata);
    }

    for (const role of data.personFirmRoles || []) {
      const roleUuid = toUuid(role.id);
      const personUuid = toUuid(role.personId);
      const firmUuid = toUuid(role.firmId);
      await tx`
        INSERT INTO vc.person_firm_roles (
          id, person_id, firm_id, title, role_type, start_date, current
        )
        VALUES (
          ${roleUuid}, ${personUuid}, ${firmUuid}, ${role.title || null},
          ${role.roleType || 'investment'}, ${role.startDate ? new Date(role.startDate) : null},
          ${role.current ?? true}
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          role_type = EXCLUDED.role_type,
          start_date = EXCLUDED.start_date,
          current = EXCLUDED.current;
      `;
    }

    // 7. Investment Theses
    console.log('7. Ingesting Investment Theses...');
    for (const thesis of data.investmentTheses || []) {
      const thesisUuid = toUuid(thesis.id);
      const firmUuid = toUuid(thesis.firmId);
      const checkMin = thesis.preferredCheckSize?.min?.amount || null;
      const checkMax = thesis.preferredCheckSize?.max?.amount || null;
      const checkCurr = thesis.preferredCheckSize?.min?.currency || 'USD';

      await tx`
        INSERT INTO vc.investment_theses (
          id, firm_id, summary, preferred_check_min, preferred_check_max, preferred_check_currency,
          evaluation_criteria, required_traction, avoids, themes, business_models, thesis_source_url, thesis_last_updated
        )
        VALUES (
          ${thesisUuid}, ${firmUuid}, ${thesis.summary}, ${checkMin}, ${checkMax}, ${checkCurr},
          ${sql.json(thesis.evaluationCriteria || [])},
          ${sql.json(thesis.requiredTraction || [])},
          ${sql.json(thesis.avoids || [])},
          ${sql.json(thesis.preferredSectors || [])},
          ${sql.json(thesis.preferredBusinessModels || [])},
          ${thesis.thesisSourceUrl || null},
          ${thesis.thesisLastUpdated ? new Date(thesis.thesisLastUpdated) : null}
        )
        ON CONFLICT (id) DO UPDATE SET
          summary = EXCLUDED.summary,
          preferred_check_min = EXCLUDED.preferred_check_min,
          preferred_check_max = EXCLUDED.preferred_check_max,
          preferred_check_currency = EXCLUDED.preferred_check_currency,
          evaluation_criteria = EXCLUDED.evaluation_criteria,
          required_traction = EXCLUDED.required_traction,
          avoids = EXCLUDED.avoids,
          themes = EXCLUDED.themes,
          business_models = EXCLUDED.business_models,
          thesis_source_url = EXCLUDED.thesis_source_url,
          thesis_last_updated = EXCLUDED.thesis_last_updated;
      `;
    }

    // 8. Companies
    console.log('8. Ingesting Companies and Company Sectors...');
    // Sector lookup cache
    const existingSectors = await tx`SELECT id, name FROM vc.sectors;`;
    const sectorNameToUuid = new Map<string, string>();
    for (const s of existingSectors) {
      sectorNameToUuid.set(s.name.toLowerCase(), s.id);
    }
    const aliases = await tx`SELECT sector_id, alias FROM vc.sector_aliases;`;
    for (const a of aliases) {
      sectorNameToUuid.set(a.alias.toLowerCase(), a.sector_id);
    }

    for (const comp of data.companies || []) {
      const compUuid = toUuid(comp.id);
      const hqLocationId = comp.headquarters ? await getOrCreateLocation(comp.headquarters) : null;
      const valuation = comp.latestValuation?.amount || null;
      const valCurr = comp.latestValuation?.currency || null;

      await tx`
        INSERT INTO vc.companies (
          id, name, legal_name, website, status, founded_year,
          headquarters_location_id, latest_valuation_amount, latest_valuation_currency
        )
        VALUES (
          ${compUuid}, ${comp.name}, ${comp.legalName || null}, ${comp.website || null},
          ${comp.status || 'unknown'}, ${comp.foundedYear || null},
          ${hqLocationId}, ${valuation}, ${valCurr}
        )
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          legal_name = EXCLUDED.legal_name,
          website = EXCLUDED.website,
          status = EXCLUDED.status,
          founded_year = EXCLUDED.founded_year,
          headquarters_location_id = EXCLUDED.headquarters_location_id,
          latest_valuation_amount = EXCLUDED.latest_valuation_amount,
          latest_valuation_currency = EXCLUDED.latest_valuation_currency;
      `;

      // Company sectors mapping
      if (comp.sectors && Array.isArray(comp.sectors)) {
        for (const sName of comp.sectors) {
          const sUuid = sectorNameToUuid.get(sName.toLowerCase());
          if (sUuid) {
            await tx`
              INSERT INTO vc.company_sectors (company_id, sector_id)
              VALUES (${compUuid}, ${sUuid})
              ON CONFLICT (company_id, sector_id) DO NOTHING;
            `;
          }
        }
      }

      await ingestSourceMetadata('company', compUuid, comp.sourceMetadata);
    }

    // 9. Funding Rounds
    console.log('9. Ingesting Funding Rounds...');
    for (const round of data.fundingRounds || []) {
      const roundUuid = toUuid(round.id);
      const compUuid = toUuid(round.companyId);
      const amount = round.amountRaised?.amount || null;
      const curr = round.amountRaised?.currency || 'USD';
      const postVal = round.postMoneyValuation?.amount || null;
      const stage = round.stage || round.roundType;

      await tx`
        INSERT INTO vc.funding_rounds (
          id, company_id, stage, round_type, announced_date,
          amount_raised, currency, post_money_valuation, total_investor_count
        )
        VALUES (
          ${roundUuid}, ${compUuid}, ${stage}, ${round.roundType || null},
          ${round.announcedDate ? new Date(round.announcedDate) : null},
          ${amount}, ${curr}, ${postVal}, ${round.totalInvestorCount || null}
        )
        ON CONFLICT (id) DO UPDATE SET
          stage = EXCLUDED.stage,
          round_type = EXCLUDED.round_type,
          announced_date = EXCLUDED.announced_date,
          amount_raised = EXCLUDED.amount_raised,
          currency = EXCLUDED.currency,
          post_money_valuation = EXCLUDED.post_money_valuation,
          total_investor_count = EXCLUDED.total_investor_count;
      `;

      await ingestSourceMetadata('round', roundUuid, round.sourceMetadata);
    }

    // 10. Investments
    console.log('10. Ingesting Investments...');
    for (const inv of data.investments || []) {
      const invUuid = toUuid(inv.id);
      const firmUuid = toUuid(inv.firmId);
      const fundUuid = inv.fundId ? toUuid(inv.fundId) : null;
      const compUuid = toUuid(inv.companyId);
      const roundUuid = inv.fundingRoundId ? toUuid(inv.fundingRoundId) : null;
      const invRole = inv.role || 'unknown';

      await tx`
        INSERT INTO vc.investments (
          id, firm_id, fund_id, company_id, funding_round_id, investment_date,
          investment_role, first_investment, follow_on, board_seat_obtained, status
        )
        VALUES (
          ${invUuid}, ${firmUuid}, ${fundUuid}, ${compUuid}, ${roundUuid},
          ${inv.investmentDate ? new Date(inv.investmentDate) : null},
          ${invRole}, ${inv.firstInvestment ?? false}, ${inv.followOn ?? false},
          ${inv.boardSeatObtained ?? false}, ${inv.status || 'unknown'}
        )
        ON CONFLICT (id) DO UPDATE SET
          firm_id = EXCLUDED.firm_id,
          fund_id = EXCLUDED.fund_id,
          company_id = EXCLUDED.company_id,
          funding_round_id = EXCLUDED.funding_round_id,
          investment_date = EXCLUDED.investment_date,
          investment_role = EXCLUDED.investment_role,
          first_investment = EXCLUDED.first_investment,
          follow_on = EXCLUDED.follow_on,
          board_seat_obtained = EXCLUDED.board_seat_obtained,
          status = EXCLUDED.status;
      `;

      await ingestSourceMetadata('investment', invUuid, inv.sourceMetadata);
    }

    // 11. Exits
    console.log('11. Ingesting Exits...');
    for (const exit of data.exits || []) {
      const exitUuid = toUuid(exit.id);
      const compUuid = toUuid(exit.companyId);
      const ipoPrice = exit.IPO?.IPOPrice || null;
      const mktCap = exit.IPO?.marketCapAtIPO?.amount || null;
      const curr = exit.IPO?.marketCapAtIPO?.currency || 'USD';

      await tx`
        INSERT INTO vc.exits (
          id, company_id, exit_type, completion_date,
          ticker, exchange, ipo_price, market_cap_at_ipo, currency
        )
        VALUES (
          ${exitUuid}, ${compUuid}, ${exit.type},
          ${exit.completionDate ? new Date(exit.completionDate) : null},
          ${exit.IPO?.ticker || null}, ${exit.IPO?.exchange || null},
          ${ipoPrice}, ${mktCap}, ${curr}
        )
        ON CONFLICT (id) DO UPDATE SET
          exit_type = EXCLUDED.exit_type,
          completion_date = EXCLUDED.completion_date,
          ticker = EXCLUDED.ticker,
          exchange = EXCLUDED.exchange,
          ipo_price = EXCLUDED.ipo_price,
          market_cap_at_ipo = EXCLUDED.market_cap_at_ipo,
          currency = EXCLUDED.currency;
      `;

      await ingestSourceMetadata('exit', exitUuid, exit.sourceMetadata);
    }

    // 12. Limited Partners & Commitments
    console.log('12. Ingesting Limited Partners & Commitments...');
    for (const lp of data.limitedPartners || []) {
      const lpUuid = toUuid(lp.id);
      const aum = lp.assetsUnderManagement?.amount || null;
      const curr = lp.assetsUnderManagement?.currency || null;

      await tx`
        INSERT INTO vc.limited_partners (id, name, lp_type, country, aum_amount, aum_currency)
        VALUES (${lpUuid}, ${lp.name}, ${lp.type || null}, ${lp.country || null}, ${aum}, ${curr})
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          lp_type = EXCLUDED.lp_type,
          country = EXCLUDED.country,
          aum_amount = EXCLUDED.aum_amount,
          aum_currency = EXCLUDED.aum_currency;
      `;

      if (lp.commitments && Array.isArray(lp.commitments)) {
        for (const comm of lp.commitments) {
          const commUuid = toUuid(comm.id);
          const fundUuid = toUuid(comm.fundId);
          const commAmt = comm.commitmentAmount?.amount || null;
          const commCurr = comm.commitmentAmount?.currency || 'USD';
          await tx`
            INSERT INTO vc.fund_commitments (
              id, limited_partner_id, fund_id, commitment_amount, currency, commitment_date
            )
            VALUES (
              ${commUuid}, ${lpUuid}, ${fundUuid}, ${commAmt}, ${commCurr},
              ${comm.commitmentDate ? new Date(comm.commitmentDate) : null}
            )
            ON CONFLICT (limited_partner_id, fund_id) DO UPDATE SET
              commitment_amount = EXCLUDED.commitment_amount,
              currency = EXCLUDED.currency,
              commitment_date = EXCLUDED.commitment_date;
          `;
        }
      }

      await ingestSourceMetadata('lp', lpUuid, lp.sourceMetadata);
    }

    // 13. Fundraising Events
    console.log('13. Ingesting Fundraising Events...');
    for (const fe of data.fundraisingEvents || []) {
      const feUuid = toUuid(fe.id);
      const firmUuid = toUuid(fe.firmId);
      const fundUuid = toUuid(fe.fundId);
      const amount = fe.amountRaised?.amount || null;
      const curr = fe.amountRaised?.currency || 'USD';

      await tx`
        INSERT INTO vc.fundraising_events (
          id, firm_id, fund_id, event_type, event_date, amount_raised, currency
        )
        VALUES (
          ${feUuid}, ${firmUuid}, ${fundUuid}, ${fe.eventType},
          ${fe.date ? new Date(fe.date) : null}, ${amount}, ${curr}
        )
        ON CONFLICT (id) DO UPDATE SET
          event_type = EXCLUDED.event_type,
          event_date = EXCLUDED.event_date,
          amount_raised = EXCLUDED.amount_raised,
          currency = EXCLUDED.currency;
      `;

      await ingestSourceMetadata('fundraising_event', feUuid, fe.sourceMetadata);
    }

    // 14. Relationships
    console.log('14. Ingesting Investor Relationships...');
    for (const rel of data.investorRelationships || []) {
      const relUuid = toUuid(rel.id);
      const fromUuid = toUuid(rel.fromEntityId);
      const toUuidVal = toUuid(rel.toEntityId);

      await tx`
        INSERT INTO vc.investor_relationships (
          id, from_entity_id, from_entity_type, to_entity_id, to_entity_type,
          relationship_type, strength, first_observed, last_observed
        )
        VALUES (
          ${relUuid}, ${fromUuid}, ${rel.fromEntityType}, ${toUuidVal}, ${rel.toEntityType},
          ${rel.relationshipType}, ${rel.strength || null},
          ${rel.firstObserved ? new Date(rel.firstObserved) : null},
          ${rel.lastObserved ? new Date(rel.lastObserved) : null}
        )
        ON CONFLICT (id) DO UPDATE SET
          relationship_type = EXCLUDED.relationship_type,
          strength = EXCLUDED.strength,
          first_observed = EXCLUDED.first_observed,
          last_observed = EXCLUDED.last_observed;
      `;
    }

    // 15. Activity Signals
    console.log('15. Ingesting Investor Signals...');
    for (const sig of data.investorSignals || []) {
      const sigUuid = toUuid(sig.id);
      const firmUuid = toUuid(sig.investorId);

      await tx`
        INSERT INTO vc.investor_signals (
          id, firm_id, signal_type, observed_at, description, signal_strength
        )
        VALUES (
          ${sigUuid}, ${firmUuid}, ${sig.signalType},
          ${sig.observedAt ? new Date(sig.observedAt) : new Date()},
          ${sig.description}, ${sig.signalStrength || null}
        )
        ON CONFLICT (id) DO UPDATE SET
          signal_type = EXCLUDED.signal_type,
          observed_at = EXCLUDED.observed_at,
          description = EXCLUDED.description,
          signal_strength = EXCLUDED.signal_strength;
      `;

      await ingestSourceMetadata('signal', sigUuid, sig.sourceMetadata);
    }

    // 16. Investor Analytics
    console.log('16. Ingesting Investor Analytics...');
    for (const a of data.investorAnalytics || []) {
      const firmUuid = toUuid(a.firmId);

      await tx`
        INSERT INTO vc.investor_analytics (
          firm_id, calculated_at, total_investments, new_investments_12m,
          follow_on_investments_12m, lead_rate, follow_on_rate, unicorn_rate,
          sector_distribution, stage_distribution, geography_distribution
        )
        VALUES (
          ${firmUuid}, ${a.calculatedAt ? new Date(a.calculatedAt) : new Date()},
          ${a.totalInvestments || null}, ${a.newInvestmentsLast12Months || null},
          ${a.followOnInvestmentsLast12Months || null}, ${a.leadRate || null},
          ${a.followOnRate || null}, ${a.unicornRate || null},
          ${sql.json(a.sectorDistribution || {})},
          ${sql.json(a.stageDistribution || {})},
          ${sql.json(a.geographyDistribution || {})}
        );
      `;
    }

    // 17. Investor Fit Scores
    console.log('17. Ingesting Investor Fit Scores...');
    for (const fit of data.investorFitScores || []) {
      const compUuid = toUuid(fit.companyId);
      const firmUuid = toUuid(fit.firmId);
      const c = fit.components || {};

      await tx`
        INSERT INTO vc.investor_fit_scores (
          company_id, firm_id, calculated_at, overall_score,
          stage_fit, sector_fit, geography_fit, check_size_fit, traction_fit,
          business_model_fit, portfolio_conflict, activity_score, relationship_score,
          reasons, blockers
        )
        VALUES (
          ${compUuid}, ${firmUuid}, ${fit.calculatedAt ? new Date(fit.calculatedAt) : new Date()},
          ${fit.overallScore}, ${c.stageFit || null}, ${c.sectorFit || null},
          ${c.geographyFit || null}, ${c.checkSizeFit || null}, ${c.tractionFit || null},
          ${c.businessModelFit || null}, ${c.portfolioConflict || null},
          ${c.activityScore || null}, ${c.relationshipScore || null},
          ${sql.json(fit.reasons || [])}, ${sql.json(fit.blockers || [])}
        );
      `;
    }
  });

  console.log('SUCCESS: All VC Intelligence dataset entities ingested into vc schema!');
}

run()
  .catch((err) => {
    console.error('Ingestion failed:', err);
    process.exit(1);
  })
  .finally(() => sql.end());
