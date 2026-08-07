export type ProcessingServiceStage =
  | "Draft"
  | "Received"
  | "In Progress"
  | "Processed"
  | "Picked Up/Delivered"

export interface StatusHistoryEntry {
  stage: ProcessingServiceStage
  timestamp: string
}

export interface ProcessingServiceOrder {
  id: string
  reference_number: string
  client_company_name: string
  customer_id?: string | null
  goods_description: string
  quantity: number
  uom: string
  entry_date: string
  agreed_price: number
  currency: string
  status: ProcessingServiceStage
  status_history: StatusHistoryEntry[]
  assigned_to: string
  invoice_id?: string | null
  notes?: string
  created_at?: string
  updated_at?: string
}

export async function fetchProcessingServices(status?: string): Promise<ProcessingServiceOrder[]> {
  try {
    const url = new URL("/api/processing-services", window.location.origin)
    if (status && status !== "ALL") {
      url.searchParams.set("status", status)
    }
    const res = await fetch(url.toString())
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return data
    }
  } catch (err) {
    console.warn("fetchProcessingServices error:", err)
  }
  return []
}

export async function createProcessingService(payload: Partial<ProcessingServiceOrder>): Promise<ProcessingServiceOrder> {
  const res = await fetch("/api/processing-services", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || "Failed to create processing service order.")
  }
  return res.json()
}

export async function updateProcessingService(id: string, payload: Partial<ProcessingServiceOrder>): Promise<ProcessingServiceOrder> {
  const res = await fetch(`/api/processing-services/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || "Failed to update processing service order.")
  }
  return res.json()
}

export async function transitionProcessingServiceStage(id: string, stage: ProcessingServiceStage): Promise<{ ok: boolean; journalEntry?: any } & ProcessingServiceOrder> {
  const res = await fetch(`/api/processing-services/${id}/transition`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stage }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || "Failed to advance stage.")
  }
  return res.json()
}

export async function deleteProcessingService(id: string): Promise<void> {
  const res = await fetch(`/api/processing-services/${id}`, { method: "DELETE" })
  if (!res.ok) {
    throw new Error("Failed to delete processing service order.")
  }
}
