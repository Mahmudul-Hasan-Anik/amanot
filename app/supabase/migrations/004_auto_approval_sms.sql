-- ==============================================================================
-- আমানত — Migration 004: Auto-Approval Workflow & SMS Audit Logs
-- Run once in Supabase SQL Editor after 003 (safe to re-run).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SMS Logs Table & Traceability
-- ------------------------------------------------------------------------------
create table if not exists public.sms_logs (
  id uuid primary key default gen_random_uuid(),
  recipient_phone text not null,
  recipient_name text,
  member_id uuid references public.members(id) on delete set null,
  template_type text not null default 'custom',
  message text not null,
  provider text not null default 'mock',
  status text not null default 'sent' check (status in ('sent', 'failed', 'queued')),
  response_data jsonb,
  sent_by uuid default auth.uid(),
  sent_by_name text,
  created_at timestamptz not null default now()
);

alter table public.sms_logs enable row level security;
drop policy if exists sms_logs_read on public.sms_logs;
create policy sms_logs_read on public.sms_logs for select to authenticated using (public.is_staff());

-- RPC to record SMS log
create or replace function public.log_sms(
  p_phone text,
  p_message text,
  p_template text default 'custom',
  p_recipient_name text default null,
  p_member_id uuid default null,
  p_provider text default 'mock',
  p_status text default 'sent',
  p_response jsonb default '{}'::jsonb
)
returns sms_logs language plpgsql security definer set search_path = public as $$
declare
  v sms_logs%rowtype;
begin
  perform public.require_staff();
  insert into sms_logs (
    recipient_phone,
    recipient_name,
    member_id,
    template_type,
    message,
    provider,
    status,
    response_data,
    sent_by,
    sent_by_name
  ) values (
    public.norm_phone(p_phone),
    p_recipient_name,
    p_member_id,
    p_template,
    p_message,
    p_provider,
    p_status,
    p_response,
    auth.uid(),
    public.my_name()
  )
  returning * into v;

  return v;
end; $$;

-- ------------------------------------------------------------------------------
-- 2. Enhanced add_expense with Automatic Approval
-- ------------------------------------------------------------------------------
alter table public.expenses add column if not exists created_by_name text;
create or replace function public.add_expense(
  p_title text,
  p_category text,
  p_amount numeric,
  p_payment_source text,
  p_voucher_no text,
  p_note text default null,
  p_status text default 'approved'
)
returns expenses language plpgsql security definer set search_path = public as $$
declare
  v_e expenses%rowtype;
  v_settings jsonb := coalesce((select info from somiti_settings where id = 1), '{}'::jsonb);
  v_limit numeric := coalesce((v_settings->>'expenseApprovalLimit')::numeric, 10000);
  v_auto_enabled boolean := coalesce((v_settings->>'autoApproveEnabled')::boolean, true);
  v_auto_threshold numeric := coalesce((v_settings->>'autoApproveThreshold')::numeric, 5000);
  v_pending boolean;
  v_voucher text := coalesce(nullif(trim(p_voucher_no),''), 'V-' || nextval('public.receipt_seq')::text);
begin
  perform public.require_staff();
  if p_amount <= 0 then raise exception 'খরচের পরিমাণ শূন্যের বেশি হতে হবে'; end if;
  if coalesce(trim(p_title),'') = '' then raise exception 'খরচের খাত বা শিরোনাম দিন'; end if;

  if exists (select 1 from expenses where voucher_no = v_voucher) then
    v_voucher := v_voucher || '-' || nextval('public.receipt_seq')::text;
  end if;

  -- Auto-approval rule:
  -- If explicitly requested as 'approved' OR auto-approval is enabled for amounts <= threshold
  if v_auto_enabled and p_amount <= v_auto_threshold then
    v_pending := false;
  else
    v_pending := p_status = 'pending' or not public.is_admin() or (p_amount > v_limit and public.my_role() <> 'super_admin');
  end if;

  insert into expenses(title, category, amount, payment_source, voucher_no, note, status, created_by_name)
  values (p_title, p_category, p_amount, p_payment_source, v_voucher, p_note,
          case when v_pending then 'pending' else 'approved' end, public.my_name())
  returning * into v_e;

  if v_pending then
    insert into approvals(type, title, amount, detail, expense_id, created_by_name)
    values ('expense', p_title, p_amount,
            p_category || ' · ভাউচার: ' || v_voucher || coalesce(' · ' || nullif(p_note,''), ''),
            v_e.id, public.my_name());
    perform public.write_audit('expense_requested', jsonb_build_object('expense_id', v_e.id, 'amount', p_amount, 'title', p_title));
  else
    perform public.post_expense(v_e.id);
    perform public.write_audit('expense_recorded', jsonb_build_object('expense_id', v_e.id, 'amount', p_amount, 'title', p_title, 'auto_approved', true));
  end if;

  return v_e;
end; $$;

revoke execute on function public.log_sms(text,text,text,text,uuid,text,text,jsonb), public.auto_approve_eligible() from public, anon;
grant execute on function public.log_sms(text,text,text,text,uuid,text,text,jsonb), public.auto_approve_eligible() to authenticated;

-- ------------------------------------------------------------------------------
-- 3. Batch Auto-Approve RPC for Admin
-- ------------------------------------------------------------------------------
create or replace function public.auto_approve_eligible()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_settings jsonb := coalesce((select info from somiti_settings where id = 1), '{}'::jsonb);
  v_threshold numeric := coalesce((v_settings->>'autoApproveThreshold')::numeric, 5000);
  r record;
  v_count int := 0;
  v_total numeric := 0;
begin
  perform public.require_admin();

  for r in
    select id, amount, title, expense_id
    from approvals
    where status = 'pending' and type = 'expense' and amount <= v_threshold
    order by created_at asc
    for update
  loop
    if r.expense_id is not null then
      perform public.post_expense(r.expense_id);
    end if;

    update approvals
    set status = 'approved',
        decided_by = auth.uid(),
        decided_by_name = public.my_name() || ' (স্বয়ংক্রিয়)',
        decided_at = now()
    where id = r.id;

    v_count := v_count + 1;
    v_total := v_total + r.amount;

    perform public.write_audit('approval_auto_approved', jsonb_build_object(
      'approval_id', r.id,
      'amount', r.amount,
      'title', r.title
    ));
  end loop;

  return jsonb_build_object('approved_count', v_count, 'total_amount', v_total);
end; $$;
