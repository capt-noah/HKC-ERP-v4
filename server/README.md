# HKC ERP Server

Small Node backend for the HKC Trading ERP frontend.

## Run

```bash
npm run server
```

The server listens on `http://localhost:8787` by default.

## Supabase

The server uses the Supabase Data API configured by environment variables:

```text
SUPABASE_REST_URL=https://your-project-ref.supabase.co/rest/v1/
```

Required environment variables:

```bash
SUPABASE_REST_URL=https://your-project.supabase.co/rest/v1/
SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=sb_secret_...
PORT=8787
SERVER_HOST=127.0.0.1
```

Only a publishable key is required for user-token forwarding. For local ERP development without a login flow, set `SUPABASE_SERVICE_ROLE_KEY` on the Node server so `/api` routes can read and write server-side while the browser never receives that secret. Without that key, write routes depend on a caller `Authorization: Bearer <access-token>` header.

Before using data routes, run `server/supabase.schema.sql` in the Supabase SQL editor. The schema creates one JSONB document table per ERP resource, enables RLS, revokes anonymous table access, and grants CRUD access to authenticated users for the prototype. Tighten those policies before production or before storing sensitive/user-specific data.

## Routes

- `GET /health`
- `GET /api`
- `GET /api/:resource`
- `GET /api/:resource/:id`
- `POST /api/:resource`
- `PUT /api/:resource`
- `PATCH /api/:resource/:id`
- `DELETE /api/:resource/:id`

Examples:

```bash
curl http://localhost:8787/api/invoices
curl http://localhost:8787/api/sales_orders/SO-2026-001
```

Supported resources are defined in `server/resources.js` and mirror `DOCUMENTATION.md`: Sales, Inventory, Finance, HR, and the planned `cost_center_budgets` surface.
