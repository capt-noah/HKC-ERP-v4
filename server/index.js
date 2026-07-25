import http from "node:http"
import { assertConfig, config } from "./config.js"
import { route } from "./routes.js"

assertConfig()

const server = http.createServer(async (req, res) => {
  try {
    await route(req, res)
  } catch (error) {
    res.writeHead(500, {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
    })
    res.end(
      JSON.stringify({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    )
  }
})

server.listen(config.port, config.host, () => {
  console.log(`HKC ERP API listening on http://${config.host}:${config.port}`)
})
