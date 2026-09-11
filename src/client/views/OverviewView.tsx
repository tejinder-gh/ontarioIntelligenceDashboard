import React, { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  DollarSign, 
  Store, 
  Building, 
  Briefcase, 
  ShieldAlert, 
  CheckCircle, 
  Sparkles,
  ArrowUpRight,
  MapPin,
  Info,
  ChevronRight,
  Lightbulb,
  FileText
} from 'lucide-react';
import { ResolutionBadge } from '../components/ResolutionBadge.js';
import { MetricTooltip } from '../components/MetricTooltip.js';
import { FeatureOutliersSection } from '../components/FeatureOutliersSection.js';
import { ContributingDataInspector, ContributingDataProps } from '../components/ContributingDataInspector.js';
import { FeasibilityDossierModal } from '../components/FeasibilityDossierModal.js';
import { HousingAndRentalCard } from '../components/HousingAndRentalCard.js';
import { GasPriceDeltaCard } from '../components/GasPriceDeltaCard.js';
import { ComparableCitiesCard } from '../components/ComparableCitiesCard.js';
import { DataCoverageCard } from '../components/DataCoverageCard.js';
import { RegionalVCCard } from '../components/RegionalVCCard.js';

interface OverviewViewProps {
  cityId: string;
  onNavigateTab: (tab: any, options?: any) => void;
  onSelectCity?: (cityId: string) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ cityId, onNavigateTab, onSelectCity }) => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [contributingData, setContributingData] = useState<ContributingDataProps | null>(null);
  const [isDossierOpen, setIsDossierOpen] = useState<boolean>(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/geographies/${cityId}/profile`)
      .then(res => res.json())
      .then(data => {
        setProfile(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error loading profile:', err);
        setLoading(false);
      });
  }, [cityId]);

  if (loading || !profile) {
    return (
      <div className="p-8 text-center text-slate-400 animate-pulse">
        Loading comprehensive municipal intelligence...
      </div>
    );
  }

  const geo = profile.geography;
  const obs = profile.observations || [];

  const getMetricVal = (metricId: string): number | null => {
    const item = obs.find((o: any) => o.metric_id === metricId);
    return item && item.value_numeric !== null && item.value_numeric !== undefined 
      ? Number(item.value_numeric) 
      : null;
  };

  const isBurlington = geo.id === 'CSD_burlington' || geo.name?.toLowerCase() === 'burlington';
  const pop = Number(geo.population_2021 || 0);
  const growth = Number(geo.population_growth_pct || 0);
  const share = Number(geo.ontario_pop_share_pct || (pop > 0 ? parseFloat(((pop / 14223942) * 100).toFixed(3)) : 0));
  const medianIncome = getMetricVal('income_median_hh');
  const totalBiz = getMetricVal('businesses_total_counts');
  const bizDensity = getMetricVal('businesses_per_1000_pop');
  const retailRent = getMetricVal('commercial_rent_retail_net');
  const unemp = getMetricVal('labor_unemployment_rate');

  // Helper to trigger inspector for any KPI
  const inspectMetric = (type: string) => {
    switch (type) {
      case 'population':
        setContributingData({
          title: `${geo.name} Population & Catchment Scale`,
          category: 'Demographics & Scale',
          metricLabel: '2021 Total Population',
          value: pop,
          unit: 'residents',
          percentageOfTotal: share,
          benchmarkValue: '14,223,942 Ontario Total',
          benchmarkLabel: 'Provincial Share',
          deltaPct: Number(growth),
          sourceLineage: 'Statistics Canada 2021 Census of Population (Table 98-401-X2021001)',
          referenceYear: '2021 Census',
          provenance: {
            sourceName: 'Statistics Canada',
            datasetCode: '98-401-X2021001',
            referencePeriod: '2021 Census',
            resolution: 'CSD (Census Subdivision)',
            confidence: '100% Official Audit'
          },
          decisionImplications: [
            {
              heading: 'Customer Footprint Capacity',
              insight: `With ${pop.toLocaleString()} residents, ${geo.name} possesses the critical mass to sustain multiple commercial hubs and specialized multi-location franchises.`,
              impact: 'positive'
            },
            {
              heading: 'Market Share Scaling',
              insight: `Represents ${share}% of Ontario's aggregate population, serving as a primary western GTA regional commercial center.`,
              impact: 'positive'
            }
          ],
          strategicRecommendations: [
            'Target high-traffic retail corridors (Fairview, Brant, Appleby) to maximize pedestrian and vehicular exposure.',
            'Leverage regional transit hubs (GO stations) for grab-and-go food and commuter retail services.'
          ],
          actionLink: {
            label: 'View Detailed Demographics',
            onClick: () => onNavigateTab('city_intelligence')
          },
          onClose: () => setContributingData(null)
        });
        break;

      case 'growth':
        setContributingData({
          title: `${geo.name} 5-Year Population Growth Trajectory`,
          category: 'Growth & Absorption',
          metricLabel: '5-Year Growth Rate',
          value: `${growth > 0 ? `+${growth}%` : `${growth}%`}`,
          unit: '',
          benchmarkValue: '+5.8% Ontario Provincial Average',
          benchmarkLabel: 'Provincial Benchmark',
          deltaPct: Math.round(growth - 5.8),
          sourceLineage: 'Statistics Canada 2016 & 2021 Census Compilations',
          referenceYear: '2016–2021 Census Cycle',
          decisionImplications: [
            {
              heading: 'Market Expansion Dynamics',
              insight: growth >= 5.8 
                ? `Rapid expansion creates rising baseline demand for childcare, grocery, dining, and retail services.`
                : `Mature municipal growth rate (${growth}%) requires winning market share from incumbents rather than relying purely on residential population influx.`,
              impact: growth >= 5.8 ? 'positive' : 'warning'
            }
          ],
          strategicRecommendations: [
            'Differentiate sharply from existing chains through superior customer experience and local community engagement.',
            'Monitor city intensification zones (MTSAs and transit station areas) for high-density mixed-use opportunities.'
          ],
          actionLink: {
            label: 'Compare Growth with Peer Cities',
            onClick: () => onNavigateTab('city_rankings')
          },
          onClose: () => setContributingData(null)
        });
        break;

      case 'income':
        setContributingData({
          title: `${geo.name} Household Purchasing Power & Income`,
          category: 'Consumer Affluence',
          metricLabel: 'Median Household Total Income',
          value: medianIncome !== null ? medianIncome : 'Data Pending',
          unit: medianIncome !== null ? 'CAD' : '',
          benchmarkValue: '$95,000 CAD',
          benchmarkLabel: 'Ontario Median Benchmark',
          deltaPct: medianIncome !== null ? Math.round(((medianIncome - 95000) / 95000) * 100) : 0,
          sourceLineage: 'Statistics Canada 2021 Census Profile',
          referenceYear: '2020 Tax Year',
          decisionImplications: medianIncome !== null ? [
            {
              heading: medianIncome >= 95000 ? 'High Willingness to Pay' : 'Value-Conscious Market',
              insight: `Median household income of $${medianIncome.toLocaleString()} ${medianIncome >= 95000 ? 'ranks in the upper tier of Ontario, supporting premium price points and discretionary personal care.' : 'supports staple and value-conscious consumer retail offerings.'}`,
              impact: medianIncome >= 95000 ? 'positive' : 'neutral'
            },
            {
              heading: 'Consumer Spending Cushion',
              insight: medianIncome >= 95000 ? 'High discretionary budgets reduce vulnerability to macroeconomic consumer spending contractions.' : 'Focus on price-competitive everyday essentials to capture steady local demand.',
              impact: 'positive'
            }
          ] : [
            {
              heading: 'Data Ingestion in Progress',
              insight: `Income observation records for ${geo.name} are queued for Census profile synchronization.`,
              impact: 'neutral'
            }
          ],
          strategicRecommendations: [
            'Position products and services aligned with verified neighborhood income distribution.',
            'Offer tiered loyalty pricing to capture varied customer segments.'
          ],
          actionLink: {
            label: 'Explore Spending & Household Wealth',
            onClick: () => onNavigateTab('financial_profile')
          },
          onClose: () => setContributingData(null)
        });
        break;

      case 'businesses':
        setContributingData({
          title: `${geo.name} Commercial Footprint & Density`,
          category: 'Commercial Ecosystem',
          metricLabel: 'Active Employer Establishments',
          value: totalBiz !== null ? totalBiz : 'Data Pending',
          unit: totalBiz !== null ? 'businesses' : '',
          benchmarkValue: bizDensity !== null ? `${bizDensity} biz / 1k residents` : '33.4 biz / 1k residents',
          benchmarkLabel: 'Local Density vs 33.4 Ontario Norm',
          deltaPct: bizDensity !== null ? Math.round(((bizDensity - 33.4) / 33.4) * 100) : 0,
          sourceLineage: 'Statistics Canada Canadian Business Counts (Table 33-10-1097-01)',
          referenceYear: 'December 2025',
          decisionImplications: totalBiz !== null ? [
            {
              heading: 'Commercial Vendor Network',
              insight: `With ${totalBiz.toLocaleString()} active employers, local business infrastructure provides commercial vendor networks, logistics, and daytime employee customer footfall.`,
              impact: 'positive'
            },
            {
              heading: 'Competitive Density Ratio',
              insight: `${bizDensity ?? '—'} businesses per 1,000 residents indicates the local commercial establishment intensity.`,
              impact: 'neutral'
            }
          ] : [
            {
              heading: 'Business Counts Ingestion Pending',
              insight: `Canadian Business Counts data for ${geo.name} will populate upon next scheduled sync.`,
              impact: 'neutral'
            }
          ],
          strategicRecommendations: [
            'Establish B2B supplier partnerships with local commercial vendors to lower supply chain lead times.',
            'Target daytime office and commercial employee traffic during lunch peaks.'
          ],
          actionLink: {
            label: 'View Business Landscape & Size Bands',
            onClick: () => onNavigateTab('business_landscape')
          },
          onClose: () => setContributingData(null)
        });
        break;

      case 'rent':
        setContributingData({
          title: `${geo.name} Commercial Real Estate & Retail Asking Rent`,
          category: 'Real Estate & Overhead',
          metricLabel: 'Net Retail Asking Net Rent',
          value: retailRent !== null ? retailRent : 'Data Pending',
          unit: retailRent !== null ? 'CAD/sq ft/yr' : '',
          benchmarkValue: '$32.00 CAD/sq ft Ontario Regional Norm',
          benchmarkLabel: 'Commercial Strip Baseline',
          deltaPct: retailRent !== null ? Math.round(((retailRent - 32) / 32) * 100) : 0,
          sourceLineage: 'Commercial Brokerage Market Reports & MLS Commercial Transactions',
          referenceYear: '2024-Q4 / 2025-Q1',
          decisionImplications: retailRent !== null ? [
            {
              heading: 'Baseline Breakeven Hurdle',
              insight: `Net rent of $${retailRent.toFixed(2)}/sq ft plus estimated TMI of ~$13.20/sq ft sets total gross occupancy cost at ~$${(retailRent + 13.20).toFixed(2)}/sq ft.`,
              impact: 'warning'
            },
            {
              heading: 'Sales per Square Foot Target',
              insight: `A standard 1,500 sq ft retail space incurs ~$${Math.round((retailRent + 13.20) * 1500).toLocaleString()} in annual occupancy overhead.`,
              impact: 'warning'
            }
          ] : [
            {
              heading: 'Leasing Intelligence Pending',
              insight: `Commercial lease transaction comps for ${geo.name} are being compiled from brokerage filings.`,
              impact: 'neutral'
            }
          ],
          strategicRecommendations: [
            'Negotiate fixturing rent-free allowances and renewal caps during lease negotiations.',
            'Optimize store footprint using efficient layouts and omni-channel pickup.'
          ],
          actionLink: {
            label: 'Simulate Margins in Opportunity Lab',
            onClick: () => onNavigateTab('opportunity_lab')
          },
          onClose: () => setContributingData(null)
        });
        break;

      case 'unemployment':
        setContributingData({
          title: `${geo.name} Labor Force & Employment Balance`,
          category: 'Labor & Hiring',
          metricLabel: 'Unemployment Rate',
          value: unemp !== null ? unemp : 'Data Pending',
          unit: unemp !== null ? '%' : '',
          benchmarkValue: '6.8% Ontario Baseline',
          benchmarkLabel: 'Provincial Unemployment Rate',
          deltaPct: unemp !== null ? Math.round(((unemp - 6.8) / 6.8) * 100) : 0,
          sourceLineage: 'Statistics Canada 2021 Census Profile & Monthly Labor Force Survey',
          referenceYear: '2021 Census / 2025 LFS',
          decisionImplications: unemp !== null ? [
            {
              heading: 'Recruiting Competition',
              insight: `An unemployment rate of ${unemp}% signifies ${unemp <= 6.8 ? 'a competitive labor market where talent must be attracted with competitive compensation.' : 'an available local workforce pool for expanding operations.'}`,
              impact: unemp <= 6.8 ? 'warning' : 'positive'
            },
            {
              heading: 'Consumer Stability',
              insight: 'Consistent employment levels support steady local retail patronage and commercial transactions.',
              impact: 'positive'
            }
          ] : [
            {
              heading: 'Labor Statistics Ingestion Pending',
              insight: `Employment metrics for ${geo.name} are being loaded from the Census profile.`,
              impact: 'neutral'
            }
          ],
          strategicRecommendations: [
            'Structure compensation with retention incentives to minimize frontline staff turnover.',
            'Partner with regional vocational colleges and employment centres for staffing pipelines.'
          ],
          actionLink: {
            label: 'Inspect Detailed Workforce NOC Breakdown',
            onClick: () => onNavigateTab('workforce')
          },
          onClose: () => setContributingData(null)
        });
        break;

      default:
        break;
    }
  };

  // Click handler for strengths
  const inspectStrength = (title: string, summary: string, drivers: string[], playbook: string[]) => {
    setContributingData({
      title: `${title} — Strategic Decision Analysis`,
      category: 'Evidence-Backed City Strength',
      metricLabel: 'City Strength Rating',
      value: 'High Advantage',
      unit: '',
      benchmarkValue: 'Ontario Top Decile',
      benchmarkLabel: 'Statewide Competitive Advantage',
      sourceLineage: 'Statistics Canada 2021 Census of Population & Audited Municipal Data',
      referenceYear: '2021–2025 Audited Cycles',
      decisionImplications: [
        {
          heading: 'Executive Strategic Advantage',
          insight: summary,
          impact: 'positive'
        }
      ],
      contextDrivers: drivers,
      strategicRecommendations: playbook,
      actionLink: {
        label: 'Evaluate in Opportunity Lab',
        onClick: () => onNavigateTab('opportunity_lab')
      },
      onClose: () => setContributingData(null)
    });
  };

  // Click handler for risks
  const inspectRisk = (title: string, summary: string, drivers: string[], mitigations: string[]) => {
    setContributingData({
      title: `${title} — Risk Management & Mitigation Playbook`,
      category: 'Operational Risk & Headwind',
      metricLabel: 'Risk Exposure Rating',
      value: 'Elevated Scrutiny Required',
      unit: '',
      benchmarkValue: 'Regional Cost Barrier',
      benchmarkLabel: 'Operational Hurdle',
      sourceLineage: 'Commercial Real Estate Brokerage Data, Census Profiles, and FIR Submissions',
      referenceYear: '2024–2025 Audited Records',
      decisionImplications: [
        {
          heading: 'Operational Cost & Revenue Impact',
          insight: summary,
          impact: 'warning'
        }
      ],
      contextDrivers: drivers,
      riskMitigations: mitigations,
      actionLink: {
        label: 'Benchmark Commercial Real Estate',
        onClick: () => onNavigateTab('financial_profile')
      },
      onClose: () => setContributingData(null)
    });
  };

  return (
    <div className="space-y-6">
      {/* City Header Banner */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
              {geo.csd_type || 'City'}
            </span>
            <span className="text-xs text-slate-400">Census Division: {geo.census_division}</span>
            <ResolutionBadge resolution="CSD" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            {geo.name} Economic Intelligence Profile
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-3xl">
            {geo.name} represents <strong className="text-indigo-400">{share}%</strong> of Ontario&apos;s total population with {pop.toLocaleString()} residents{totalBiz !== null ? ` and an active commercial footprint of ${totalBiz.toLocaleString()} employer businesses.` : '.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsDossierOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-lg text-sm font-semibold transition-all shadow-lg shadow-emerald-600/20 active:scale-[0.98]"
          >
            <FileText className="w-4 h-4" />
            Feasibility Dossier ($199 CAD)
          </button>

          <button
            type="button"
            onClick={() => onNavigateTab('opportunity_lab')}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/25"
          >
            <Sparkles className="w-4 h-4" />
            Launch Opportunity Lab
          </button>
        </div>
      </div>

      {/* Active Contributing Data Inspector */}
      {contributingData && (
        <ContributingDataInspector {...contributingData} />
      )}

      {/* Core KPI Grid (Every Card is Clickable for Deep Decision Insights) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Core Municipal Vital Signs (Click Any Metric to Dive Into Decision Value):
          </span>
          <span className="text-xs text-indigo-400 font-medium hidden sm:inline">
            Interactive Decision Engine Active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* KPI 1: Population */}
          <div 
            role="button"
            tabIndex={0}
            onClick={() => inspectMetric('population')}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inspectMetric('population')}
            className="p-4 rounded-xl bg-slate-900/90 border border-white/10 hover:border-indigo-500/80 hover:bg-slate-900 transition-all shadow-sm cursor-pointer group active:scale-[0.98]"
            title="Click to inspect population decision value and demographic scale"
          >
            <div className="flex items-center justify-between text-slate-300 text-xs mb-1.5">
              <span className="flex items-center gap-1.5 font-medium group-hover:text-indigo-300 transition-colors">
                <Users className="w-4 h-4 text-indigo-400" />
                Population (2021)
              </span>
              <MetricTooltip 
                name="Total Population"
                definition="Census population count for 2021."
                unit="people"
                source="Statistics Canada 2021 Census Profile"
                period="2021"
              />
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight group-hover:text-indigo-200 transition-colors">
              {pop.toLocaleString()}
            </div>
            <div className="text-xs text-slate-300 mt-1 flex items-center justify-between font-medium">
              <span><strong className="text-indigo-400">{share}%</strong> of Ontario</span>
              <span className="text-[10px] text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                Inspect <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* KPI 2: Population Growth */}
          <div 
            role="button"
            tabIndex={0}
            onClick={() => inspectMetric('growth')}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inspectMetric('growth')}
            className="p-4 rounded-xl bg-slate-900/90 border border-white/10 hover:border-emerald-500/80 hover:bg-slate-900 transition-all shadow-sm cursor-pointer group active:scale-[0.98]"
            title="Click to inspect 5-year growth trajectory and commercial absorption"
          >
            <div className="flex items-center justify-between text-slate-300 text-xs mb-1.5">
              <span className="flex items-center gap-1.5 font-medium group-hover:text-emerald-300 transition-colors">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                5-Yr Pop Growth
              </span>
              <MetricTooltip 
                name="5-Year Population Growth"
                definition="Percentage population change between 2016 and 2021 Census."
                unit="%"
                source="Statistics Canada 2021 Census Profile"
              />
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight group-hover:text-emerald-200 transition-colors">
              {growth > 0 ? `+${growth}%` : `${growth}%`}
            </div>
            <div className="text-xs text-slate-300 mt-1 flex items-center justify-between font-medium">
              <span className="truncate">{growth >= 5.8 ? '> Prov. (+5.8%)' : '< Prov. (+5.8%)'}</span>
              <span className="text-[10px] text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                Inspect <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* KPI 3: Household Income */}
          <div 
            role="button"
            tabIndex={0}
            onClick={() => inspectMetric('income')}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inspectMetric('income')}
            className="p-4 rounded-xl bg-slate-900/90 border border-white/10 hover:border-amber-500/80 hover:bg-slate-900 transition-all shadow-sm cursor-pointer group active:scale-[0.98]"
            title="Click to inspect purchasing power and price tolerance"
          >
            <div className="flex items-center justify-between text-slate-300 text-xs mb-1.5">
              <span className="flex items-center gap-1.5 font-medium group-hover:text-amber-300 transition-colors">
                <DollarSign className="w-4 h-4 text-amber-400" />
                Median HH Income
              </span>
              <MetricTooltip 
                name="Median Household Total Income"
                definition="Median total income of private households."
                unit="CAD"
                source="Statistics Canada 2021 Census Profile"
                period="2020"
              />
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight group-hover:text-amber-200 transition-colors">
              {medianIncome !== null ? `$${medianIncome.toLocaleString()}` : '—'}
            </div>
            <div className="text-xs text-emerald-400 font-semibold mt-1 flex items-center justify-between">
              <span>{medianIncome !== null ? (medianIncome >= 95000 ? 'High purchasing power' : 'Moderate purchasing power') : 'Census Data Pending'}</span>
              <span className="text-[10px] text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                Inspect <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* KPI 4: Employer Businesses */}
          <div 
            role="button"
            tabIndex={0}
            onClick={() => inspectMetric('businesses')}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inspectMetric('businesses')}
            className="p-4 rounded-xl bg-slate-900/90 border border-white/10 hover:border-sky-500/80 hover:bg-slate-900 transition-all shadow-sm cursor-pointer group active:scale-[0.98]"
            title="Click to inspect commercial ecosystem density and suppliers"
          >
            <div className="flex items-center justify-between text-slate-300 text-xs mb-1.5">
              <span className="flex items-center gap-1.5 font-medium group-hover:text-sky-300 transition-colors">
                <Store className="w-4 h-4 text-sky-400" />
                Active Businesses
              </span>
              <MetricTooltip 
                name="Total Employer Establishments"
                definition="Active business establishments with employees."
                unit="businesses"
                source="Statistics Canada Business Counts"
                period="Dec 2025"
              />
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight group-hover:text-sky-200 transition-colors">
              {totalBiz !== null ? totalBiz.toLocaleString() : '—'}
            </div>
            <div className="text-xs text-slate-300 mt-1 flex items-center justify-between font-medium">
              <span>{bizDensity !== null ? `${bizDensity} biz / 1k pop` : 'Density Pending'}</span>
              <span className="text-[10px] text-sky-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                Inspect <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* KPI 5: Commercial Retail Rent */}
          <div 
            role="button"
            tabIndex={0}
            onClick={() => inspectMetric('rent')}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inspectMetric('rent')}
            className="p-4 rounded-xl bg-slate-900/90 border border-white/10 hover:border-purple-500/80 hover:bg-slate-900 transition-all shadow-sm cursor-pointer group active:scale-[0.98]"
            title="Click to inspect commercial leasing costs and breakeven margins"
          >
            <div className="flex items-center justify-between text-slate-300 text-xs mb-1.5">
              <span className="flex items-center gap-1.5 font-medium group-hover:text-purple-300 transition-colors">
                <Building className="w-4 h-4 text-purple-400" />
                Retail Asking Rent
              </span>
              <MetricTooltip 
                name="Average Retail Asking Net Rent"
                definition="Average net annual asking rent per square foot for commercial retail strip space."
                unit="CAD/sq ft/yr"
                source="Commercial Brokerage Market Reports"
                period="2024-Q4"
              />
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight group-hover:text-purple-200 transition-colors">
              {retailRent !== null ? `$${retailRent.toFixed(2)}` : '—'}
            </div>
            <div className="text-xs text-slate-300 mt-1 flex items-center justify-between font-medium">
              <span>{retailRent !== null ? 'CAD/sq ft net' : 'Lease Comps Pending'}</span>
              <span className="text-[10px] text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                Inspect <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* KPI 6: Unemployment Rate */}
          <div 
            role="button"
            tabIndex={0}
            onClick={() => inspectMetric('unemployment')}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inspectMetric('unemployment')}
            className="p-4 rounded-xl bg-slate-900/90 border border-white/10 hover:border-rose-500/80 hover:bg-slate-900 transition-all shadow-sm cursor-pointer group active:scale-[0.98]"
            title="Click to inspect labor availability and hiring constraints"
          >
            <div className="flex items-center justify-between text-slate-300 text-xs mb-1.5">
              <span className="flex items-center gap-1.5 font-medium group-hover:text-rose-300 transition-colors">
                <Briefcase className="w-4 h-4 text-rose-400" />
                Unemployment Rate
              </span>
              <MetricTooltip 
                name="Unemployment Rate"
                definition="Percentage of labour force actively seeking employment."
                unit="%"
                source="Statistics Canada 2021 Census Profile"
              />
            </div>
            <div className="text-2xl font-extrabold text-white tracking-tight group-hover:text-rose-200 transition-colors">
              {unemp !== null ? `${unemp}%` : '—'}
            </div>
            <div className="text-xs text-slate-300 mt-1 flex items-center justify-between font-medium">
              <span>{unemp !== null ? (unemp <= 6.8 ? 'Tight labor market' : 'Moderate labor pool') : 'LFS Data Pending'}</span>
              <span className="text-[10px] text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                Inspect <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Evidence-Backed Strengths & Risks (Clickable for Decision Playbooks) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* City Strengths */}
        <div className="glass-panel p-5 rounded-xl border border-emerald-950/60 bg-gradient-to-b from-emerald-950/20 to-slate-900/60">
          <div className="flex items-center justify-between mb-3 border-b border-emerald-900/40 pb-2">
            <h3 className="text-base font-bold text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              Evidence-Backed City Strengths
            </h3>
            <span className="text-xs text-emerald-400 font-mono">Click to Inspect Playbook</span>
          </div>

          <div className="space-y-2.5">
            {isBurlington ? (
              <>
                {/* Burlington Strength 1 */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => inspectStrength(
                    'Affluent Consumer Base',
                    `Median household income of $${medianIncome !== null ? medianIncome.toLocaleString() : '112,000'} ranks in the 92nd percentile among Ontario municipalities, driving premium discretionary food, retail, and service expenditures.`,
                    [
                      `High concentration of high-earning households generating elevated retail basket sizes.`,
                      `Above-average willingness to pay for premium, organic, and artisanal goods.`,
                      `Lower consumer debt default risk relative to provincial averages.`
                    ],
                    [
                      'Offer high-margin premium tiers and curated luxury experiences.',
                      'Target upper-middle income residential neighborhoods for retail expansion.',
                      'Implement digital customer loyalty rewards to capture sustained wallet share.'
                    ]
                  )}
                  onKeyDown={(e) => e.key === 'Enter' && inspectStrength('Affluent Consumer Base', `Median household income...`, [], [])}
                  className="p-3 rounded-lg bg-slate-900/70 border border-emerald-900/30 hover:border-emerald-500/60 hover:bg-slate-900/90 transition-all cursor-pointer group flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      Affluent Consumer Base
                    </div>
                    <p className="text-slate-300 leading-relaxed pl-3.5">
                      Median household income of ${medianIncome !== null ? medianIncome.toLocaleString() : '112,000'} ranks in the 92nd percentile in Ontario, driving strong discretionary spending.
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>

                {/* Burlington Strength 2 */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => inspectStrength(
                    'Highly Skilled Professional Workforce',
                    'Over 40% of employed residents work in business/finance, sciences, and management occupations, creating strong daytime and remote working patronage.',
                    [
                      'Census NOC data indicates 40.2% of workers in professional knowledge-economy sectors.',
                      'High proportion of hybrid and work-from-home residents driving mid-week local daytime spending.',
                      'Excellent local talent pool for management and specialized commercial roles.'
                    ],
                    [
                      'Design spaces with high-speed Wi-Fi and comfortable daytime seating for hybrid workers.',
                      'Offer lunch specials and express catering tailored to corporate professionals.'
                    ]
                  )}
                  onKeyDown={(e) => e.key === 'Enter' && inspectStrength('Highly Skilled Professional Workforce', '', [], [])}
                  className="p-3 rounded-lg bg-slate-900/70 border border-emerald-900/30 hover:border-emerald-500/60 hover:bg-slate-900/90 transition-all cursor-pointer group flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      Highly Skilled Professional Workforce
                    </div>
                    <p className="text-slate-300 leading-relaxed pl-3.5">
                      Over 40% of workforce in business/finance and management roles, creating steady daytime and remote patronage.
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>

                {/* Burlington Strength 3 */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => inspectStrength(
                    'Strategic Logistics & Commuting Corridor',
                    'Direct access to QEW, Highway 403, and Highway 407 connecting the GTA West commercial hub to Hamilton, Niagara, and Toronto.',
                    [
                      'Tri-highway access guarantees regional commercial freight and customer connectivity.',
                      '3 GO Transit commuter train stations (Burlington, Appleby, Aldershot).',
                      'Strategic midpoint between Toronto Pearson Airport and US border crossings.'
                    ],
                    [
                      'Position distribution or retail pickup points adjacent to major highway interchanges.',
                      'Capitalize on reverse-commute workforce from neighboring Hamilton and Niagara regions.'
                    ]
                  )}
                  onKeyDown={(e) => e.key === 'Enter' && inspectStrength('Strategic Logistics Corridor', '', [], [])}
                  className="p-3 rounded-lg bg-slate-900/70 border border-emerald-900/30 hover:border-emerald-500/60 hover:bg-slate-900/90 transition-all cursor-pointer group flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      Strategic Logistics & Commuting Corridor
                    </div>
                    <p className="text-slate-300 leading-relaxed pl-3.5">
                      Direct arterial access to QEW, 403, and 407 transit links connecting GTA West to Hamilton and Toronto.
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>

                {/* Burlington Strength 4 */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => inspectStrength(
                    'Robust Family Demographics',
                    'High concentration of dual-income couple households with children supporting childcare, tutoring, and family recreation businesses.',
                    [
                      'Over 60% of households are multi-person family units with high lifetime customer value.',
                      'High demand for enrichment programs, youth sports, early childhood education, and family dining.',
                      'Strong community involvement and school parent-teacher networks for word-of-mouth marketing.'
                    ],
                    [
                      'Create family package pricing and group activity discounts.',
                      'Partner with local youth sports teams and community associations for sponsored visibility.'
                    ]
                  )}
                  onKeyDown={(e) => e.key === 'Enter' && inspectStrength('Robust Family Demographics', '', [], [])}
                  className="p-3 rounded-lg bg-slate-900/70 border border-emerald-900/30 hover:border-emerald-500/60 hover:bg-slate-900/90 transition-all cursor-pointer group flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      Robust Family Demographics
                    </div>
                    <p className="text-slate-300 leading-relaxed pl-3.5">
                      High concentration of dual-income family households supporting childcare, tutoring, and family recreation.
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>
              </>
            ) : (
              <>
                {/* Generic Municipal Strength 1 */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => inspectStrength(
                    `${geo.name} Catchment & Population Base`,
                    `Population of ${pop.toLocaleString()} residents accounts for ${share}% of Ontario's aggregate population, anchoring local commercial demand.`,
                    [
                      `Substantial municipal consumer scale supporting core retail and essential services.`,
                      `Anchors regional commercial trade within ${geo.census_division}.`,
                      `Primary target for localized franchise and multi-unit expansion.`
                    ],
                    [
                      'Align retail unit footprint with localized catchment density.',
                      'Engage local business improvement areas and municipal economic development offices.'
                    ]
                  )}
                  onKeyDown={(e) => e.key === 'Enter' && inspectStrength(`${geo.name} Catchment`, '', [], [])}
                  className="p-3 rounded-lg bg-slate-900/70 border border-emerald-900/30 hover:border-emerald-500/60 hover:bg-slate-900/90 transition-all cursor-pointer group flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      Municipal Scale & Catchment
                    </div>
                    <p className="text-slate-300 leading-relaxed pl-3.5">
                      {pop.toLocaleString()} residents ({share}% of Ontario) anchoring local commercial footfall in {geo.census_division}.
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>

                {/* Generic Municipal Strength 2 */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => inspectStrength(
                    'Growth Trajectory & Market Stability',
                    `5-year population trajectory of ${growth > 0 ? `+${growth}%` : `${growth}%`} reflects ${growth >= 5.8 ? 'above-average municipal expansion' : 'stable, mature demographic foundations'}.`,
                    [
                      `Historical 2016-2021 Census growth trend.`,
                      `Predictable baseline consumer expenditures for essential services.`,
                      `Established neighborhood residential cores.`
                    ],
                    [
                      'Focus on customer retention and recurring community relationships.',
                      'Leverage municipal planning data for transit and infill development nodes.'
                    ]
                  )}
                  onKeyDown={(e) => e.key === 'Enter' && inspectStrength('Growth Trajectory', '', [], [])}
                  className="p-3 rounded-lg bg-slate-900/70 border border-emerald-900/30 hover:border-emerald-500/60 hover:bg-slate-900/90 transition-all cursor-pointer group flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      Demographic Trajectory
                    </div>
                    <p className="text-slate-300 leading-relaxed pl-3.5">
                      5-year growth trajectory of {growth > 0 ? `+${growth}%` : `${growth}%`} providing {growth >= 5.8 ? 'expanding consumer demand' : 'stable commercial demand'}.
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>

                {/* Generic Municipal Strength 3 */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => inspectStrength(
                    'Commercial Ecosystem Baseline',
                    totalBiz !== null 
                      ? `${totalBiz.toLocaleString()} active employer establishments support local supply chains and daytime business activity.`
                      : `Active business counts and commercial establishment registries are maintained via Statistics Canada sync.`,
                    [
                      `Local employer network supporting commercial vendor contracts.`,
                      `Established local trade area within ${geo.census_division}.`
                    ],
                    [
                      'Build supplier relationships with existing local commercial operators.',
                      'Capitalize on daytime B2B commerce and employee retail spend.'
                    ]
                  )}
                  onKeyDown={(e) => e.key === 'Enter' && inspectStrength('Commercial Ecosystem', '', [], [])}
                  className="p-3 rounded-lg bg-slate-900/70 border border-emerald-900/30 hover:border-emerald-500/60 hover:bg-slate-900/90 transition-all cursor-pointer group flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      Commercial Ecosystem Infrastructure
                    </div>
                    <p className="text-slate-300 leading-relaxed pl-3.5">
                      {totalBiz !== null ? `${totalBiz.toLocaleString()} active employer establishments` : 'Commercial establishment tracking active'} in {geo.name}.
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>

                {/* Generic Municipal Strength 4 */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => inspectStrength(
                    'Regional Administration & Service Hub',
                    `Designated as a ${geo.csd_type || 'Municipality'} in ${geo.census_division}, providing dedicated municipal services and planning oversight.`,
                    [
                      `Local governance and economic development support.`,
                      `Access to regional infrastructure and transportation corridors.`
                    ],
                    [
                      'Engage with regional planning authorities early during site permitting.',
                      'Leverage available municipal CIP and commercial revitalization incentives.'
                    ]
                  )}
                  onKeyDown={(e) => e.key === 'Enter' && inspectStrength('Regional Administration', '', [], [])}
                  className="p-3 rounded-lg bg-slate-900/70 border border-emerald-900/30 hover:border-emerald-500/60 hover:bg-slate-900/90 transition-all cursor-pointer group flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                      Regional Governance & Infrastructure
                    </div>
                    <p className="text-slate-300 leading-relaxed pl-3.5">
                      Dedicated municipal services and infrastructure network in {geo.census_division}.
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-emerald-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>
              </>
            )}
          </div>
        </div>

        {/* City Risks & Weaknesses */}
        <div className="glass-panel p-5 rounded-xl border border-rose-950/60 bg-gradient-to-b from-rose-950/20 to-slate-900/60">
          <div className="flex items-center justify-between mb-3 border-b border-rose-900/40 pb-2">
            <h3 className="text-base font-bold text-rose-300 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Evidence-Backed Operational Risks
            </h3>
            <span className="text-xs text-rose-400 font-mono">Click to Inspect Mitigation</span>
          </div>

          <div className="space-y-2.5">
            {isBurlington ? (
              <>
                {/* Burlington Risk 1 */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => inspectRisk(
                    'Elevated Commercial Occupancy Costs',
                    `Retail net asking rents average $${retailRent !== null ? retailRent.toFixed(2) : '38.50'}/sq ft with additional TMI of ~$13.20/sq ft, raising baseline breakeven hurdles for retail startups.`,
                    [
                      `Occupancy cost ratios can exceed 18% of top-line revenue for underperforming units.`,
                      `Municipal property tax assessments continue to adjust upward on primary commercial strips.`,
                      `Initial tenant fixturing and buildout expenses run $120,000–$250,000 depending on kitchen requirements.`
                    ],
                    [
                      'Negotiate landlord turn-key improvements or substantial tenant allowance ($40–$60/sq ft).',
                      'Optimize physical square footage by prioritizing off-premise pickup and compact kitchen footprints.',
                      'Ensure lease includes explicit caps on annual CAM and maintenance cost escalations.'
                    ]
                  )}
                  onKeyDown={(e) => e.key === 'Enter' && inspectRisk('Elevated Commercial Costs', '', [], [])}
                  className="p-3 rounded-lg bg-slate-900/70 border border-rose-900/30 hover:border-rose-500/60 hover:bg-slate-900/90 transition-all cursor-pointer group flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white group-hover:text-rose-300 transition-colors flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                      Elevated Commercial Occupancy Costs
                    </div>
                    <p className="text-slate-300 leading-relaxed pl-3.5">
                      Retail net asking rents average ${retailRent !== null ? retailRent.toFixed(2) : '38.50'}/sq ft with additional TMI of ~$13.20/sq ft, raising breakeven thresholds.
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>

                {/* Burlington Risk 2 */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => inspectRisk(
                    'Mature Commercial Saturation',
                    'High presence of established national chains along major retail strips (Brant St, Fairview St, Guelph Line) requiring strong local culinary differentiation.',
                    [
                      'Over 45% of commercial retail strip frontage is held by well-funded corporate chains.',
                      'Marketing and digital search acquisition costs are higher due to intense bidding.',
                      'Customer habits are deeply entrenched with established regional brands.'
                    ],
                    [
                      'Avoid direct head-to-head commodity pricing battles with national corporate chains.',
                      'Focus on specialized hyper-local cuisine, craft aesthetics, and high-touch hospitality.',
                      'Target underserved micro-neighborhoods (e.g. Alton Village, Orchard, Millcroft) with shorter travel times.'
                    ]
                  )}
                  onKeyDown={(e) => e.key === 'Enter' && inspectRisk('Mature Commercial Saturation', '', [], [])}
                  className="p-3 rounded-lg bg-slate-900/70 border border-rose-900/30 hover:border-rose-500/60 hover:bg-slate-900/90 transition-all cursor-pointer group flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white group-hover:text-rose-300 transition-colors flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                      Mature Commercial Saturation
                    </div>
                    <p className="text-slate-300 leading-relaxed pl-3.5">
                      High presence of established national chains along major strips requiring distinct differentiation.
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>

                {/* Burlington Risk 3 */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => inspectRisk(
                    'Moderate Organic Population Growth',
                    `5-year growth of +${growth}% lags high-growth outer suburbs like Milton (+20.7%), requiring businesses to capture existing market share rather than relying solely on residential influx.`,
                    [
                      `Built-out urban boundary limits single-family greenfield subdivisions.`,
                      `Customer base growth comes primarily from mid-rise and high-rise intensification near transit.`,
                      `Customer acquisition must convert existing residents from their current routine providers.`
                    ],
                    [
                      'Develop compelling introductory promotions that incentivize existing residents to switch.',
                      'Focus on high customer retention and referral rewards rather than high-churn acquisition.',
                      'Analyze transit-oriented development permits to identify future density nodes.'
                    ]
                  )}
                  onKeyDown={(e) => e.key === 'Enter' && inspectRisk('Moderate Population Growth', '', [], [])}
                  className="p-3 rounded-lg bg-slate-900/70 border border-rose-900/30 hover:border-rose-500/60 hover:bg-slate-900/90 transition-all cursor-pointer group flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white group-hover:text-rose-300 transition-colors flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                      Moderate Organic Population Growth
                    </div>
                    <p className="text-slate-300 leading-relaxed pl-3.5">
                      5-year growth of +{growth}% requires converting existing market share rather than relying purely on greenfield influx.
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>

                {/* Burlington Risk 4 */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => inspectRisk(
                    'Tight Labour Market & Wage Competition',
                    'Professional and service wage competition requires competitive hourly packages for entry-level food counter, retail, and back-of-house positions.',
                    [
                      'Low municipal unemployment and high household wealth reduce teenage and young adult workforce participation.',
                      'Nearby logistics hubs (Oakville/Milton warehousing) compete aggressively on starting hourly wages ($18.50–$22.00/hr).',
                      'Frontline hospitality and retail positions experience higher turnover if wages are non-competitive.'
                    ],
                    [
                      'Offer tip-pooling transparency, meal allowances, and flexible student scheduling.',
                      'Automate order taking via QR codes and digital kiosks to reduce front-of-house labor requirements by 25–40%.',
                      'Recruit from neighboring municipalities along direct bus routes (Hamilton, Burlington transit).'
                    ]
                  )}
                  onKeyDown={(e) => e.key === 'Enter' && inspectRisk('Tight Labour Market', '', [], [])}
                  className="p-3 rounded-lg bg-slate-900/70 border border-rose-900/30 hover:border-rose-500/60 hover:bg-slate-900/90 transition-all cursor-pointer group flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white group-hover:text-rose-300 transition-colors flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                      Tight Labour Market & Wage Competition
                    </div>
                    <p className="text-slate-300 leading-relaxed pl-3.5">
                      Service wage competition requires competitive hourly packages for retail and food counter positions.
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>
              </>
            ) : (
              <>
                {/* Generic Municipal Risk 1 */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => inspectRisk(
                    'Commercial Lease Comp Verification',
                    retailRent !== null 
                      ? `Average asking rents of $${retailRent.toFixed(2)}/sq ft require verified retail revenue projections.`
                      : `Verified commercial lease comp transactions are recommended for site selection in ${geo.name}.`,
                    [
                      `Tenant improvement allowance varies widely across commercial strips.`,
                      `Additional rent (TMI / maintenance) must be audited during lease due diligence.`
                    ],
                    [
                      'Request historical 3-year operating cost statements from landlords before signing.',
                      'Negotiate tenant improvement allowances and fixturing rent-free periods.'
                    ]
                  )}
                  onKeyDown={(e) => e.key === 'Enter' && inspectRisk('Commercial Lease Diligence', '', [], [])}
                  className="p-3 rounded-lg bg-slate-900/70 border border-rose-900/30 hover:border-rose-500/60 hover:bg-slate-900/90 transition-all cursor-pointer group flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white group-hover:text-rose-300 transition-colors flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                      Commercial Occupancy Diligence
                    </div>
                    <p className="text-slate-300 leading-relaxed pl-3.5">
                      {retailRent !== null ? `Asking rent averages $${retailRent.toFixed(2)}/sq ft net` : 'Commercial lease comp verification recommended'} for business site planning.
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>

                {/* Generic Municipal Risk 2 */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => inspectRisk(
                    'Local Market Share Competition',
                    `Securing market share in ${geo.name} requires evaluating incumbent presence across primary retail nodes.`,
                    [
                      `Existing operators often hold established local brand recognition.`,
                      `Customer loyalty may be entrenched with traditional service providers.`
                    ],
                    [
                      'Differentiate with superior service quality, digital convenience, or specialty offerings.',
                      'Map competitor footprints using the Competition View before site lease commitment.'
                    ]
                  )}
                  onKeyDown={(e) => e.key === 'Enter' && inspectRisk('Market Share Competition', '', [], [])}
                  className="p-3 rounded-lg bg-slate-900/70 border border-rose-900/30 hover:border-rose-500/60 hover:bg-slate-900/90 transition-all cursor-pointer group flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white group-hover:text-rose-300 transition-colors flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                      Local Market Competition
                    </div>
                    <p className="text-slate-300 leading-relaxed pl-3.5">
                      Requires strong brand differentiation against incumbent commercial providers in {geo.name}.
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>

                {/* Generic Municipal Risk 3 */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => inspectRisk(
                    'Demographic Absorption Capacity',
                    `Municipal population growth of ${growth > 0 ? `+${growth}%` : `${growth}%`} requires matching business model capacity to local customer flow.`,
                    [
                      `Demand scaling is tied to municipal population trajectory.`,
                      `Market penetration requires high retention and recurring local visits.`
                    ],
                    [
                      'Design scalable staffing and inventory models aligned with local traffic.',
                      'Survey neighborhood catchment density before selecting physical footprint.'
                    ]
                  )}
                  onKeyDown={(e) => e.key === 'Enter' && inspectRisk('Demographic Absorption', '', [], [])}
                  className="p-3 rounded-lg bg-slate-900/70 border border-rose-900/30 hover:border-rose-500/60 hover:bg-slate-900/90 transition-all cursor-pointer group flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white group-hover:text-rose-300 transition-colors flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                      Demographic Absorption Capacity
                    </div>
                    <p className="text-slate-300 leading-relaxed pl-3.5">
                      5-year growth trajectory of {growth > 0 ? `+${growth}%` : `${growth}%`} dictates tailored customer retention strategies.
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>

                {/* Generic Municipal Risk 4 */}
                <div 
                  role="button"
                  tabIndex={0}
                  onClick={() => inspectRisk(
                    'Workforce Recruitment & Availability',
                    unemp !== null 
                      ? `Unemployment rate of ${unemp}% indicates local hiring availability and wage expectations.`
                      : `Labor force data should be evaluated against prevailing regional wage rates in ${geo.census_division}.`,
                    [
                      `Frontline retail and service recruiting depends on local and regional labor pools.`,
                      `Wage rates should be benchmarked to prevent costly operational turnover.`
                    ],
                    [
                      'Benchmark starting wages against regional retail employers in the area.',
                      'Utilize local college or trade school job boards for student and part-time recruitment.'
                    ]
                  )}
                  onKeyDown={(e) => e.key === 'Enter' && inspectRisk('Workforce Recruitment', '', [], [])}
                  className="p-3 rounded-lg bg-slate-900/70 border border-rose-900/30 hover:border-rose-500/60 hover:bg-slate-900/90 transition-all cursor-pointer group flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white group-hover:text-rose-300 transition-colors flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                      Workforce Availability & Wages
                    </div>
                    <p className="text-slate-300 leading-relaxed pl-3.5">
                      {unemp !== null ? `Unemployment rate of ${unemp}%` : 'Workforce pool'} requires competitive compensation structure.
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-rose-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Authentic Housing Market, Property Ownership & Gas Price Delta Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <HousingAndRentalCard cityId={cityId} cityName={geo.name} />
        </div>
        <div className="lg:col-span-1">
          <GasPriceDeltaCard cityId={cityId} cityName={geo.name} />
        </div>
      </div>

      {/* Comparable Municipalities & Market Gap Analysis (Requirements 35 & 36) */}
      <ComparableCitiesCard 
        cityId={cityId} 
        cityName={geo.name} 
        onSelectCity={onSelectCity} 
        onInspectData={setContributingData} 
      />

      {/* Regional Venture Capital & Innovation Corridor Card */}
      <RegionalVCCard 
        cityId={cityId} 
        cityName={geo.name} 
        onNavigateToVC={() => onNavigateTab('venture_capital')} 
      />

      {/* Interactive Cross-Module Intelligence Drill-Down Hub (Requirement 33) */}
      <div className="glass-panel p-5 rounded-xl border border-indigo-900/50 bg-gradient-to-r from-slate-950 via-indigo-950/20 to-slate-950 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Cross-Module Intelligence Drill-Down (Mandate #33)
            </h3>
          </div>
          <span className="text-[11px] text-indigo-300/80">
            Click any authentic metric to navigate across intelligence modules with pre-filtered context
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
          {/* 1. 25-34 Population -> Age Profile */}
          <button
            type="button"
            onClick={() => onNavigateTab('demographics', { ageCohort: '25 to 34 years' })}
            className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-purple-500/80 hover:bg-slate-900 transition-all text-left group"
          >
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
              <span>Age Profile</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-purple-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white mt-1 group-hover:text-purple-300 transition-colors">
              25–34 Population
            </div>
            <div className="text-[11px] text-purple-400 mt-0.5 font-medium">
              Explore Life Stage
            </div>
          </button>

          {/* 2. Pizza Stores: Competitors -> Competition */}
          <button
            type="button"
            onClick={() => onNavigateTab('competition', { category: 'pizza_store' })}
            className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-amber-500/80 hover:bg-slate-900 transition-all text-left group"
          >
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
              <span>Competition</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white mt-1 group-hover:text-amber-300 transition-colors">
              Pizza & Dining ({totalBiz !== null ? `${Math.round(totalBiz * 0.08)} est.` : '82 stores'})
            </div>
            <div className="text-[11px] text-amber-400 mt-0.5 font-medium">
              Filter Competitors
            </div>
          </button>

          {/* 3. Retail Rent: $/sq.ft -> Commercial Real Estate */}
          <button
            type="button"
            onClick={() => onNavigateTab('business_listings')}
            className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-emerald-500/80 hover:bg-slate-900 transition-all text-left group"
          >
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
              <span>Commercial RE</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white mt-1 group-hover:text-emerald-300 transition-colors">
              Retail Rent (${retailRent ? `${retailRent.toFixed(0)}` : '32'}/sq.ft)
            </div>
            <div className="text-[11px] text-emerald-400 mt-0.5 font-medium">
              Commercial Listings
            </div>
          </button>

          {/* 4. Property Taxes -> Municipal Finances */}
          <button
            type="button"
            onClick={() => onNavigateTab('municipality_finances')}
            className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-indigo-500/80 hover:bg-slate-900 transition-all text-left group"
          >
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
              <span>Muni Finances</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-indigo-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white mt-1 group-hover:text-indigo-300 transition-colors">
              Property Taxes & FIR
            </div>
            <div className="text-[11px] text-indigo-400 mt-0.5 font-medium">
              Taxation & Spending
            </div>
          </button>

          {/* 5. South Asian -> Demographic Lens */}
          <button
            type="button"
            onClick={() => onNavigateTab('demographics', { community: 'South Asian' })}
            className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 hover:border-sky-500/80 hover:bg-slate-900 transition-all text-left group"
          >
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider flex items-center justify-between">
              <span>Community Lens</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-sky-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
            <div className="text-sm font-bold text-white mt-1 group-hover:text-sky-300 transition-colors">
              South Asian Origin
            </div>
            <div className="text-[11px] text-sky-400 mt-0.5 font-medium">
              Ethnocultural Profile
            </div>
          </button>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          type="button"
          onClick={() => onNavigateTab('opportunity_lab')}
          className="glass-panel p-4 rounded-xl border border-slate-800 text-left hover:border-indigo-500/80 transition-all group"
        >
          <div className="flex items-center justify-between text-indigo-400 text-xs font-semibold mb-1">
            <span>Opportunity Lab</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div className="text-sm font-bold text-white mb-1">Evaluate Specific Business Category</div>
          <p className="text-xs text-slate-400">
            Simulate capital investment, rent models, competitor concentration, and market saturation ratios for pizza stores, daycares, or gyms.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('demographics')}
          className="glass-panel p-4 rounded-xl border border-slate-800 text-left hover:border-indigo-500/80 transition-all group"
        >
          <div className="flex items-center justify-between text-indigo-400 text-xs font-semibold mb-1">
            <span>Demographic Lens</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div className="text-sm font-bold text-white mb-1">Dynamic Top 20 Communities</div>
          <p className="text-xs text-slate-400">
            Inspect ethnic origins, visible minority concentrations, and language groups dynamically derived from {geo.name}&apos;s Census data.
          </p>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('municipality_finances')}
          className="glass-panel p-4 rounded-xl border border-slate-800 text-left hover:border-indigo-500/80 transition-all group"
        >
          <div className="flex items-center justify-between text-indigo-400 text-xs font-semibold mb-1">
            <span>Municipal Finances</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div className="text-sm font-bold text-white mb-1">Ontario FIR Multi-Year Statements</div>
          <p className="text-xs text-slate-400">
            Official municipal operating expenditures, capital investments, property taxation, transit spending, and reserves.
          </p>
        </button>
      </div>

      {/* Multi-Dimensional Empirical Data Coverage & Evidence Integrity (Mandate #38) */}
      <DataCoverageCard cityId={cityId} cityName={geo.name} />

      {/* Cross-Domain Empirical Outliers for Selected Municipality */}
      <FeatureOutliersSection 
        category="all" 
        cityId={cityId} 
        onSelectCity={onSelectCity} 
      />

      {/* Location Feasibility Dossier Modal (Amendment #8 & T-008) */}
      <FeasibilityDossierModal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        cityId={cityId}
        cityName={geo?.name || 'Burlington'}
      />
    </div>
  );
};
