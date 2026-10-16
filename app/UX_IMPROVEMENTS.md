# Savings, forms and member selection improvements — 2026-10-16

Implemented:

- Member login PIN is available directly on the profile for admins managing another member. Issuance opens a confirmation dialog before changing credentials, then shows a large selectable PIN, mobile number, expiry guidance and a manual share button. Closing discards the displayed PIN. New-member success uses the same credentials card. No existing private PIN is retrieved or displayed.

- Shared savings breakdown on the member dashboard, admin member profile, statements and member withdrawal screen. Separates paid-in savings, net withdrawals, remaining principal, allocated profit, approved reservations and withdrawable savings.
- Shared searchable member picker for deposits, investments, statements and withdrawals. Supports Bengali digits, name/number/phone search, category filters and a virtual list rather than mounting every member row.
- Member and deposit validation displays errors beside fields and scrolls to the first invalid field. Saving shows a spinner; a synchronous guard blocks double taps. Deposit amounts reject malformed values and excess decimal places.
- Pending withdrawals show elapsed calendar-independent 24-hour days since submission. Approved requests remain clearly identified as awaiting payment.
- Withdrawal PDFs use the actual ledger receipt number, including a separate reversal receipt and date when applicable.
- Individual statements fetch full scoped transaction history and the current member balance, rejecting snapshots if the society revision changes while reading. Statements show a running own-savings balance, with allocated profit separately identified. All-member exports fetch fresh balances; the visible member list initially renders 20 cards.
- Narrow deposit date input can shrink without pushing its calendar icon outside the form.

No database migration or APK rebuild is required for the source/web changes. Installed APKs still require an explicitly requested rebuild to receive them.

## Local iPhone browser test

From this app directory, after `npm run build:web`:

```powershell
node scripts/serve-web.cjs dist 8085 --lan
```

Connect the computer and iPhone to the same trusted Wi-Fi. Open the printed `Phone preview` URL in Safari. Use `/` for the full phone viewport, or `/preview.html` for the framed preview. Keep the terminal running. Ctrl+C stops it. Without `--lan`, the server remains accessible only on the computer.

This serves the production-configured web bundle and uses the real backend. An isolated local demo can instead use `npm run build:web:demo` and `node scripts/serve-web.cjs dist-demo 8084 --lan`; the login page displays the demo credentials. No real SMS is sent by the demo.

Safari tests layout, forms and ordinary web flows. It does not validate Android status/navigation bars, hardware back behavior, native keyboard integration or APK startup performance. Native iOS testing is a separate compatible Expo Go/development-build workflow.

## Validation and remaining device checks

Automated: TypeScript; savings breakdown and statements with exact cents; stale snapshot rejection; Bengali picker search/category/active filters; deposit date/amount validation, error scrolling and duplicate tap guards; member identity, investment, withdrawal, accounting, PIN and query-cache regressions.

Browser: mobile-width demo login, anchored deposit errors, shared member picker, Bengali member-number search and profile savings breakdown. Screenshot: `../state/savings-breakdown-preview.png`.

Still needs a physical device: real login stage timings on the user's Wi-Fi, keyboard overlap, native safe areas/back button, and sharing/printing. No live financial transaction was posted as part of these UI checks. No measured device speedup is claimed.
