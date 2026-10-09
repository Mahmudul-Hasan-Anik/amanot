# Amanot audit — 9 October 2026

Amanot manages association members, savings collections, dues, expenses, projects, balances and annual profit distribution. The app uses Expo/React Native for web and Android, with Supabase authentication, SQL functions and private storage.

## Addressed

- Tightened OTP/PIN checks, Bengali phone normalization, session guards and live/demo cache separation.
- Made important writes wait for server confirmation and expose errors rather than showing premature success.
- Added atomic posting, duplicate protection, year-aware dues, partial payments, fee separation and balance checks.
- Corrected project principal recovery and annual realized-profit allocation; protected the last super administrator.
- Added actual PDF/CSV exports, statements and analytics, and removed live empty-list mock fallbacks.
- Added private member-document uploads and server-only SMS configuration; simulated messaging is clearly labelled.
- Exported separate live/demo web bundles and built Android preview APKs through EAS.
- Deployed migrations 004–007 and `send-sms` to the matching live Supabase project, preserving the existing ledger.

## Verification and remaining work

The accounting suite passed 17 checks in disposable PostgreSQL/PGlite. It includes accounting, authorization, immutable ledger and private deployment-backup checks. Its auth/storage scaffolding and hashing stubs do not validate hosted authentication or delivery services. Web demo OTP/PIN login and a CSV download were exercised in the browser.

Before member rollout: verify real hosted login with the owner, reconcile legacy yearless dues, test the APK on Android, select public HTTPS hosting, configure and test a real SMS provider, and resolve inherited dependency advisories. Push notifications are not implemented. WhatsApp prepares a message for manual sending. Preview APK data is local demo data; do not use it as the live ledger.
