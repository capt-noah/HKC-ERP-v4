import { getResource, listResources } from "./resources.js"
import { createRow, deleteRow, getRow, listRows, replaceRows, updateRow } from "./supabaseRest.js"
import {
  cancelSalesIssue,
  createSalesIssue,
  deleteSalesIssue,
  getAvailableBatches,
  getSalesIssue,
  listSalesIssues,
  postSalesIssue,
  updateSalesIssue,
} from "./salesIssues.js"

function json(res, status, body, extraHeaders = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    ...extraHeaders,
  })

  res.end(body === null ? "" : JSON.stringify(body))
}

function normalizeSupabaseResult(result) {
  const headers = {}
  const contentRange = result.headers.get("content-range")

  if (contentRange) {
    headers["Content-Range"] = contentRange
  }

  return {
    status: result.status,
    headers,
    body: result.body,
  }
}

export async function route(req, res) {
  const requestUrl = new URL(req.url || "/", "http://localhost")
  const parts = requestUrl.pathname.split("/").filter(Boolean)

  if (req.method === "OPTIONS") {
    json(res, 204, null)
    return
  }

  if (req.method === "GET" && requestUrl.pathname === "/health") {
    json(res, 200, { ok: true, service: "hkc-erp-server" })
    return
  }

  if (req.method === "GET" && requestUrl.pathname === "/api") {
    json(res, 200, {
      service: "HKC ERP API",
      resources: listResources(),
    })
    return
  }

  if (parts[0] !== "api" || !parts[1]) {
    json(res, 404, {
      error: "Not found",
      hint: "Use /api for the resource registry or /api/:resource for table routes.",
    })
    return
  }

  if (parts[1] === "sales-issues") {
    const id = parts[2] ? decodeURIComponent(parts[2]) : null
    let result

    try {
      if (req.method === "GET" && !id) {
        result = await listSalesIssues(requestUrl)
      } else if (req.method === "POST" && !id) {
        result = await createSalesIssue(req)
      } else if (req.method === "GET" && id === "batches") {
        result = await getAvailableBatches(requestUrl)
      } else if (req.method === "POST" && id && parts[3] === "post") {
        result = await postSalesIssue(id)
      } else if (req.method === "POST" && id && parts[3] === "cancel") {
        result = await cancelSalesIssue(id)
      } else if (req.method === "GET" && id && parts[3] === "print") {
        result = await getSalesIssue(id)
      } else if (req.method === "GET" && id) {
        result = await getSalesIssue(id)
      } else if (req.method === "PATCH" && id) {
        result = await updateSalesIssue(req, id)
      } else if (req.method === "DELETE" && id) {
        result = await deleteSalesIssue(id)
      } else {
        json(res, 405, { error: "Method not allowed for this sales issue route." })
        return
      }
    } catch (error) {
      json(res, error.status || 500, {
        error: error instanceof Error ? error.message : "Sales issue route failed.",
        details: error.body,
      })
      return
    }

    json(res, result.status, result.body)
    return
  }

  const resource = getResource(parts[1])
  if (!resource) {
    json(res, 404, {
      error: `Unknown resource '${parts[1]}'.`,
      availableResources: listResources().map((item) => item.name),
    })
    return
  }

  const id = parts[2] ? decodeURIComponent(parts[2]) : null
  let result

  if (req.method === "GET" && !id) {
    result = await listRows({ req, resource, requestUrl })
  } else if (req.method === "PUT" && !id) {
    result = await replaceRows({ req, resource })
  } else if (req.method === "GET" && id) {
    result = await getRow({ req, resource, id, requestUrl })
  } else if (req.method === "POST" && !id) {
    result = await createRow({ req, resource })
  } else if (req.method === "PATCH" && id) {
    result = await updateRow({ req, resource, id })
  } else if (req.method === "DELETE" && id) {
    result = await deleteRow({ req, resource, id })
  } else {
    json(res, 405, { error: "Method not allowed for this route." })
    return
  }

  const normalized = normalizeSupabaseResult(result)
  json(res, normalized.status, normalized.body, normalized.headers)
}
