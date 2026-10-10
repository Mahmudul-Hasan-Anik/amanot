const app = require('./app.json').expo;

// Fail the remote release build instead of accidentally shipping demo mode.
module.exports = () => {
  const profile = process.env.EAS_BUILD_PROFILE;
  const release = ['release', 'release-arm64', 'production'].includes(profile);
  if (release) {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (process.env.EXPO_PUBLIC_DEMO_MODE !== 'false' || !url?.startsWith('https://') || /demo-|your-project-id/.test(url) || !key || key.includes('dummy')) {
      throw new Error('Live release requires EXPO_PUBLIC_DEMO_MODE=false and the production Supabase URL/public key.');
    }
  }
  return {...app,plugins:[...(app.plugins||[]),['expo-build-properties',{android:{
    ...(release ? {buildArchs: profile === 'release-arm64' ? ['arm64-v8a'] : ['arm64-v8a','armeabi-v7a']} : {}),
    // Direct APK download: compress .so files. Play AAB keeps modern packaging.
    ...(['release', 'release-arm64'].includes(profile) ? {useLegacyPackaging:true} : {}),
    enableMinifyInReleaseBuilds:true,enableShrinkResourcesInReleaseBuilds:true,
  }}]]};
};
