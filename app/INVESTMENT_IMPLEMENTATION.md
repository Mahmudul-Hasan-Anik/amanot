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
