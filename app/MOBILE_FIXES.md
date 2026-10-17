# Mobile fixes — 17 October 2026

- PIN replacement now distinguishes missing/current PIN length, new PIN length,
  weak PIN, confirmation mismatch and reuse of the current PIN. Validation and
  server errors appear in the form and scroll into view. Repeated save taps are
  blocked. Successful replacement returns to login. PIN strength rules and the
  backend credential checks remain enforced.
- Removed the legacy four-digit login toggle and all visible four-digit PIN
  wording, including profile/registration labels and the auth error text.
- Web errors and confirmations use a centered, scrollable app dialog instead of
  browser alert/confirm/prompt. Confirmation callbacks run only after the user
  selects their button. General form dialogs use a viewport Modal, safe areas
  and scrolling rather than being positioned inside screen content.
- PDF and CSV exports include Amanot, society, document/report identity, period
  or receipt/member identity, and an ISO timestamp. Native print output is renamed
  before sharing; browser PDF print titles suggest the same descriptive name.
  Bengali names are preserved, reserved characters removed and UTF-8 filename
  length bounded for Android. Browser print destinations can override names.
- Blocked the unused Android SYSTEM_ALERT_WINDOW permission for future builds.
  Existing 1.0.7 APK v2 signature/content verified, certificate matches 1.0.6,
  package com.amanot.app, target SDK 36. This verifies signing/integrity, not
  Play Protect approval or device compatibility. The reported first-install
  warning has not been identified without its exact wording.

Validation: TypeScript; PIN screen, mobile feedback, export files, live-auth,
report-query and release-configuration tests; 11 security checks in a disposable
database (hashing stubbed). The mobile browser preview visibly verified the
registration form scrolling and an error dialog centered inside the phone frame.
No real account PIN was changed. The changes are packaged in the verified 1.0.8
APK; see RELEASE_1.0.8.md. Installation and runtime testing on a phone remain.
