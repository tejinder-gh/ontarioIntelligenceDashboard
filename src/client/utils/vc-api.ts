export interface VCSummaryData {
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

export interface VCFirm {
  id: string;
  name: string;
  legal_name: string | null;
  website: string | null;
  linkedin_url: string | null;
  contact_email: string | null;
  office_address: string | null;
  description: string | null;
  firm_type: string;
  status: string;
  founded_year: number | null;
  aum_amount: number | null;
  aum_currency: string | null;
  typical_check_min: number | null;
  typical_check_max: number | null;
  typical_check_currency: string | null;
  reserves_for_follow_on: boolean | null;
  board_seat_preference: boolean | null;
  city: string | null;
  state_province: string | null;
  country: string | null;
  country_code: string | null;
  funds?: Array<{
    id: string;
    name: string;
    vintageYear: number | null;
    status: string;
    committedCapital: number | null;
    targetSize: number | null;
    currency: string;
  }>;
  partners?: Array<{
    id: string;
    name: string;
    title: string | null;
    seniority: string | null;
    linkedinUrl: string | null;
    publicEmail?: string | null;
  }>;
  theses?: Array<{
    id: string;
    summary: string;
    preferredCheckMin?: number | null;
    preferredCheckMax?: number | null;
    preferredCheckCurrency?: string | null;
    evaluationCriteria?: string[];
    requiredTraction?: string[];
    avoids?: string[];
    themes?: string[];
    businessModels?: string[];
    thesisSourceUrl?: string | null;
  }>;
  recent_investments?: Array<{
    companyId: string;
    companyName: string;
    website?: string | null;
    stage?: string | null;
    amountRaised?: number | null;
    currency?: string | null;
    valuation?: number | null;
    announcedDate?: string | null;
    role?: string | null;
    city?: string | null;
  }>;
  stages?: string[];
  sectors?: string[];
}

export interface VCDeal {
  round_id: string;
  stage: string;
  round_type: string;
  announced_date: string | null;
  amount_raised: number | null;
  currency: string;
  post_money_valuation: number | null;
  total_investor_count: number | null;
  company_id: string;
  company_name: string;
  company_website: string | null;
  founded_year: number | null;
  company_status: string;
  city: string | null;
  state_province: string | null;
  country: string | null;
  country_code: string | null;
  investors?: Array<{
    investmentId: string;
    firmId: string;
    firmName: string;
    role: string;
    boardSeat: boolean | null;
  }>;
  sectors?: string[];
}

export interface VCSector {
  id: string;
  name: string;
  level: number;
  parent_sector_name: string | null;
  aliases: string[] | null;
  firm_count: number;
  company_count: number;
}

export interface InvestorFitMatch {
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

export interface VCSignal {
  id: string;
  firm_name: string;
  signal_type: string;
  observed_at: string;
  description: string;
  signal_strength: number | null;
}

export interface VCSyndicationGraph {
  relationships: Array<{
    id: string;
    relationship_type: string;
    strength: number;
    from_name: string;
    to_name: string;
    first_observed: string | null;
    last_observed: string | null;
  }>;
  commitments: Array<{
    id: string;
    lp_name: string;
    lp_type: string;
    lp_country: string;
    firm_name: string;
    fund_name: string;
    commitment_amount: number;
    currency: string;
    commitment_date: string | null;
  }>;
  exits: Array<{
    id: string;
    company_name: string;
    exit_type: string;
    completion_date: string;
    ticker: string | null;
    exchange: string | null;
    market_cap_at_ipo: number | null;
    currency: string;
  }>;
}

export async function fetchVCSummary(): Promise<VCSummaryData> {
  const res = await fetch('/api/vc/summary');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch VC summary');
  return json.data;
}

export async function fetchVCFirms(filters: { stage?: string; sector?: string; country?: string; query?: string } = {}): Promise<VCFirm[]> {
  const params = new URLSearchParams();
  if (filters.stage) params.set('stage', filters.stage);
  if (filters.sector) params.set('sector', filters.sector);
  if (filters.country) params.set('country', filters.country);
  if (filters.query) params.set('query', filters.query);

  const res = await fetch(`/api/vc/firms?${params.toString()}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch firms');
  return json.data;
}

export async function fetchVCDeals(filters: { stage?: string; country?: string } = {}): Promise<VCDeal[]> {
  const params = new URLSearchParams();
  if (filters.stage) params.set('stage', filters.stage);
  if (filters.country) params.set('country', filters.country);

  const res = await fetch(`/api/vc/deals?${params.toString()}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch deals');
  return json.data;
}

export async function fetchVCSectors(): Promise<VCSector[]> {
  const res = await fetch('/api/vc/sectors');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch sectors');
  return json.data;
}

export async function fetchVCSignals(): Promise<VCSignal[]> {
  const res = await fetch('/api/vc/signals');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch signals');
  return json.data;
}

export async function fetchVCSyndication(): Promise<VCSyndicationGraph> {
  const res = await fetch('/api/vc/syndication');
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch syndication graph');
  return json.data;
}

export async function calculateInvestorFit(input: {
  sector?: string;
  stage?: string;
  targetCheckSize?: number;
  countryCode?: string;
  stateProvince?: string;
  city?: string;
}): Promise<InvestorFitMatch[]> {
  const res = await fetch('/api/vc/fit-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to calculate fit score');
  return json.allMatches || json.topMatches || [];
}

export async function fetchRegionalVC(city: string) {
  const res = await fetch(`/api/vc/regional/${encodeURIComponent(city)}`);
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Failed to fetch regional VC summary');
  return json.data;
}
