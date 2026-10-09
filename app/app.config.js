const app = require('./app.json').expo;

// Fail the remote release build instead of accidentally shipping demo mode.
module.exports = () => {
  if (['release', 'production'].includes(process.env.EAS_BUILD_PROFILE)) {
    const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const key = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    if (process.env.EXPO_PUBLIC_DEMO_MODE !== 'false' || !url?.startsWith('https://') || /demo-|your-project-id/.test(url) || !key || key.includes('dummy')) {
      throw new Error('Live release requires EXPO_PUBLIC_DEMO_MODE=false and the production Supabase URL/public key.');
    }
  }
  return app;
};
