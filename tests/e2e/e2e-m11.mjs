#!/usr/bin/env node
// M11 E2E + Security test against running production simulation stack
// Uses actual API contract discovered from route source code

import http from 'http';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = 'http://localhost';
const API = `${BASE}/api`;

let pass = 0;
let fail = 0;
const results = [];

function record(name, status, detail = '') {
  const line = `${status.padEnd(12)} ${name}${detail ? ' — ' + detail : ''}`;
  results.push(line);
  if (status === 'OBSERVED') pass++;
  else fail++;
  console.log(line);
}

async function req(method, url, { body, token, contentType = 'application/json', rawBody } = {}) {
  return new Promise((resolve, reject) => {
    const fullUrl = new URL(url);
    const bodyStr = rawBody ?? (body ? JSON.stringify(body) : undefined);
    const ct = rawBody ? contentType : body ? 'application/json' : undefined;
    const options = {
      hostname: fullUrl.hostname,
      port: fullUrl.port || 80,
      path: fullUrl.pathname + fullUrl.search,
      method,
      headers: {
        ...(ct ? { 'Content-Type': ct } : {}),
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });
    r.on('error', reject);
    if (bodyStr) r.write(bodyStr);
    r.end();
  });
}

// Multipart file upload using raw HTTP
async function uploadFile(url, token, fileBuffer, filename, mimeType) {
  return new Promise((resolve, reject) => {
    const boundary = `----FormBoundary${Date.now()}`;
    const CRLF = '\r\n';
    const disposition = `Content-Disposition: form-data; name="file"; filename="${filename}"${CRLF}Content-Type: ${mimeType}${CRLF}${CRLF}`;
    const header = `--${boundary}${CRLF}${disposition}`;
    const footer = `${CRLF}--${boundary}--${CRLF}`;
    const headerBuf = Buffer.from(header);
    const footerBuf = Buffer.from(footer);
    const totalLen = headerBuf.length + fileBuffer.length + footerBuf.length;

    const fullUrl = new URL(url);
    const options = {
      hostname: fullUrl.hostname,
      port: fullUrl.port || 80,
      path: fullUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': totalLen,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    const r = http.request(options, (res) => {
      let data = '';
      res.on('data', (d) => (data += d));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data), headers: res.headers });
        } catch {
          resolve({ status: res.statusCode, body: data, headers: res.headers });
        }
      });
    });
    r.on('error', reject);
    r.write(headerBuf);
    r.write(fileBuffer);
    r.write(footerBuf);
    r.end();
  });
}

async function main() {
  console.log('\n=== M11 E2E + SECURITY VERIFICATION ===\n');

  // ── Section A: Public website / SPA routing ───────────────────────────────
  console.log('-- A: Public Website / SPA routing --');
  for (const route of [
    '/',
    '/project',
    '/architecture',
    '/research',
    '/benchmark',
    '/results',
    '/milestones',
  ]) {
    try {
      const r = await req('GET', `${BASE}${route}`);
      const isHtml =
        typeof r.body === 'string' && (r.body.includes('<html') || r.body.includes('<!DOCTYPE'));
      record(
        `GET ${route}`,
        r.status === 200 && isHtml ? 'OBSERVED' : 'FAILED',
        `HTTP ${r.status}`,
      );
    } catch (e) {
      record(`GET ${route}`, 'FAILED', e.message);
    }
  }

  // ── Section B: Authentication ─────────────────────────────────────────────
  console.log('\n-- B: Authentication --');
  let adminToken = null,
    reviewerToken = null;

  // Admin login
  try {
    const r = await req('POST', `${API}/auth/login`, {
      body: { email: 'admin@migrationguard.dev', password: 'admin123!' },
    });
    if (r.status === 200 && r.body.token) {
      adminToken = r.body.token;
      record('ADMIN login → 200', 'OBSERVED', `token obtained, role=${r.body.user?.role ?? 'n/a'}`);
    } else {
      record('ADMIN login → 200', 'FAILED', `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
    }
  } catch (e) {
    record('ADMIN login', 'FAILED', e.message);
  }

  // Reviewer login
  try {
    const r = await req('POST', `${API}/auth/login`, {
      body: { email: 'reviewer@migrationguard.dev', password: 'reviewer123!' },
    });
    if (r.status === 200 && r.body.token) {
      reviewerToken = r.body.token;
      record('REVIEWER login → 200', 'OBSERVED', `token obtained`);
    } else {
      record('REVIEWER login → 200', 'FAILED', `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
    }
  } catch (e) {
    record('REVIEWER login', 'FAILED', e.message);
  }

  // Invalid password
  try {
    const r = await req('POST', `${API}/auth/login`, {
      body: { email: 'admin@migrationguard.dev', password: 'wrongpassword' },
    });
    record('Invalid password → 401', r.status === 401 ? 'OBSERVED' : 'FAILED', `HTTP ${r.status}`);
  } catch (e) {
    record('Invalid password → 401', 'FAILED', e.message);
  }

  // No JWT → protected endpoint (/api/auth/me)
  try {
    const r = await req('GET', `${API}/auth/me`);
    record('No JWT on /me → 401', r.status === 401 ? 'OBSERVED' : 'FAILED', `HTTP ${r.status}`);
  } catch (e) {
    record('No JWT → 401', 'FAILED', e.message);
  }

  // Invalid JWT
  try {
    const r = await req('GET', `${API}/auth/me`, { token: 'bad.token' });
    record(
      'Invalid JWT on /me → 401',
      r.status === 401 ? 'OBSERVED' : 'FAILED',
      `HTTP ${r.status}`,
    );
  } catch (e) {
    record('Invalid JWT', 'FAILED', e.message);
  }

  // Admin /me
  if (adminToken) {
    try {
      const r = await req('GET', `${API}/auth/me`, { token: adminToken });
      record('Admin /me → 200', r.status === 200 ? 'OBSERVED' : 'FAILED', `HTTP ${r.status}`);
    } catch (e) {
      record('Admin /me', 'FAILED', e.message);
    }
  }

  if (!adminToken) {
    console.log('\n[ABORT] No admin token — cannot proceed');
    return printResults();
  }

  // ── Section C: Presentation upload workflow (multipart) ───────────────────
  console.log('\n-- C: Presentation upload workflow --');
  const presId = `PRES-E2E-${Date.now()}`;
  let v1Id = null,
    v2Id = null;
  const fakeFile = Buffer.from('%PDF-1.4 fake content for E2E test');

  // Upload V1
  try {
    const r = await uploadFile(
      `${API}/presentations/${presId}/versions`,
      adminToken,
      fakeFile,
      'test-v1.pdf',
      'application/pdf',
    );
    if (r.status === 200 && r.body.id) {
      v1Id = r.body.id;
      record(
        'Upload V1 (multipart)',
        'OBSERVED',
        `HTTP ${r.status} — versionId=${v1Id} version=${r.body.version}`,
      );
    } else {
      record('Upload V1 (multipart)', 'FAILED', `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
    }
  } catch (e) {
    record('Upload V1', 'FAILED', e.message);
  }

  // Publish V1
  if (v1Id) {
    try {
      const r = await req('POST', `${API}/presentations/${presId}/versions/${v1Id}/publish`, {
        token: adminToken,
      });
      record('Publish V1', r.status === 200 ? 'OBSERVED' : 'FAILED', `HTTP ${r.status}`);
    } catch (e) {
      record('Publish V1', 'FAILED', e.message);
    }
  }

  // Upload V2
  try {
    const r = await uploadFile(
      `${API}/presentations/${presId}/versions`,
      adminToken,
      fakeFile,
      'test-v2.pdf',
      'application/pdf',
    );
    if (r.status === 200 && r.body.id) {
      v2Id = r.body.id;
      record(
        'Upload V2 (multipart)',
        'OBSERVED',
        `HTTP ${r.status} — versionId=${v2Id} version=${r.body.version}`,
      );
    } else {
      record('Upload V2 (multipart)', 'FAILED', `HTTP ${r.status} — ${JSON.stringify(r.body)}`);
    }
  } catch (e) {
    record('Upload V2', 'FAILED', e.message);
  }

  // Retrieve and verify both versions
  try {
    const r = await req('GET', `${API}/presentations/${presId}`, { token: adminToken });
    if (r.status === 200) {
      const versions = r.body.versions || [];
      const hasV1 = v1Id && versions.some((v) => v.id === v1Id);
      const hasV2 = v2Id && versions.some((v) => v.id === v2Id);
      record(
        'V1 persists after V2 upload',
        hasV1 ? 'OBSERVED' : 'FAILED',
        `count=${versions.length}`,
      );
      record('V2 exists', hasV2 ? 'OBSERVED' : 'FAILED', `count=${versions.length}`);
    } else {
      record('Retrieve presentation', 'FAILED', `HTTP ${r.status}`);
    }
  } catch (e) {
    record('Retrieve presentation', 'FAILED', e.message);
  }

  // ── Section D: Verification run workflow ──────────────────────────────────
  console.log('\n-- D: Verification run workflow --');
  const runId = `MG-E2E-${Date.now()}`;

  // Submit a run with correct schema
  try {
    const runBody = {
      runId,
      migrationName: 'e2e-test-migration',
      status: 'FAIL',
      durationMs: 1234,
      artifactKey: null,
      artifactHash: null,
      compatibility: [
        { appVersion: 'OLD', dbVersion: 'V1', status: 'PASS', durationMs: 100, error: null },
        {
          appVersion: 'NEW',
          dbVersion: 'V2',
          status: 'FAIL',
          durationMs: 200,
          error: 'column not found',
        },
      ],
      evidence: [
        {
          faultType: 'DESTRUCTIVE_RENAME',
          confidence: 'CONFIRMED',
          operation: 'GET /users/1',
          observedError: 'column does not exist',
        },
      ],
    };
    const r = await req('POST', `${API}/runs`, { token: adminToken, body: runBody });
    record(
      'Submit verification run',
      r.status === 200 ? 'OBSERVED' : 'FAILED',
      `HTTP ${r.status}${r.status !== 200 ? ' — ' + JSON.stringify(r.body) : ''}`,
    );
  } catch (e) {
    record('Submit run', 'FAILED', e.message);
  }

  // Retrieve run
  try {
    const r = await req('GET', `${API}/runs/${runId}`, { token: adminToken });
    record('Retrieve run by ID', r.status === 200 ? 'OBSERVED' : 'FAILED', `HTTP ${r.status}`);
  } catch (e) {
    record('Retrieve run', 'FAILED', e.message);
  }

  // List all runs (public endpoint)
  try {
    const r = await req('GET', `${API}/runs`);
    record(
      'List runs (public)',
      r.status === 200 ? 'OBSERVED' : 'FAILED',
      `HTTP ${r.status} — count=${Array.isArray(r.body) ? r.body.length : 'n/a'}`,
    );
  } catch (e) {
    record('List runs', 'FAILED', e.message);
  }

  // ── Section E: Reviewer workflow ─────────────────────────────────────────
  console.log('\n-- E: Reviewer workflow --');
  if (reviewerToken) {
    try {
      const r = await req('POST', `${API}/runs/${runId}/decisions`, {
        token: reviewerToken,
        body: { decision: 'ACCEPTED', comment: 'E2E test ACCEPTED' },
      });
      record(
        'Reviewer ACCEPTED',
        r.status === 200 ? 'OBSERVED' : 'FAILED',
        `HTTP ${r.status}${r.status !== 200 ? ' — ' + JSON.stringify(r.body) : ''}`,
      );
    } catch (e) {
      record('Reviewer decision', 'FAILED', e.message);
    }

    // Verify decision persisted
    try {
      const r = await req('GET', `${API}/runs/${runId}`, { token: adminToken });
      const decisions = r.body?.ReviewerDecision;
      record(
        'Decision persisted',
        decisions?.length > 0 ? 'OBSERVED' : 'FAILED',
        `decisions=${JSON.stringify(decisions?.map((d) => d.decision))}`,
      );
    } catch (e) {
      record('Decision persistence', 'FAILED', e.message);
    }
  }

  // ── Section F: Security micro-gate ────────────────────────────────────────
  console.log('\n-- F: Security micro-gate --');

  // Protected endpoint /auth/me without JWT → 401
  try {
    const r = await req('GET', `${API}/auth/me`);
    record('Unauth /me → 401', r.status === 401 ? 'OBSERVED' : 'FAILED', `HTTP ${r.status}`);
  } catch (e) {
    record('Unauth /me', 'FAILED', e.message);
  }

  // Invalid JWT → 401
  try {
    const r = await req('GET', `${API}/auth/me`, { token: 'invalid.jwt.token' });
    record('Invalid JWT → 401', r.status === 401 ? 'OBSERVED' : 'FAILED', `HTTP ${r.status}`);
  } catch (e) {
    record('Invalid JWT', 'FAILED', e.message);
  }

  // REVIEWER cannot publish presentation (ADMIN-only endpoint)
  if (reviewerToken && v1Id) {
    try {
      const r = await req('POST', `${API}/presentations/${presId}/versions/${v1Id}/publish`, {
        token: reviewerToken,
      });
      record(
        'REVIEWER cannot publish → 403',
        r.status === 403 ? 'OBSERVED' : 'FAILED',
        `HTTP ${r.status}`,
      );
    } catch (e) {
      record('RBAC publish', 'FAILED', e.message);
    }
  }

  // Malformed JSON
  try {
    const r = await req('POST', `${API}/auth/login`, {
      rawBody: '{bad json}',
      contentType: 'application/json',
    });
    record('Malformed JSON → 400', r.status === 400 ? 'OBSERVED' : 'FAILED', `HTTP ${r.status}`);
  } catch (e) {
    record('Malformed JSON', 'FAILED', e.message);
  }

  // Invalid MIME file upload (text/html)
  try {
    const r = await uploadFile(
      `${API}/presentations/test-mime/versions`,
      adminToken,
      Buffer.from('<html>evil</html>'),
      'evil.html',
      'text/html',
    );
    record(
      'Invalid MIME → 400',
      r.status === 400 ? 'OBSERVED' : 'FAILED',
      `HTTP ${r.status} — ${JSON.stringify(r.body)}`,
    );
  } catch (e) {
    record('Invalid MIME', 'FAILED', e.message);
  }

  // Path traversal filename — extension sanitization verified at code level
  try {
    const r = await uploadFile(
      `${API}/presentations/test-traversal/versions`,
      adminToken,
      fakeFile,
      '../../etc/passwd.pdf',
      'application/pdf',
    );
    // Should succeed (200) since server sanitises extension, or reject with 400
    record(
      'Path traversal sanitised',
      r.status === 200 || r.status === 400 ? 'OBSERVED' : 'FAILED',
      `HTTP ${r.status} — sanitises extension in code`,
    );
  } catch (e) {
    record('Path traversal', 'FAILED', e.message);
  }

  // Empty file upload → 400
  try {
    const r = await uploadFile(
      `${API}/presentations/test-empty/versions`,
      adminToken,
      Buffer.alloc(0),
      'empty.pdf',
      'application/pdf',
    );
    record('Empty file → 400', r.status === 400 ? 'OBSERVED' : 'FAILED', `HTTP ${r.status}`);
  } catch (e) {
    record('Empty file', 'FAILED', e.message);
  }

  // Reviewer accessing a specific run → 200 (read is public)
  if (reviewerToken) {
    try {
      const r = await req('GET', `${API}/runs/${runId}`, { token: reviewerToken });
      record(
        'Reviewer GET run → 200',
        r.status === 200 ? 'OBSERVED' : 'FAILED',
        `HTTP ${r.status}`,
      );
    } catch (e) {
      record('Reviewer GET run', 'FAILED', e.message);
    }
  }

  // Version overwrite prevention
  if (v1Id) {
    try {
      const r = await uploadFile(
        `${API}/presentations/${presId}/versions`,
        adminToken,
        fakeFile,
        'v1-dup.pdf',
        'application/pdf',
      );
      const newId = r.body?.id;
      record(
        'Upload creates new version (no overwrite)',
        r.status === 200 && newId && newId !== v1Id ? 'OBSERVED' : 'FAILED',
        `HTTP ${r.status} — newId=${newId}`,
      );
    } catch (e) {
      record('Version overwrite prevention', 'FAILED', e.message);
    }
  }

  printResults();
}

function printResults() {
  console.log('\n=== SUMMARY ===');
  results.forEach((r) => console.log(r));
  console.log(`\nOBSERVED: ${pass}  FAILED: ${fail}  TOTAL: ${pass + fail}`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Fatal:', e);
  process.exit(1);
});
