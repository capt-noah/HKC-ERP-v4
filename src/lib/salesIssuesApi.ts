export type SalesIssueStatus = "Draft" | "Posted" | "Cancelled"
export type PaymentType = "Cash" | "Credit"

export interface SalesIssueItem {
  id?: string
  sales_issue_id?: string
  item_id: string
  item_name: string
  batch_id: string
  batch_no: string
  packaging_unit?: string
  available_quantity?: number
  quantity: number
  unit_price: number
  amount: number
}

export interface SalesIssue {
  id: string
  fs_no: string
  reference_no: string
  sale_date: string
  customer_id: string
  customer_name: string
  warehouse_id: string
  payment_type: PaymentType
  status: SalesIssueStatus
  total_quantity: number
  total_amount: number
  created_by: string
  posted_by?: string | null
  posted_at?: string | null
  items?: SalesIssueItem[]
}

export interface AvailableBatch {
  batch_id: string
  batch_no: string
  item_id: string
  item_name: string
  warehouse_id: string
  available_quantity: number
  manufacturing_date?: string
  expiry: string
  expiry_date?: string
  packaging_unit: string
  unit_price: number
  unit_cost?: number
}

async function parseResponse(response: Response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const base = import.meta.env.VITE_API_URL ?? ""
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })
  const body = await parseResponse(response)
  if (!response.ok) {
    throw new Error(body?.error || body?.message || `Request failed with ${response.status}`)
  }
  return body as T
}

export function listSalesIssues(params: URLSearchParams) {
  return api<{ rows: SalesIssue[]; total: number; page: number; pageSize: number }>(`/api/sales-issues?${params.toString()}`)
}

export function getSalesIssue(id: string) {
  return api<SalesIssue>(`/api/sales-issues/${encodeURIComponent(id)}`)
}

export function createSalesIssue(issue: Partial<SalesIssue> & { items: SalesIssueItem[] }) {
  return api<SalesIssue>("/api/sales-issues", {
    method: "POST",
    body: JSON.stringify(issue),
  })
}

export function updateSalesIssue(id: string, issue: Partial<SalesIssue> & { items: SalesIssueItem[] }) {
  return api<SalesIssue>(`/api/sales-issues/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(issue),
  })
}

export function postSalesIssue(id: string) {
  return api<{ id: string; status: SalesIssueStatus }>(`/api/sales-issues/${encodeURIComponent(id)}/post`, { method: "POST" })
}

export function cancelSalesIssue(id: string) {
  return api<SalesIssue>(`/api/sales-issues/${encodeURIComponent(id)}/cancel`, { method: "POST" })
}

export function deleteSalesIssue(id: string) {
  return api<{ ok: true }>(`/api/sales-issues/${encodeURIComponent(id)}`, { method: "DELETE" })
}

export function getAvailableBatches(itemId: string, warehouseId: string) {
  const params = new URLSearchParams({ item_id: itemId, warehouse_id: warehouseId })
  return api<AvailableBatch[]>(`/api/sales-issues/batches?${params.toString()}`)
}
