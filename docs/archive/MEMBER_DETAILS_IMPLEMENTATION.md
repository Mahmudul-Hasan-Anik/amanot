# Parent names and admission fee removal — 15 October 2026

New member form no longer shows, computes or submits an admission fee. Demo member creation starts at zero deposit, creates no receipt and does not change cash accounts or fund totals. Existing historical deposits are retained.

Father's Name and Mother's Name are optional fields in Bengali and English. They are saved as trimmed text, displayed in the admin member profile and editable there. Empty values remain allowed for older members. Category and immutable identity rules remain unchanged.

Migration 017 adds nullable father_name/mother_name columns with the same tenant RLS as the other member columns. It patches add_member and update_member while preserving their current PIN, caller identity, tenant, role and audit logic and owners. Admission-fee parsing and automatic financial writes are removed, including for old payloads. No existing member or transaction records are rewritten.

Status: migration 017 applied in production on 15 October 2026 after the user explicitly requested production fee removal. Live schema inspection confirmed zero admission/joining/entry fee columns: admissionFee was a JSON RPC input, not a persisted member column. That input handling and automatic fee transaction logic were removed. Parent names are enabled for new and existing members. The deployment's transactional checks returned parent_names_enabled=true, admission_fee_removed=true and existing_members_and_ledger_preserved=true. No historical records were rewritten. Evidence: member-details-migration-success.png. Existing RLS is retained; the temporary verification table was dropped at commit. The API still permits legacy reads and guards parent-name writes against a missing schema.

Verification: TypeScript and production web build pass. 14 disposable PostgreSQL checks pass, including repeatability, parent name create/edit/clear, legacy fee payload produces no deposit/transaction, immutable identities and tenant/role isolation. UI submission and API schema compatibility checks, sync and profile-loading checks pass. The local dist preview includes the updated form and save guard. Physical phone testing and APK rebuild are not performed for this change.

Deployment source: supabase/migrations/017_member_parent_names_no_admission_fee.sql.
