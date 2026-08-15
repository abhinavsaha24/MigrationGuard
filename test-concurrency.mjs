import { execSync } from 'child_process';
import * as crypto from 'crypto';
import http from 'http';

const apiBase = 'http://localhost';
let adminToken = '';
const testPresentationId = 'pres-concurrent-test-' + Date.now();

async function login() {
  const res = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@migrationguard.dev', password: 'admin123!' }),
  });
  if (!res.ok) throw new Error('Failed to login');
  const data = await res.json();
  adminToken = data.token;
}

async function uploadConcurrent(label) {
  return new Promise((resolve, reject) => {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const postData = Buffer.concat([
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${label}.bin"\r\nContent-Type: application/json\r\n\r\n`,
      ),
      Buffer.alloc(10),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const req = http.request(
      `${apiBase}/api/presentations/${testPresentationId}/versions`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': postData.length,
        },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, text: () => Promise.resolve(data) }));
      },
    );

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function runTest() {
  console.log('--- Concurrency Race Test ---');
  await login();
  console.log(`Test Presentation ID: ${testPresentationId}`);

  // We are firing two requests simultaneously without awaiting the first
  console.log('Firing Request A and Request B concurrently...');
  const [resA, resB] = await Promise.all([uploadConcurrent('A'), uploadConcurrent('B')]);

  console.log(`Request A: ${resA.status} - ${await resA.text()}`);
  console.log(`Request B: ${resB.status} - ${await resB.text()}`);

  if (resA.status === 200 && resB.status === 409) {
    console.log(
      'SUCCESS: Concurrency test passed. Request B was aborted to prevent race condition.',
    );
    return;
  } else if (resA.status === 409 && resB.status === 200) {
    console.log(
      'SUCCESS: Concurrency test passed. Request A was aborted to prevent race condition.',
    );
    return;
  } else if (resA.status === 200 && resB.status === 200) {
    // Both succeeded. Fetch the presentation and ensure versions 1 and 2 exist (no duplicates)
    const verifyRes = await fetch(`${apiBase}/api/presentations/${testPresentationId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (!verifyRes.ok) throw new Error('Failed to fetch presentation after race');
    const verifyData = await verifyRes.json();

    const versions = verifyData.versions.map((v) => v.version).sort((a, b) => a - b);
    console.log(`Final Database Version Count: ${versions.length}`);
    console.log(`Final Database Version Numbers: ${versions.join(', ')}`);

    if (versions.length === 2 && versions[0] === 1 && versions[1] === 2) {
      console.log(
        'SUCCESS: Concurrency test passed. Both queued successfully, invariant maintained: unique and monotonically increasing versions.',
      );
      return;
    } else {
      console.error(
        'FAIL: Invariant broken. Versions were not unique and monotonically increasing.',
      );
      process.exit(1);
    }
  } else {
    console.error(`FAIL: Unexpected status combination. A: ${resA.status}, B: ${resB.status}`);
    process.exit(1);
  }
}

runTest().catch((e) => {
  console.error(e);
  process.exit(1);
});
