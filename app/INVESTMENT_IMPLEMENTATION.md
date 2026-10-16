# Investment implementation — 16 October 2026

## Approved rules

- Society members and external recipients can receive investments. External recipients do not receive a savings membership or login automatically.
- Profit percentage applies to the entire contract, not an annual/monthly rate.
- Collections recover principal first, then contractual profit.
- Three emergency-contact slots; at least one complete contact required. Contacts are not guarantors.
- Member savings remain voluntary and separate from investment installment obligations.

## Delivered

- Projects navigation, dashboard and reports use Investments terminology in BN/EN; existing project UUID/routes remain compatible.
- New investment form: member lookup/autofill, external recipient, phone/WhatsApp, address, optional NID number and parents, emergency contacts, purpose, principal, contract profit, monthly term, first due date and funding account.
- Explicit review before posting: account, cash principal, contractual receivable, contacts and installment schedule. Monthly dates remain anchored at the original day, including month-end rounding.
- Investment list: outstanding principal, recognized profit, overdue scheduled installments, search and active/overdue/settled filters. Existing projects remain visibly identified as previous investments.
- Detail: actual principal/profit recovery, remaining contractual balance, FIFO installment allocation, contact information and paginated history.
- Partial/advance payments, overpayment rejection, positive two-decimal amounts, server idempotency and atomic cash/ledger updates.
- Payment receipts and contract statements export as PDF. Income/collection exports show principal and profit separately for new contracts. Investment disbursement/reversal displays as cash outflow.
- Manual WhatsApp message preview with contract, dates and balances; opens a prepared conversation only after the user chooses. Attempts are not represented as delivered messages. No message was sent during verification.
- Related expense entries carry an explicit investment FK, respect existing staff/admin approval rules and subtract from society net profit once.
- Authorized administrators can reverse the latest active payment with a reason, refund from its original account and append an immutable reversal. Closed distribution years reject financial changes.
- New private tables use forced tenant/staff RLS and composite tenant foreign keys. Ordinary members cannot read recipient emergency/NID details. New private copies are scrubbed by the existing account-deletion flow for linked accounts/society closure.
- Bangladesh business dates are used for new posting validation, avoiding the UTC/Dhaka midnight mismatch.
- Older APKs retain legacy project creation/returns. They cannot edit or post returns into new contracts through old RPCs.

## Backend deployment

Migration: `supabase/migrations/020_investment_contracts.sql`.

Reviewable deployment: `supabase/deploy_020_investments.sql`; regenerate with `node scripts/prepare-investment-deploy.cjs`. This generator writes SQL only, never connects to a database.

Applied to the existing Amanot Supabase project using an explicit transaction and financial fingerprint checks. Existing member savings, project records, ledger entries, account balances and prior distribution snapshots were verified unchanged. No production investment or payment fixture was created.

The internal non-login RPC role receives schema CREATE only when necessary for ownership transfer during the migration transaction. Its original restriction is restored before commit. New business functions remain owned by the tenant-isolated RPC role.

Proof: `../state/old-app-audit/investment-backend-deployed.png`.

## Verification

- `npm run test:investment-db`: 15 database checks, including repeatable migration, hosted-role restriction, external recipient, idempotency, allocation, overpayment, reversal, tenant isolation, legacy guard, expenses/approval, ordinary-member privacy, monthly profit, closed years and guarded deployment preservation.
- `npm run test:investment-ui`: domain and form checks for partial allocation, exact installment totals, month-end dates, amount validation, reminder privacy, member autofill, optional contacts and explicit admin review.
- Existing accounting suite: 36 checks passed.
- Report-query, synchronization, profit-rule and member-identity API regressions passed.
- TypeScript and production web export passed.
- Browser demo at a 390-pixel app width: external contract 100,000 + 20% over 12 months -> total 120,000, monthly 10,000; collected 10,000 -> principal 10,000, profit 0, remaining 110,000; reminder showed the next unpaid installment. All browser fixtures stayed in isolated demo storage.
- Screenshots: `../state/old-app-audit/investment-review-preview.png` and `investment-reminder-preview.png`.

## Review and release boundary

- APK was not rebuilt. Android device review and a new APK release remain separate steps.
- Manual WhatsApp opening/message preview was checked; sending/delivery was not tested or claimed.
- Existing projects are not automatically assigned invented recipients, percentages or repayment dates.
- Automated WhatsApp scheduling, contractual term rescheduling, waivers and multiple repayment calculation products are not included in this first implementation. They require separately agreed rules.
- Recorded contract terms are locked; corrections to posted money use the audited reversal flow. External-recipient personal-detail editing/redaction beyond the linked account-deletion flow remains a follow-up workflow.

## 2026-10-16: Required identity and staged investment workflow

- New proposals require a digit-only NID number, father’s name and mother’s name, for both members and external recipients. Existing contracts and privacy redaction remain compatible. No NID image is collected.
- Administrator submits an immutable proposal, explicitly approves or rejects it (rejection needs a reason), then confirms actual disbursement separately. The same administrator may perform these steps; no separate-person approval requirement was requested.
- Submission and approval do not create a financial project, installment debt, ledger transaction, or cash deduction. Only approved disbursement atomically posts the contract, ledger and cash movement.
- At payment confirmation, actual date, first installment date and funding account are confirmed; agreed principal, rate and duration cannot change. Future planned proposal dates are allowed, future financial postings are forbidden. Cash sufficiency and closed accounting-year checks remain enforced.
- Request retries and row locks prevent duplicate disbursement. Altered retries are rejected. Ordinary members cannot read proposals; cashier cannot submit, approve or disburse.
- Investment list shows pending, approved and rejected proposals separately from posted investments. Detail shows recipient identity, emergency contacts, terms, decision note, timestamps and installment preview. Existing collection, principal-first allocation, receipts, reversals and manual WhatsApp reminders continue after disbursement.
- Proposal privacy copies are removed on linked account/society deletion; remote identity records remain memory-only.
- Migration 021 is additive and guarded against changes to existing balances, ledger, savings and distributions. Migration 020 must not be reapplied alone after 021, since 021 intentionally replaces its public direct-disbursement entry point.
- Tests: 19 disposable PostgreSQL checks; domain and component tests for required identity, review, submission, approval and explicit disbursement; TypeScript; existing synchronization checks; web production export. No real production investment was created for testing.
- APK has not been rebuilt. Physical Android verification is still needed after the user requests a new APK.

Live verification: migration 021 deployed successfully; financial preservation guard returned true. Proposal table/RPC readiness, forced RLS and restored business-role privileges verified. Local demo browser completed proposal → approval → disbursement → contract, with cash deducted only at disbursement; latest preview confirmed fractional installment values (91.66). UI proof: state/old-app-audit/investment-required-identity.png. Backend proof: state/old-app-audit/investment-workflow-deployed.png.
