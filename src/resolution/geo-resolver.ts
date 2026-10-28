import { sql } from '../db/index.js';

let cachedGeoMap: Map<string, string> | null = null;

export async function resolveGeographyId(city: string, province: string = 'ON'): Promise<string> {
  if (!cachedGeoMap) {
    cachedGeoMap = new Map<string, string>();
    try {
      const rows = await sql<{ id: string; name: string }[]>`
        SELECT id, name FROM geographies WHERE is_active = true;
      `;
      for (const row of rows) {
        cachedGeoMap.set(row.name.toLowerCase().trim(), row.id);
      }

      // Also map common municipal aliases
      const aliases = await sql<{ alias_name: string; geography_id: string }[]>`
        SELECT alias_name, geography_id FROM geographic_aliases;
      `;
      for (const alias of aliases) {
        cachedGeoMap.set(alias.alias_name.toLowerCase().trim(), alias.geography_id);
      }
    } catch (err) {
      console.warn('[GeoResolver] Fallback to direct mapping:', err);
    }
  }

  const normalizedCity = city.toLowerCase().trim();
  const directMatch = cachedGeoMap?.get(normalizedCity);
  if (directMatch) return directMatch;

  // Specific common municipal fallbacks for Halton
  if (normalizedCity.includes('burlington')) return 'CSD_burlington';
  if (normalizedCity.includes('oakville')) return 'CSD_oakville';
  if (normalizedCity.includes('milton')) return 'CSD_milton';
  if (normalizedCity.includes('halton hills') || normalizedCity.includes('georgetown') || normalizedCity.includes('acton')) {
    return 'CSD_halton_hills';
  }
  if (normalizedCity.includes('toronto')) return 'CSD_toronto';
  if (normalizedCity.includes('mississauga')) return 'CSD_mississauga';
  if (normalizedCity.includes('hamilton')) return 'CSD_hamilton';

  return 'PR_35'; // Default to Ontario provincial benchmark
}
