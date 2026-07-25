import { config } from "./config.js"
import crypto from "node:crypto"

const PASS_THROUGH_QUERY_KEYS = new Set(["select", "order", "limit", "offset", "range", "or", "and"])

function appendQueryParams(target, searchParams) {
  for (const [key, value] of searchParams.entries()) {
    if (PASS_THROUGH_QUERY_KEYS.has(key) || /^[a-zA-Z0-9_]+$/.test(key)) {
      target.searchParams.append(key, value)
    }
  }
}

function buildHeaders(req, prefer) {
  const authorization = req.headers.authorization || (config.supabaseServiceRoleKey ? `Bearer ${config.supabaseServiceRoleKey}` : "")
  const apiKey = config.supabaseServiceRoleKey || config.supabasePublishableKey
  const headers = {
    apikey: apiKey,
    "Content-Type": "application/json",
  }

  if (authorization) {
    headers.Authorization = authorization
  }

  if (prefer) {
    headers.Prefer = prefer
  }

  return headers
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ""

    req.on("data", (chunk) => {
      body += chunk
      if (body.length > 1_000_000) {
        reject(new Error("Request body is too large."))
        req.destroy()
      }
    })

    req.on("end", () => {
      if (!body) {
        resolve(undefined)
        return
      }

      try {
        resolve(JSON.parse(body))
      } catch {
        reject(new Error("Request body must be valid JSON."))
      }
    })

    req.on("error", reject)
  })
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

function documentId(body) {
  return body && typeof body === "object" && body.id ? String(body.id) : crypto.randomUUID()
}

export async function listRows({ req, resource, requestUrl }) {
  const url = new URL(resource.table, config.supabaseRestUrl)
  appendQueryParams(url, requestUrl.searchParams)

  if (!url.searchParams.has("select")) {
    url.searchParams.set("select", resource.storage === "jsonb_document" ? "id,payload" : "*")
  }

  const response = await fetch(url, {
    method: "GET",
    headers: buildHeaders(req),
  })

  return {
    status: response.status,
    headers: response.headers,
    body: resource.storage === "jsonb_document"
      ? toDocumentRows(await parseSupabaseResponse(response))
      : await parseSupabaseResponse(response),
  }
}

export async function getRow({ req, resource, id, requestUrl }) {
  const url = new URL(resource.table, config.supabaseRestUrl)
  appendQueryParams(url, requestUrl.searchParams)
  url.searchParams.set("id", `eq.${id}`)

  if (!url.searchParams.has("select")) {
    url.searchParams.set("select", resource.storage === "jsonb_document" ? "id,payload" : "*")
  }

  const response = await fetch(url, {
    method: "GET",
    headers: buildHeaders(req),
  })

  return {
    status: response.status,
    headers: response.headers,
    body: resource.storage === "jsonb_document"
      ? toDocumentRow(await parseSupabaseResponse(response))
      : await parseSupabaseResponse(response),
  }
}

export async function createRow({ req, resource }) {
  const body = await readBody(req)
  const payload = resource.storage === "jsonb_document"
    ? { id: documentId(body), payload: body }
    : body

  const response = await fetch(new URL(resource.table, config.supabaseRestUrl), {
    method: "POST",
    headers: buildHeaders(req, "return=representation"),
    body: JSON.stringify(payload),
  })

  return {
    status: response.status,
    headers: response.headers,
    body: resource.storage === "jsonb_document"
      ? toDocumentRow(await parseSupabaseResponse(response))
      : await parseSupabaseResponse(response),
  }
}

export async function updateRow({ req, resource, id }) {
  const body = await readBody(req)
  let payload = body

  if (resource.storage === "jsonb_document") {
    const existing = await getRow({ req, resource, id, requestUrl: new URL("/", "http://localhost") })
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
    headers: buildHeaders(req, "return=representation"),
    body: JSON.stringify(payload),
  })

  return {
    status: response.status,
    headers: response.headers,
    body: resource.storage === "jsonb_document"
      ? toDocumentRow(await parseSupabaseResponse(response))
      : await parseSupabaseResponse(response),
  }
}

export async function deleteRow({ req, resource, id }) {
  const url = new URL(resource.table, config.supabaseRestUrl)
  url.searchParams.set("id", `eq.${id}`)

  const response = await fetch(url, {
    method: "DELETE",
    headers: buildHeaders(req, "return=representation"),
  })

  return {
    status: response.status,
    headers: response.headers,
    body: resource.storage === "jsonb_document"
      ? toDocumentRow(await parseSupabaseResponse(response))
      : await parseSupabaseResponse(response),
  }
}

export async function replaceRows({ req, resource }) {
  const body = await readBody(req)
  if (!Array.isArray(body)) {
    return {
      status: 400,
      headers: new Headers(),
      body: { error: "Request body must be an array." },
    }
  }

  const existing = await listRows({ req, resource, requestUrl: new URL("/", "http://localhost") })
  if (existing.status >= 400) {
    return existing
  }

  const existingRows = Array.isArray(existing.body) ? existing.body : []
  const nextIds = new Set(body.map((item, index) => documentId({ ...item, id: item?.id || `row-${index + 1}` })))

  for (const row of existingRows) {
    if (row?.id && !nextIds.has(String(row.id))) {
      await deleteRow({ req, resource, id: String(row.id) })
    }
  }

  for (const item of body) {
    const id = documentId(item)
    const payload = resource.storage === "jsonb_document"
      ? { id, payload: { ...item, id } }
      : { ...item, id }

    const url = new URL(resource.table, config.supabaseRestUrl)
    url.searchParams.set("id", `eq.${id}`)

    await fetch(url, {
      method: "PATCH",
      headers: buildHeaders(req, "return=minimal"),
      body: JSON.stringify(resource.storage === "jsonb_document" ? { payload: payload.payload } : payload),
    })

    await fetch(new URL(resource.table, config.supabaseRestUrl), {
      method: "POST",
      headers: buildHeaders(req, "resolution=merge-duplicates,return=minimal"),
      body: JSON.stringify(payload),
    })
  }

  return {
    status: 200,
    headers: new Headers(),
    body: { ok: true, count: body.length },
  }
}
