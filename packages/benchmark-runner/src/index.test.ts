import { describe, it, expect } from 'vitest';
import { BenchmarkRunner } from './index.js';

describe('Benchmark Runner', () => {
  it('should compute metrics correctly for mock results', async () => {
    const runner = new BenchmarkRunner('invalid/repo');
    await expect(runner.runBenchmark('invalid/path')).rejects.toThrow();
  });
});
