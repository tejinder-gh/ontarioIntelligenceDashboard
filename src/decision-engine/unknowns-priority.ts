import type {
  FunnelCandidate,
  MaterialUnknown,
} from './types.js';

export function prioritizeMaterialUnknowns(candidate: FunnelCandidate): MaterialUnknown[] {
  return [
    {
      rank: 1,
      title: 'Municipal Zoning & Permitted Food Service Use',
      category: 'ZONING',
      potentialImpact: 'FATAL: If commercial unit lacks permitted class for commercial ventilation exhaust, legal pizza baking cannot occur without a 6–9 month Committee of Adjustment variance.',
      authoritativeSource: `City of ${candidate.city} Planning & Building Department (Zoning By-law Schedule & Land Use By-law)`,
      retrievalStatus: 'ONLINE_VERIFIED',
      fieldCheckProtocol: `Request Official Zoning Compliance Letter from City of ${candidate.city} planning department explicitly confirming NAICS 722511 'Eating Establishment / Takeout Food Service' permitted as of right.`
    },
    {
      rank: 2,
      title: 'Type 1 Grease Exhaust & Gas/Electrical Mechanical Capacity',
      category: 'BUILDING_SERVICES',
      potentialImpact: 'CRITICAL COST DRIVER: Installing a rooftop grease duct where no penetration or chase exists costs $35,000–$65,000, immediately consuming initial working capital buffer.',
      authoritativeSource: 'Landlord Mechanical As-Built Drawings & Enbridge / Local Hydro Service Records',
      retrievalStatus: 'FIELD_INSPECTION_REQUIRED',
      fieldCheckProtocol: 'Physical inspection with licensed HVAC & master electrician: confirm 200A–400A 3-phase service panel and 1.5"+ gas line supply before signing unconditional lease.'
    },
    {
      rank: 3,
      title: 'Commercial Lease CAM / TMI Escalation & Personal Guarantee',
      category: 'LEASE_TERMS',
      potentialImpact: 'OPERATING PROFIT DRAG: Uncapped municipal tax or building operating expenses can add $800–$1,500/month above initial quoted Net Rent.',
      authoritativeSource: 'Commercial Offer to Lease / Standard Landlord Head Lease Document',
      retrievalStatus: 'LOCAL_ARCHIVE_NEEDED',
      fieldCheckProtocol: 'Review past 3 years of reconciled CAM/TMI statements; insist on lease clause capping annual controllable CAM escalations at 5% and limiting personal guarantee burn-off to 24 months.'
    },
    {
      rank: 4,
      title: 'Delivery Driver Curbside Egress & Peak Parking Ingress',
      category: 'CATCHMENT_ACCESS',
      potentialImpact: 'LOGISTICAL BOTTLENECK: If delivery drivers cannot easily park and retrieve orders within 90 seconds, dispatch times double and third-party delivery ratings plummet.',
      authoritativeSource: 'Municipal Traffic Operations & On-Site Parking Stall Allocation Map',
      retrievalStatus: 'FIELD_INSPECTION_REQUIRED',
      fieldCheckProtocol: 'Conduct peak-hour physical reconnaissance (Friday 5:30 PM–7:30 PM): measure curb availability, turning radiuses from main arterial, and designated 15-minute pickup stalls.'
    }
  ];
}
