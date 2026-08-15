import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from './app.js';
import { FastifyInstance } from 'fastify';
import FormData from 'form-data';
import { Buffer } from 'buffer';
import { prisma } from './config/prisma.js';

let app: FastifyInstance;
let adminToken: string;
let reviewerToken: string;

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
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
    const res = await app.inject({ method: 'GET', url: `/api/runs/${runId}` });
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

describe('M10 API - Presentations', () => {
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

  it('GET /api/presentations/:id should return presigned URLs', async () => {
    const res = await app.inject({ method: 'GET', url: `/api/presentations/${presentationId}` });
    expect(res.statusCode).toBe(200);
    expect(res.json().versions[0].url).toContain('X-Amz-Signature');
  });
});
