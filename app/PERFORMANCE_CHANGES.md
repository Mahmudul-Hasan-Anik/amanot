# Performance changes — 10 October 2026

Implemented in source; the existing 1.0.4 APK has not been rebuilt.

- Login snapshot no longer downloads audit logs, decided approval history or the 12-month ledger report. Pending approvals remain available for the badge. Transaction preview stays limited to 50 rows.
- Finance, collection and analytics fetch authoritative totals for their selected period when focused. Audit/history load when opened. Loading/error/retry states prevent missing reports appearing as zero balances. Live audit never mixes sample records into real history.
- Settings edits use the server response. Due-day/grace/late-fee and member edits refresh the member directory and server totals, without reloading projects, cash accounts, expenses, notices and approval history. Concurrent edits/full sync fall back to a fresh full snapshot. Logout/account changes reject old responses.
- Home, finance, collection, analytics and projects subscribe to the store fields they use, rather than the entire store. Avatars use React memoization.
- Collection and project lists now use FlatList; member list batching is bounded. Existing transaction history retains keyset pagination and complete scoped exports.
- Private photo URLs reuse an in-memory account-scoped cache for 55 minutes (URLs last 60 minutes). Logout/account changes invalidate the cache, including in-flight results. No financial or NID data is newly persisted.

The member directory remains complete because current totals, member selection and reports depend on it. True server-side member pagination requires moving those consumers to server aggregates/search first; truncating the directory now would give misleading counts. Approval history still loads its complete selected history on demand; audit remains the existing latest-300 view. These are later scaling work, not claimed as completed pagination.

Verification: TypeScript checks; focused-query/filter-race/retry/lock tests; targeted-edit and sync tests; photo cache isolation; ledger loading, keyset pagination, tenant isolation and report export tests; existing authentication/settings regressions. No phone speed benchmark or live database load test has been performed, so no percentage speedup is claimed.
