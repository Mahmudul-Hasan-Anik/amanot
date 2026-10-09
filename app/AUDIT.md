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
- Latest requirement: NID number only; removed NID attachment UI/API. Migration 008 is deployed and restricts the private bucket to profile-photo paths and 120 KB (122,880 bytes). Actual bytes are checked on selection and upload. Existing files are retained; old APKs do not include the updated UI.
- Live-mode login now rejects inactive profiles and demo-role bypass. PIN change/reset failures propagate to the UI. The member dashboard no longer invents balances, payment destinations, notices, paid months or receipts. Live-mode auth-store regression checks pass.
- The signed live APK build (release profile, version 1.0.1/code 2) finished successfully. Production EAS public environment is configured and release config rejects missing backend/demo mode. GitHub database health checks are configured three times daily; the first manual run passed. Hosted read-only database/permission checks passed without posting money or changing credentials.

## Verification and remaining work

The accounting suite now passes 18 checks in disposable PostgreSQL/PGlite, including NID attachment denial, profile upload permissions and bucket size configuration. Six separate checks exercise the actual photo validator's exact-size boundary, oversized/empty data and supported/invalid formats. TypeScript and token checks pass. The auth/storage scaffolding and hashing stubs do not validate hosted authentication or actual Storage service byte-limit enforcement. Live SQL verification confirms the private bucket's 122,880-byte setting. Web demo OTP/PIN login and a CSV download were exercised previously.

Current launch scope is Android only, using Supabase Free; iOS comes later. Public web hosting is not required. Before member rollout: verify real hosted login with the owner, harden PIN onboarding/attempt limits, reconcile legacy yearless dues, complete Android device checks, verify independent backup recovery, and review inherited dependency advisories (11 moderate, 15 high, zero critical in the current production dependency audit). Real SMS and push notifications are deferred. WhatsApp prepares a message for manual sending. Preview APK data is local demo data; do not use it as the live ledger. See `../ANDROID_RELEASE.md` for delivery details and `../IMPLEMENTATION_PLAN.md` for the ordered launch plan.
