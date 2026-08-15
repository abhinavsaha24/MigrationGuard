import * as crypto from 'crypto';

const apiBase = 'http://localhost';
let adminToken = '';
const testPresentationId = 'pres-boundary-test-' + Date.now();

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

async function uploadFile(name, sizeBytes, mimetype = 'application/json') {
  let buffer;
  if (sizeBytes > 0) {
    buffer = Buffer.alloc(sizeBytes, 'a'); // allocate string 'a'
  } else {
    buffer = Buffer.alloc(0);
  }

  const blob = new Blob([buffer], { type: mimetype });
  const form = new FormData();
  form.set('file', blob, name);

  return fetch(`${apiBase}/api/presentations/${testPresentationId}/versions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: form,
  });
}

async function runTest() {
  console.log('--- Upload Boundary Test ---');
  await login();
  console.log(`Test Presentation ID: ${testPresentationId}`);

  // Test 1: Empty file
  console.log('\nTesting empty file (0 bytes)...');
  const resEmpty = await uploadFile('empty.bin', 0);
  console.log(`Status: ${resEmpty.status}`);
  if (resEmpty.status !== 400) throw new Error('Expected 400 for empty file');

  // Test 2: Invalid MIME type
  console.log('\nTesting invalid MIME type (text/plain)...');
  const resMime = await uploadFile('invalid.txt', 10, 'text/plain');
  console.log(`Status: ${resMime.status}`);
  if (resMime.status !== 400) throw new Error('Expected 400 for invalid MIME type');

  // Test 3: Below limit (49MB)
  console.log('\nTesting below limit (49MB)...');
  const res49 = await uploadFile('49mb.bin', 49 * 1024 * 1024);
  console.log(`Status: ${res49.status}`);
  if (res49.status !== 200) throw new Error('Expected 200 for 49MB file');

  // Test 4: Exactly limit (50MB) - note this can be tricky because Fastify/multipart counts boundaries in payload size,
  // but we can try exact 50MB. Actually let's use 50 * 1024 * 1024 - 1000 to be safe for headers.
  console.log('\nTesting just below limit (~50MB)...');
  const res50 = await uploadFile('50mb.bin', 50 * 1024 * 1024 - 5000);
  console.log(`Status: ${res50.status}`);
  if (res50.status !== 200) throw new Error('Expected 200 for ~50MB file');

  // Test 5: Above limit (51MB)
  console.log('\nTesting above limit (51MB)...');
  const res51 = await uploadFile('51mb.bin', 51 * 1024 * 1024);
  console.log(`Status: ${res51.status}`);
  if (res51.status !== 413) throw new Error('Expected 413 for 51MB file');

  console.log('\nSUCCESS: All upload boundaries verified.');
}

runTest().catch((e) => {
  console.error(e);
  process.exit(1);
});
