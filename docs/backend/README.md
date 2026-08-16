# Backend Architecture & API

HKC Trading operates with a dedicated Express.js backend designed to run on a Node.js runtime (e.g., Render, Heroku) independently of the Vercel-hosted frontend.

## 1. Core Server Layer (`server/index.js`)
The application entry point bootstraps an Express server.
- **Middleware:** Applies JSON body parsing (1mb limit), custom CORS configurations, and an activity logger (`server/logger.js`).
- **Global Error Handling:** Implements a global error-catching middleware to prevent node process crashes, returning standardized `{ error, message }` JSON responses on `500 Internal Server Error`.
- **Graceful Shutdown:** Intercepts `SIGTERM` and `SIGINT` to safely close the HTTP server and database connections before forced termination by the hosting provider.

## 2. API Routing & Modularity (`server/router/index.js`)
The application is split into domain-specific modules:
- `/api/auth`: Handles login and registration (`modules/auth/authRouter.js`). Registration checks for unique usernames and roles, while login provides JWT authentication.
- `/api/finance`: Ledger and payroll operations (`modules/finance`).
- `/api/sales`: Issues, processing services, and shipment document uploads (`modules/sales`).

All routes outside of `/api/auth/login` and `/api/auth/register` are protected by a JWT bearer token strategy (`authMiddleware.js`).

## 3. Database Layer (`server/db/supabaseClient.js`)
Instead of using the standard `@supabase/supabase-js` SDK, the backend uses a custom lightweight REST client (`fetch` wrappers) optimized for serverless/edge compatibility and precise control over headers and payload structure.
- **Query Param Forwarding:** Maps custom filter queries directly to PostgREST format (`?id=eq.123`).
- **Storage Strategies:** Handlers toggle between `direct` row updates and `jsonb_document` payloads depending on the target resource table design.
- **Protected Table Wipes:** Prevents accidental frontend `PUT` requests with an empty array `[]` from wiping protected core tables (`chart_of_accounts`, `journal_entries`, `invoices`, etc.).

## 4. Operational Activity Logger (`server/modules/common/activityLogger.js`)
The backend features an automated logging middleware that tracks user actions.
- Automatically attached to mutating REST actions (`POST`, `PUT`, `PATCH`, `DELETE`).
- Rejects unauthenticated traffic.
- Parses the URL structure to normalize action strings (e.g. `POST /api/sales-issues/123/post` -> `Action: Post`, `Resource: sales_issues`).
- Asynchronously logs the details to the `user_activity_logs` table, which is visible in the frontend Admin Control Center.

## 5. Deployment Configurations (`server/config.js`)
Configuration relies on `.env` vars:
- `SUPABASE_REST_URL`: Must end in `/rest/v1/`.
- `SUPABASE_SERVICE_ROLE_KEY`: Used by the backend to bypass RLS policies and interact securely with Supabase.
- `JWT_SECRET`: For signing user authentication sessions.

**Note on Vercel Integration:**
Frontend API requests use the `API_BASE` variable (exported from `src/lib/apiPersistence.ts`). To proxy properly to Render on Vercel, the Vercel project environment variables **must** inject `VITE_API_URL=https://hkc-trading-api.onrender.com`. The rewrites in `vercel.json` are fallback routines but true backend calls rely on the configured `API_BASE` being prepended to `/api/auth/login` and standard resource fetches.
