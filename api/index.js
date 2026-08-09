import express from "express"
import { assertConfig } from "../server/config.js"
import { masterRouter } from "../server/router/index.js"

try {
  assertConfig()
} catch (err) {
  console.warn("Vercel env assertion warning:", err)
}

const app = express()

// Middleware
app.use(express.json({ limit: "10mb" }))

// CORS headers
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

// Normalize URL prefix for Vercel serverless routing
app.use((req, _res, next) => {
  if (!req.url.startsWith("/api") && !req.url.startsWith("/health")) {
    req.url = `/api${req.url}`
  }
  next()
})

app.use("/", masterRouter)

export default app
