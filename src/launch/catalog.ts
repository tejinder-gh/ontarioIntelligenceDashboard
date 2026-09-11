import type { LaunchCatalogCheck, LaunchCategory, LaunchCheckState, LaunchSource } from './contracts.js';

const source = (title: string, publisher: string, url: string): LaunchSource => ({
  title, publisher, url, verifiedAt: null,
});
const ontario = source('Ontario business guidance', 'Government of Ontario', 'https://www.ontario.ca/page/business-and-economy');
const canada = source('Starting a business', 'Government of Canada', 'https://www.canada.ca/en/services/business/start.html');
const cra = source('Business taxes', 'Canada Revenue Agency', 'https://www.canada.ca/en/services/taxes/businesses.html');
const bizpal = source('BizPaL permit and licence discovery', 'Government of Canada / BizPaL', 'https://bizpal.ca/');

function check(
  id: string, title: string, category: LaunchCategory, guidance: string,
  applicabilityGuidance: string, sources: readonly LaunchSource[], conditional = false,
): LaunchCatalogCheck {
  return {
    id, title, category, label: conditional ? 'candidate' : 'verify', guidance,
    applicabilityGuidance, defaultApplicability: conditional ? 'unknown' : 'applicable',
    evidenceRequired: true, sources,
  };
}

/** Ontario-wide review prompts, not a complete or currently verified legal checklist.
 * Municipal and industry requirements need a user-specific authority lookup. */
export const LAUNCH_CATALOG: readonly LaunchCatalogCheck[] = [
  check('on.business.structure', 'Business structure and ownership review', 'business_structure',
    'Review the proposed structure and who can commit the business; record a public guidance reference.',
    'Review for every launch.', [canada, ontario]),
  check('on.registration.business', 'Business registration and name review', 'registration',
    'Determine which name, entity and registration steps apply; record a reference without any registration number.',
    'Review for every launch; determine requirements for the chosen structure.', [source('Ontario Business Registry', 'Government of Ontario', 'https://www.ontario.ca/page/ontario-business-registry')]),
  check('on.municipal.permits', 'Municipal permits and business licensing', 'municipal',
    'Use the municipality and activity to discover candidate permits; confirm with the responsible municipality.',
    'Depends on municipality, business activity and operating location.', [bizpal, ontario], true),
  check('on.municipal.premises', 'Zoning, premises and home business', 'municipal',
    'Confirm permitted use and any building, signage, fire or home business review before committing to premises.',
    'Depends on the location and how the premises will be used.', [bizpal, ontario], true),
  check('on.industry.licensing', 'Industry and professional licensing', 'industry',
    'Identify the sector regulator and check candidate licences, qualifications and operating conditions.',
    'Depends on the products, services and regulated activities.', [bizpal, ontario], true),
  check('on.industry.product_safety', 'Product, food and environmental review', 'industry',
    'Identify applicable product, food, import or environmental authorities and their current guidance.',
    'Depends on goods handled, imports, food service and environmental activities.', [canada, bizpal], true),
  check('on.tax.accounts', 'Business tax account review', 'tax',
    'Determine applicable tax accounts and filing responsibilities; store only public references, never account identifiers.',
    'Review for every launch with the chosen structure and activities.', [cra]),
  check('on.tax.sales', 'GST/HST and sales tax applicability', 'tax',
    'Review current registration and collection rules with CRA or an adviser; do not store revenue or tax amounts.',
    'Depends on supplies, activities and applicable registration rules.', [cra], true),
  check('on.employer.payroll', 'Employer and payroll setup', 'employer',
    'Review payroll registration and employer obligations before hiring; do not record employee information.',
    'Applies when the business will have employees or other relevant payroll obligations.', [cra], true),
  check('on.employer.standards', 'Employment standards and workplace safety', 'employer',
    'Review applicable employment standards, occupational safety and accessibility guidance.',
    'Depends on workforce, workplace and activity.', [source('Employment standards', 'Government of Ontario', 'https://www.ontario.ca/document/your-guide-employment-standards-act-0'), ontario], true),
  check('on.employer.wsib', 'WSIB coverage review', 'employer',
    'Confirm whether workplace insurance registration or coverage applies directly with WSIB.',
    'Depends on the business activity and workforce; do not assume an exemption.', [source('WSIB business guidance', 'Workplace Safety and Insurance Board', 'https://www.wsib.ca/en/businesses')], true),
  check('on.insurance.coverage', 'Insurance and contractual coverage', 'insurance',
    'Review liability and any required coverage with a qualified broker and relevant regulator or contracting party.',
    'Review for every launch; coverage needs depend on activities and commitments.', [source('Insurance consumer guidance', 'Financial Services Regulatory Authority of Ontario', 'https://www.fsrao.ca/consumers')]),
  check('on.privacy.customer_data', 'Privacy, customer data and communications', 'privacy',
    'Review data collection, retention, consent and commercial messaging obligations before collecting customer data.',
    'Depends on personal information processing and commercial messaging.', [source('Privacy for businesses', 'Office of the Privacy Commissioner of Canada', 'https://www.priv.gc.ca/en/privacy-topics/privacy-laws-in-canada/the-personal-information-protection-and-electronic-documents-act-pipeda/'), source('Anti-spam guidance', 'Canadian Radio-television and Telecommunications Commission', 'https://crtc.gc.ca/eng/internet/anti.htm')], true),
  check('on.operations.records', 'Records and operating responsibilities', 'operations',
    'Identify who maintains required business records and reviews ongoing obligations; keep this workspace metadata-only.',
    'Review for every launch.', [canada, cra]),
];

export function createLaunchChecks(catalog: readonly LaunchCatalogCheck[] = LAUNCH_CATALOG): LaunchCheckState[] {
  return catalog.map(item => ({
    id: item.id, applicability: item.defaultApplicability,
    completion: 'incomplete', blocker: 'none', evidenceIds: [],
  }));
}
