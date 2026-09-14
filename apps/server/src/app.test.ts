import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from './app.js';
import { FastifyInstance } from 'fastify';
import FormData from 'form-data';
import { Buffer } from 'buffer';
import { prisma } from './config/prisma.js';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-minimum-32-chars-for-testing';

let app: FastifyInstance;
let adminToken: string;
let reviewerToken: string;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  if (app) {
    await app.close();
  }
});

describe('M10 API - Auth & Health', () => {
  it('GET /api/health should return ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json().status).toBe('ok');
  });

  it('POST /api/auth/login should authenticate admin', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'admin@migrationguard.dev', password: 'admin123!' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().token).toBeDefined();
    adminToken = res.json().token;
  });

  it('POST /api/auth/login should authenticate reviewer', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: 'reviewer@migrationguard.dev', password: 'reviewer123!' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().token).toBeDefined();
    reviewerToken = res.json().token;
  });

  it('GET /api/auth/me should return user info', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().user.role).toBe('ADMIN');
  });

  it('GET /api/auth/me without token should fail', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    expect(res.statusCode).toBe(401);
  });
});

describe('M10 API - Runs', () => {
  const runId = 'MG-TEST-' + Date.now();

  it('POST /api/runs should create a run with evidence', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: { Authorization: `Bearer ${reviewerToken}` },
      payload: {
        runId,
        migrationName: '20260810_test',
        status: 'FAIL',
        durationMs: 1500,
        compatibility: [
          {
            appVersion: 'OLD',
            dbVersion: 'V2',
            status: 'FAIL',
            durationMs: 500,
            error: 'DESTRUCTIVE_RENAME',
          },
        ],
        evidence: [
          {
            faultType: 'DESTRUCTIVE_RENAME',
            confidence: 'CONFIRMED',
            operation: 'GET /user',
            observedError: 'missing column',
          },
        ],
      },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(runId);
  });

  it('GET /api/runs/:id should return run details', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/runs/${runId}`,
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().evidence.length).toBe(1);
    expect(res.json().compatibility.length).toBe(1);
  });

  it('POST /api/runs/:id/decisions should create reviewer decision', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/runs/${runId}/decisions`,
      headers: { Authorization: `Bearer ${reviewerToken}` },
      payload: { decision: 'ACCEPTED', comment: 'LGTM' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().decision).toBe('ACCEPTED');
  });
});

describe('Assistant & Repair API', () => {
  const testRunId = 'MG-TEST-ASSISTANT-' + Date.now();
  let proposalId: string;

  beforeAll(async () => {
    // Create a test run with a destructive rename failure
    await app.inject({
      method: 'POST',
      url: '/api/runs',
      headers: { Authorization: `Bearer ${reviewerToken}` },
      payload: {
        runId: testRunId,
        migrationName: '20240102000000_v2',
        status: 'FAIL',
        durationMs: 1200,
        compatibility: [
          {
            appVersion: 'OLD',
            dbVersion: 'V2',
            status: 'FAIL',
            durationMs: 400,
            error: 'The column `users.name` does not exist in the current database.',
          },
        ],
        evidence: [
          {
            faultType: 'DESTRUCTIVE_RENAME',
            confidence: 'CONFIRMED',
            operation: 'GET /users/1',
            observedError: 'The column `users.name` does not exist in the current database.',
          },
        ],
      },
    });
  });

  it('GET /api/assistant/status should return status and provider name', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/assistant/status' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.status).toBe('ok');
    expect(body.provider).toBeDefined();
  });

  it('POST /api/assistant/ask should answer documentation queries', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/assistant/ask',
      headers: { Authorization: `Bearer ${reviewerToken}` },
      payload: { query: 'How does the compatibility matrix work?' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.answer).toContain('Compatibility Matrix');
    expect(body.data.citations.length).toBeGreaterThan(0);
  });

  it('POST /api/assistant/ask with runId should explain failure using evidence', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/assistant/ask',
      headers: { Authorization: `Bearer ${reviewerToken}` },
      payload: { runId: testRunId },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.data.explanation).toContain('destructive column rename');
    expect(body.data.remediation.strategy).toBe('EXPAND_CONTRACT');
    expect(body.data.observations.length).toBeGreaterThan(0);
  });

  it('POST /api/repair/proposals should synthesize deterministic repair proposal', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/repair/proposals',
      headers: { Authorization: `Bearer ${reviewerToken}` },
      payload: { runId: testRunId },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.success).toBe(true);
    expect(body.proposal.strategy).toBe('EXPAND_CONTRACT');
    expect(body.proposal.proposalId).toBeDefined();
    expect(body.proposal.affectedObjects.length).toBeGreaterThan(0);
    expect(body.proposal.migrationPlan.length).toBe(4);
    proposalId = body.proposal.proposalId;
  });

  it('GET /api/repair/proposals/:id should retrieve existing proposal', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/api/repair/proposals/${proposalId}`,
      headers: { Authorization: `Bearer ${reviewerToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.proposal.proposalId).toBe(proposalId);
  });

  it('POST /api/repair/proposals/:id/approve should update status to APPROVED', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/api/repair/proposals/${proposalId}/approve`,
      headers: { Authorization: `Bearer ${reviewerToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.proposal.status).toBe('APPROVED');
  });
});

const runIntegrationTests = process.env.INTEGRATION_TESTS === 'true';

describe.skipIf(!runIntegrationTests)(
  'M10 API - Presentations (requires MinIO; set INTEGRATION_TESTS=true)',
  () => {
    let presentationId: string;

    it('POST /api/presentations/:id/versions should upload version', async () => {
      presentationId = 'PRES-' + Date.now();
      const form = new FormData();
      form.append('file', Buffer.from('test pdf content'), {
        filename: 'test.pdf',
        contentType: 'application/pdf',
      });

      const res = await app.inject({
        method: 'POST',
        url: `/api/presentations/${presentationId}/versions`,
        headers: {
          Authorization: `Bearer ${adminToken}`,
          ...form.getHeaders(),
        },
        payload: form,
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().version).toBe(1);
      expect(res.json().storageKey).toContain('.pdf');
    });

    it('POST /api/presentations/:id/versions/:versionId/publish should publish', async () => {
      const pRes = await app.inject({ method: 'GET', url: `/api/presentations/${presentationId}` });
      const versionId = pRes.json().versions[0].id;

      const res = await app.inject({
        method: 'POST',
        url: `/api/presentations/${presentationId}/versions/${versionId}/publish`,
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      expect(res.statusCode).toBe(200);
      expect(res.json().publishedAt).toBeDefined();
    });

    it('GET /api/presentations/:id should return presentation details', async () => {
      const res = await app.inject({
        method: 'GET',
        url: `/api/presentations/${presentationId}`,
      });
      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.id).toBe(presentationId);
      expect(body.versions).toBeDefined();
    });
  },
);
