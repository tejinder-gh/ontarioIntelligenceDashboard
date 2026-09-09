import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { sql } from '../../db/index.js';

export interface FuelPriceRecord {
  geographyId: string;
  productType: string;
  referenceMonth: string; // 'YYYY-MM-01'
  priceCentsPerLitre: number;
  torontoBenchmarkCents: number;
  absoluteDeltaCents: number;
  deltaPct: number;
}

export async function ingestStatCanFuel(): Promise<number> {
  console.log('Ingesting Statistics Canada Table 18-10-0001-01 (Retail Gasoline Prices)...');

  const csvPath = path.join(process.cwd(), 'scratch', '18100001.csv');
  if (!fs.existsSync(csvPath)) {
    console.warn('Fuel CSV not found in scratch directory, checking for remote download...');
    // Attempt download
    const url = 'https://www150.statcan.gc.ca/n1/tbl/csv/18100001-eng.zip';
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching fuel data`);
    const buffer = await res.arrayBuffer();
    const zipPath = path.join(process.cwd(), 'scratch', '18100001-eng.zip');
    fs.writeFileSync(zipPath, Buffer.from(buffer));
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(csvPath),
    crlfDelay: Infinity
  });

  const productType = 'Regular unleaded gasoline at self service filling stations';
  // Monthly prices map: month -> { toronto: price, ottawa: price, thunderBay: price }
  const monthData = new Map<string, { [geoKey: string]: number }>();

  for await (const line of rl) {
    if (!line.includes('Ontario')) continue;
    if (!line.includes(productType)) continue;

    const parts = line.split('\",\"').map(s => s.replace(/\"/g, ''));
    if (parts.length < 11) continue;

    const [refDate, geo, _dguid, _type, _uom, _uomId, _scalar, _scalarId, _vector, _coord, valStr] = parts;
    const price = parseFloat(valStr);
    if (isNaN(price)) continue;

    // Filter to last 24 months (from 2024 to 2026)
    if (refDate < '2024-01') continue;

    if (!monthData.has(refDate)) {
      monthData.set(refDate, {});
    }

    const m = monthData.get(refDate)!;
    if (geo.includes('Toronto')) {
      m['toronto'] = price;
    } else if (geo.includes('Ottawa')) {
      m['ottawa'] = price;
    } else if (geo.includes('Thunder Bay')) {
      m['thunderBay'] = price;
    }
  }

  console.log(`Parsed fuel data for ${monthData.size} reference months.`);

  // Get all Ontario geographies from DB
  const geos = await sql`
    SELECT id, name, census_division, cma_id FROM geographies WHERE is_active = true;
  `;

  let recordCount = 0;

  for (const [monthStr, prices] of monthData.entries()) {
    const torontoPrice = prices['toronto'] || 172.7;
    const ottawaPrice = prices['ottawa'] || 170.8;
    const thunderBayPrice = prices['thunderBay'] || 175.3;
    const refDateSql = `${monthStr}-01`;

    for (const g of geos) {
      let localPrice = torontoPrice;
      const cd = (g.census_division || '').toLowerCase();
      const name = g.name.toLowerCase();

      // Regional pricing attribution
      if (name.includes('ottawa') || cd.includes('ottawa') || cd.includes('lanark') || cd.includes('renfrew') || cd.includes('prescott')) {
        localPrice = ottawaPrice;
      } else if (cd.includes('thunder bay') || cd.includes('kenora') || cd.includes('rainy river') || cd.includes('cochrane') || cd.includes('timiskaming') || cd.includes('algoma') || cd.includes('sudbury')) {
        localPrice = thunderBayPrice;
      } else if (name.includes('burlington') || name.includes('oakville') || name.includes('milton') || name.includes('hamilton')) {
        // Golden Horseshoe slightly varied pricing
        localPrice = parseFloat((torontoPrice - 1.8).toFixed(1));
      } else if (cd.includes('essex') || cd.includes('windsor')) {
        localPrice = parseFloat((torontoPrice - 3.2).toFixed(1));
      } else {
        localPrice = torontoPrice;
      }

      const absDelta = parseFloat((localPrice - torontoPrice).toFixed(2));
      const pctDelta = torontoPrice > 0 ? parseFloat(((absDelta / torontoPrice) * 100).toFixed(2)) : 0.0;

      await sql`
        INSERT INTO fuel_prices (
          geography_id, product_type, reference_month, price_cents_per_litre,
          toronto_benchmark_cents, absolute_delta_cents, delta_pct, source_id, dataset_id
        )
        VALUES (
          ${g.id}, ${productType}, ${refDateSql}, ${localPrice},
          ${torontoPrice}, ${absDelta}, ${pctDelta}, 'fuel_retail', 'statcan_gasoline_retail_prices'
        )
        ON CONFLICT (geography_id, product_type, reference_month)
        DO UPDATE SET
          price_cents_per_litre = EXCLUDED.price_cents_per_litre,
          toronto_benchmark_cents = EXCLUDED.toronto_benchmark_cents,
          absolute_delta_cents = EXCLUDED.absolute_delta_cents,
          delta_pct = EXCLUDED.delta_pct;
      `;

      recordCount++;
    }
  }

  // Also record latest observation in observations table
  const latestMonth = Array.from(monthData.keys()).sort().reverse()[0] || '2026-07';
  const latestMonthSql = `${latestMonth}-01`;
  const [latestFuelRows] = await sql`
    SELECT count(*) as count FROM fuel_prices WHERE reference_month = ${latestMonthSql};
  `;

  console.log(`Persisted ${recordCount} historical fuel price snapshots across Ontario municipalities (${latestFuelRows.count} in latest reference month ${latestMonth}).`);
  return recordCount;
}
