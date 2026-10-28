import { runHaltonAcquisition } from '../src/acquisition/pipeline.js';
import { closeDatabase, sql } from '../src/db/index.js';

async function main() {
  console.log('--- EXECUTING 500+ LOCATION HALTON PROOF INGESTION RUN ---');
  
  // First run
  const report1 = await runHaltonAcquisition({ limit: 600 });
  console.log('\n--- Run 1 Report ---');
  console.log(`Total Observed: ${report1.totalObserved}`);
  console.log(`Canonical Created: ${report1.canonicalCreated}`);
  console.log(`Canonical Updated: ${report1.canonicalUpdated}`);
  console.log(`Burlington: ${report1.haltonCounts.burlington}`);
  console.log(`Oakville: ${report1.haltonCounts.oakville}`);
  console.log(`Milton: ${report1.haltonCounts.milton}`);
  console.log(`Halton Hills: ${report1.haltonCounts.haltonHills}`);

  // Query database state
  const [bizCountAfter1] = await sql<{ count: string }[]>`
    SELECT count(*) FROM businesses;
  `;
  const [srcCountAfter1] = await sql<{ count: string }[]>`
    SELECT count(*) FROM business_source_records;
  `;
  console.log(`\nDB State: businesses count = ${bizCountAfter1.count}, source_records = ${srcCountAfter1.count}`);

  // Second run: Test Idempotency
  console.log('\n--- Testing Idempotency (Repeating Ingestion) ---');
  const report2 = await runHaltonAcquisition({ limit: 600 });
  console.log(`Run 2 Total Observed: ${report2.totalObserved}`);
  console.log(`Run 2 Canonical Created: ${report2.canonicalCreated}`);
  console.log(`Run 2 Canonical Updated: ${report2.canonicalUpdated}`);

  const [bizCountAfter2] = await sql<{ count: string }[]>`
    SELECT count(*) FROM businesses;
  `;
  console.log(`DB State After Run 2: businesses count = ${bizCountAfter2.count}`);

  if (Number(bizCountAfter2.count) === Number(bizCountAfter1.count) && report2.canonicalCreated === 0) {
    console.log('>>> IDEMPOTENCY VERIFICATION PASSED: No duplicate businesses created on repeat ingestion! <<<');
  } else {
    console.warn('>>> IDEMPOTENCY WARNING: Duplicate records detected! <<<');
  }

  await closeDatabase();
}

main().catch(async (err) => {
  console.error('Fatal Halton proof error:', err);
  await closeDatabase();
  process.exit(1);
});
