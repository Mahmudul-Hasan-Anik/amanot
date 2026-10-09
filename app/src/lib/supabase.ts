import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { sessionStorage } from './sessionStorage';
import { Platform } from 'react-native';

// Read from Expo public environment variables (app/.env)
const envUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const envKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const forceDemo = process.env.EXPO_PUBLIC_DEMO_MODE === 'true';

const supabaseUrl = envUrl || 'https://demo-amanot-somiti.supabase.co';
const supabaseAnonKey = envKey || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

/** true when a real Supabase project is configured — otherwise the app runs on local demo data */
export const isSupabaseConfigured = (): boolean =>
  !forceDemo && !!envUrl && !!envKey && !envUrl.includes('demo-') && !envUrl.includes('your-project-id');

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ---------------------------------------------------------------------------
// Phone + PIN login on top of Supabase email/password auth.
// Must match public.pin_password() in supabase/schema.sql.
// ---------------------------------------------------------------------------
export { normalizePhone, isValidPhone, PHONE_EMAIL_DOMAIN, phoneToEmail, pinToPassword } from './phoneAuth';
