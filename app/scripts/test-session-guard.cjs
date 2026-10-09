// Render the real guard against synthetic auth/sync state. No network or accounts.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const ts = require('typescript'), assert = require('node:assert/strict');
const source = fs.readFileSync(path.join(__dirname, '../src/components/SessionGuard.tsx'), 'utf8');
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText;
function fixture({ remote = true, hydrated = true, ...overrides } = {}) {
  const auth = { isAuthenticated: true, isPinVerified: true, mustChangePin: false, actualRole: 'admin', logout: () => { auth.isAuthenticated = false; }, ...overrides.auth };
  let retries = 0;
  const sync = { lastSyncedAt: null, isSyncing: false, syncError: null, syncFromServer: async () => { retries++; sync.isSyncing = true; }, ...overrides.sync };
  const React = { Fragment: 'Fragment', createElement: (type, props, ...children) => ({ type, props: { ...props, children } }), useState: value => [value, () => {}], useEffect: () => {} };
  const useAuthStore = () => auth;
  useAuthStore.persist = { hasHydrated: () => hydrated, onFinishHydration: () => () => {} };
  const useSomitiStore = selector => selector(sync);
  useSomitiStore.getState = () => sync;
  const exported = {};
  vm.runInNewContext(code, { exports: exported, require: name => {
    if (name === 'react') return { __esModule: true, default: React, ...React };
    if (name === 'expo-router') return { Redirect: 'Redirect' };
    if (name === 'react-native') return { ActivityIndicator: 'Spinner', View: 'View', Text: 'Text', StyleSheet: { create: s => s } };
    if (name.endsWith('/authStore')) return { useAuthStore };
    if (name.endsWith('/somitiStore')) return { REMOTE: remote, useSomitiStore };
    if (name.endsWith('/useLanguage')) return { useLanguage: () => ({ l: en => en }) };
    if (name.endsWith('/colors')) return { colors: {} };
    if (name.endsWith('/typography')) return { typography: { fontFamily: {}, size: {}, lineHeight: {} } };
    if (name === './Button') return { Button: 'Button' };
    throw Error('Unexpected dependency ' + name);
  } });
  const render = (staff = false) => exported.SessionGuard({ children: 'ACCOUNT_SCREEN', staff });
  return { auth, sync, render, retries: () => retries };
}
function nodes(tree, type) {
  if (!tree || typeof tree !== 'object') return [];
  return [...(tree.type === type ? [tree] : []), ...(tree.props?.children || []).flat(Infinity).flatMap(n => nodes(n, type))];
}
function hasScreen(tree) { return JSON.stringify(tree).includes('ACCOUNT_SCREEN'); }
async function main() {
  const f = fixture();
  assert.equal(hasScreen(f.render()), false, 'First render must hide placeholder account information, even before sync starts');
  f.sync.isSyncing = true;
  assert.equal(nodes(f.render(), 'Spinner').length, 1);
  f.sync.lastSyncedAt = Date.now();
  assert.equal(hasScreen(f.render()), true, 'First snapshot opens account screen');
  f.sync.syncError = 'Synthetic background error';
  assert.equal(hasScreen(f.render()), true, 'Background update/error must retain loaded account');
  f.sync.lastSyncedAt = null; f.sync.isSyncing = false;
  const buttons = nodes(f.render(), 'Button');
  assert.deepEqual(buttons.map(b => b.props.title), ['Try again', 'Log out']);
  buttons[0].props.onPress();
  assert.equal(f.retries(), 1);
  assert.equal(nodes(f.render(), 'Spinner').length, 1, 'Retry shows progress instead of stale error');
  f.sync.isSyncing = false;
  nodes(f.render(), 'Button')[1].props.onPress();
  assert.equal(f.render().props.href, '/(auth)/login');
  assert.equal(hasScreen(fixture({ remote: false }).render()), true, 'Demo does not wait for server');
  assert.equal(fixture({ auth: { isPinVerified: false } }).render().props.href, '/(auth)/pin');
  assert.equal(fixture({ auth: { mustChangePin: true } }).render().props.href, '/(auth)/change-pin');
  assert.equal(fixture({ auth: { actualRole: 'member' } }).render(true).props.href, '/(member)');
  assert.equal(hasScreen(fixture({ hydrated: false, sync: { lastSyncedAt: Date.now() } }).render()), false);
  console.log('PASS account readiness: no placeholder dashboard before first snapshot, loaded screen retained during background sync/error, first-load retry/logout, demo and auth/PIN/role/hydration guards.');
}
main().catch(e => { console.error(e); process.exitCode = 1; });
