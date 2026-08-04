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
    ('inventory'),
    ('inventory_products'),
    ('inventory_batches'),
    ('warehouse_stock'),
    ('stock_movements'),
    ('store_transfers'),
    ('sales_orders'),
    ('quotations'),
    ('delivery_notes'),
    ('purchase_orders'),
    ('customers'),
    ('suppliers'),
    ('chart_of_accounts'),
    ('journal_entries'),
    ('journal_entry_lines'),
    ('invoices'),
    ('payments'),
    ('cash_accounts'),
    ('accounts_receivable'),
    ('customer_balances'),
    ('expenses'),
    ('recurring_expense_schedules'),
    ('vehicles'),
    ('accounting_periods'),
    ('company_settings'),
    ('payroll_runs'),
    ('revaluations'),
    ('fixed_assets'),
    ('tax_rules'),
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
    ('training_programs'),
    ('cost_center_budgets')
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

drop function public.create_hkc_document_table(text);

notify pgrst, 'reload schema';
