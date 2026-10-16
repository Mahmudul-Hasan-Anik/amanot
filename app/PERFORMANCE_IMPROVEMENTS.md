# Performance and usability changes — 2026-10-16

Implemented after the read-only UI/performance audit. No production schema change and no APK rebuild in this task.

## Login and PIN

- The complete PIN immediately shows a spinner and disables the keypad, PIN-length switch and forgot-PIN action. A synchronous ref prevents repeated submission before React renders the disabled state.
- After eight seconds the status explains that verification is taking longer. No fake progress percentage or automatic repeat of a PIN attempt is used.
- Request failures reset the PIN and re-enable entry. Responses from an unmounted screen or another phone cannot navigate or show an error.
- The PIN screen scrolls on short screens and with larger text.
- A matching, unexpired local session is only a candidate for unlocking. `confirm_pin_session` still checks active membership, server-side session existence, credential-change timestamp, PIN hash and attempt limits before it grants access. Profile/readiness checks still follow.
- Successful unlock uses one PIN RPC instead of precheck → password authentication → PIN confirmation (two fewer network requests). Fresh login and expired/mismatched sessions keep the original authentication path. Explicit server rejection of an obsolete session also uses fresh login. Wrong PIN, lockout and network failures never trigger an additional password/PIN attempt.
- First-load feedback distinguishes required backend updates and session/permission failures from a generic loading failure. Retry and logout remain available after failure. Background sync keeps existing account data visible.

## Account loading and UI

- Initial snapshot loading no longer waits for private avatar URLs. The complete financial snapshot publishes first; initials remain visible until photos load. Photo failure does not block the account.
- Late avatar responses are discarded after logout, lock, account/role change or a newer data version.
- Existing query-cache, revision reuse, request deduplication, authoritative financial totals and ledger pagination remain in use.
- PIN unlock asks for revision-checked synchronization instead of forcing every table to reload. A complete, unchanged in-memory snapshot is reused; first login, changed revisions and scheduled full refreshes still load account data.
- PIN, session guard and sync banner subscribe only to the store values they render.
- Reports use the shared scrollable month picker for all twelve months rather than Android's limited native alert buttons. Selection was checked in the demo browser.

## Measurement and validation

`getPerformanceSamples()` in `src/lib/api.ts` returns at most forty in-memory stage timings. `clearPerformanceSamples()` clears them, including on account-data reset. Development builds print `[amanot:performance]` with only stage, durationMs and success. Production does not print these samples. No PIN, phone, name, token, query result or error payload is recorded or sent to an analytics service.

Stages: PIN precheck, password sign-in, PIN-session confirmation, profile/readiness and account snapshot. Compare fresh login and foreground unlock separately on the same phone/network. These changes have regression tests, but actual Android latency has not yet been measured; no numerical device-speed claim is made.

Validated with TypeScript, PIN-screen, phone-auth, auth-store, profile-loading, session-guard, sync, ledger-sync, report-query, readiness and security tests. Database security/readiness tests use disposable local fixtures. Production and demo web exports are also checked; these do not replace Android device testing.

## Later optimizations if measurements justify them

- A summary-first dashboard would need explicit per-section readiness so incomplete directories cannot display misleading zero balances/counts or empty approvals. Current loading opens only after the financial snapshot is complete; avatars are the deferred part.
- Virtualize long statements/member selections as data volume grows. For the current small deployment, measure scroll/render cost before replacing working screens.
- Narrow selectors in remaining feature screens as they are revised. The hot PIN/guard/sync path is already updated.
