import * as fs from 'fs';

export interface WorkloadExpectation {
  status?: number;
}

export interface WorkloadOperation {
  id: string;
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
  expect?: WorkloadExpectation;
}

export interface Workload {
  id: string;
  name: string;
  description: string;
  operations: WorkloadOperation[];
}

export interface OperationResult {
  operationId: string;
  method: string;
  path: string;
  status: number;
  response: unknown;
  durationMs: number;
  success: boolean;
  error?: string;
}

export interface WorkloadResult {
  workloadId: string;
  applicationUrl: string;
  startedAt: string;
  completedAt: string;
  operations: OperationResult[];
  success: boolean;
}

export class WorkloadLoader {
  public static load(filepath: string): Workload {
    if (!fs.existsSync(filepath)) {
      throw new Error(`Workload file not found: ${filepath}`);
    }
    const raw = fs.readFileSync(filepath, 'utf-8');
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error(`Invalid JSON in workload file: ${filepath}`);
    }

    if (!parsed.id || !parsed.name || !Array.isArray(parsed.operations)) {
      throw new Error('Malformed workload: Missing id, name, or operations array.');
    }

    const seenOpIds = new Set<string>();
    for (const op of parsed.operations) {
      if (!op.id || !op.method || !op.path) {
        throw new Error(`Malformed operation in workload: Missing id, method, or path.`);
      }
      if (seenOpIds.has(op.id)) {
        throw new Error(`Duplicate operation ID found: ${op.id}`);
      }
      seenOpIds.add(op.id);
    }

    return parsed as unknown as Workload;
  }
}

export class WorkloadReplayEngine {
  private timeoutMs: number;

  constructor(timeoutMs: number = 5000) {
    this.timeoutMs = timeoutMs;
  }

  public async replay(workload: Workload, baseUrl: string): Promise<WorkloadResult> {
    const startedAt = new Date().toISOString();
    const results: OperationResult[] = [];
    let overallSuccess = true;

    for (const op of workload.operations) {
      const start = Date.now();
      const url = new URL(op.path, baseUrl).toString();

      // Ensure local URL restriction for M5 scope
      if (!url.startsWith('http://localhost') && !url.startsWith('http://127.0.0.1')) {
        throw new Error(
          'Security Restriction: WorkloadReplayEngine only allows localhost requests.',
        );
      }

      let status = 0;
      let body: unknown = null;
      let opError: string | undefined;

      const abortController = new AbortController();
      const timeoutHandle = setTimeout(() => abortController.abort(), this.timeoutMs);

      try {
        const fetchOptions: RequestInit = {
          method: op.method,
          headers: op.headers || {},
          signal: abortController.signal,
        };

        if (op.body) {
          fetchOptions.body = typeof op.body === 'string' ? op.body : JSON.stringify(op.body);
          if (
            !fetchOptions.headers ||
            !Object.keys(fetchOptions.headers).find((k) => k.toLowerCase() === 'content-type')
          ) {
            fetchOptions.headers = { ...fetchOptions.headers, 'Content-Type': 'application/json' };
          }
        }

        const res = await fetch(url, fetchOptions);
        status = res.status;

        const rawBody = await res.text();
        try {
          body = JSON.parse(rawBody);
        } catch {
          body = rawBody;
        }
      } catch (err: unknown) {
        if (err instanceof Error) {
          if (err.name === 'AbortError') {
            opError = `Timeout after ${this.timeoutMs}ms`;
            console.error(`[Workload] Operation ${op.id} timeout`);
            status = 504; // Gateway Timeout equivalent
          } else {
            opError = err.message;
            console.error(`[Workload] Operation ${op.id} failed:`, err.message);
            status = 500;
          }
        } else {
          opError = 'Unknown error occurred';
          console.error(`[Workload] Operation ${op.id} failed: Unknown error`);
          status = 500;
        }
      } finally {
        clearTimeout(timeoutHandle);
      }

      const durationMs = Date.now() - start;
      let success = true;

      if (opError) {
        success = false;
      } else if (op.expect?.status && op.expect.status !== status) {
        success = false;
        opError = `Expected status ${op.expect.status} but got ${status}`;
        console.error(
          `[Workload] Operation ${op.id} status mismatch: expected ${op.expect.status}, got ${status}`,
        );
      } else if (status >= 400) {
        if (!op.expect?.status) {
          success = false;
          opError = `HTTP ${status}`;
        }
      }

      if (!success) {
        overallSuccess = false;
      }

      results.push({
        operationId: op.id,
        method: op.method,
        path: op.path,
        status,
        response: body,
        durationMs,
        success,
        error: opError,
      });
    }

    return {
      workloadId: workload.id,
      applicationUrl: baseUrl,
      startedAt,
      completedAt: new Date().toISOString(),
      operations: results,
      success: overallSuccess,
    };
  }
}
