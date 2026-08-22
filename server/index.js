import path from "node:path"
import fs from "node:fs"
import { fileURLToPath } from "node:url"
import express from "express"
import { assertConfig, config } from "./config.js"
import { masterRouter } from "./router/index.js"
import { logger } from "./logger.js"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distPath = path.resolve(__dirname, "../dist")

assertConfig()

const app = express()

// Request logger middleware — logs every request to stdout (for Render) and server/logs/access.log
app.use(logger.requestLogger)

// Parse JSON request bodies before any route handler runs.
app.use(express.json({ limit: "1mb" }))

// CORS — allow all origins so the Vercel frontend can reach the Render API.
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  if (req.method === "OPTIONS") {
    res.sendStatus(204)
    return
  }
  next()
})

// 1. API & Backend routes
app.use("/", masterRouter)

// 2. Serve static assets from pre-compiled dist/ directory (for Plesk / standalone hosting)
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath, { maxAge: "1d", index: false }))
}

// 3. SPA Client-Side Catch-All Fallback (eliminates page refresh trap on Plesk across all Express versions)
app.use((req, res, next) => {
  if (req.method !== "GET") return next()
  const indexPath = path.join(distPath, "index.html")
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath)
  } else {
    res.status(200).send("HKC ERP API is running. Run 'npm run build' to generate frontend assets.")
  }
})

// Generic error handler — catches anything thrown inside route handlers.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  logger.error(`Unhandled error on ${req.method} ${req.originalUrl || req.url}`, err)
  res.status(500).json({
    error: "Internal server error",
    message: err instanceof Error ? err.message : "Unknown error",
  })
})

const server = app.listen(config.port, config.host, () => {
  console.log(`HKC ERP API listening on http://${config.host}:${config.port}`)
})

// Graceful shutdown — Render sends SIGTERM before killing the container.
function shutdown(signal) {
  console.log(`${signal} received — shutting down gracefully.`)
  server.close(() => {
    console.log("HTTP server closed.")
    process.exit(0)
  })

  // Force-exit if connections don't drain within 10 seconds.
  setTimeout(() => {
    console.error("Forced exit after timeout.")
    process.exit(1)
  }, 10_000).unref()
}

process.on("SIGTERM", () => shutdown("SIGTERM"))
process.on("SIGINT", () => shutdown("SIGINT"))
