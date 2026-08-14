import { createRow } from "../../db/supabaseClient.js"

const LOGS_RESOURCE = { table: "user_activity_logs", storage: "relational" }

/**
 * Normalizes request paths to extract clean resource names and action types.
 */
export function parseRequestAction(method, path) {
  // Strip query parameters and clean trailing slash
  const cleanPath = path.split("?")[0].replace(/^\/api\//, "").replace(/\/$/, "")
  const segments = cleanPath.split("/")

  if (segments.length === 0 || segments[0] === "") {
    return { resource: "unknown", action: method }
  }

  // Normalize resource name: e.g. "sales-issues" -> "sales_issues"
  const rawResource = segments[0]
  const resource = rawResource.replace(/-/g, "_")

  let action = ""
  if (method === "POST") {
    if (segments.length > 2) {
      // e.g. /api/sales-issues/123/post -> "Post"
      const subAction = segments[segments.length - 1]
      action = subAction.charAt(0).toUpperCase() + subAction.slice(1).replace(/-/g, " ")
    } else if (segments.length === 2 && ["assign", "upload-contract", "transition"].includes(segments[1])) {
      action = segments[1].charAt(0).toUpperCase() + segments[1].slice(1).replace(/-/g, " ")
    } else {
      action = "Create"
    }
  } else if (method === "PATCH" || method === "PUT") {
    action = "Update"
  } else if (method === "DELETE") {
    action = "Delete"
  } else {
    action = method
  }

  return { resource, action }
}

/**
 * Log activity helper.
 */
export async function logActivity(userId, username, fullname, action, resource, details = {}) {
  try {
    await createRow({
      resource: LOGS_RESOURCE,
      body: {
        user_id: userId || null,
        username: username || "system",
        fullname: fullname || "",
        action,
        resource,
        details,
      },
    })
  } catch (err) {
    console.error("[ACTIVITY LOGGER ERROR] Failed to write log:", err.message)
  }
}

/**
 * Express middleware to automatically log mutating API operations.
 */
export function activityLoggerMiddleware(req, res, next) {
  // Only log state-modifying HTTP methods
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    return next()
  }

  // Skip login endpoint (handled manually in login controller)
  if (req.originalUrl.includes("/api/auth/login")) {
    return next()
  }

  const onFinish = () => {
    res.removeListener("finish", onFinish)
    res.removeListener("close", onFinish)

    // Log only successful transactions for authenticated users
    if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
      const { resource, action } = parseRequestAction(req.method, req.originalUrl || req.url)

      // Skip logging logs themselves to prevent recursion
      if (resource === "user_activity_logs") {
        return
      }

      // Populate details metadata
      const details = {
        path: req.originalUrl || req.url,
        ip: (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1").split(",")[0].trim(),
      }

      // If an ID is present in the path, extract it
      const idMatch = (req.originalUrl || req.url).match(/\/api\/[^/]+\/([^/?#]+)/)
      if (idMatch && idMatch[1] && !["assign", "rules", "batches", "officers"].includes(idMatch[1])) {
        details.itemId = idMatch[1]
      }

      // Perform logging asynchronously in background
      logActivity(
        req.user.id,
        req.user.username,
        req.user.fullname,
        action,
        resource,
        details
      ).catch((err) => {
        console.error("[ACTIVITY LOGGER ASYNC ERROR]:", err.message)
      })
    }
  }

  res.on("finish", onFinish)
  res.on("close", onFinish)
  next()
}
