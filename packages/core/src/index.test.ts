import { describe, it, expect } from 'vitest';
import { getCoreVersion } from './index.js';

describe('core module', () => {
  it('should return the correct version', () => {
    expect(getCoreVersion()).toBe('0.1.0');
  });
});
