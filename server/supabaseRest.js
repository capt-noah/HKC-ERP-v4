import { config } from "./config.js"
import crypto from "node:crypto"

const PASS_THROUGH_QUERY_KEYS = new Set(["select", "order", "limit", "offset", "range", "or", "and"])

function appendQueryParams(url, query = {}) {
  for (const [key, value] of Object.entries(query)) {
    if (PASS_THROUGH_QUERY_KEYS.has(key) || /^[a-zA-Z0-9_]+$/.test(key)) {
      url.searchParams.append(key, value)
    }
  }
}

function buildHeaders(incomingHeaders = {}, prefer) {
  const key = config.supabaseServiceRoleKey || config.supabasePublishableKey
  const result = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  }
  if (prefer) result.Prefer = prefer
  return result
}

async function parseSupabaseResponse(response) {
  const text = await response.text()
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

function toDocumentRows(data) {
  if (!Array.isArray(data)) return data
  return data.map((row) => ({ id: row.id, ...(row.payload || {}) }))
}

function toDocumentRow(data) {
  if (Array.isArray(data)) return toDocumentRows(data)
  if (!data || typeof data !== "object") return data
  return { id: data.id, ...(data.payload || {}) }
}

function isEmptyObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0
}

function documentId(body) {
  return body && typeof body === "object" && body.id ? String(body.id) : crypto.randomUUID()
}

// ── Public API ────────────────────────────────────────────────────────────────
// All functions accept plain objects from Express (req.query / req.body /
// req.headers) rather than the raw Node IncomingMessage.

export async function listRows({ resource, query = {}, headers = {} }) {
  const url = new URL(resource.table, config.supabaseRestUrl)
  appendQueryParams(url, query)

  if (!url.searchParams.has("select")) {
    url.searchParams.set("select", resource.storage === "jsonb_document" ? "id,payload" : "*")
  }

  const response = await fetch(url, {
    method: "GET",
    headers: buildHeaders(headers),
  })

  return {
    status: response.status,
    headers: { "Content-Range": response.headers.get("content-range") },
    body:
      resource.storage === "jsonb_document"
        ? toDocumentRows(await parseSupabaseResponse(response))
        : await parseSupabaseResponse(response),
  }
}

export async function getRow({ resource, id, query = {}, headers = {} }) {
  const url = new URL(resource.table, config.supabaseRestUrl)
  appendQueryParams(url, query)
  url.searchParams.set("id", `eq.${id}`)

  if (!url.searchParams.has("select")) {
    url.searchParams.set("select", resource.storage === "jsonb_document" ? "id,payload" : "*")
  }

  const response = await fetch(url, {
    method: "GET",
    headers: buildHeaders(headers),
  })

  return {
    status: response.status,
    headers: {},
    body: await (async () => {
      const parsed = await parseSupabaseResponse(response)
      if (response.status >= 400 && isEmptyObject(parsed)) {
        return {
          error: `Supabase rejected '${resource.table}'. Confirm public.${resource.table} exists, is exposed to the Data API, and has the correct schema grants/policies applied.`,
        }
      }
      return resource.storage === "jsonb_document" ? toDocumentRow(parsed) : parsed
    })(),
  }
}

export async function createRow({ resource, body, headers = {} }) {
  const payload =
    resource.storage === "jsonb_document"
      ? { id: documentId(body), payload: body }
      : body

  const response = await fetch(new URL(resource.table, config.supabaseRestUrl), {
    method: "POST",
    headers: buildHeaders(headers, "resolution=merge-duplicates,return=representation"),
    body: JSON.stringify(payload),
  })

  return {
    status: response.status,
    headers: {},
    body:
      resource.storage === "jsonb_document"
        ? toDocumentRow(await parseSupabaseResponse(response))
        : await parseSupabaseResponse(response),
  }
}

export async function updateRow({ resource, id, body, headers = {} }) {
  let payload = body

  if (resource.storage === "jsonb_document") {
    const existing = await getRow({ resource, id, headers })
    const existingBody = Array.isArray(existing.body) ? existing.body[0] : existing.body
    payload = {
      payload: {
        ...(existingBody || {}),
        ...(body || {}),
        id,
      },
    }
  }

  const url = new URL(resource.table, config.supabaseRestUrl)
  url.searchParams.set("id", `eq.${id}`)

  const response = await fetch(url, {
    method: "PATCH",
    headers: buildHeaders(headers, "return=representation"),
    body: JSON.stringify(payload),
  })

  return {
    status: response.status,
    headers: {},
    body:
      resource.storage === "jsonb_document"
        ? toDocumentRow(await parseSupabaseResponse(response))
        : await parseSupabaseResponse(response),
  }
}

export async function deleteRow({ resource, id, headers = {} }) {
  const url = new URL(resource.table, config.supabaseRestUrl)
  url.searchParams.set("id", `eq.${id}`)

  const response = await fetch(url, {
    method: "DELETE",
    headers: buildHeaders(headers, "return=representation"),
  })

  return {
    status: response.status,
    headers: {},
    body:
      resource.storage === "jsonb_document"
        ? toDocumentRow(await parseSupabaseResponse(response))
        : await parseSupabaseResponse(response),
  }
}

export async function replaceRows({ resource, body, headers = {} }) {
  if (!Array.isArray(body)) {
    return {
      status: 400,
      headers: {},
      body: { error: "Request body must be an array." },
    }
  }

  if (body.length === 0) {
    return {
      status: 200,
      headers: {},
      body: { ok: true, count: 0 },
    }
  }

  const payload = body.map((item, index) => {
    const id = documentId({ ...item, id: item?.id || `row-${index + 1}` })
    return resource.storage === "jsonb_document"
      ? { id, payload: { ...item, id } }
      : { ...item, id }
  })

  const url = new URL(resource.table, config.supabaseRestUrl)
  const response = await fetch(url, {
    method: "POST",
    headers: buildHeaders(headers, "resolution=merge-duplicates,return=minimal"),
    body: JSON.stringify(payload),
  })

  if (response.status >= 400) {
    return {
      status: response.status,
      headers: response.headers,
      body: await parseSupabaseResponse(response),
    }
  }

  return {
    status: 200,
    headers: {},
    body: { ok: true, count: body.length },
  }
}
