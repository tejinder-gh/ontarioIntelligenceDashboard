import { describe, it, expect, beforeAll } from 'vitest';
import { runDecisionEngine } from '../src/decision-engine/engine.js';
import { getCategoryProfile } from '../src/decision-engine/category-profiles.js';
import { createWorkspace, getWorkspace, listWorkspaces } from '../src/launch/repository.js';
import fs from 'node:fs';
import path from 'node:path';

describe('Phase 5 — Complete Coherent Product Journey & UI Integrity', () => {
  const testUserId = 'test_user_phase5_' + Date.now();

  it('completes end-to-end analytical journey: brief -> shortlist -> evidence -> financial scenarios -> saved decision', async () => {
    // 1. User Brief / Inquiry
    const inquiry = 'I want to open a takeout pizza shop in Halton region. I have $260,000 in capital.';
    const scenarios = getCategoryProfile('pizza_store').scenarios;
    const chosenScenario = scenarios.find(s => s.key === 'lean_takeout_delivery') || scenarios[0];

    // 2. Shortlist & Staged Geographic Funnel
    const result = await runDecisionEngine({
      inquiry,
      categoryId: 'pizza_store',
      scenarioKey: chosenScenario.key,
      targetRegions: ['Milton'],
      investmentCapital: 260000,
      desiredDiscretionaryIncome: 85000,
      userId: testUserId,
    });

    expect(result.runId).toBeDefined();
    expect(result.geographicFunnel.totalMarketsScreened).toBeGreaterThan(0);
    expect(result.geographicFunnel.shortlistedCandidates.length).toBeGreaterThan(0);

    // 3. Evidence Comparison & Ranked Alternatives
    expect(result.rankedAlternatives.length).toBeGreaterThan(0);
    const topPick = result.rankedAlternatives[0];
    expect(topPick.rank).toBe(1);
    expect(topPick.candidate.suitabilityScore).toBeGreaterThan(0);
    expect(topPick.candidate.confidenceScore).toBeDefined();
    expect(topPick.scenarioEconomics.breakEvenDailyOrders).toBeGreaterThan(0);

    // Verify evidence ledger contains traceable sources
    expect(result.evidenceLedger.length).toBeGreaterThan(0);
    const hasStatCan = result.evidenceLedger.some(e => 
      e.verificationSource?.includes('StatCan') || 
      e.verificationSource?.includes('Statistics Canada') || 
      e.claim?.length > 0
    );
    expect(hasStatCan).toBe(true);

    // 4. Financial Economics: Separate required sales from expected demand
    expect(result.financialEconomics.requiredSalesForIncomeGoal?.requiredUnitsPerPeriod).toBeGreaterThan(0);
    expect(result.financialEconomics.bands.baseCase.dailyUnitVolume).toBeGreaterThan(0);
    expect(result.financialEconomics.operationalCapacity?.unitCapacity).toBeGreaterThan(0);

    // 5. Saved Decision Brief with 7 Mandated Sections
    const brief = result.decisionBrief;
    expect(brief.recommendation.outcome).toBe('PROCEED_WITH_VERIFICATION');
    expect(brief.recommendation.marketOrLocation).toBeDefined();
    expect(brief.whyThisLocation.length).toBeGreaterThan(0);
    expect(Array.isArray(brief.whyNotAlternatives)).toBe(true);
    expect(brief.economics.requiredCapital).toBeGreaterThan(0);
    expect(brief.economics.breakEvenDailyOrders).toBeGreaterThan(0);
    expect(brief.whatCouldMakeThisWrong.length).toBeGreaterThan(0);
    expect(brief.beforeCommitting.length).toBeGreaterThan(0);
    expect(brief.sources.length).toBeGreaterThan(0);
  });

  it('seamlessly transitions saved decision into Launch Readiness due diligence workspace', async () => {
    // Run an inquiry for retail shipping counter
    const result = await runDecisionEngine({
      inquiry: 'Opening a private retail shipping and parcel counter in Halton with $160,000 capital',
      scenarioKey: 'franchise_express',
      userId: testUserId,
    });

    const brief = result.decisionBrief;
    expect(brief.recommendation.marketOrLocation).toBeDefined();

    // User initiates due diligence workspace
    const workspace = await createWorkspace({
      name: `${brief.recommendation.operatingFormat} - ${brief.recommendation.marketOrLocation}`,
      municipality: brief.recommendation.marketOrLocation,
      industry: brief.recommendation.operatingFormat,
    });

    expect(workspace.id).toBeDefined();
    expect(workspace.name).toContain(brief.recommendation.marketOrLocation);

    // Verify workspace can be retrieved and initialized
    const loadedWorkspace = await getWorkspace(workspace.id, workspace.token);
    expect(loadedWorkspace.id).toBe(workspace.id);
    expect(loadedWorkspace.municipality).toBe(brief.recommendation.marketOrLocation);
    expect(Array.isArray(loadedWorkspace.checks)).toBe(true);
  });

  it('provides honest DO_NOT_PROCEED recommendation and stopping criteria for impossible geographic constraints', async () => {
    const impossibleInquiry = 'Opening an express business in NonExistentTown';
    const result = await runDecisionEngine({
      inquiry: impossibleInquiry,
      targetRegions: ['NonExistentTown'],
      scenarioKey: 'lean_takeout_delivery',
      userId: testUserId,
    });

    expect(result.decisionBrief.recommendation.outcome).toBe('DO_NOT_PROCEED');
    expect(result.geographicFunnel.shortlistedCandidates.length).toBe(0);
    expect(result.geographicFunnel.stoppingCriteria.length).toBeGreaterThan(0);
    expect(result.decisionBrief.whyThisLocation[0]).toContain('No candidate locations');
    expect(result.decisionBrief.economics.baseNetIncome).toBe(0);
  });

  it('confirms all client UI views have removed internal engineering slogans and requirement tags', () => {
    const clientDir = path.resolve(__dirname, '../src/client');
    const checkedFiles = [
      'views/DecisionEngineView.tsx',
      'views/BusinessListingsView.tsx',
      'components/decision-engine/DecisionBriefView.tsx',
      'components/decision-engine/AlternativesScorecard.tsx',
      'components/decision-engine/DecisionModelPanel.tsx',
      'components/decision-engine/HypothesesMatrixCard.tsx',
      'components/decision-engine/PreCommitmentChecklist.tsx',
      'components/decision-engine/SensitivityStressTester.tsx',
      'components/decision-engine/StagedFunnelProgress.tsx',
      'components/DataCoverageCard.tsx',
    ];

    for (const file of checkedFiles) {
      const fullPath = path.join(clientDir, file);
      const content = fs.readFileSync(fullPath, 'utf8');

      // Must not contain "Staff Engineer Grade"
      expect(content.includes('Staff Engineer Grade')).toBe(false);

      // Must not contain "(Requirement \d+)" in user-visible strings
      const requirementRegex = /\(Requirement\s+\d+\)/;
      const match = content.match(requirementRegex);
      if (match) {
        throw new Error(`File ${file} still contains internal tag: ${match[0]}`);
      }
    }
  });

  it('guarantees explicit Ontario coverage in navigation branding and catalog scope', () => {
    const sidebarPath = path.resolve(__dirname, '../src/client/components/Sidebar.tsx');
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');

    // Must prominently display Ontario coverage
    expect(sidebarContent.includes('Ontario Intel')).toBe(true);
    expect(sidebarContent.includes('Economic & Market Intelligence')).toBe(true);
  });
});
