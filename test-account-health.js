#!/usr/bin/env node

/**
 * Quick Account-MS Health Test
 */

const https = require('https');

console.log('Testing Account-MS connectivity...\n');

const raw = (process.env.NEXT_PUBLIC_API_URL || 'https://account-ms-plata.fly.dev').trim().replace(/\/+$/, '');
const withProtocol = raw.startsWith('http') ? raw : `https://${raw}`;
const baseUrl = new URL(withProtocol);

const options = {
  hostname: baseUrl.hostname,
  port: baseUrl.port ? Number(baseUrl.port) : 443,
  path: '/health',
  method: 'GET',
  timeout: 30000,
};

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log('✅ SUCCESS');
    console.log('Status Code:', res.statusCode);
    console.log('Response:', data);
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.log('❌ ERROR:', e.message);
  process.exit(1);
});

req.on('timeout', () => {
  console.log('❌ TIMEOUT');
  req.destroy();
  process.exit(1);
});

req.end();
