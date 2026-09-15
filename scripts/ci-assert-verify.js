import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

export function findLatestReport(reportsDir) {
  if (!fs.existsSync(reportsDir)) {
    throw new Error(`Reports directory does not exist: ${reportsDir}`);
  }
  const files = fs
    .readdirSync(reportsDir)
    .filter((f) => f.startsWith('MG-VERIFY-') && f.endsWith('.json'))
    .map((f) => ({
      name: f,
      fullPath: path.join(reportsDir, f),
      mtime: fs.statSync(path.join(reportsDir, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (files.length === 0) {
    throw new Error(`No MG-VERIFY-*.json report found in: ${reportsDir}`);
  }

  const raw = fs.readFileSync(files[0].fullPath, 'utf-8');
  return JSON.parse(raw);
}

export function assertVerificationResult(input) {
  const { exitCode, outputText } = input;

  if (exitCode !== 1) {
    if (exitCode === 0) {
      throw new Error(
        `Verifier unexpectedly exited with 0 (SUCCESS). Expected exit code 1 (VERIFIED_COMPATIBILITY_FAILURE) for destructive rename benchmark fixture.`,
      );
    } else if (exitCode === 2) {
      throw new Error(`Verifier failed with CONFIGURATION_ERROR (exit code 2).`);
    } else if (exitCode === 3) {
      throw new Error(`Verifier failed with INFRASTRUCTURE_FAILURE (exit code 3).`);
    } else {
      throw new Error(`Verifier exited with unexpected error/crash code: ${exitCode}.`);
    }
  }

  const reportsDir = input.reportsDir || path.resolve(process.cwd(), 'reports');
  const report = input.report || findLatestReport(reportsDir);

  if (!report || typeof report !== 'object') {
    throw new Error('Verification report is empty or invalid.');
  }

  const runId = report.runId;
  if (!runId) {
    throw new Error('Report missing runId.');
  }

  const evidence = report.evidence;
  if (!Array.isArray(evidence) || evidence.length !== 4) {
    throw new Error(
      `Report must contain exactly 4 matrix state evidence records, got: ${evidence?.length ?? 0}`,
    );
  }

  const findState = (app, db) =>
    evidence.find((e) => e.applicationVersion === app && e.databaseVersion === db);

  const oldV1 = findState('OLD', 'V1');
  const newV1 = findState('NEW', 'V1');
  const oldV2 = findState('OLD', 'V2');
  const newV2 = findState('NEW', 'V2');

  if (!oldV1 || !newV1 || !oldV2 || !newV2) {
    throw new Error(
      'One or more required compatibility matrix states (OLD/NEW + V1/V2) are missing.',
    );
  }

  if (oldV1.failureCategory !== 'NONE') {
    throw new Error(
      `Matrix state OLD + V1 expected PASS (NONE), got failureCategory: ${oldV1.failureCategory}`,
    );
  }

  if (newV1.failureCategory !== 'COMPATIBILITY_FAILURE') {
    throw new Error(
      `Matrix state NEW + V1 expected FAIL (COMPATIBILITY_FAILURE), got failureCategory: ${newV1.failureCategory}`,
    );
  }

  if (oldV2.failureCategory !== 'COMPATIBILITY_FAILURE') {
    throw new Error(
      `Matrix state OLD + V2 expected FAIL (COMPATIBILITY_FAILURE), got failureCategory: ${oldV2.failureCategory}`,
    );
  }

  if (newV2.failureCategory !== 'NONE') {
    throw new Error(
      `Matrix state NEW + V2 expected PASS (NONE), got failureCategory: ${newV2.failureCategory}`,
    );
  }

  if (oldV2.faultType !== 'DESTRUCTIVE_RENAME') {
    throw new Error(
      `Expected fault category DESTRUCTIVE_RENAME for OLD + V2, got: ${oldV2.faultType}`,
    );
  }

  if (oldV2.confidence !== 'CONFIRMED') {
    throw new Error(`Expected confidence CONFIRMED for OLD + V2, got: ${oldV2.confidence}`);
  }

  const observedError = String(oldV2.databaseError || JSON.stringify(oldV2.actualResult) || '');
  if (!observedError.includes('users.name')) {
    throw new Error(
      `Evidence missing expected missing column failure detail (users.name). Got: ${observedError}`,
    );
  }

  if (outputText) {
    if (!outputText.includes('OLD + V1     PASS')) {
      throw new Error('CLI output missing "OLD + V1     PASS"');
    }
    if (!outputText.includes('NEW + V1     FAIL')) {
      throw new Error('CLI output missing "NEW + V1     FAIL"');
    }
    if (!outputText.includes('OLD + V2     FAIL')) {
      throw new Error('CLI output missing "OLD + V2     FAIL"');
    }
    if (!outputText.includes('NEW + V2     PASS')) {
      throw new Error('CLI output missing "NEW + V2     PASS"');
    }
    if (!outputText.includes('VERIFICATION FAILED')) {
      throw new Error('CLI output missing "VERIFICATION FAILED"');
    }
    if (!outputText.includes('DESTRUCTIVE_RENAME')) {
      throw new Error('CLI output missing "DESTRUCTIVE_RENAME"');
    }
  }

  const markdownSummary = [
    '# MigrationGuard Verification',
    '',
    '**Status: ✅ PASS — Expected Incompatibility Detected and Proven**',
    '',
    `**Run ID:** \`${runId}\``,
    `**Verdict:** \`VERIFICATION FAILED\` (Exit code: \`${exitCode}\` as specified by CLI contract)`,
    `**Fault Type:** \`${oldV2.faultType}\``,
    `**Confidence:** \`${oldV2.confidence}\``,
    `**Operation:** \`${oldV2.operationId || 'UNKNOWN'}\``,
    '',
    '### Deterministic Compatibility Matrix',
    '```text',
    'OLD + V1     PASS (legacy baseline)',
    'NEW + V1     FAIL (forward query dependency on full_name)',
    'OLD + V2     FAIL (destructive rename: column users.name dropped)',
    'NEW + V2     PASS (target schema and app aligned)',
    '```',
    '',
    '### Failure Evidence Detail',
    '```text',
    observedError.trim(),
    '```',
    '',
    `_Reports generated: reports/${runId}.json and reports/${runId}.md_`,
  ].join('\n');

  return {
    success: true,
    runId,
    fault: oldV2.faultType,
    confidence: oldV2.confidence,
    matrix: {
      OLD_V1: 'PASS',
      NEW_V1: 'FAIL',
      OLD_V2: 'FAIL',
      NEW_V2: 'PASS',
    },
    markdownSummary,
  };
}

async function runCli() {
  const exitCodeArg = process.argv[2];
  const outputFileArg = process.argv[3];

  if (exitCodeArg === undefined) {
    console.error('Usage: node scripts/ci-assert-verify.js <exit_code> [output_file]');
    process.exit(1);
  }

  const exitCode = parseInt(exitCodeArg, 10);
  let outputText = '';
  if (outputFileArg && fs.existsSync(outputFileArg)) {
    outputText = fs.readFileSync(outputFileArg, 'utf-8');
  }

  try {
    const result = assertVerificationResult({ exitCode, outputText });
    console.log(
      `\n[CI-ASSERT SUCCESS] MigrationGuard verification strictly matched expected benchmark contract:`,
    );
    console.log(`- Run ID:     ${result.runId}`);
    console.log(`- Fault:      ${result.fault}`);
    console.log(`- Confidence: ${result.confidence}`);
    console.log(`- Matrix:     ${JSON.stringify(result.matrix)}`);

    const stepSummaryPath = process.env.GITHUB_STEP_SUMMARY;
    if (stepSummaryPath) {
      fs.appendFileSync(stepSummaryPath, result.markdownSummary + '\n', 'utf-8');
    }

    process.exit(0);
  } catch (err) {
    console.error(`\n[CI-ASSERT FAILED] Verification assertion failed:`);
    console.error(err.message || err);

    const stepSummaryPath = process.env.GITHUB_STEP_SUMMARY;
    if (stepSummaryPath) {
      const failureMd = [
        '# MigrationGuard Verification',
        '',
        '**Status: ❌ FAILED — Verification Assertion Violated**',
        '',
        '```text',
        err.message || String(err),
        '```',
      ].join('\n');
      fs.appendFileSync(stepSummaryPath, failureMd + '\n', 'utf-8');
    }

    process.exit(1);
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  runCli();
}
