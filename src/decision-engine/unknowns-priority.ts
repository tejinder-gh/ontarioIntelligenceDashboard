import type {
  FunnelCandidate,
  MaterialUnknown,
} from './types.js';

export function prioritizeMaterialUnknowns(
  candidate: FunnelCandidate,
  categoryId: string = 'pizza_store'
): MaterialUnknown[] {
  const norm = categoryId.toLowerCase();

  if (norm.includes('logistics') || norm.includes('shipping') || norm.includes('warehouse') || norm.includes('freight')) {
    return [
      {
        rank: 1,
        title: 'Municipal Zoning & Permitted Industrial Courier Depot Use',
        category: 'ZONING',
        potentialImpact: 'FATAL: If site lacks E1/E2 employment industrial zoning allowing freight handling, cross-docking, and courier vehicles, operations will face immediate municipal stop-work orders.',
        authoritativeSource: `City of ${candidate.city} Planning & Building Department (Employment Area Zoning By-law)`,
        retrievalStatus: 'ONLINE_VERIFIED',
        fieldCheckProtocol: `Request Official Zoning Compliance Certificate confirming NAICS 484110 / courier distribution is permitted as-of-right.`
      },
      {
        rank: 2,
        title: 'Overhead Doors & Clear Interior Stacking Height',
        category: 'BUILDING_SERVICES',
        potentialImpact: 'OPERATIONAL CAPACITY LIMIT: Lack of 12-ft+ overhead doors or <18-ft clear ceiling height prevents pallet racking and mechanized straight-truck unloading.',
        authoritativeSource: 'Landlord Architectural As-Built Drawings & Brokerage Specification Sheet',
        retrievalStatus: 'FIELD_INSPECTION_REQUIRED',
        fieldCheckProtocol: 'Physical laser measurement of overhead door clearances, dock-leveler condition, and underside of joist ceiling height.'
      },
      {
        rank: 3,
        title: 'Heavy 3-Phase Electrical (400A) & Concrete Slab Load Rating',
        category: 'BUILDING_SERVICES',
        potentialImpact: 'HIGH COST DRIVER: Upgrading electrical service for automated sortation belts or fleet EV charging costs $30,000–$75,000 if utility transformer capacity is constrained.',
        authoritativeSource: 'Hydro Distribution Utility & Structural Engineering Slab Certification',
        retrievalStatus: 'LOCAL_ARCHIVE_NEEDED',
        fieldCheckProtocol: 'Inspect electrical distribution panel and request slab design verification for minimum 250 lbs/sqft load capacity.'
      },
      {
        rank: 4,
        title: 'Heavy Truck Arterial Ingress & Turning Radiuses',
        category: 'CATCHMENT_ACCESS',
        potentialImpact: 'ACCESS RISK: Municipal heavy-truck route restrictions or tight yard turning radius can prevent 24-ft straight trucks and courier vans from operating legally.',
        authoritativeSource: `City of ${candidate.city} Transportation Services By-law & Yard Turning Template`,
        retrievalStatus: 'FIELD_INSPECTION_REQUIRED',
        fieldCheckProtocol: 'Verify municipal designated truck routes from nearest 400-series highway exit and simulate WB-20 truck turning radius in parking apron.'
      }
    ];
  }

  if (norm.includes('daycare') || norm.includes('childcare') || norm.includes('preschool')) {
    return [
      {
        rank: 1,
        title: 'Ministry of Education Day Nursery License & OBC Group B Div 2',
        category: 'ZONING',
        potentialImpact: 'FATAL: Failure to obtain provincial licensing approval prohibits commercial operation as a registered child care facility.',
        authoritativeSource: 'Ontario Ministry of Education & Municipal Building Inspection Division',
        retrievalStatus: 'ONLINE_VERIFIED',
        fieldCheckProtocol: 'Submit preliminary architectural floor plan to Ministry of Education program advisor and municipal chief building official.'
      },
      {
        rank: 2,
        title: 'Dedicated Outdoor Fenced Play Space (60 sqft/child)',
        category: 'BUILDING_SERVICES',
        potentialImpact: 'CAPACITY CAP: Child Care and Early Years Act strictly mandates 60 sqft of contiguous outdoor play space per licensed child; insufficient yard caps enrolment.',
        authoritativeSource: 'Site Boundary Survey & Land Titles Plan',
        retrievalStatus: 'FIELD_INSPECTION_REQUIRED',
        fieldCheckProtocol: 'Perform on-site perimeter survey of outdoor green area to confirm compliant sun exposure, drainage, and security fencing.'
      },
      {
        rank: 3,
        title: 'Direct Ground-Level Barrier-Free Egress & Fire Separation',
        category: 'BUILDING_SERVICES',
        potentialImpact: 'EXPENSIVE RETROFIT: Daycare spaces require direct ground egress without stairs for infant rooms and minimum 1-hour fire separations.',
        authoritativeSource: 'Building Code Compliance Life Safety Review',
        retrievalStatus: 'LOCAL_ARCHIVE_NEEDED',
        fieldCheckProtocol: 'Engage code consultant to verify door widths, panic hardware, and emergency exit routes.'
      },
      {
        rank: 4,
        title: 'Commuter Morning Drop-Off Circulation & Dedicated Stalls',
        category: 'CATCHMENT_ACCESS',
        potentialImpact: 'PARENT ATTRITION: Unsafe parent vehicular circulation or lack of dedicated 10-minute drop-off bays causes severe safety hazards.',
        authoritativeSource: 'Municipal Development Engineering & Parking Study',
        retrievalStatus: 'FIELD_INSPECTION_REQUIRED',
        fieldCheckProtocol: 'Observe morning 7:30 AM–8:45 AM traffic flow to ensure safe pedestrian separation from vehicle lanes.'
      }
    ];
  }

  // Food Service / Pizza Store default
  return [
    {
      rank: 1,
      title: 'Municipal Zoning & Permitted Commercial Eating Establishment Use',
      category: 'ZONING',
      potentialImpact: 'FATAL: If commercial unit lacks permitted class for commercial ventilation exhaust, legal baking and cooking cannot occur without a 6–9 month Committee of Adjustment variance.',
      authoritativeSource: `City of ${candidate.city} Planning & Building Department (Zoning By-law Schedule & Land Use By-law)`,
      retrievalStatus: 'ONLINE_VERIFIED',
      fieldCheckProtocol: `Request Official Zoning Compliance Letter from City of ${candidate.city} planning department explicitly confirming NAICS 722513 / commercial food service permitted as-of-right.`
    },
    {
      rank: 2,
      title: 'Type 1 Grease Exhaust & Gas/Electrical Mechanical Capacity',
      category: 'BUILDING_SERVICES',
      potentialImpact: 'CRITICAL COST DRIVER: Installing a rooftop grease duct where no penetration or chase exists costs $35,000–$65,000, immediately consuming initial working capital buffer.',
      authoritativeSource: 'Landlord Mechanical As-Built Drawings & Local Hydro Service Records',
      retrievalStatus: 'FIELD_INSPECTION_REQUIRED',
      fieldCheckProtocol: 'Physical inspection with licensed HVAC contractor & master electrician: confirm 200A 3-phase service panel and natural gas supply before signing unconditional lease.'
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
      title: 'Curbside Egress & Peak Customer / Courier Parking Access',
      category: 'CATCHMENT_ACCESS',
      potentialImpact: 'LOGISTICAL BOTTLENECK: If customers or delivery drivers cannot easily park and retrieve orders within 90 seconds, dispatch times double and ratings plummet.',
      authoritativeSource: 'Municipal Traffic Operations & On-Site Parking Stall Allocation Map',
      retrievalStatus: 'FIELD_INSPECTION_REQUIRED',
      fieldCheckProtocol: 'Conduct peak-hour physical reconnaissance: measure curb availability, turning radiuses from main arterial, and designated pickup stalls.'
    }
  ];
}
