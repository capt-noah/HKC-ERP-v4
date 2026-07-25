import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"

import "./index.css"
import App from "./App.tsx"
import { ThemeProvider } from "@/components/theme-provider.tsx"
import { FeedbackProvider } from "@/context/FeedbackContext.tsx"

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
