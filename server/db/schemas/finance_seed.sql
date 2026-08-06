-- HKC ERP Standard Chart of Accounts & Company Settings SQL Seed
-- Run this in the Supabase SQL editor to seed standard ERP accounts and settings.

-- 1. Seed Company Settings
insert into public.company_settings (id, payload, created_at, updated_at)
values (
  'default',
  '{
    "company_name": "HKC Trading PLC",
    "base_currency": "ETB",
    "exchange_rates": { "USD": 58.50, "EUR": 63.20 },
    "cash_account_id": "ACC-1010",
    "ar_account_id": "ACC-1200",
    "inventory_account_id": "ACC-1410",
    "ap_account_id": "ACC-2100",
    "tax_payable_account_id": "ACC-2210",
    "payroll_payable_account_id": "ACC-2300",
    "retained_earnings_account_id": "ACC-3200",
    "sales_account_id": "ACC-4010",
    "cogs_account_id": "ACC-5000",
    "payroll_expense_account_id": "ACC-5010"
  }'::jsonb,
  now(),
  now()
)
on conflict (id) do update
set payload = excluded.payload, updated_at = now();

-- 2. Seed Standard ERP Chart of Accounts (5 Root Hierarchy)
select public.create_hkc_document_table('chart_of_accounts');

insert into public.chart_of_accounts (id, payload, created_at, updated_at)
values
  ('ACC-1000', '{"id":"ACC-1000","code":"1000","name":"Assets","account_type":"Asset","parent_account_id":null,"is_active":true,"is_group":true}'::jsonb, now(), now()),
  ('ACC-1010', '{"id":"ACC-1010","code":"1010","name":"Cash & Bank Accounts","account_type":"Asset","parent_account_id":"ACC-1000","is_active":true,"is_group":false}'::jsonb, now(), now()),
  ('ACC-1200', '{"id":"ACC-1200","code":"1200","name":"Accounts Receivable (AR)","account_type":"Asset","parent_account_id":"ACC-1000","is_active":true,"is_group":false}'::jsonb, now(), now()),
  ('ACC-1410', '{"id":"ACC-1410","code":"1410","name":"Stock in Hand / Inventory Asset","account_type":"Asset","parent_account_id":"ACC-1000","is_active":true,"is_group":false}'::jsonb, now(), now()),
  ('ACC-1500', '{"id":"ACC-1500","code":"1500","name":"Fixed Capital Assets","account_type":"Asset","parent_account_id":"ACC-1000","is_active":true,"is_group":false}'::jsonb, now(), now()),

  ('ACC-2000', '{"id":"ACC-2000","code":"2000","name":"Liabilities","account_type":"Liability","parent_account_id":null,"is_active":true,"is_group":true}'::jsonb, now(), now()),
  ('ACC-2100', '{"id":"ACC-2100","code":"2100","name":"Accounts Payable (AP)","account_type":"Liability","parent_account_id":"ACC-2000","is_active":true,"is_group":false}'::jsonb, now(), now()),
  ('ACC-2120', '{"id":"ACC-2120","code":"2120","name":"Stock Received Not Billed (Clearing)","account_type":"Liability","parent_account_id":"ACC-2000","is_active":true,"is_group":false}'::jsonb, now(), now()),
  ('ACC-2210', '{"id":"ACC-2210","code":"2210","name":"VAT & Tax Payable","account_type":"Liability","parent_account_id":"ACC-2000","is_active":true,"is_group":false}'::jsonb, now(), now()),
  ('ACC-2300', '{"id":"ACC-2300","code":"2300","name":"Payroll Payable","account_type":"Liability","parent_account_id":"ACC-2000","is_active":true,"is_group":false}'::jsonb, now(), now()),

  ('ACC-3000', '{"id":"ACC-3000","code":"3000","name":"Equity","account_type":"Equity","parent_account_id":null,"is_active":true,"is_group":true}'::jsonb, now(), now()),
  ('ACC-3100', '{"id":"ACC-3100","code":"3100","name":"Share Capital","account_type":"Equity","parent_account_id":"ACC-3000","is_active":true,"is_group":false}'::jsonb, now(), now()),
  ('ACC-3200', '{"id":"ACC-3200","code":"3200","name":"Retained Earnings","account_type":"Equity","parent_account_id":"ACC-3000","is_active":true,"is_group":false}'::jsonb, now(), now()),

  ('ACC-4000', '{"id":"ACC-4000","code":"4000","name":"Income / Revenue","account_type":"Revenue","parent_account_id":null,"is_active":true,"is_group":true}'::jsonb, now(), now()),
  ('ACC-4010', '{"id":"ACC-4010","code":"4010","name":"Sales Revenue","account_type":"Revenue","parent_account_id":"ACC-4000","is_active":true,"is_group":false}'::jsonb, now(), now()),
  ('ACC-4020', '{"id":"ACC-4020","code":"4020","name":"Other Operating Income","account_type":"Revenue","parent_account_id":"ACC-4000","is_active":true,"is_group":false}'::jsonb, now(), now()),

  ('ACC-5000', '{"id":"ACC-5000","code":"5000","name":"Expenses","account_type":"Expense","parent_account_id":null,"is_active":true,"is_group":true}'::jsonb, now(), now()),
  ('ACC-5001', '{"id":"ACC-5001","code":"5001","name":"Cost of Goods Sold (COGS)","account_type":"Expense","parent_account_id":"ACC-5000","is_active":true,"is_group":false}'::jsonb, now(), now()),
  ('ACC-5010', '{"id":"ACC-5010","code":"5010","name":"Salaries & Employee Wages","account_type":"Expense","parent_account_id":"ACC-5000","is_active":true,"is_group":false}'::jsonb, now(), now()),
  ('ACC-5200', '{"id":"ACC-5200","code":"5200","name":"Software & SaaS Expenses","account_type":"Expense","parent_account_id":"ACC-5000","is_active":true,"is_group":false}'::jsonb, now(), now()),
  ('ACC-5300', '{"id":"ACC-5300","code":"5300","name":"Research & Development","account_type":"Expense","parent_account_id":"ACC-5000","is_active":true,"is_group":false}'::jsonb, now(), now()),
  ('ACC-5400', '{"id":"ACC-5400","code":"5400","name":"Vehicle Fleet Repairs & Maintenance","account_type":"Expense","parent_account_id":"ACC-5000","is_active":true,"is_group":false}'::jsonb, now(), now())
on conflict (id) do update
set payload = excluded.payload, updated_at = now();

-- 3. Seed Standard Tax Rules
select public.create_hkc_document_table('tax_rules');

insert into public.tax_rules (id, payload, created_at, updated_at)
values
  ('TAX-001', '{"id":"TAX-001","name":"Standard VAT (15%)","rate":15,"type":"VAT/GST","gl_account_code":"2210","is_inclusive":false,"description":"Standard Ethiopian Value Added Tax rate of 15%"}'::jsonb, now(), now()),
  ('TAX-002', '{"id":"TAX-002","name":"Withholding Tax (TDS 2%)","rate":2,"type":"Withholding Tax (TDS)","gl_account_code":"2210","is_inclusive":false,"description":"2% Tax Deducted at Source for commercial services"}'::jsonb, now(), now()),
  ('TAX-003', '{"id":"TAX-003","name":"Import Customs Duty (10%)","rate":10,"type":"Import Duty","gl_account_code":"2210","is_inclusive":false,"description":"Customs duty rate on imported agricultural & tech goods"}'::jsonb, now(), now())
on conflict (id) do update
set payload = excluded.payload, updated_at = now();
