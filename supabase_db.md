## Table `warehouses`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `inventory_products`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `stock_movements`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `store_transfers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `sales_orders`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `quotations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `delivery_notes`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `purchase_orders`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `customers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `suppliers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `chart_of_accounts`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `journal_entries`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `journal_entry_lines`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `invoices`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `payments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `expenses`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `recurring_expense_schedules`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `vehicles`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `accounting_periods`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `company_settings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `payroll_runs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `revaluations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `fixed_assets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `tax_rules`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `employees`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `departments`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `designations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `job_openings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `job_applicants`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `onboardings`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `separations`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `leave_types`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `leave_requests`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `expense_claims`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `appraisals`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `training_programs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `cost_center_budgets`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `sales_issues`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `fs_no` | `text` |  Unique |
| `reference_no` | `text` |  |
| `sale_date` | `date` |  |
| `customer_id` | `text` |  |
| `customer_name` | `text` |  |
| `warehouse_id` | `text` |  |
| `payment_type` | `text` |  |
| `status` | `text` |  |
| `total_quantity` | `numeric` |  |
| `total_amount` | `numeric` |  |
| `created_by` | `text` |  |
| `posted_by` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `posted_at` | `timestamptz` |  Nullable |

## Table `sales_issue_items`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `sales_issue_id` | `text` |  |
| `item_id` | `text` |  |
| `item_name` | `text` |  |
| `batch_id` | `text` |  |
| `batch_no` | `text` |  |
| `quantity` | `numeric` |  |
| `unit_price` | `numeric` |  |
| `amount` | `numeric` |  |
| `created_at` | `timestamptz` |  |

## Table `customer_receivables`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `sales_issue_id` | `text` |  |
| `customer_id` | `text` |  |
| `customer_name` | `text` |  |
| `amount` | `numeric` |  |
| `balance` | `numeric` |  |
| `status` | `text` |  |
| `created_at` | `timestamptz` |  |

## Table `attendance_records`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `payroll_periods`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `payroll_records`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `users`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `username` | `text` |  Unique |
| `password_hash` | `text` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |
| `roles` | `_text` |  |
| `status` | `text` |  |
| `fullname` | `text` |  Nullable |
| `employee_id` | `text` |  Nullable |
| `warehouse_ids` | `_text` |  Nullable |

## Table `user_activity_logs`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `uuid` | Primary |
| `user_id` | `uuid` |  Nullable |
| `username` | `text` |  |
| `fullname` | `text` |  Nullable |
| `action` | `text` |  |
| `resource` | `text` |  |
| `details` | `jsonb` |  Nullable |
| `created_at` | `timestamptz` |  |

## Table `bin_cards`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `hkc_doc_records`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `payload` | `jsonb` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `shipment_documents`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `record_id` | `text` |  |
| `record_type` | `text` |  |
| `document_type` | `text` |  |
| `file_name` | `text` |  |
| `file_size` | `numeric` |  |
| `file_url` | `text` |  |
| `uploaded_at` | `timestamptz` |  |
| `uploaded_by` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `shipment_document_officers`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `record_id` | `text` | Primary |
| `assigned_employee_id` | `text` |  Nullable |
| `assigned_employee_name` | `text` |  |
| `assigned_at` | `timestamptz` |  |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## Table `processing_services`

### Columns

| Name | Type | Constraints |
|------|------|-------------|
| `id` | `text` | Primary |
| `reference_number` | `text` |  Nullable |
| `client_company_name` | `text` |  Nullable |
| `customer_id` | `text` |  Nullable |
| `goods_description` | `text` |  Nullable |
| `quantity` | `numeric` |  Nullable |
| `uom` | `text` |  Nullable |
| `entry_date` | `text` |  Nullable |
| `agreed_price` | `numeric` |  Nullable |
| `currency` | `text` |  Nullable |
| `status` | `text` |  Nullable |
| `status_history` | `jsonb` |  Nullable |
| `assigned_to` | `text` |  Nullable |
| `invoice_id` | `text` |  Nullable |
| `notes` | `text` |  Nullable |
| `contract_url` | `text` |  Nullable |
| `contract_file_name` | `text` |  Nullable |
| `created_at` | `timestamptz` |  |
| `updated_at` | `timestamptz` |  |

## RLS Policies

### `warehouses`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `warehouses authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `warehouses authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `warehouses authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `warehouses authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `inventory_products`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `inventory_products authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `inventory_products authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `inventory_products authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `inventory_products authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `stock_movements`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `stock_movements authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `stock_movements authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `stock_movements authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `stock_movements authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `store_transfers`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `store_transfers authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `store_transfers authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `store_transfers authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `store_transfers authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `sales_orders`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `sales_orders authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `sales_orders authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `sales_orders authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `sales_orders authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `quotations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `quotations authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `quotations authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `quotations authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `quotations authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `delivery_notes`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `delivery_notes authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `delivery_notes authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `delivery_notes authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `delivery_notes authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `purchase_orders`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `purchase_orders authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `purchase_orders authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `purchase_orders authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `purchase_orders authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `customers`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `customers authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `customers authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `customers authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `customers authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `suppliers`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `suppliers authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `suppliers authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `suppliers authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `suppliers authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `chart_of_accounts`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `chart_of_accounts authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `chart_of_accounts authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `chart_of_accounts authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `chart_of_accounts authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `journal_entries`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `journal_entries authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `journal_entries authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `journal_entries authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `journal_entries authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `journal_entry_lines`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `journal_entry_lines authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `journal_entry_lines authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `journal_entry_lines authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `journal_entry_lines authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `invoices`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `invoices authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `invoices authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `invoices authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `invoices authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `payments`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `payments authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `payments authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `payments authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `payments authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `expenses`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `expenses authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `expenses authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `expenses authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `expenses authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `recurring_expense_schedules`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `recurring_expense_schedules authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `recurring_expense_schedules authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `recurring_expense_schedules authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `recurring_expense_schedules authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `vehicles`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `vehicles authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `vehicles authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `vehicles authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `vehicles authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `accounting_periods`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `accounting_periods authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `accounting_periods authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `accounting_periods authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `accounting_periods authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `company_settings`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `company_settings authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `company_settings authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `company_settings authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `company_settings authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `payroll_runs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `payroll_runs authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `payroll_runs authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `payroll_runs authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `payroll_runs authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `revaluations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `revaluations authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `revaluations authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `revaluations authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `revaluations authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `fixed_assets`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `fixed_assets authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `fixed_assets authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `fixed_assets authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `fixed_assets authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `tax_rules`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `tax_rules authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `tax_rules authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `tax_rules authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `tax_rules authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `employees`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `employees authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `employees authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `employees authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `employees authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `departments`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `departments authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `departments authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `departments authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `departments authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `designations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `designations authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `designations authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `designations authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `designations authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `job_openings`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `job_openings authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `job_openings authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `job_openings authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `job_openings authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `job_applicants`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `job_applicants authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `job_applicants authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `job_applicants authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `job_applicants authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `onboardings`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `onboardings authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `onboardings authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `onboardings authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `onboardings authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `separations`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `separations authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `separations authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `separations authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `separations authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `leave_types`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `leave_types authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `leave_types authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `leave_types authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `leave_types authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `leave_requests`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `leave_requests authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `leave_requests authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `leave_requests authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `leave_requests authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `expense_claims`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `expense_claims authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `expense_claims authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `expense_claims authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `expense_claims authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `appraisals`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `appraisals authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `appraisals authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `appraisals authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `appraisals authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `training_programs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `training_programs authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `training_programs authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `training_programs authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `training_programs authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `cost_center_budgets`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `cost_center_budgets authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `cost_center_budgets authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `cost_center_budgets authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `cost_center_budgets authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `payroll_periods`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `payroll_periods authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `payroll_periods authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `payroll_periods authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `payroll_periods authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `payroll_records`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `payroll_records authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `payroll_records authenticated insert` | INSERT | authenticated | PERMISSIVE | — | `true` |
| `payroll_records authenticated update` | UPDATE | authenticated | PERMISSIVE | `true` | `true` |
| `payroll_records authenticated delete` | DELETE | authenticated | PERMISSIVE | `true` | — |

### `users`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `users authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `users service_role all` | ALL | service_role | PERMISSIVE | `true` | `true` |

### `user_activity_logs`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `user_activity_logs authenticated read` | SELECT | authenticated | PERMISSIVE | `true` | — |
| `user_activity_logs service_role all` | ALL | service_role | PERMISSIVE | `true` | `true` |

### `bin_cards`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `bin_cards authenticated all` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `hkc_doc_records`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `hkc_doc_records authenticated all` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `shipment_documents`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `shipment_documents authenticated all` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `shipment_document_officers`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `shipment_document_officers authenticated all` | ALL | authenticated | PERMISSIVE | `true` | `true` |

### `processing_services`

| Policy | Command | Roles | Action | USING | WITH CHECK |
|--------|---------|-------|--------|-------|------------|
| `processing_services authenticated all` | ALL | authenticated | PERMISSIVE | `true` | `true` |

