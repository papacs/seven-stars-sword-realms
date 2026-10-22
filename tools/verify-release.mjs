// Compare the deployed entry and story chunks with the local production build.
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const base = process.env.RELEASE_URL ?? 'https://play1.heyluckyme.com/';
const dist = new URL('../dist/', import.meta.url);
const html = readFileSync(new URL('index.html', dist));
const entry = html.toString().match(/<script\b[^>]*\bsrc="([^"]+\.js)"/)[1];
const assets = readdirSync(new URL('assets/', dist)).filter(name => name.startsWith('chapter-'));
const files = ['index.html', entry.replace(/^\//, ''), ...assets.map(name => `assets/${name}`)];

for (const file of files) {
  const url = new URL(file === 'index.html' ? './' : file, base);
  url.searchParams.set('release-check', Date.now());
  const response = await fetch(url, { headers: { 'cache-control': 'no-cache' }, signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200, `${file}: HTTP ${response.status}`);
  const remote = Buffer.from(await response.arrayBuffer());
  assert.ok(remote.equals(readFileSync(new URL(file, dist))), `${file}: deployed content differs from local build`);
  console.log(`MATCH ${file} sha256=${createHash('sha256').update(remote).digest('hex').slice(0, 16)}`);
}
console.log(`Verified ${base}: ${files.length} files match the tested production build.`);
