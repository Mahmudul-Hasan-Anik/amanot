# Amanot investment module: structure review, market comparison and delivery plan

Date: 16 October 2026. Status: proposal; no source, production database or APK changes made for this plan.

## 1. Recommendation

Evolve the existing Projects module into Investments, retaining Amanot's navigation, design system, authentication, society isolation, accounts, ledger, reports and profit distribution. Implement recipient contracts and installment collection rather than rebuilding the app or introducing a separate banking platform.

Separate three concepts explicitly:

1. Agreed profit for the entire contract.
2. Cash actually collected against that contract.
3. Profit recognized for reporting/distribution under an approved accounting policy.

For new contracts, recommend principal-first allocation as the simplest fit with Amanot's existing period-profit logic. It is a proposal requiring client acceptance, not an already approved requirement or universal accounting standard. The old APK instead recognizes agreed profit on full settlement. If the client wants exact old-app parity, use settlement recognition consistently. Do not silently switch between these policies, let collectors choose arbitrarily, or use different formulas on dashboard and reports.

The recipient form, schedule, receipt and reminder workflow can be designed before that policy choice is finalized.

## 2. Evidence and scope

Reviewed local code and migrations, not the current production database state:

- `app/app/(admin)/(tabs)/projects.tsx`: list, summary, filters and create form.
- `app/app/(admin)/project/[id].tsx`: returns, generic expenses, detail and ledger history.
- `app/src/mocks/mockData.ts`: Project model.
- `app/src/store/somitiStore.ts`: demo posting and balance changes.
- `app/src/lib/api.ts`: mapProject, upsertProject and recordProjectReturn.
- `app/supabase/schema.sql`, migrations 003, 005, 007, 011 and 014: posting, profit, tenant isolation and ledger queries.
- `app/src/hooks/useLedgerPage.ts`: cached, paginated history.
- `app/src/utils/reportExport.ts`: project and financial reports.
- Supplied SomitiPro APK: static inspection only; see `state/old-app-audit/INVESTMENT_AUDIT.md` and focused evidence files.

Existing strengths: UUID-based investment/project references, cash account postings, staff/admin permissions, multi-society isolation, annual profit distribution snapshots, cached queries, pagination and shared UI components.

Gaps to fix:

- Projects lack recipient, contact, contract profit percentage, repayment schedule and emergency contact models.
- All project return transactions are typed `profit`, including cash that repays principal. Backend annual profit calculations subtract capital, but transaction-level report classification can still mislead. Migrate reports and posting together.
- Current profit logic generally recognizes collections exceeding principal as profit, with shortfalls recognized on project completion. It is not the old APK's full-settlement rule.
- Detail-screen expenses use a project-name prefix in the generic expense flow; ledger queries have a name-prefix fallback. Use an explicit investment reference because names can repeat/change.
- Current return RPC has no client request-id parameter. Add server idempotency to new financial flows.
- Some detail actions are placeholder alerts. Replace relevant edit actions with audited workflows.
- Main member deposits and investment repayments must remain distinct. Voluntary savings must not regain monthly obligations.

## 3. Market research: applicable patterns

This is a focused product/workflow comparison, not a market-share or pricing survey. Vendor claims have not been independently benchmarked.

| Reference | Documented pattern | Amanot implication |
| --- | --- | --- |
| Mambu repayment collection | Allocation policy and due-date ordering are explicit product rules | Set and preserve one rule per contract; collectors enter money received, not arbitrary accounting splits |
| Mambu / Mifos calculation documentation | Fixed/flat and declining-balance calculations are different models | Do not label a whole-contract percentage as an annual rate or silently calculate an EMI |
| Microfinex product site | Clients, disbursements, repayments, accounting, reporting and communications are connected workflows | Build one complete investment-to-collection-to-report flow |
| WhatsApp Help Center | Click-to-chat supports a prepared message | Use manual WhatsApp reminders first; opening a chat does not prove sending/delivery |

Sources checked 16 October 2026:

- https://docs.mambu.com/docs/repayment-collection/
- https://docs.mambu.com/docs/interest-calculation-methods-in-loans/
- https://docs.mifos.org/mifosx/user-manual/for-administrators-mifos-x-platform/administration/products/loan-products/loan-product-fields/flat-interest-calculation
- https://microfinex.loan/
- https://faq.whatsapp.com/5913398998672934

Do not copy enterprise complexity into Amanot. First release: monthly schedules, clear contract terms, receipts, arrears list, audited corrections and manual reminders. Daily/weekly schedules, multiple allocation products and automated messaging can follow validated demand.

## 4. Requirements and unresolved business decisions

Confirmed:

- Visible Projects terminology becomes Investments in Bengali and English.
- Both society members and non-members can receive an investment.
- A non-member recipient is not automatically a savings member, app user, admin or shareholder.
- Profit percentage is entered when creating an investment.
- Provide three emergency-contact slots: name, relationship and phone. Emergency contact is not automatically a guarantor.
- Preserve existing savings/member-category features and historical financial entries.
- Investment WhatsApp reminders are a priority.

Need client sign-off before activating financial posting:

1. Percentage basis: recommend one fixed percentage for the entire contract, displayed explicitly. Annual/monthly rate is not yet confirmed.
2. Recognition: recommended principal-first versus exact old-app full-settlement rule.
3. Whether all three emergency contacts are required. Build three slots; do not invent a mandatory rule.
4. Early settlement/waiver policy. Recommend no automatic profit reduction or extra charge; approved waiver uses a separate entry and recalculation.

## 5. Screen and design plan

Keep Amanot's colors, typography, shared cards/buttons/modals and bottom navigation. Change only the investment workflow and relevant dashboard/report labels.

### Investment list

Summary: outstanding principal, selected-period collections, recognized profit, overdue scheduled repayments. Keep total contractual balance separate from principal exposure.

Filters: all, active, overdue, settled. Search name, phone and contract number. Recipient-name duplicates are allowed; identity and contract UUIDs disambiguate.

Card: recipient name, contract number, member/non-member badge, principal disbursed, amount collected, contractual balance, next due date. Show installment overdue separately from total outstanding.

### New investment: short sections with a final review

1. Recipient: existing member picker or external-recipient search/create. Reuse existing details; snapshot contract identity where required.
2. Details: name, phone/WhatsApp, address, NID number only, optional parent fields consistent with existing forms. No NID image requirement.
3. Emergency contacts: three numbered sections, compact at first and expandable for entry.
4. Terms: principal, profit percentage, explicit rate basis, duration, disbursement date, first installment date and funding account.
5. Review: actual cash disbursed, agreed profit, total receivable, schedule and rounding; confirm before posting.

Example under proposed whole-contract percentage: principal 100,000, 20%, 12 monthly installments -> agreed profit 20,000, receivable 120,000, installment 10,000. No automatic compounding or day-based increase.

Generate a stable contract number per society; the investment contract number is distinct from immutable member number. Do not reuse M/S/D member categories to identify investments.

### Investment detail

Tabs/sections: overview, installments, transactions, recipient/contact details.

Primary actions: Collect payment and WhatsApp reminder. Display expected profit, recognized profit and unrecognized balance with clear labels. Show next due date, overdue amount and full outstanding separately.

### Collect payment

Collector enters actual amount, posting date, receiving account and note. The server previews allocation and updated balance. Support partial and advance payments; allocate to earliest unpaid schedule first under the chosen policy. Reject excess over contractual balance unless a separately designed overpayment/refund workflow exists.

On confirmation create one receipt, one ledger posting and allocation records atomically. Preserve entered data on a retry; reuse its operation ID.

### Reminder

Preview recipient name, contract number, due installment amount/date, overdue amount and society name. Never include NID or emergency-contact details in the message.

Use WhatsApp click-to-chat. Provide copy-message/call fallback if unavailable. Record `opened` or explicit staff `marked sent` separately; no fake delivered/read status. Show latest reminder attempt to reduce duplicates. Do not automatically contact emergency persons.

## 6. Accounting policy comparison

Contract: principal 100,000, profit 20,000, total 120,000.

| Total collected | Principal-first recognized profit | Old APK settlement-recognized profit | Proportional cash allocation illustration |
| --- | ---: | ---: | ---: |
| 10,000 | 0 | 0 | approx. 1,666.67 profit component |
| 110,000 | 10,000 | 0 | approx. 18,333.33 profit component |
| 120,000 | 20,000 | 20,000 | 20,000 profit component |

These are different policies, not interchangeable display options. Proportional allocation is not automatically authorization to distribute that profit.

Recommended new-contract principal-first implementation after approval:

- Principal portion of a collection = min(amount received, principal outstanding).
- Profit portion = remaining received amount, capped at agreed profit outstanding.
- Cash account increases by total collection exactly once.
- Principal outstanding falls only by principal portion.
- Recognized profit increases only by profit portion, under this approved software policy.
- Schedule status follows the total contractual installment payment, independently of principal/profit reporting.
- Use integer minor units / PostgreSQL numeric, cumulative allocation and final rounding adjustment, not JS floating point as the financial authority.

Expected profit is not cash or member savings. Do not inflate available funds by adding the full contractual receivable. Keep principal exposure, cash balance and expected profit distinct. Collection by itself does not create new society capital.

If choosing old-app settlement recognition, calculate and store recognition consistently on settlement, including reversal/reopening behavior; do not reuse principal-first annual profit SQL unchanged.

Annual distribution must use the same approved recognized-profit calculation as dashboard and reports, subtract eligible expenses once, and preserve approved distribution snapshots. Profit allocation to savings members stays the existing approved deposit-proportion rule; taking an investment does not itself earn a savings profit share.

## 7. Technical implementation

Prefer an incremental schema around existing `projects` identities rather than destructive table renaming:

- Investment contract extension: stable project/contract ID, tenant, optional member link, external recipient link, terms, fixed percentage basis, chosen policy/version and lifecycle.
- External recipients: tenant-scoped UUID, contact/identity details; same names and shared family contacts are not uniqueness errors.
- Emergency contacts: contract/recipient link, position 1-3, name, relationship, phone. Snapshot/update policy is explicit.
- Installments: contract, sequence, due date, expected amount and allocation records. Amount paid derives from valid ledger allocations; overdue derives from dates and balance, never a menu-visit mutation.
- Repayment details: immutable transaction link, principal/profit allocation and request ID.
- Related expenses: explicit contract/project FK instead of matching display names.
- Reminder attempts and financial audit events: actor, tenant, contract, event, timestamp.

Database RPCs enforce tenant membership, role, positive finite amount, balance limits, lifecycle, no overpayment, idempotency and atomic ledger/account changes. Use composite tenant foreign keys and existing RLS patterns. Preserve references to inactive recipients so history remains readable.

Permissions: admin creates/approves/disburses according to existing permissions; authorized cashier/field staff collect; only authorized admin reverses/waives/reschedules. Final matrix follows existing roles, not member category M/S/D.

Use current cached query/pagination infrastructure. Aggregate summaries server-side; avoid loading every receipt on each navigation. Invalidate affected investment, account, dashboard and profit queries after writes. Scope caches by identity/tenant; do not persist additional NID/contact data unnecessarily.

Gate new contract RPCs by app/schema capability. An old APK must not post into the new contract path through an obsolete return RPC. Keep legacy project returns compatible only for legacy project records.

## 8. Migration and reports

- Inventory production records and reconcile current project returns, cash accounts and prior distributions before migration.
- Preserve project UUIDs and existing ledger rows. Mark existing records legacy; do not invent recipients, percentages or repayment dates from a name/total alone.
- Historical principal/profit allocation cannot be inferred reliably from a gross return alone. Reconcile manually where needed and store migration decisions explicitly.
- Snapshot record counts, ledger totals, cash balances, member savings and approved distributions; verify unchanged after additive migration.
- Keep legacy and new policy reporting explicit until reconciliation is complete. Do not retroactively alter distributed years.
- Test restore and migration on a disposable database first; deploy transactionally and retain compatible old screens until new data path is ready.

Reports: per-contract statement; recipient-wise contracts; disbursement/collection by date; principal outstanding; expected versus recognized profit; overdue schedule; cashier collections; investment expenses; society profit distribution.

Income-expense reports exclude principal recovery from profit income. Investment cash-out is an asset movement, not automatically an operating expense. Prevent double subtraction of linked expenses.

## 9. Phases and acceptance checks

1. Business sign-off and three screen previews: create, detail and collection/reminder.
2. Additive database migration, server posting, allocation and financial invariants in a disposable test database.
3. UI forms, schedules, collection, receipts and BN/EN terminology.
4. WhatsApp reminders, dashboard, reports and profit-distribution integration.
5. Production migration/reconciliation, Android device review, then authorized APK rebuild.

Release checks:

- Member and external recipient, same names, multiple contracts, M/S/D unchanged.
- Three contacts and chosen requiredness, reused/edited member identity, NID number only.
- Zero-profit contracts, percentage validation, partial/advance payment, month-end dates, last-installment rounding.
- Exact full repayment, overpayment rejection, insufficient disbursement funds, same request twice, concurrent collections.
- Correction, backdated entry, waiver/reschedule, settled contract reopening and locked distribution years.
- Cash plus principal/profit reconciliation; aggregate dashboard/report/distribution agree.
- Cross-society isolation, role restrictions and old APK write restrictions.
- WhatsApp missing/not installed, valid international phone format, correct message language, no false sent/delivered status.
- Small Android display, safe areas, keyboard, accessibility text scaling and no repeat API reads solely on tab switching.

Do not promise a reliable deadline before the policy, historical-data inventory and integration tests are complete. Preview work can proceed immediately; financial posting depends on the unresolved business rules.
