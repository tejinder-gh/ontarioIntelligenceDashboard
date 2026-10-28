/**
 * Text, Address, and Identifier Normalization Utility
 * High-precision normalization for Canadian business entity resolution.
 */

export function normalizeBusinessName(name: string): string {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^\w\s]/g, ' ')       // remove punctuation
    .replace(/\b(inc|incorporated|ltd|limited|corp|corporation|llc|co|company|holdings|services)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeAddress(address: string | null | undefined): string {
  if (!address) return '';
  return address
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\bstreet\b/g, 'st')
    .replace(/\bavenue\b/g, 'ave')
    .replace(/\bboulevard\b/g, 'blvd')
    .replace(/\broad\b/g, 'rd')
    .replace(/\bdrive\b/g, 'dr')
    .replace(/\bcourt\b/g, 'ct')
    .replace(/\bplace\b/g, 'pl')
    .replace(/\bhighway\b/g, 'hwy')
    .replace(/\bconcession\b/g, 'conc')
    .replace(/\bsuite\b/g, 'ste')
    .replace(/\bunit\b/g, '#')
    .replace(/\bapartment\b/g, 'apt')
    .replace(/[^\w\s#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizePostalCode(postalCode: string | null | undefined): string {
  if (!postalCode) return '';
  return postalCode.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function normalizePhone(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  return digits.length >= 7 ? digits : null;
}

export function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    const hostname = new URL(cleanUrl).hostname.toLowerCase();
    return hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Calculates geographic distance in meters between two lat/lon points (Haversine formula).
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
