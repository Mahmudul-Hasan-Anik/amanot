# Performance changes — 10 October 2026

Included in live APK 1.0.5 (Android versionCode 6), built 10 October 2026. Artifact structure/native module checks passed; physical device testing remains.

- Login snapshot no longer downloads audit logs, decided approval history or the 12-month ledger report. Pending approvals remain available for the badge. Transaction preview stays limited to 50 rows.
- Finance, collection and analytics fetch authoritative totals for their selected period when focused. Audit/history load when opened. Loading/error/retry states prevent missing reports appearing as zero balances. Live audit never mixes sample records into real history.
- Settings edits use the server response. Due-day/grace/late-fee and member edits refresh the member directory and server totals, without reloading projects, cash accounts, expenses, notices and approval history. Concurrent edits/full sync fall back to a fresh full snapshot. Logout/account changes reject old responses.
- Home, finance, collection, analytics and projects subscribe to the store fields they use, rather than the entire store. Avatars use React memoization.
- Collection and project lists now use FlatList; member list batching is bounded. Existing transaction history retains keyset pagination and complete scoped exports.
- Private photo URLs reuse an in-memory account-scoped cache for 55 minutes (URLs last 60 minutes). Logout/account changes invalidate the cache, including in-flight results. No financial or NID data is newly persisted.

The member directory remains complete because current totals, member selection and reports depend on it. True server-side member pagination requires moving those consumers to server aggregates/search first; truncating the directory now would give misleading counts. Approval history still loads its complete selected history on demand; audit remains the existing latest-300 view. These are later scaling work, not claimed as completed pagination.

Verification: TypeScript checks; focused-query/filter-race/retry/lock tests; targeted-edit and sync tests; photo cache isolation; ledger loading, keyset pagination, tenant isolation and report export tests; existing authentication/settings regressions. No phone speed benchmark or live database load test has been performed, so no percentage speedup is claimed.

## Follow-up after Android 1.0.5 feedback — included in Android 1.0.6

- Report/ledger results now survive screen blur, return, remount and filter switching. Matching concurrent requests share one promise. Loaded ledger pages are retained. Receipt lookups and annual previews also reuse revision-scoped results.
- The memory cache holds at most 64 entries; account identity and store revision/version are part of its keys. Lock/logout clear it and reject previous in-flight results. Local writes/server revision changes invalidate results; manual retry/refresh can explicitly refetch. The existing five-minute foreground revision/profile check remains, so other-device changes are not detected instantly.
- Registered login no longer repeats check_phone before server authentication. Unactivated or unknown accounts still check registration before activation. Profile and member now use the existing FK relationship in one request, concurrently with session_ready. Server PIN verification, confirmation, active-account checks and the forced PIN-upgrade path remain.
- Tests cover focus/remount/filter reuse with zero additional request count, shared requests, revision invalidation, accumulated pages, manual refresh, error retry, lock/logout, cache bounds, duplicate phone lookup suppression, joined profile/member loading and mandatory PIN changes. TypeScript, existing security/auth/settings/sync tests and local web export passed.

These follow-up changes are included in Android 1.0.6 (versionCode 7), built 10 October 2026. Downloaded APK manifest version and bundled cache/joined-profile markers were verified. A physical phone timing test is still needed; no measured phone speedup is claimed.
