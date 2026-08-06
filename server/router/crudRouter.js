import { Router } from "express"
import { getResource, listResources } from "../db/resourceRegistry.js"
import { crudService } from "../modules/common/crudService.js"

export const crudRouter = Router()

crudRouter.get("/:resource", async (req, res, next) => {
  try {
    const resource = getResource(req.params.resource)
    if (!resource) {
      res.status(404).json({
        error: `Unknown resource '${req.params.resource}'.`,
        availableResources: listResources().map((item) => item.name),
      })
      return
    }
    const result = await crudService.list({ resource, query: req.query, headers: req.headers })
    if (result.headers?.["Content-Range"]) {
      res.setHeader("Content-Range", result.headers["Content-Range"])
    }
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

crudRouter.put("/:resource", async (req, res, next) => {
  try {
    const resource = getResource(req.params.resource)
    if (!resource) {
      res.status(404).json({ error: `Unknown resource '${req.params.resource}'.` })
      return
    }
    const result = await crudService.replace({ resource, body: req.body, headers: req.headers })
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

crudRouter.post("/:resource", async (req, res, next) => {
  try {
    const resource = getResource(req.params.resource)
    if (!resource) {
      res.status(404).json({ error: `Unknown resource '${req.params.resource}'.` })
      return
    }
    const result = await crudService.create({ resource, body: req.body, headers: req.headers })
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

crudRouter.get("/:resource/:id", async (req, res, next) => {
  try {
    const resource = getResource(req.params.resource)
    if (!resource) {
      res.status(404).json({ error: `Unknown resource '${req.params.resource}'.` })
      return
    }
    const result = await crudService.get({ resource, id: req.params.id, query: req.query, headers: req.headers })
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

crudRouter.patch("/:resource/:id", async (req, res, next) => {
  try {
    const resource = getResource(req.params.resource)
    if (!resource) {
      res.status(404).json({ error: `Unknown resource '${req.params.resource}'.` })
      return
    }
    const result = await crudService.update({ resource, id: req.params.id, body: req.body, headers: req.headers })
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})

crudRouter.delete("/:resource/:id", async (req, res, next) => {
  try {
    const resource = getResource(req.params.resource)
    if (!resource) {
      res.status(404).json({ error: `Unknown resource '${req.params.resource}'.` })
      return
    }
    const result = await crudService.delete({ resource, id: req.params.id, headers: req.headers })
    res.status(result.status).json(result.body)
  } catch (err) {
    next(err)
  }
})
