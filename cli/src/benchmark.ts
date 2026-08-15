import { BenchmarkRunner, BenchmarkResult } from '@migrationguard/benchmark-runner';
import * as path from 'path';
import * as fs from 'fs';

function calculateMetrics(results: BenchmarkResult[], evaluator: 'migrationguard' | 'atlas') {
  let tp = 0;
  let tn = 0;
  let fp = 0;
  let fn = 0;

  for (const r of results) {
    let verdict;
    let evaluated = true;

    if (evaluator === 'atlas') {
      verdict = r.atlas.status;
      evaluated = r.atlas.evaluated;
    } else {
      verdict = r.migrationguard.verdict;
      evaluated = verdict !== 'NOT_EVALUATED';
    }

    if (!evaluated) continue;

    if (r.groundTruth === 'UNSAFE') {
      if (verdict === 'UNSAFE') tp++;
      else if (verdict === 'SAFE') fn++;
    } else if (r.groundTruth === 'SAFE') {
      if (verdict === 'SAFE') tn++;
      else if (verdict === 'UNSAFE') fp++;
    }
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 'NOT_APPLICABLE';
  const recall = tp + fn > 0 ? tp / (tp + fn) : 'NOT_APPLICABLE';

  let f1 = 'NOT_APPLICABLE';
  if (typeof precision === 'number' && typeof recall === 'number' && precision + recall > 0) {
    f1 = ((2 * precision * recall) / (precision + recall)).toFixed(2);
  }

  return {
    tp,
    tn,
    fp,
    fn,
    precision: typeof precision === 'number' ? precision.toFixed(2) : precision,
    recall: typeof recall === 'number' ? recall.toFixed(2) : recall,
    f1,
  };
}

export async function benchmarkCommandAction(repoRoot: string, filter?: string) {
  // filter is directly provided now

  console.log('\n--- MigrationGuard Benchmark Started ---\n');
  const manifestPath = path.join(repoRoot, 'benchmark', 'manifest.json');

  if (!fs.existsSync(manifestPath)) {
    console.error('Benchmark manifest not found at:', manifestPath);
    process.exit(1);
  }

  const runner = new BenchmarkRunner(repoRoot);
  const startTime = Date.now();
  const results = await runner.runBenchmark(manifestPath, filter);
  const executionTimeMs = Date.now() - startTime;

  const mgMetrics = calculateMetrics(results, 'migrationguard');
  const atlasMetrics = calculateMetrics(results, 'atlas');

  console.log('\n--- Benchmark Results ---');
  console.log(`Execution Time: ${executionTimeMs}ms\n`);

  console.log('MigrationGuard Metrics:');
  console.log(mgMetrics);

  console.log('\nAtlas Metrics:');
  console.log(atlasMetrics);

  // Write report
  let reportMd = `# MigrationGuard M8 Benchmark Results\n\n`;
  reportMd += `**Execution Time:** ${executionTimeMs}ms\n\n`;

  reportMd += `## Overall Metrics\n\n`;
  reportMd += `| Metric | MigrationGuard | Atlas (SQL-only Baseline) |\n`;
  reportMd += `|---|---|---|\n`;
  reportMd += `| True Positives (TP) | ${mgMetrics.tp} | ${atlasMetrics.tp} |\n`;
  reportMd += `| True Negatives (TN) | ${mgMetrics.tn} | ${atlasMetrics.tn} |\n`;
  reportMd += `| False Positives (FP) | ${mgMetrics.fp} | ${atlasMetrics.fp} |\n`;
  reportMd += `| False Negatives (FN) | ${mgMetrics.fn} | ${atlasMetrics.fn} |\n`;
  reportMd += `| Precision | ${mgMetrics.precision} | ${atlasMetrics.precision} |\n`;
  reportMd += `| Recall | ${mgMetrics.recall} | ${atlasMetrics.recall} |\n`;
  reportMd += `| F1 Score | ${mgMetrics.f1} | ${atlasMetrics.f1} |\n\n`;

  reportMd += `## Detailed Results\n\n`;
  for (const r of results) {
    reportMd += `### Test: ${r.testId} (Track ${r.track})\n`;
    reportMd += `- **Ground Truth:** ${r.groundTruth} (${r.faultType})\n`;
    reportMd += `- **MigrationGuard Verdict:** ${r.migrationguard.verdict} (Confidence: ${r.migrationguard.confidence}, Fault: ${r.migrationguard.evidenceFaultType})\n`;
    reportMd += `- **Atlas Verdict:** ${r.atlas.status}\n\n`;

    if (r.migrationguard.verdict === 'UNSAFE' && r.atlas.status === 'SAFE') {
      reportMd += `> **Application-Aware Detection:** MigrationGuard successfully detected an application compatibility failure that Atlas marked as SAFE.\n\n`;
    }
  }

  const reportsDir = path.join(repoRoot, 'docs', 'benchmark');
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  fs.writeFileSync(path.join(reportsDir, 'RESULTS.md'), reportMd, 'utf-8');
  console.log('\nReport generated at docs/benchmark/RESULTS.md');
}

// If invoked directly
if (process.argv[1].endsWith('benchmark.js') || process.argv[1].endsWith('benchmark.ts')) {
  // If we are already in the repo root (which is typical for monorepo scripts)
  let root = process.cwd();
  if (root.endsWith('cli')) {
    root = path.resolve(root, '../');
  }
  // commander takes care of args in normal CLI use,
  // but if we are invoking just benchmark.ts directly for some reason:
  const filterIndex = process.argv.indexOf('--filter');
  const filter = filterIndex !== -1 ? process.argv[filterIndex + 1] : undefined;
  benchmarkCommandAction(root, filter).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
