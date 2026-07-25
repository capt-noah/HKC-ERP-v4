-- Sales Issued normalized register and posting workflow.
-- Run after server/supabase.schema.sql so inventory_products, stock_movements,
-- journal_entries, and journal_entry_lines JSONB document tables exist.
--
-- Access is intentionally service-role-only. The React app talks to the local
-- server, and the server uses the service role key to perform validated writes.

create table if not exists public.sales_issues (
  id text primary key,
  fs_no text not null unique,
  reference_no text not null,
  sale_date date not null,
  customer_id text not null,
  customer_name text not null,
  warehouse_id text not null,
  payment_type text not null check (payment_type in ('Cash', 'Credit')),
  status text not null default 'Draft' check (status in ('Draft', 'Posted', 'Cancelled')),
  total_quantity numeric not null default 0,
  total_amount numeric not null default 0,
  created_by text not null default 'Current User',
  posted_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  posted_at timestamptz
);

create table if not exists public.sales_issue_items (
  id text primary key,
  sales_issue_id text not null references public.sales_issues(id) on delete cascade,
  item_id text not null,
  item_name text not null,
  batch_id text not null,
  batch_no text not null,
  quantity numeric not null check (quantity > 0),
  unit_price numeric not null check (unit_price >= 0),
  amount numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_receivables (
  id text primary key,
  sales_issue_id text not null references public.sales_issues(id) on delete cascade,
  customer_id text not null,
  customer_name text not null,
  amount numeric not null check (amount >= 0),
  balance numeric not null check (balance >= 0),
  status text not null default 'Open',
  created_at timestamptz not null default now()
);

create index if not exists sales_issue_items_issue_idx on public.sales_issue_items(sales_issue_id);
create index if not exists sales_issue_items_item_idx on public.sales_issue_items(item_id);
create index if not exists sales_issue_items_batch_idx on public.sales_issue_items(batch_no);

alter table public.sales_issues enable row level security;
alter table public.sales_issue_items enable row level security;
alter table public.customer_receivables enable row level security;

revoke all on public.sales_issues from anon, authenticated;
revoke all on public.sales_issue_items from anon, authenticated;
revoke all on public.customer_receivables from anon, authenticated;
grant select, insert, update, delete on public.sales_issues to service_role;
grant select, insert, update, delete on public.sales_issue_items to service_role;
grant select, insert, update, delete on public.customer_receivables to service_role;

create or replace function public.hkc_expiry_date(expiry_text text)
returns date
language plpgsql
immutable
as $$
begin
  if expiry_text is null or expiry_text = '' or expiry_text = 'N/A' then
    return null;
  end if;

  if expiry_text ~ '^\d{4}-\d{2}$' then
    return (date_trunc('month', (expiry_text || '-01')::date) + interval '1 month - 1 day')::date;
  end if;

  if expiry_text ~ '^\d{4}-\d{2}-\d{2}$' then
    return expiry_text::date;
  end if;

  return null;
end;
$$;

create or replace function public.hkc_post_sales_issue(p_sales_issue_id text, p_posted_by text default 'Current User')
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_issue public.sales_issues%rowtype;
  v_item public.sales_issue_items%rowtype;
  v_product_row record;
  v_payload jsonb;
  v_batches jsonb;
  v_stock jsonb;
  v_batch jsonb;
  v_stock_row jsonb;
  v_batch_found boolean;
  v_stock_found boolean;
  v_batch_qty numeric;
  v_stock_qty numeric;
  v_total_qty numeric := 0;
  v_total_amount numeric := 0;
  v_total_cost numeric := 0;
  v_unit_cost numeric;
  v_entry_id text := 'JE-SALE-' || p_sales_issue_id;
  v_cost_entry_id text := 'JE-COGS-' || p_sales_issue_id;
begin
  select *
    into v_issue
    from public.sales_issues
    where id = p_sales_issue_id
    for update;

  if not found then
    raise exception 'Sales issue not found.';
  end if;

  if v_issue.status = 'Posted' then
    raise exception 'Sales issue has already been posted.';
  end if;

  if v_issue.status = 'Cancelled' then
    raise exception 'Cancelled sales issue cannot be posted.';
  end if;

  if not exists (select 1 from public.sales_issue_items where sales_issue_id = p_sales_issue_id) then
    raise exception 'At least one item row is required.';
  end if;

  for v_item in
    select * from public.sales_issue_items where sales_issue_id = p_sales_issue_id order by created_at, id
  loop
    if v_item.quantity <= 0 then
      raise exception 'Row %: Quantity must be greater than zero.', v_item.id;
    end if;

    if v_item.unit_price < 0 then
      raise exception 'Row %: Unit price must be greater than or equal to zero.', v_item.id;
    end if;

    select *
      into v_product_row
      from public.inventory_products
      where id = v_item.item_id
      for update;

    if not found then
      raise exception 'Item % does not exist.', v_item.item_id;
    end if;

    v_payload := v_product_row.payload;
    v_batches := '[]'::jsonb;
    v_stock := '[]'::jsonb;
    v_batch_found := false;
    v_stock_found := false;
    v_unit_cost := coalesce((v_payload->>'unitCost')::numeric, 0);

    for v_batch in select value from jsonb_array_elements(coalesce(v_payload->'batches', '[]'::jsonb))
    loop
      if v_batch->>'batchNo' = v_item.batch_no then
        v_batch_found := true;
        if public.hkc_expiry_date(v_batch->>'expiry') is not null and public.hkc_expiry_date(v_batch->>'expiry') < current_date then
          raise exception 'Batch % is expired and cannot be sold.', v_item.batch_no;
        end if;

        v_batch_qty := coalesce((v_batch->>'qty')::numeric, 0);
        if v_item.quantity > v_batch_qty then
          raise exception 'Quantity exceeds available batch balance for %.', v_item.batch_no;
        end if;

        v_batch := jsonb_set(v_batch, '{qty}', to_jsonb(v_batch_qty - v_item.quantity), true);
      end if;

      v_batches := v_batches || jsonb_build_array(v_batch);
    end loop;

    if not v_batch_found then
      raise exception 'Batch % does not exist.', v_item.batch_no;
    end if;

    for v_stock_row in select value from jsonb_array_elements(coalesce(v_payload->'stockBreakdown', '[]'::jsonb))
    loop
      if v_stock_row->>'warehouse' = v_issue.warehouse_id then
        v_stock_found := true;
        v_stock_qty := coalesce((v_stock_row->>'qty')::numeric, 0);
        if v_item.quantity > v_stock_qty then
          raise exception 'Quantity exceeds warehouse balance for %.', v_issue.warehouse_id;
        end if;

        v_stock_row := jsonb_set(v_stock_row, '{qty}', to_jsonb(v_stock_qty - v_item.quantity), true);
      end if;

      v_stock := v_stock || jsonb_build_array(v_stock_row);
    end loop;

    if not v_stock_found then
      raise exception 'Warehouse balance for % does not exist.', v_issue.warehouse_id;
    end if;

    v_payload := jsonb_set(v_payload, '{batches}', v_batches, true);
    v_payload := jsonb_set(v_payload, '{stockBreakdown}', v_stock, true);
    v_payload := jsonb_set(v_payload, '{quantity}', to_jsonb(greatest(coalesce((v_payload->>'quantity')::numeric, 0) - v_item.quantity, 0)), true);

    update public.inventory_products
      set payload = v_payload, updated_at = now()
      where id = v_item.item_id;

    update public.sales_issue_items
      set amount = round(v_item.quantity * v_item.unit_price, 2)
      where id = v_item.id;

    insert into public.stock_movements(id, payload)
    values (
      'SM-SALE-' || p_sales_issue_id || '-' || v_item.id,
      jsonb_build_object(
        'id', 'SM-SALE-' || p_sales_issue_id || '-' || v_item.id,
        'type', 'SALES_OUT',
        'productId', v_item.item_id,
        'productName', v_item.item_name,
        'fromWarehouse', v_issue.warehouse_id,
        'qty', v_item.quantity,
        'reference', v_issue.fs_no,
        'date', now()
      )
    )
    on conflict (id) do nothing;

    v_total_qty := v_total_qty + v_item.quantity;
    v_total_amount := v_total_amount + round(v_item.quantity * v_item.unit_price, 2);
    v_total_cost := v_total_cost + round(v_item.quantity * v_unit_cost, 2);
  end loop;

  update public.sales_issues
    set status = 'Posted',
        total_quantity = v_total_qty,
        total_amount = v_total_amount,
        posted_by = p_posted_by,
        posted_at = now(),
        updated_at = now()
    where id = p_sales_issue_id and status = 'Draft';

  if not found then
    raise exception 'Posting failed because the sales issue is no longer draft.';
  end if;

  if v_issue.payment_type = 'Credit' then
    insert into public.customer_receivables(id, sales_issue_id, customer_id, customer_name, amount, balance)
    values ('AR-' || p_sales_issue_id, p_sales_issue_id, v_issue.customer_id, v_issue.customer_name, v_total_amount, v_total_amount)
    on conflict (id) do nothing;
  end if;

  insert into public.journal_entries(id, payload)
  values (
    v_entry_id,
    jsonb_build_object(
      'id', v_entry_id,
      'entry_date', current_date,
      'description', 'Sales issue ' || v_issue.fs_no,
      'source_type', 'Sales Issue',
      'source_id', p_sales_issue_id,
      'created_by', p_posted_by,
      'currency', 'ETB',
      'exchange_rate', 1,
      'is_reversal_of', null
    )
  )
  on conflict (id) do nothing;

  insert into public.journal_entry_lines(id, payload)
  values
    (v_entry_id || '-DR', jsonb_build_object('id', v_entry_id || '-DR', 'journal_entry_id', v_entry_id, 'account_id', case when v_issue.payment_type = 'Cash' then '1000' else '1200' end, 'debit_amount', v_total_amount, 'credit_amount', 0, 'currency', 'ETB', 'exchange_rate_at_time', 1, 'warehouse_id', v_issue.warehouse_id, 'party_type', 'Customer', 'party_id', v_issue.customer_id, 'party_name', v_issue.customer_name)),
    (v_entry_id || '-CR', jsonb_build_object('id', v_entry_id || '-CR', 'journal_entry_id', v_entry_id, 'account_id', '4000', 'debit_amount', 0, 'credit_amount', v_total_amount, 'currency', 'ETB', 'exchange_rate_at_time', 1, 'warehouse_id', v_issue.warehouse_id, 'party_type', 'Customer', 'party_id', v_issue.customer_id, 'party_name', v_issue.customer_name))
  on conflict (id) do nothing;

  insert into public.journal_entries(id, payload)
  values (
    v_cost_entry_id,
    jsonb_build_object(
      'id', v_cost_entry_id,
      'entry_date', current_date,
      'description', 'Inventory cost for sales issue ' || v_issue.fs_no,
      'source_type', 'Sales Issue',
      'source_id', p_sales_issue_id,
      'created_by', p_posted_by,
      'currency', 'ETB',
      'exchange_rate', 1,
      'is_reversal_of', null
    )
  )
  on conflict (id) do nothing;

  insert into public.journal_entry_lines(id, payload)
  values
    (v_cost_entry_id || '-DR', jsonb_build_object('id', v_cost_entry_id || '-DR', 'journal_entry_id', v_cost_entry_id, 'account_id', '5000', 'debit_amount', v_total_cost, 'credit_amount', 0, 'currency', 'ETB', 'exchange_rate_at_time', 1, 'warehouse_id', v_issue.warehouse_id, 'party_type', null, 'party_id', null, 'party_name', null)),
    (v_cost_entry_id || '-CR', jsonb_build_object('id', v_cost_entry_id || '-CR', 'journal_entry_id', v_cost_entry_id, 'account_id', '1300', 'debit_amount', 0, 'credit_amount', v_total_cost, 'currency', 'ETB', 'exchange_rate_at_time', 1, 'warehouse_id', v_issue.warehouse_id, 'party_type', null, 'party_id', null, 'party_name', null))
  on conflict (id) do nothing;

  return jsonb_build_object('id', p_sales_issue_id, 'status', 'Posted', 'total_quantity', v_total_qty, 'total_amount', v_total_amount);
end;
$$;

revoke all on function public.hkc_post_sales_issue(text, text) from public, anon, authenticated;
grant execute on function public.hkc_post_sales_issue(text, text) to service_role;
