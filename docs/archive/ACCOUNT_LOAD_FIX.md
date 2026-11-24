# Android account loading fix — deployed

The installed 1.0.3 APK reaches Supabase and authenticates. On 10 October 2026,
18:19–18:21 Asia/Dhaka, account sync failed because `get_somiti_summary` returned
HTTP 403 / PostgreSQL 42501: `permission denied for schema auth`. Other sync
endpoints returned 200. The displayed internet warning is misleading in this case.

Live read-only inspection confirmed that `amanot_rpc` has no auth schema usage.
Five RPCs owned by that role directly call `auth.uid()`:
`approve_request`, `auto_approve_eligible`, `get_somiti_summary`, `log_sms`,
and `reject_request`.

Migration 015 replaces that call only within these five named RPCs with a
postgres-owned helper returning the current request's UID. Only `amanot_rpc`
may execute the helper; anonymous and authenticated clients cannot call it
directly. It grants no access to Auth tables or schema and preserves tenant
checks, RPC signatures, ownership and existing client permissions.

Local regression coverage reproduces the hosted restriction, applies the fix
twice, checks that Auth access remains denied, and tests anonymous and
authenticated access alongside the existing tenant/accounting scenarios.

Deployment status: DEPLOYED on 10 October 2026 after the user explicitly approved
the live fix. Supabase SQL Editor reported success. Read-only live checks verified
all five RPCs use the helper, version 015 is recorded, Auth schema/table access
remains denied, direct authenticated helper execution remains denied, and calling
the summary without a session fails authentication without the auth-schema error.
All 35 local accounting checks passed.

An attempted read-only test using existing sessions found no eligible session;
authenticated summary loading on the phone remains unverified. Retry on the
existing APK, logging in again if needed. A rebuild should not be necessary for
this backend error. No member or accounting records were changed by the fix.
