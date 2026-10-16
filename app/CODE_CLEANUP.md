# Code cleanup — 2026-10-16

Removed after checking references:

- Seven unused components: ActionButton, IconTile, SectionHeader, StatusChip, Toggle, ProgressRing and NumberSettingModal. Their obsolete barrel exports were removed too.
- 112 unused screen styles, mainly from the former fixed monthly deposit, overdue, month-grid and voucher UI.
- Unused imports, state, calculations and store subscriptions. Removed the unused finance transaction-modal state and its scroll-position listener; removed the member dashboard's never-shown copy toast and its state.
- Obsolete month-selection types/helpers from `months.ts`. Current date parsing, reporting periods and month filters remain.
- Two archived source-rewrite scripts and their README.
- 49 old Puppeteer screenshot/interaction scripts with obsolete screen selectors and hardcoded personal output paths. These were not wired into npm's regression-test commands.
- Unused `puppeteer-core` development dependency and `react-native-svg` runtime dependency. SVG had only supported the removed ProgressRing; the app no longer imports it. Updated the npm lockfile.

The resulting tracked diff removes approximately 5,500 net lines, mostly old tooling and screen styles. This does not imply an equivalent APK size reduction: the tooling was not packaged into the APK. Native size must be measured in a later requested build.

Kept migrations, live backend integrations, database compatibility fields, backups/recovery tools, release scripts, current regression tests, icons and the isolated demo mode. No live data/schema or credentials changed. No APK was rebuilt.

## Checks

- `npm run typecheck`.
- `npm run check:unused`: unused locals/parameters check, with classic JSX mode to retain the React imports used by the existing VM-based UI test harnesses.
- Import graph: no broken local imports or unreachable source files after removing unused barrel exports.
- UI/domain tests: member identity, login PIN, deposit validation, investments, withdrawals, savings statements, settings, approval menus, PIN screen and session guards.
- Auth/sync/export tests: live-auth fixtures, phone auth, ledger sync, query cache, report queries, profile-photo and protected session storage.
- Disposable database security checks; release-configuration checks. No native build involved.
- Demo and production web exports passed with 1,025 modules (previous export: 1,052).

The settings regression test now covers current voluntary-saving controls and withdrawal approval counts; its obsolete NumberSettingModal tests were removed with that unused component.
