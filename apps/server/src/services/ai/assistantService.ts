import { prisma } from '../../config/prisma.js';
import { AIProvider, AssistantDocChunk } from './aiProvider.js';
import { MockProvider } from './mockProvider.js';
import { GeminiProvider } from './geminiProvider.js';
import {
  CompatibilityExplanationContext,
  RepairProposal,
  normalizeCanonicalFaultCategory,
} from '@migrationguard/core';
import { RepairPlanner } from '@migrationguard/repair-planner';

const BUILT_IN_DOCS: AssistantDocChunk[] = [
  {
    topic: 'compatibility-matrix',
    title: 'The 4-Cell Compatibility Matrix',
    content:
      'MigrationGuard evaluates four distinct execution states during zero-downtime rolling deployments:\n' +
      '1. Cell 1 (OLD APP + V1 DB): Baseline pre-deployment functionality.\n' +
      '2. Cell 2 (NEW APP + V1 DB): Forward compatibility. Verifies new application can operate if deployed before database migration.\n' +
      '3. Cell 3 (OLD APP + V2 DB): Backward compatibility. Verifies existing application continues functioning when database is migrated before old pods drain.\n' +
      '4. Cell 4 (NEW APP + V2 DB): Steady post-deployment state.\n' +
      'Failures in Cell 3 represent backward incompatibilities such as destructive column renames or drops.',
  },
  {
    topic: 'destructive-rename',
    title: 'Destructive Column Renames & Expand/Contract',
    content:
      'Renaming a column directly (e.g. name to full_name) causes immediate Cell 3 (OLD APP + V2 DB) failures. ' +
      'Zero-downtime migrations require an Expand/Contract workflow:\n' +
      'Phase 1 (Expand): Add the new column as NULLABLE without dropping the old column.\n' +
      'Phase 2 (Backfill): Populate the new column from existing records.\n' +
      'Phase 3 (Dual Write): Deploy application instances that write to both columns and prefer reading the new column.\n' +
      'Phase 4 (Contract): Drop the legacy column only after all older application versions have terminated.',
  },
  {
    topic: 'cli-usage',
    title: 'MigrationGuard CLI Usage',
    content:
      'The MigrationGuard CLI provides autonomous local verification:\n' +
      '- `migrationguard verify --config migrationguard.json`: Executes the 4-cell compatibility matrix in isolated Docker sandboxes.\n' +
      '- `migrationguard repair`: Inspects detected incompatibilities and synthesizes a deterministic, non-breaking repair proposal.\n' +
      '- `migrationguard repair --approve <id>`: Applies the approved repair to local files and immediately triggers independent re-verification.\n' +
      '- `migrationguard benchmark`: Executes the full ground-truth validation suite.',
  },
  {
    topic: 'not-null-addition',
    title: 'Safe NOT NULL Additions',
    content:
      'Adding a NOT NULL column without a default value causes legacy application versions to fail during insert operations. ' +
      'To remediate: (1) Add the column as nullable, (2) Backfill default values, (3) Deploy application code populating the field, and (4) Alter the column to SET NOT NULL in a contract phase.',
  },
];

export class AssistantService {
  private provider: AIProvider;

  constructor(provider?: AIProvider) {
    if (provider) {
      this.provider = provider;
    } else if (process.env.GEMINI_API_KEY) {
      this.provider = new GeminiProvider(process.env.GEMINI_API_KEY);
    } else {
      this.provider = new MockProvider();
    }
  }

  public getProviderName(): string {
    return this.provider.name;
  }

  public async explainVerificationRun(runId: string, user: any) {
    // 1. Object-Level Authorization (IDOR Defense)
    const run = await prisma.verificationRun.findUnique({
      where: { id: runId },
      include: {
        compatibility: true,
        evidence: true,
      },
    });

    if (!run) {
      throw new Error(`Verification run [${runId}] not found.`);
    }

    // Build context
    const failedRuns = run.compatibility.filter((c) => c.status !== 'PASS');
    const failedStates = failedRuns.map((c) => `${c.appVersion}_APP_${c.dbVersion}_DB`);

    const canonical = normalizeCanonicalFaultCategory(
      run.evidence[0]?.faultType || (run.status === 'PASS' ? 'NONE' : 'DESTRUCTIVE_RENAME'),
    );

    const context: CompatibilityExplanationContext = {
      verificationId: run.id,
      verdict: run.status === 'PASS' ? 'PASS' : 'FAIL',
      faultCategory: canonical.faultCategory,
      failureMechanism: canonical.failureMechanism,
      confidence: run.evidence[0]?.confidence || 'CONFIRMED',
      failedStates,
      migrationChanges: [],
      observations: run.compatibility.map((c) => ({
        state: `${c.appVersion}_APP_${c.dbVersion}_DB`,
        result: c.status,
        databaseError: c.error || undefined,
      })),
      evidence: run.evidence.map((e) => ({
        id: e.id,
        faultType: e.faultType,
        confidence: e.confidence,
        operation: e.operation || undefined,
        observedError: e.observedError || undefined,
      })),
    };

    return this.provider.explainFailure(context);
  }

  public async explainCellState(runId: string, cellState: string, user: any) {
    const run = await prisma.verificationRun.findUnique({
      where: { id: runId },
      include: {
        compatibility: true,
        evidence: true,
      },
    });

    if (!run) throw new Error(`Verification run [${runId}] not found.`);

    const canonicalCell = normalizeCanonicalFaultCategory(
      run.evidence[0]?.faultType || (run.status === 'PASS' ? 'NONE' : 'DESTRUCTIVE_RENAME'),
    );

    const context: CompatibilityExplanationContext = {
      verificationId: run.id,
      verdict: run.status === 'PASS' ? 'PASS' : 'FAIL',
      faultCategory: canonicalCell.faultCategory,
      failureMechanism: canonicalCell.failureMechanism,
      confidence: run.evidence[0]?.confidence || 'CONFIRMED',
      failedStates: [cellState],
      migrationChanges: [],
      observations: run.compatibility.map((c) => ({
        state: `${c.appVersion}_APP_${c.dbVersion}_DB`,
        result: c.status,
        databaseError: c.error || undefined,
      })),
      evidence: run.evidence.map((e) => ({
        id: e.id,
        faultType: e.faultType,
        confidence: e.confidence,
        operation: e.operation || undefined,
        observedError: e.observedError || undefined,
      })),
    };

    return this.provider.explainCell(cellState, context);
  }

  public async answerQuestion(query: string) {
    let docs: AssistantDocChunk[] = [];
    try {
      const dbDocs = await prisma.assistantDocument.findMany();
      if (dbDocs.length > 0) {
        docs = dbDocs.map((d) => ({ topic: d.topic, title: d.title, content: d.content }));
      } else {
        docs = BUILT_IN_DOCS;
      }
    } catch {
      docs = BUILT_IN_DOCS;
    }

    return this.provider.answerDocumentation(query, docs);
  }

  public async explainProposal(proposal: RepairProposal) {
    return this.provider.explainRepair(proposal);
  }
}
