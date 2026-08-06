import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const logsDir = path.join(__dirname, "logs")
const accessLogPath = path.join(logsDir, "access.log")
const errorLogPath = path.join(logsDir, "error.log")

// Ensure server/logs directory and access.log exist
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}
if (!fs.existsSync(accessLogPath)) {
  fs.writeFileSync(accessLogPath, `[${new Date().toISOString()}] [INFO] HKC ERP Request Logger initialized.\n`, "utf8")
}

function formatTimestamp(date = new Date()) {
  return date.toISOString()
}

function writeToFile(filePath, content) {
  try {
    fs.appendFileSync(filePath, content + "\n", "utf8")
  } catch (err) {
    console.error(`[LOGGER ERROR] Failed to write to ${filePath}:`, err.message)
  }
}

export const logger = {
  info(message, meta = {}) {
    const timestamp = formatTimestamp()
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ""
    const logLine = `[${timestamp}] [INFO] ${message}${metaStr}`
    console.log(logLine)
    writeToFile(accessLogPath, logLine)
  },

  error(message, error = null) {
    const timestamp = formatTimestamp()
    const errDetails = error instanceof Error ? `${error.message}\n${error.stack}` : error ? JSON.stringify(error) : ""
    const logLine = `[${timestamp}] [ERROR] ${message} ${errDetails}`.trim()
    console.error(logLine)
    writeToFile(errorLogPath, logLine)
    writeToFile(accessLogPath, logLine)
  },

  /**
   * Express request logging middleware.
   * Logs every incoming HTTP request to console (for Render) and appends to server/logs/access.log
   */
  requestLogger(req, res, next) {
    const start = process.hrtime()
    const method = req.method
    const url = req.originalUrl || req.url
    const ip = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "127.0.0.1").split(",")[0].trim()

    const logRequest = () => {
      res.removeListener("finish", logRequest)
      res.removeListener("close", logRequest)

      const diff = process.hrtime(start)
      const durationMs = (diff[0] * 1e3 + diff[1] * 1e-6).toFixed(1)
      const status = res.statusCode
      const timestamp = formatTimestamp()
      const logLine = `[${timestamp}] ${method} ${url} ${status} ${durationMs}ms - ${ip}`

      // Output colorized line to stdout/stderr for Render log viewer
      if (status >= 400) {
        console.error(`\x1b[31m${logLine}\x1b[0m`)
        writeToFile(errorLogPath, `${logLine} - UA: ${req.headers["user-agent"] || "-"}`)
      } else {
        console.log(`\x1b[32m${logLine}\x1b[0m`)
      }

      // Append clean log line to server/logs/access.log
      writeToFile(accessLogPath, logLine)
    }

    res.on("finish", logRequest)
    res.on("close", logRequest)

    next()
  },
}
