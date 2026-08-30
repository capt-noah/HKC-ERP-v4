-- ============================================================================
-- HKC ERP v4 MASTER DATABASE SCHEMA (31 PRODUCTION TABLES)
-- Compatible with PostgreSQL (Supabase) & Dialect-Mapped for MySQL
-- ============================================================================

-- 1. Helper Function for JSONB Document Tables
CREATE OR REPLACE FUNCTION public.create_hkc_document_table(target_table_name text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS public.%I (
      id TEXT PRIMARY KEY,
      payload JSONB NOT NULL DEFAULT ''{}''::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT timezone(''utc''::text, now()),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone(''utc''::text, now())
    );

    CREATE INDEX IF NOT EXISTS %I_created_at_idx ON public.%I (created_at DESC);
    CREATE INDEX IF NOT EXISTS %I_payload_gin_idx ON public.%I USING gin (payload);

    ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "%s authenticated read" ON public.%I;
    DROP POLICY IF EXISTS "%s authenticated insert" ON public.%I;
    DROP POLICY IF EXISTS "%s authenticated update" ON public.%I;
    DROP POLICY IF EXISTS "%s authenticated delete" ON public.%I;

    CREATE POLICY "%s authenticated read" ON public.%I FOR SELECT TO authenticated USING (true);
    CREATE POLICY "%s authenticated insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (true);
    CREATE POLICY "%s authenticated update" ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    CREATE POLICY "%s authenticated delete" ON public.%I FOR DELETE TO authenticated USING (true);

    GRANT ALL ON public.%I TO authenticated;
    GRANT ALL ON public.%I TO service_role;
  ', 
    target_table_name,
    target_table_name, target_table_name,
    target_table_name, target_table_name,
    target_table_name,
    target_table_name, target_table_name,
    target_table_name, target_table_name,
    target_table_name, target_table_name,
    target_table_name, target_table_name,
    target_table_name, target_table_name,
    target_table_name, target_table_name,
    target_table_name, target_table_name,
    target_table_name, target_table_name,
    target_table_name,
    target_table_name
  );
END;
$$;

-- 2. CREATE 25 JSONB DOCUMENT TABLES
SELECT public.create_hkc_document_table(table_name)
FROM (
  VALUES
    -- Inventory (4)
    ('warehouses'),
    ('inventory_products'),
    ('stock_movements'),
    ('store_transfers'),
    -- Sales & Purchasing (5)
    ('sales_orders'),
    ('purchase_orders'),
    ('customers'),
    ('suppliers'),
    ('hkc_doc_records'),
    -- Finance (10)
    ('company_settings'),
    ('chart_of_accounts'),
    ('journal_entries'),
    ('journal_entry_lines'),
    ('invoices'),
    ('payments'),
    ('expenses'),
    ('recurring_expense_schedules'),
    ('vehicles'),
    ('tax_rules'),
    -- HR & Payroll (6)
    ('employees'),
    ('attendance_records'),
    ('payroll_periods'),
    ('payroll_records'),
    ('leave_types'),
    ('leave_requests')
) AS t(table_name);

-- 3. CREATE 6 RELATIONAL SCHEMA TABLES

-- A. Admin & Auth: users
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  first_name TEXT,
  last_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users authenticated read" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users authenticated write" ON public.users FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.users TO authenticated;
GRANT ALL ON public.users TO service_role;

-- B. Admin & Auth: user_activity_logs
CREATE TABLE IF NOT EXISTS public.user_activity_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
  username TEXT NOT NULL,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.user_activity_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_module ON public.user_activity_logs (module);
ALTER TABLE public.user_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "activity_logs authenticated read" ON public.user_activity_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "activity_logs authenticated insert" ON public.user_activity_logs FOR INSERT TO authenticated WITH CHECK (true);
GRANT ALL ON public.user_activity_logs TO authenticated;
GRANT ALL ON public.user_activity_logs TO service_role;

-- C. Sales: sales_issues
CREATE TABLE IF NOT EXISTS public.sales_issues (
  id TEXT PRIMARY KEY,
  sales_order_id TEXT,
  issue_number TEXT NOT NULL,
  customer_id TEXT,
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'Draft',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  subtotal_amount NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL DEFAULT 'Unpaid',
  payment_method TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.sales_issues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_issues authenticated all" ON public.sales_issues FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.sales_issues TO authenticated;
GRANT ALL ON public.sales_issues TO service_role;

-- D. Sales: sales_issue_items
CREATE TABLE IF NOT EXISTS public.sales_issue_items (
  id TEXT PRIMARY KEY,
  sales_issue_id TEXT NOT NULL REFERENCES public.sales_issues(id) ON DELETE CASCADE,
  product_id TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  batch_number TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_sales_issue_items_issue_id ON public.sales_issue_items (sales_issue_id);
ALTER TABLE public.sales_issue_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sales_issue_items authenticated all" ON public.sales_issue_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.sales_issue_items TO authenticated;
GRANT ALL ON public.sales_issue_items TO service_role;

-- E. Sales: processing_services
CREATE TABLE IF NOT EXISTS public.processing_services (
  id TEXT PRIMARY KEY,
  reference_number TEXT,
  client_company_name TEXT,
  customer_id TEXT,
  goods_description TEXT,
  quantity NUMERIC DEFAULT 1,
  uom TEXT DEFAULT 'Quintal',
  entry_date TEXT,
  agreed_price NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'ETB',
  status TEXT DEFAULT 'Received',
  status_history JSONB DEFAULT '[]'::jsonb,
  assigned_to TEXT,
  invoice_id TEXT,
  notes TEXT,
  contract_url TEXT,
  contract_file_name TEXT,
  locked_processing_rate NUMERIC,
  locked_processing_fee NUMERIC,
  locked_storage_fee NUMERIC,
  locked_total_fee NUMERIC,
  processed_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.processing_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "processing_services authenticated all" ON public.processing_services FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.processing_services TO authenticated;
GRANT ALL ON public.processing_services TO service_role;

-- F. Sales & Logistics: shipment_documents
CREATE TABLE IF NOT EXISTS public.shipment_documents (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  record_type TEXT NOT NULL DEFAULT 'purchase_order',
  document_type TEXT NOT NULL DEFAULT 'Other',
  file_name TEXT NOT NULL,
  file_size NUMERIC DEFAULT 1024,
  file_url TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  uploaded_by TEXT DEFAULT 'Current User',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_shipment_documents_record ON public.shipment_documents (record_id, record_type);
ALTER TABLE public.shipment_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "shipment_documents authenticated all" ON public.shipment_documents FOR ALL TO authenticated USING (true) WITH CHECK (true);
GRANT ALL ON public.shipment_documents TO authenticated;
GRANT ALL ON public.shipment_documents TO service_role;

-- 4. RELOAD POSTGREST SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
