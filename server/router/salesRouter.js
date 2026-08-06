import { Router } from "express"
import { salesService } from "../modules/sales/salesService.js"

export const salesRouter = Router()

salesRouter.get(["/sales-issues/batches", "/sales_issues/batches"], async (req, res, next) => {
  try {
    const result = await salesService.getBatches(req.query)
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

salesRouter.get(["/sales-issues", "/sales_issues"], async (req, res, next) => {
  try {
    const result = await salesService.list(req.query)
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

salesRouter.post(["/sales-issues", "/sales_issues"], async (req, res, next) => {
  try {
    const result = await salesService.create(req.body)
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

salesRouter.get(["/sales-issues/:id", "/sales_issues/:id"], async (req, res, next) => {
  try {
    const result = await salesService.get(req.params.id)
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

salesRouter.delete(["/sales-issues/:id", "/sales_issues/:id"], async (req, res, next) => {
  try {
    const result = await salesService.delete(req.params.id)
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

salesRouter.post(["/sales-issues/:id/post", "/sales_issues/:id/post"], async (req, res, next) => {
  try {
    const result = await salesService.post(req.body, req.params.id)
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

salesRouter.post(["/sales-issues/:id/cancel", "/sales_issues/:id/cancel"], async (req, res, next) => {
  try {
    const result = await salesService.cancel(req.params.id)
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})
