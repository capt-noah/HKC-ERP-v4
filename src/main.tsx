import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { FeedbackProvider } from "@/context/FeedbackContext.tsx"
import { useAuthStore } from "@/lib/authStore"

// Intercept all fetch requests globally to inject the JWT auth header
const originalFetch = window.fetch
window.fetch = async (input, init) => {
  const url = typeof input === "string" 
    ? input 
    : input instanceof URL 
      ? input.toString() 
      : input.url

  if (url.includes("/api/")) {
    init = init || {}
    init.cache = "no-store"

    if (!url.includes("/api/auth/login")) {
      const token = useAuthStore.getState().token
      if (token) {
        if (!init.headers) {
          init.headers = {}
        }
        if (init.headers instanceof Headers) {
          init.headers.set("Authorization", `Bearer ${token}`)
        } else if (Array.isArray(init.headers)) {
          init.headers.push(["Authorization", `Bearer ${token}`])
        } else {
          init.headers = {
            ...init.headers,
            Authorization: `Bearer ${token}`,
          }
        }
      }
    }
  }
  return originalFetch(input, init)
}


createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider defaultTheme="light">
        <FeedbackProvider>
          <App />
        </FeedbackProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
)
