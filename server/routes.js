import { Router } from "express"
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
} from "./salesIssues.js"
import { payPayrollRecord } from "./payrollFinance.js"

export const router = Router()

// ── Health & registry ────────────────────────────────────────────────────────

router.get("/health", (_req, res) => {
  res.json({ ok: true, service: "hkc-erp-server" })
})

router.get("/api", (_req, res) => {
  res.json({ service: "HKC ERP API", resources: listResources() })
})

// ── Sales Issues ─────────────────────────────────────────────────────────────
// These specific routes must come before the generic /api/:resource routes
// so Express doesn't match "sales-issues" as a resource name.

router.get("/api/sales-issues/batches", async (req, res, next) => {
  try {
    const result = await getAvailableBatches(req.query)
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

router.get("/api/sales-issues", async (req, res, next) => {
  try {
    const result = await listSalesIssues(req.query)
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

router.post("/api/sales-issues", async (req, res, next) => {
  try {
    const result = await createSalesIssue(req.body)
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

router.get("/api/sales-issues/:id", async (req, res, next) => {
  try {
    const result = await getSalesIssue(req.params.id)
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

router.patch("/api/sales-issues/:id", async (req, res, next) => {
  try {
    const result = await updateSalesIssue(req.body, req.params.id)
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

router.delete("/api/sales-issues/:id", async (req, res, next) => {
  try {
    const result = await deleteSalesIssue(req.params.id)
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

router.post("/api/sales-issues/:id/post", async (req, res, next) => {
  try {
    const result = await postSalesIssue(req.body, req.params.id)
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

router.post("/api/sales-issues/:id/cancel", async (req, res, next) => {
  try {
    const result = await cancelSalesIssue(req.params.id)
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

// ── Payroll payment ───────────────────────────────────────────────────────────
// MUST be registered before POST /api/:resource — otherwise Express matches
// "payroll-records" as :resource and ":id/pay" as :id, hitting the wrong handler.

router.post("/api/payroll-records/:id/pay", async (req, res, next) => {
  try {
    const result = await payPayrollRecord(req.params.id)
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

// ── Generic resource routes ───────────────────────────────────────────────────

router.get("/api/:resource", async (req, res, next) => {
  try {
    const resource = getResource(req.params.resource)
    if (!resource) {
      res.status(404).json({
        error: `Unknown resource '${req.params.resource}'.`,
        availableResources: listResources().map((item) => item.name),
      })
      return
    }
    const result = await listRows({ resource, query: req.query, headers: req.headers })
    if (result.headers?.["Content-Range"]) {
      res.setHeader("Content-Range", result.headers["Content-Range"])
    }
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

router.put("/api/:resource", async (req, res, next) => {
  try {
    const resource = getResource(req.params.resource)
    if (!resource) {
      res.status(404).json({ error: `Unknown resource '${req.params.resource}'.` })
      return
    }
    const result = await replaceRows({ resource, body: req.body, headers: req.headers })
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

router.post("/api/:resource", async (req, res, next) => {
  try {
    const resource = getResource(req.params.resource)
    if (!resource) {
      res.status(404).json({ error: `Unknown resource '${req.params.resource}'.` })
      return
    }
    const result = await createRow({ resource, body: req.body, headers: req.headers })
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

router.get("/api/:resource/:id", async (req, res, next) => {
  try {
    const resource = getResource(req.params.resource)
    if (!resource) {
      res.status(404).json({ error: `Unknown resource '${req.params.resource}'.` })
      return
    }
    const result = await getRow({ resource, id: req.params.id, query: req.query, headers: req.headers })
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

router.patch("/api/:resource/:id", async (req, res, next) => {
  try {
    const resource = getResource(req.params.resource)
    if (!resource) {
      res.status(404).json({ error: `Unknown resource '${req.params.resource}'.` })
      return
    }
    const result = await updateRow({ resource, id: req.params.id, body: req.body, headers: req.headers })
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

router.delete("/api/:resource/:id", async (req, res, next) => {
  try {
    const resource = getResource(req.params.resource)
    if (!resource) {
      res.status(404).json({ error: `Unknown resource '${req.params.resource}'.` })
      return
    }
    const result = await deleteRow({ resource, id: req.params.id, headers: req.headers })
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

// ── Catch-all 404 ─────────────────────────────────────────────────────────────

router.use((_req, res) => {
  res.status(404).json({
    error: "Not found",
    hint: "Use /api for the resource registry or /api/:resource for table routes.",
  })
})
