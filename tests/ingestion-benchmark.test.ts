import { describe, it, expect } from 'bun:test';
import { runCensusBenchmark } from '../src/ingestion/benchmarks/census-benchmark';
import fs from 'fs';
import path from 'path';

describe('T-005 Ingestion Benchmark & StatCan 98-401 Lineage', () => {
  it('benchmarks full streaming bulk ingestion pipeline and captures all 9 required metrics', async () => {
    const results = await runCensusBenchmark();

    // Verify 9 measured metrics specified in Phase 2 Amendment #1
    expect(results.compressedDownloadSizeBytes).toBeGreaterThan(0);
    expect(results.uncompressedSizeBytes).toBeGreaterThan(results.compressedDownloadSizeBytes);
    expect(results.rowsProcessed).toBeGreaterThanOrEqual(6660);
    expect(parseFloat(results.peakRamMB)).toBeLessThan(512); // < 512 MB ceiling
    expect(results.ingestionDurationMs).toBeGreaterThan(0);
    expect(results.resultingSqliteSizeBytes).toBeGreaterThan(100 * 1024); // > 100 KB
    expect(results.indexBuildDurationMs).toBeGreaterThan(0);
    expect(results.cityQueryLatencyP50Ms).toBeLessThan(10); // < 10ms target
    expect(results.ontarioRankingQueryLatencyP50Ms).toBeLessThan(25); // < 25ms target

    // Verify benchmark report is written
    const docPath = path.join(process.cwd(), 'docs', 'INGESTION_BENCHMARK.md');
    expect(fs.existsSync(docPath)).toBe(true);
    const docContent = fs.readFileSync(docPath, 'utf-8');
    expect(docContent).toContain('98-401-X2021001');
    expect(docContent).toContain('Typical City-Query Latency');
    expect(docContent).toContain('Ontario-Wide Ranking Latency');
  });
});
