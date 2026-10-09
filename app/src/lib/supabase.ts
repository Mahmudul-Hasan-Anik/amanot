import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
    storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// ---------------------------------------------------------------------------
// Phone + PIN login on top of Supabase email/password auth.
// Must match public.pin_password() in supabase/schema.sql.
// ---------------------------------------------------------------------------
const BN_DIGITS = '০১২৩৪৫৬৭৮৯';
const toEn = (s: string) => s.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));

/** any BD number format -> 01XXXXXXXXX */
export function normalizePhone(raw: string): string {
  const d = toEn(raw || '').replace(/\D/g, '');
  return d.length >= 10 ? '0' + d.slice(-10) : d;
}

export const PHONE_EMAIL_DOMAIN = 'member.amanot.app';
export const phoneToEmail = (phone: string) => `${normalizePhone(phone)}@${PHONE_EMAIL_DOMAIN}`;
export const pinToPassword = (pin: string) => `amanot:${toEn(pin || '').replace(/\D/g, '')}`;
