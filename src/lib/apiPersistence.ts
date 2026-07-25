type Identified = { id?: string }

const API_BASE = ""

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

export async function loadResource<T>(resource: string, defaults: T[]): Promise<T[]> {
  const response = await fetch(`${API_BASE}/api/${resource}`)
  const body = await parseResponse(response)

  if (!response.ok) {
    throw new Error(typeof body === "object" && body && "message" in body ? String(body.message) : `Failed to load ${resource}.`)
  }

  if (Array.isArray(body) && body.length > 0) {
    return body as T[]
  }

  if (defaults.length > 0) {
    await replaceResource(resource, defaults as Identified[])
  }

  return defaults
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
    throw new Error(typeof body === "object" && body && "message" in body ? String(body.message) : `Failed to save ${resource}.`)
  }
}

export function persistResources(resources: Array<{ resource: string; items: Identified[] }>) {
  return Promise.all(resources.map(({ resource, items }) => replaceResource(resource, items))).then(() => undefined)
}
