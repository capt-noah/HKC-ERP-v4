-- HKC ERP backend schema for Supabase Data API.
-- Run this in the Supabase SQL editor for the project before using the server routes.
--
-- This first backend stores each ERP record as a JSONB document:
--   id text primary key
--   payload jsonb not null
--   created_at / updated_at timestamps
--
-- It keeps the current frontend object shapes intact while the module logic is
-- still evolving. Once workflows settle, high-value finance tables can be
-- normalized with migrations without changing the public route names.
--
-- Access model:
--   - anon gets no table access.
--   - authenticated users get CRUD access through permissive prototype RLS.
--   - service_role gets CRUD access for server-side administrative jobs.
--
-- Tighten the authenticated policies before storing production or user-specific
-- data. Good next steps are tenant/company ownership columns and policies that
-- compare those columns to authorization data in auth.jwt()->'app_metadata'.

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.create_hkc_document_table(table_name text)
returns void
language plpgsql
as $$
begin
  execute format(
    'create table if not exists public.%I (
      id text primary key,
      payload jsonb not null default ''{}''::jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    )',
    table_name
  );

  execute format('alter table public.%I enable row level security', table_name);

  execute format('drop trigger if exists set_updated_at on public.%I', table_name);
  execute format(
    'create trigger set_updated_at
      before update on public.%I
      for each row execute function public.set_updated_at()',
    table_name
  );

  execute format('drop policy if exists "%s anon read" on public.%I', table_name, table_name);
  execute format('drop policy if exists "%s anon insert" on public.%I', table_name, table_name);
  execute format('drop policy if exists "%s anon update" on public.%I', table_name, table_name);
  execute format('drop policy if exists "%s anon delete" on public.%I', table_name, table_name);
  execute format('drop policy if exists "%s authenticated read" on public.%I', table_name, table_name);
  execute format('drop policy if exists "%s authenticated insert" on public.%I', table_name, table_name);
  execute format('drop policy if exists "%s authenticated update" on public.%I', table_name, table_name);
  execute format('drop policy if exists "%s authenticated delete" on public.%I', table_name, table_name);

  execute format('create policy "%s authenticated read" on public.%I for select to authenticated using (true)', table_name, table_name);
  execute format('create policy "%s authenticated insert" on public.%I for insert to authenticated with check (true)', table_name, table_name);
  execute format('create policy "%s authenticated update" on public.%I for update to authenticated using (true) with check (true)', table_name, table_name);
  execute format('create policy "%s authenticated delete" on public.%I for delete to authenticated using (true)', table_name, table_name);

  execute format('revoke all on public.%I from anon', table_name);
  execute 'grant usage on schema public to authenticated';
  execute 'grant usage on schema public to service_role';
  execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
  execute format('grant select, insert, update, delete on public.%I to service_role', table_name);
end;
$$;

select public.create_hkc_document_table(table_name)
from (
  values
    ('warehouses'),
    ('inventory_products'),
    ('bin_cards'),
    ('stock_movements'),
    ('store_transfers'),
    ('sales_orders'),
    ('quotations'),
    ('delivery_notes'),
    ('purchase_orders'),
    ('customers'),
    ('suppliers'),
    ('hkc_doc_records'),
    ('chart_of_accounts'),
    ('journal_entries'),
    ('journal_entry_lines'),
    ('invoices'),
    ('payments'),
    ('expenses'),
    ('recurring_expense_schedules'),
    ('vehicles'),
    ('accounting_periods'),
    ('company_settings'),
    ('payroll_runs'),
    ('revaluations'),
    ('fixed_assets'),
    ('tax_rules'),
    ('tax_schedules'),
    ('employees'),
    ('attendance_records'),
    ('payroll_periods'),
    ('payroll_records'),
    ('departments'),
    ('designations'),
    ('job_openings'),
    ('job_applicants'),
    ('onboardings'),
    ('separations'),
    ('leave_types'),
    ('leave_requests'),
    ('expense_claims'),
    ('appraisals'),
    ('training_programs')
) as tables(table_name);

create unique index if not exists employees_employee_number_unique
  on public.employees ((payload->>'employee_number'))
  where payload ? 'employee_number';

create unique index if not exists employees_duplicate_details_unique
  on public.employees (
    lower(trim(payload->>'full_name')),
    lower(trim(coalesce(payload->>'phone', ''))),
    lower(trim(coalesce(payload->>'email', ''))),
    coalesce(payload->>'date_of_birth', ''),
    lower(trim(coalesce(payload->>'gender', ''))),
    lower(trim(coalesce(payload->>'warehouse_id', ''))),
    lower(trim(coalesce(payload->>'employment_type', ''))),
    coalesce(payload->>'start_date', ''),
    coalesce(payload->>'basic_salary', ''),
    lower(trim(coalesce(payload->>'bank_account', ''))),
    lower(trim(coalesce(payload->>'emergency_contact_name', ''))),
    lower(trim(coalesce(payload->>'emergency_contact_phone', '')))
  )
  where payload ? 'full_name' and payload ? 'phone' and payload ? 'date_of_birth';

create unique index if not exists attendance_employee_date_unique
  on public.attendance_records ((payload->>'employee_id'), (payload->>'attendance_date'))
  where payload ? 'employee_id' and payload ? 'attendance_date';

create unique index if not exists payroll_record_period_employee_unique
  on public.payroll_records ((payload->>'payroll_period_id'), (payload->>'employee_id'))
  where payload ? 'payroll_period_id' and payload ? 'employee_id';

create unique index if not exists payroll_period_month_year_unique
  on public.payroll_periods ((payload->>'month'), (payload->>'year'))
  where payload ? 'month' and payload ? 'year' and coalesce(payload->>'status', '') <> 'Cancelled';

create index if not exists leave_requests_employee_status_idx
  on public.leave_requests ((payload->>'employee_id'), (payload->>'status'));

create index if not exists payroll_records_period_status_idx
  on public.payroll_records ((payload->>'payroll_period_id'), (payload->>'payment_status'));

-- Finance Performance JSONB Indexes
create index if not exists journal_entries_date_idx
  on public.journal_entries ((payload->>'entry_date'));

create index if not exists journal_entries_source_idx
  on public.journal_entries ((payload->>'source_type'), (payload->>'source_id'));

create index if not exists journal_entry_lines_account_idx
  on public.journal_entry_lines ((payload->>'account_id'), (payload->>'journal_entry_id'));

create index if not exists invoices_status_customer_idx
  on public.invoices ((payload->>'status'), (payload->>'customer_id'));

create index if not exists expenses_status_category_idx
  on public.expenses ((payload->>'status'), (payload->>'category'));

create index if not exists fixed_assets_status_idx
  on public.fixed_assets ((payload->>'status'));

-- Finance-owned, idempotent payroll disbursement. The status transition and
-- double-entry voucher happen in one database transaction.
create or replace function public.hkc_pay_payroll_record(p_payroll_record_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  payroll jsonb;
  employee jsonb;
  settings jsonb;
  expense_account_id text;
  cash_account_id text;
  amount numeric;
  journal_id text;
begin
  select payload into payroll from public.payroll_records where id = p_payroll_record_id for update;
  if payroll is null then raise exception 'Payroll record % was not found.', p_payroll_record_id; end if;
  if payroll->>'payment_status' = 'Paid' then
    select id into journal_id from public.journal_entries where payload->>'source_id' = p_payroll_record_id and payload->>'source_type' = 'Payroll Payment' limit 1;
    return jsonb_build_object('payroll_record_id', p_payroll_record_id, 'journal_entry_id', journal_id, 'already_posted', true);
  end if;
  if payroll->>'payment_status' <> 'Approved' then raise exception 'Only approved payroll records can be paid.'; end if;

  select payload into employee from public.employees where id = payroll->>'employee_id';
  if employee is null then raise exception 'Employee % was not found.', payroll->>'employee_id'; end if;
  select payload into settings from public.company_settings order by updated_at desc limit 1;
  expense_account_id := settings->>'payroll_expense_account_id';
  cash_account_id := settings->>'cash_account_id';
  if expense_account_id is null or cash_account_id is null then raise exception 'Company settings must define payroll_expense_account_id and cash_account_id.'; end if;
  if not exists (select 1 from public.chart_of_accounts where id = expense_account_id and coalesce((payload->>'is_active')::boolean, true)) then raise exception 'Configured payroll expense account is unavailable.'; end if;
  if not exists (select 1 from public.chart_of_accounts where id = cash_account_id and coalesce((payload->>'is_active')::boolean, true)) then raise exception 'Configured cash account is unavailable.'; end if;

  amount := coalesce((payroll->>'net_pay')::numeric, 0);
  if amount <= 0 then raise exception 'Payroll net pay must be greater than zero.'; end if;
  journal_id := 'JE-PAY-' || p_payroll_record_id;
  insert into public.journal_entries (id, payload) values (journal_id, jsonb_build_object(
    'id', journal_id, 'entry_date', current_date::text, 'description', 'Payroll payment for ' || coalesce(employee->>'full_name', payroll->>'employee_id'),
    'source_type', 'Payroll Payment', 'source_id', p_payroll_record_id, 'created_by', 'Payroll', 'currency', coalesce(settings->>'base_currency', 'ETB'), 'exchange_rate', 1, 'is_reversal_of', null
  ));
  insert into public.journal_entry_lines (id, payload) values
    (journal_id || '-1', jsonb_build_object('id', journal_id || '-1', 'journal_entry_id', journal_id, 'account_id', expense_account_id, 'debit_amount', amount, 'credit_amount', 0, 'currency', coalesce(settings->>'base_currency', 'ETB'), 'exchange_rate_at_time', 1, 'warehouse_id', null, 'party_type', 'Employee', 'party_id', payroll->>'employee_id', 'party_name', employee->>'full_name')),
    (journal_id || '-2', jsonb_build_object('id', journal_id || '-2', 'journal_entry_id', journal_id, 'account_id', cash_account_id, 'debit_amount', 0, 'credit_amount', amount, 'currency', coalesce(settings->>'base_currency', 'ETB'), 'exchange_rate_at_time', 1, 'warehouse_id', null, 'party_type', 'Employee', 'party_id', payroll->>'employee_id', 'party_name', employee->>'full_name'));
  update public.payroll_records set payload = jsonb_set(payroll, '{payment_status}', '"Paid"'::jsonb, true) where id = p_payroll_record_id;
  return jsonb_build_object('payroll_record_id', p_payroll_record_id, 'journal_entry_id', journal_id, 'already_posted', false);
end;
$$;

drop function public.create_hkc_document_table(text);

notify pgrst, 'reload schema';
