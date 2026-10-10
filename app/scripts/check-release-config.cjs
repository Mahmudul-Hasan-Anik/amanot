const assert = require('node:assert/strict');
const factory = require('../app.config');
const eas = require('../eas.json');
const { withBuildProperties } = require('expo-build-properties');
const keys = ['EAS_BUILD_PROFILE', 'EXPO_PUBLIC_DEMO_MODE', 'EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'];
const previous = Object.fromEntries(keys.map(key => [key, process.env[key]]));
try {
  for (const profile of ['release', 'release-arm64', 'production']) {
    process.env.EAS_BUILD_PROFILE = profile;
    process.env.EXPO_PUBLIC_DEMO_MODE = 'true';
    assert.throws(factory, /Live release requires/);
    process.env.EXPO_PUBLIC_DEMO_MODE = 'false';
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://fixture.supabase.co';
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'fixture-public-key';
    const config = factory();
    const props = config.plugins.find(p => Array.isArray(p) && p[0] === 'expo-build-properties')[1];
    withBuildProperties({ name: config.name, slug: config.slug }, props);
    assert.equal(config.name, 'Amanot');
    assert.deepEqual(props.android.buildArchs, profile === 'release-arm64' ? ['arm64-v8a'] : ['arm64-v8a', 'armeabi-v7a']);
    assert.equal(props.android.enableMinifyInReleaseBuilds, true);
    assert.equal(props.android.enableShrinkResourcesInReleaseBuilds, true);
    assert.equal(props.android.useLegacyPackaging, profile === 'production' ? undefined : true);
    // Hermes startup stays uncompressed; compression is restricted to native APK libraries.
    assert.equal(props.android.enableBundleCompression, undefined);
  }
  assert.equal(eas.build.production.android.buildType, 'app-bundle');
  assert.equal(eas.build['release-arm64'].extends, 'release');
  process.env.EAS_BUILD_PROFILE = 'development';
  const dev = factory().plugins.find(p => Array.isArray(p) && p[0] === 'expo-build-properties')[1];
  assert.equal(dev.android.buildArchs, undefined);
  assert.equal(dev.android.useLegacyPackaging, undefined);
  console.log('PASS release config: live environment gate, ARM/ARM64 profiles, native APK compression, R8/resource shrink, AAB packaging, development architectures retained. No native build performed.');
} finally {
  for (const key of keys) {
    if (previous[key] === undefined) delete process.env[key];
    else process.env[key] = previous[key];
  }
}
