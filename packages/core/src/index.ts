export function getCoreVersion(): string {
  return '0.1.0';
}

export type MatrixCellState = 'OLD_APP_V1_DB' | 'NEW_APP_V1_DB' | 'OLD_APP_V2_DB' | 'NEW_APP_V2_DB';

export interface MigrationChange {
  type: string;
  table: string;
  from?: string;
  to?: string;
  column?: string;
  nullable?: boolean;
}

export interface CompatibilityObservation {
  state: MatrixCellState | string;
  operation?: string;
  table?: string;
  column?: string;
  result?: string;
  databaseError?: string;
}

export interface CompatibilityExplanationContext {
  verificationId: string;
  verdict: 'PASS' | 'FAIL';
  faultCategory: string;
  confidence: string;
  failedStates: string[];
  migrationChanges: MigrationChange[];
  observations: CompatibilityObservation[];
  evidence: Array<{
    id: string;
    faultType: string;
    confidence: string;
    operation?: string;
    observedError?: string;
  }>;
  rolloutSequence?: string;
  inputHashes?: Record<string, string>;
}

export type RepairStrategy =
  | 'EXPAND_CONTRACT'
  | 'NULLABLE_WITH_BACKFILL'
  | 'EXPAND_TRANSFORM_CONTRACT'
  | 'SAFE_ADD_COLUMN'
  | 'SAFE_ADD_TABLE'
  | 'NONE';

export type ProposalStatus =
  'DRAFT' | 'VALIDATED' | 'APPROVED' | 'APPLIED' | 'VERIFIED' | 'REJECTED' | 'STALE' | 'FAILED';

export interface AffectedObject {
  type: 'TABLE' | 'COLUMN' | 'INDEX' | 'CONSTRAINT';
  table: string;
  name: string;
  action: 'ADD_NULLABLE' | 'PRESERVE_TEMPORARY' | 'BACKFILL' | 'DEFER_DROP' | 'MODIFY_TYPE';
  details?: string;
}

export interface MigrationPlanPhase {
  phase: number;
  title: string;
  description: string;
  sqlStatements: string[];
  timing: 'PRE_DEPLOYMENT' | 'POST_MIGRATION' | 'POST_LEGACY_DRAIN';
  reversibility: 'REVERSIBLE' | 'IRREVERSIBLE';
}

export interface SchemaDiffEntry {
  line: number;
  type: 'ADD' | 'REMOVE' | 'CONTEXT';
  content: string;
}

export interface RepairProposal {
  proposalId: string;
  verificationId: string;
  projectId?: string;
  createdAt: string;
  sourceSchemaHash: string;
  sourceMigrationHash: string;
  faultCategory: string;
  compatibilityState: string;
  strategy: RepairStrategy;
  affectedObjects: AffectedObject[];
  requiredChanges: string[];
  migrationPlan: MigrationPlanPhase[];
  beforeSchema: string;
  proposedSchema: string;
  schemaDiff: SchemaDiffEntry[];
  expectedCompatibility: {
    'OLD+V1': 'PASS' | 'FAIL';
    'NEW+V1': 'PASS' | 'FAIL';
    'OLD+V2': 'PASS' | 'FAIL';
    'NEW+V2': 'PASS' | 'FAIL';
  };
  risks: string[];
  assumptions: string[];
  warnings: string[];
  status: ProposalStatus;
}
