import { Router } from "express"
import { listResources } from "../db/resourceRegistry.js"
import { crudRouter } from "./crudRouter.js"
import { financeRouter } from "./financeRouter.js"
import { salesRouter } from "./salesRouter.js"

export const masterRouter = Router()

// Health check endpoint
masterRouter.get("/health", (_req, res) => {
  res.json({ ok: true, service: "hkc-erp-server" })
})

// Resource registry endpoint
masterRouter.get("/api", (_req, res) => {
  res.json({ service: "HKC ERP API", resources: listResources() })
})

// Domain routers (Order matters: specific domain routes before generic /api/:resource fallback)
masterRouter.use("/api", salesRouter)
masterRouter.use("/api", financeRouter)
masterRouter.use("/api", crudRouter)

// Catch-all 404
masterRouter.use((_req, res) => {
  res.status(404).json({
    error: "Not found",
    hint: "Use /api for the resource registry or /api/:resource for table routes.",
  })
})
