-- ==============================================================================
-- HKC ERP v4 - Master Database Migration: Pruning & Processing Services Patch
-- Run this script in the Supabase SQL Editor (https://supabase.com/dashboard/project/hutzzxwkzfnwiafnnwpl/sql)
-- ==============================================================================

-- 1. ADD RATE-LOCKING LIFECYCLE COLUMNS TO processing_services
ALTER TABLE public.processing_services
ADD COLUMN IF NOT EXISTS locked_processing_rate NUMERIC,
ADD COLUMN IF NOT EXISTS locked_processing_fee NUMERIC,
ADD COLUMN IF NOT EXISTS locked_storage_fee NUMERIC,
ADD COLUMN IF NOT EXISTS locked_total_fee NUMERIC,
ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- 2. ENSURE RLS AND GRANTS ARE CONFIGURED ON processing_services
ALTER TABLE public.processing_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "processing_services authenticated read" ON public.processing_services;
DROP POLICY IF EXISTS "processing_services authenticated insert" ON public.processing_services;
DROP POLICY IF EXISTS "processing_services authenticated update" ON public.processing_services;
DROP POLICY IF EXISTS "processing_services authenticated delete" ON public.processing_services;

CREATE POLICY "processing_services authenticated read" ON public.processing_services
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "processing_services authenticated insert" ON public.processing_services
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "processing_services authenticated update" ON public.processing_services
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "processing_services authenticated delete" ON public.processing_services
  FOR DELETE TO authenticated USING (true);

GRANT ALL ON public.processing_services TO authenticated;
GRANT ALL ON public.processing_services TO service_role;

-- 3. PRUNE UNUSED / DEAD TABLES (0 rows)
DROP TABLE IF EXISTS public.cost_center_budgets CASCADE;
DROP TABLE IF EXISTS public.customer_receivables CASCADE;

-- 4. RELOAD POSTGREST SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
