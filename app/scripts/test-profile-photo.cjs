const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/lib/profilePhoto.ts'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
const exported = {};
let payload;
vm.runInNewContext(code, {
  exports: exported,
  require: (name) => {
    if (name === 'react-native') return { Platform: { OS: 'web' } };
    if (name === 'expo-file-system') return {};
    throw new Error(`Unexpected import: ${name}`);
  },
  fetch: async () => ({ arrayBuffer: async () => payload.buffer }),
  Uint8Array,
});
async function main() {
  const limit = exported.MAX_PROFILE_PHOTO_BYTES;
  payload = new Uint8Array(limit); payload.set([255, 216, 255]);
  assert.equal((await exported.readProfilePhoto('test')).bytes.length, limit);
  payload = new Uint8Array(limit + 1); payload.set([255, 216, 255]);
  await assert.rejects(() => exported.readProfilePhoto('test'), /120 KB/);
  payload = new Uint8Array(0);
  await assert.rejects(() => exported.readProfilePhoto('test'), /120 KB/);
  payload = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal((await exported.readProfilePhoto('test')).contentType, 'image/png');
  payload = new Uint8Array(Buffer.from('RIFF0000WEBP'));
  assert.equal((await exported.readProfilePhoto('test')).contentType, 'image/webp');
  payload = new Uint8Array(Buffer.from('not-an-image'));
  await assert.rejects(() => exported.readProfilePhoto('test'), /JPEG/);
  console.log('PASS 6 profile-photo checks: exact limit, oversize, empty, PNG, WebP, invalid format');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
