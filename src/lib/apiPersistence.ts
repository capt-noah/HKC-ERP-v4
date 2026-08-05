type Identified = { id?: string }

// In dev, API_BASE is empty and Vite's proxy forwards /api/* to the local server.
// In production (Vercel), VITE_API_URL must be set to the Render service URL
// so requests go directly to the backend (e.g. https://hkc-erp-api.onrender.com).
const API_BASE = import.meta.env.VITE_API_URL ?? ""

function itemId(item: Identified, fallbackIndex: number) {
  return item.id ? String(item.id) : `row-${fallbackIndex + 1}`
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

function normalizeSingle<T>(body: unknown): T {
  return (Array.isArray(body) ? body[0] : body) as T
}

function errorMessage(body: unknown, fallback: string) {
  if (typeof body === "object" && body) {
    if ("message" in body) return String(body.message)
    if ("error" in body) return String(body.error)
  }
  if (typeof body === "string" && body.trim()) return body
  return fallback
}

export async function loadResource<T>(resource: string, _defaults: T[] = []): Promise<T[]> {
  const response = await fetch(`${API_BASE}/api/${resource}`)
  const body = await parseResponse(response)

  if (!response.ok) {
    throw new Error(errorMessage(body, `Failed to load ${resource}.`))
  }

  return Array.isArray(body) ? body as T[] : []
}

export async function replaceResource<T extends Identified>(resource: string, items: T[]) {
  const response = await fetch(`${API_BASE}/api/${resource}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(items.map((item, index) => ({ ...item, id: itemId(item, index) }))),
  })
  const body = await parseResponse(response)

  if (!response.ok) {
    throw new Error(errorMessage(body, `Failed to save ${resource}.`))
  }
}

export async function createResource<T extends Identified>(resource: string, item: T) {
  const response = await fetch(`${API_BASE}/api/${resource}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(item),
  })
  const body = await parseResponse(response)

  if (!response.ok) {
    throw new Error(errorMessage(body, `Failed to create ${resource}.`))
  }

  return normalizeSingle<T>(body)
}

export async function updateResource<T extends Identified>(resource: string, id: string, item: Partial<T>) {
  const response = await fetch(`${API_BASE}/api/${resource}/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(item),
  })
  const body = await parseResponse(response)

  if (!response.ok) {
    throw new Error(errorMessage(body, `Failed to update ${resource}.`))
  }

  return normalizeSingle<T>(body)
}

export async function deleteResource(resource: string, id: string) {
  const response = await fetch(`${API_BASE}/api/${resource}/${encodeURIComponent(id)}`, {
    method: "DELETE",
  })
  const body = await parseResponse(response)

  if (!response.ok) {
    throw new Error(errorMessage(body, `Failed to delete ${resource}.`))
  }
}

export function persistResources(resources: Array<{ resource: string; items: Identified[] }>) {
  return Promise.all(resources.map(({ resource, items }) => replaceResource(resource, items))).then(() => undefined)
}
