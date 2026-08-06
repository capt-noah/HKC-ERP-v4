import { config } from "../../config.js"

function headers() {
  const key = config.supabaseServiceRoleKey || config.supabasePublishableKey
  return { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" }
}

export async function payPayrollRecord(id) {
  const response = await fetch(new URL("rpc/hkc_pay_payroll_record", config.supabaseRestUrl), {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ p_payroll_record_id: id }),
  })
  const text = await response.text()
  let body = null
  try { body = text ? JSON.parse(text) : null } catch { body = text }
  if (!response.ok) {
    const error = new Error(body?.message || body?.error || "Payroll payment posting failed.")
    error.status = response.status
    error.body = body
    throw error
  }
  return { status: 200, body }
}
