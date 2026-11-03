-- Allow record_investment_expense for older (non-contract) projects so their
-- expenses are linked to the project (expenses.project_id / transactions.project_id)
-- instead of being saved as general expenses. Contract investments are unchanged.
-- Paste into Supabase > SQL Editor and Run. Safe to run more than once.
begin;
do $$ declare d text; begin
 d:=pg_get_functiondef('public.record_investment_expense(jsonb)'::regprocedure);
 if position('legacy-project-expense' in d)=0 then
  d:=replace(d,'if c.id is null then raise exception ''বিনিয়োগ পাওয়া যায়নি''; end if;','if c.id is null then /* legacy-project-expense */ select name into c.contract_no from projects where id=pid; if c.contract_no is null then raise exception ''বিনিয়োগ পাওয়া যায়নি''; end if; end if;');
  if position('legacy-project-expense' in d)=0 then raise exception 'Legacy project expense guard failed'; end if;
  execute d;
 end if;
end $$;
commit;
