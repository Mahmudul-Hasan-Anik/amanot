# Member savings withdrawals

Implemented 2026-10-16. APK rebuild is intentionally separate.

## Entry points

- Admin: More → Savings withdrawals / সঞ্চয় উত্তোলন.
- Admin member profile: Withdrawal requests, scoped to that member.
- Approvals and dashboard: withdrawal requests appear separately from expenses/investments; pending counts include submitted and approved/unpaid withdrawals.
- Member: Request savings withdrawal on the dashboard; own requests, cancellations and receipts on the withdrawal screen.

## Accounting and permissions

1. Members request their own savings; admin/super admin/cashier can enter a request on behalf of another member in the same society.
2. Only admin/super admin approves or rejects. Approval reserves member savings, without changing cash or ledger. Members cancel their own submitted request; admin cancels submitted/approved requests with a reason.
3. Admin/super admin/cashier records payment once, with date, account and reference (required for bank/bKash/Nagad). Payment rechecks all approved reservations, active membership and account funds in one transaction.
4. `total_deposit` remains the existing account balance, including previously allocated `profit_balance`. Available principal is `max(0, total_deposit - profit_balance - approved reservations)`. Payment decreases total_deposit and increases total_withdrawn; profit_balance stays unchanged. No withdrawal fee or automatic membership closure.
5. A separate positive-amount `withdrawal` ledger entry is shown/exported as negative cash movement. It is not an expense, profit or deposit. Cash/bank and total fund decrease. Monthly fund growth includes withdrawal cash flow, while income/expense totals keep their existing meaning.
6. Future profit allocation uses the remaining total_deposit. Existing finalized profit shares remain unchanged; closed years cannot receive new withdrawal/reversal postings. Approval alone does not change the allocation base.
7. Only admin/super admin can reverse a paid withdrawal, after the full amount returns to its original account. Reversal restores savings/cash with a separate `withdrawal_reversal` entry and audit reason; original records are retained. A reversed request cannot be repaid; create a new request and approval.
8. Stable IDs and payment payload comparisons prevent double posting. Member/request/account rows are locked; posting and profit distribution use the existing year lock. Database errors roll back the entire payment. No automatic financial retry is performed.

## Delivery and validation

Backend migration: `20261016092904_member_withdrawals.sql`, with `deploy_023_withdrawals.sql` checking financial fingerprints before/after migration. Follow-up `20261016145733_withdrawal_summary_consistency.sql` adds reference indexes and corrects monthly fund growth. Existing ledger, cash, savings and distributions are not rewritten by these migrations. Backend capability version is 23.

Tests cover immutable history, idempotent request/payment/reversal, reservation overbooking, excluded profit, insufficient funds rollback, dates/closed years, permissions, anonymous/revoked sessions, same-society member privacy and cross-society isolation. UI tests cover invalid/Bengali amounts, stable retry ID, duplicate taps, action visibility, separate approval/payment, mandatory reference/reversal reason and receipt generation. Sync tests verify logout clears withdrawal records. Existing accounting, investment, identity, report and auth regressions are also checked.

Supabase security advisor reports authenticated SECURITY DEFINER execution for the four withdrawal RPCs. This is intentional: clients cannot write financial tables directly. Functions run as the existing NOLOGIN/NOBYPASSRLS amanot_rpc role, with fixed search_path, tenant RLS and active PIN/session/role checks. Anonymous execution is revoked. See [advisor explanation](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

The demo browser verifies menu/form appearance using mock data. No real hosted withdrawal was submitted or paid for testing. Android device testing remains necessary; no new APK was built.
