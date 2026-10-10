# Client feedback fixes — 10 October 2026

Source changes after delivered APK 1.0.4/code 5:

- PIN login reuses the fresh server sign-in user ID instead of requesting the
  same Auth identity again. Member lookup and session readiness run concurrently.
  Initial auto-sync joins the login sync without fetching the profile again.
  Full snapshot and revision fetch run concurrently. PIN verification, attempt
  limits, session readiness, tenant RLS, stale-response checks and periodic
  profile validation remain in place. Actual phone latency is not yet measured.
- More shows the real pending approval count; the badge disappears at zero.
- Grace days, late fee and default monthly deposit have custom numeric inputs
  accepting Bengali/English digits. Zero is valid for grace/late fee; monthly
  deposits must be positive. Invalid values are blocked. Failed saves keep the
  editor open, and local defaults update only after successful remote writes.
  New-member forms initialize from the saved monthly default. Existing member
  monthly amounts are not changed by editing the default.
- Owner selected proportional distribution only. Settings now opens the annual
  preview and explains the formula. No distribution formula or ledger was changed.
- Finance localizes built-in accounts, categories, generated note prefixes,
  payment methods and transaction dates. Custom names/notes remain user data.

Validation: TypeScript, settings UI handlers/validation/failure paths, profile
loading concurrency and access rejection, live-auth, sync, PIN/session guard,
phone-auth, profit rules, ledger sync and design-token checks. No live records
were created or modified during these synthetic tests. These changes require
a new APK to verify on a phone; APK 1.0.4 does not contain them.
