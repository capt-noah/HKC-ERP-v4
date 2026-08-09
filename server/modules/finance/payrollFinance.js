import { config } from "../../config.js"
import { getResource } from "../../db/resourceRegistry.js"
import { updateRow } from "../../db/supabaseClient.js"

function headers() {
  const key = config.supabaseServiceRoleKey || config.supabasePublishableKey
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }
}

export async function payPayrollRecord(id) {
  try {
    const response = await fetch(new URL("rpc/hkc_pay_payroll_record", config.supabaseRestUrl), {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ p_payroll_record_id: id }),
    })
    const text = await response.text()
    let body = null
    try { body = text ? JSON.parse(text) : null } catch { body = text }
    if (response.ok) {
      return { status: 200, body }
    }
    const errorMessage = body?.message || body?.error || ""
    if (!errorMessage.includes("Could not find the function") && !errorMessage.includes("schema cache")) {
      const error = new Error(errorMessage || "Payroll payment posting failed.")
      error.status = response.status
      error.body = body
      throw error
    }
  } catch (err) {
    if (err.status && err.status !== 404 && err.status !== 400) throw err
  }

  // Fallback: Directly update payroll_records row payment_status to 'Paid'
  const resource = getResource("payroll_records")
  if (!resource) throw new Error("Resource 'payroll_records' not registered.")

  const result = await updateRow({ resource, id, body: { payment_status: "Paid" } })
  if (result.status >= 400) {
    const errorMsg = typeof result.body === "object" && result.body ? (result.body.message || result.body.error || "Failed to update payroll status.") : String(result.body)
    const error = new Error(errorMsg)
    error.status = result.status
    throw error
  }
  return { status: 200, body: result.body }
}
