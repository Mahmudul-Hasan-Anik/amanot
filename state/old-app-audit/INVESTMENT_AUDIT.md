# Old APK audit and Amanot investment proposal

Audited 2026-10-16. Source: `C:\Users\Hasan\Downloads\base.apk` (90,083,790 bytes).
Scope: read-only static inspection of APK configuration, Hermes bytecode, screen routes, labels and accounting functions. The APK was not installed or executed; live records, visual layout and server enforcement were not verified. No Amanot application source or production database was changed for this audit.

## Confirmed in the supplied APK

- App: SomitiPro, package `com.somitipro.app`, version 1.0.0, Android versionCode 6.
- Investment routes: `/(org)/data-center/investments`, `/new`, `/[id]`.
- Separate installment collection route: `/(org)/transactions/installments`.
- Functions/screens: NewInvestment, InvestmentList, InvestmentDetail, InstallmentForm, addInvestment, updateInvestment, splitInstallments, investmentPrincipal, investmentStatus.
- Investment data includes investorName, memberId, permanentAddress, nidNumber, parentNames, emergencyContacts, totalAmount, profitAmount, tenureMonths, monthlyInstallment and lastInstallment.
- The principal helper calculates max(0, totalAmount - profitAmount). Thus totalAmount represents the total contractual receivable, rather than only the original cash disbursement.
- Installment splitting uses floor(totalAmount / tenureMonths); the final installment contains the rounding remainder.
- Status calculation exposes paid, remaining, remainingMonths, overdueMonths, lastPaymentDate and lastPaidAmount.
- Follow-up, WhatsApp/receipt sharing paths, date-based investment PDF labels and edit flows are present. Successful operation was not verified.
- Labels include “যে কেউ বিনিয়োগ গ্রহণ করতে পারেন” and separate savings/contribution and installment collection flows.
- Separate booked, realized and outstanding investment profit functions exist. Their exact policy and runtime correctness are not certified by this audit.

Interpretation: this module primarily manages money advanced to a recipient and collected back through installments. It is broader than simply investing in a business project. “investorName” appears to be the investment recipient in the UI, so Amanot should use an unambiguous label.

## Difference from current Amanot

Amanot currently models a project with name/type/location/manager, invested amount, returned amount, remaining amount and project profit. Its return flow does not distinguish principal repayment from profit in the input. Current backend period-profit logic generally recognizes returns exceeding original invested capital as profit, and recognizes shortfalls when a project completes.

Project expenses are currently submitted through the generic expense flow with the project name in the title. Ledger queries include a name-prefix fallback. A dedicated investment reference is preferable because names can repeat or change.

These differences mean renaming the menu alone cannot reproduce the old installment workflow.

## Recommended first implementation

1. Rename visible Projects/প্রজেক্ট labels to Investments/বিনিয়োগ throughout navigation, dashboard, screens, reports and both languages. Keep internal IDs/routes stable where practical.
2. Make a separate investment contract per disbursement. Link an existing member when applicable; otherwise keep an independent recipient record. Do not create a savings member automatically just to record an investment.
3. New investment form: recipient, contract/reference number, purpose, disbursement date, principal actually paid out, agreed profit amount if applicable, duration, first payment date, repayment schedule and source cash/bank account. Show total receivable and installment preview before confirmation. Reuse member details when linked; optional emergency contacts and address/NID should not be collected twice unnecessarily.
4. Detail screen: principal disbursed, contractual profit, amount collected, principal outstanding, profit outstanding, installments, overdue scheduled amount, next due date, activity history and clear Collect installment action.
5. Collection form: investment selection, actual amount, date, receiving account, receipt and note. Support partial payments and early repayments. Preview how the payment is allocated. One payment should affect one chosen contract by default.
6. Allow multiple contracts per recipient in the data model. Whether another contract is allowed before repayment is a configurable business policy, not an accidental database restriction.
7. Summary cards: principal currently outside the society, collections in the selected period, received profit, overdue investment repayments. Filters: active, overdue, completed; search by recipient/contract number.
8. Each disbursement, collection, related expense and correction must have a stable investment_id, somiti_id and unique operation/receipt identity. Enforce permissions, tenant isolation, available balance and duplicate-request protection on the server.
9. Record corrections as auditable reversal/replacement entries. Do not silently rewrite a collected contract or delete financial history. Rescheduling should preserve the original agreement and record who changed it.

## Accounting policy to agree before coding

- Member savings/contributions remain voluntary: no monthly deposit target, contribution arrears or contribution late fee. Investment repayment schedules are a separate contract obligation and may have overdue amounts.
- Never count principal repaid as profit or member savings.
- Do not distribute unpaid contractual profit to members.
- Agree how each collection is allocated between principal and profit: proportional allocation, principal first, or explicitly entered components. Show an example before selecting a policy; do not choose silently.
- Example: principal 100,000 + agreed profit 20,000 = total receivable 120,000 over 12 monthly installments of 10,000. The society initially pays out 100,000, not 120,000. Under proportional allocation a 10,000 collection contains approximately 8,333.33 principal and 1,666.67 profit, with rounding reconciled in the final installment. This allocation is a proposal, not a verified old-app rule.
- If business/project investments are also needed, retain a separate type under the same Investments menu. A business outcome cannot be treated as a guaranteed installment contract by default.

## Delivery order

1. Confirm recipient eligibility, repayment frequency, profit allocation and rescheduling policy with the client.
2. Prepare schema and ledger migration, preserving existing project IDs and balances. Classify existing projects explicitly; do not automatically convert them into recipient contracts.
3. Build investment creation and installment collection with previews and receipts.
4. Add summary, schedules, history and reporting; update BN/EN terminology everywhere.
5. Verify partial/early payment, final rounding, same-name recipients, multiple contracts, double submit, insufficient balance, reversal and cross-society isolation using disposable test data.
6. Client review on Android before creating a release APK.

This is a design proposal; no implementation or APK rebuild was performed.

## Follow-up: old app profit recognition

Static bytecode inspection shows installment receipts are collected toward the total contractual receivable; no per-receipt principal/profit split was found in this flow. The realized-profit filter requires investmentStatus.remaining <= 0 and its reducer sums profitAmount. Thus the old app treats agreed profit as realized on full contract repayment, rather than recognizing a proportional profit component with every installment. Booked contractual profit is separate. This was verified statically, not by running the app. Focused evidence: profit-recognition-evidence.txt.
