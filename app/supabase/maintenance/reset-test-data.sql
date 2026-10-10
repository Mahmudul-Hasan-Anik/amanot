-- MANUAL MAINTENANCE ONLY. Never include in a migration or app startup.
-- Deletes all Amanot accounts (including admin), organization settings and ledger.
-- Run only against the owner-confirmed disposable backend after final approval.
-- No verified independent backup is currently available.
-- Before execution, explicitly SET amanot.reset_confirmation =
-- 'DELETE ALL TEST ACCOUNTS INCLUDING ADMIN';
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
select pg_advisory_xact_lock(714209); -- same lock as first-admin registration

do $$
begin
  if to_regclass('public.somitis') is not null then
    raise exception 'Legacy global reset disabled on multi-society backend. Prepare a society-scoped reset.';
  end if;
  if current_setting('amanot.reset_confirmation', true) is distinct from
      'DELETE ALL TEST ACCOUNTS INCLUDING ADMIN' then
    raise exception 'Explicit all-account reset confirmation is required';
  end if;
  if exists(select 1 from storage.objects) then
    raise exception 'Storage is not empty: remove files using Storage API after backup/review, then retry';
  end if;
end $$;

-- Explicit list; no CASCADE that could silently include future/unreviewed tables.
-- TRUNCATE is intentional for this full test reset; normal ledger DELETE is denied.
truncate table public.profit_shares, public.profit_distributions,
  public.approvals, public.expenses, public.transactions, public.projects,
  public.sms_logs, public.notices, public.profiles, public.members,
  public.cash_accounts, public.somiti_settings, public.audit_logs restart identity;

-- Hosted platform foreign keys cascade to identities, sessions and MFA data.
-- Profiles and member records have already been removed above.
delete from auth.users;

-- Infrastructure defaults only; no owner, account numbers or previous balances.
insert into public.cash_accounts(id,type,name,holder,amount,sort) values
  ('ca1','bank','ব্যাংক হিসাব','',0,1),
  ('ca2','cashier','কোষাধ্যক্ষের হাতে','',0,2),
  ('ca3','bkash','বিকাশ','',0,3),
  ('ca4','field','মাঠকর্মীর হাতে','',0,4),
  ('ca5','nagad','নগদ মোবাইল হিসাব','',0,5);
alter sequence public.receipt_seq restart with 1001;
update public.sync_clock set revision=revision+1 where id=1;

do $$
begin
  if public.somiti_initialized()
     or exists(select 1 from auth.users)
     or exists(select 1 from public.members)
     or exists(select 1 from public.transactions)
     or exists(select 1 from public.somiti_settings)
     or exists(select 1 from public.cash_accounts where amount<>0) then
    raise exception 'Reset verification failed';
  end if;
end $$;
commit;

-- Preserves functions, RLS, private buckets, schema versions and sync clock.
-- Prior private migration rollback snapshots and platform operational logs are
-- not active app data and are not deleted by this script. Review retention separately.
