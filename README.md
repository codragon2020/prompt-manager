# Prompt Manager

Lightweight prompt management system with versioning, environment publishing, and import/export.

## Prerequisites

- Node.js 18+ (recommended)

## Setup

From this folder:

1. Install

- `npm install`

2. Configure env

- Copy `apps/api/.env.example` to `apps/api/.env`

3. Setup DB

- `npm run db:migrate -w apps/api`
- `npm run db:seed -w apps/api`

## Run

- `npm run dev`

API: http://localhost:3001
Web: http://localhost:5173

## Web app

- `/login`
- `/prompts` list + search
- `/prompts/new` create prompt
- `/prompts/:promptId` detail (publish, preview, fork)
- `/prompts/:promptId/versions/new?from=<versionId>` version editor
- `/prompts/:promptId/compare` compare versions
- `/import-export` import/export bundles

## API

Local dev API routes are under `/api`.

On Vercel, the API is deployed as serverless functions and routes may be available both:

- Under `/api/*` (catch-all function)
- And without the `/api` prefix (root function)

The web app is configured to call the non-prefixed routes in production when `VITE_API_BASE_URL` is set.

### Vercel env vars (API project)

- `DATABASE_URL`: Supabase pooler connection string (recommended for serverless)
- `DIRECT_URL`: Supabase direct connection string (used for migrations)
- `JWT_SECRET`: required for signing auth tokens
- `CORS_ORIGIN`: comma-separated list of allowed origins, e.g. `http://localhost:5173,https://<your-web>.vercel.app`

Optional:

- `EXPOSE_ERROR_DETAILS`: set to `true` temporarily to debug production errors (turn off after)

#### Supabase pooler + Prisma

If you use the Supabase transaction pooler (PgBouncer) for `DATABASE_URL`, add these query params to avoid Prisma prepared statement errors:

- `pgbouncer=true`
- `statement_cache_size=0`

Example:

```text
postgres://USER:PASSWORD@HOST:6543/dbname?pgbouncer=true&statement_cache_size=0
```

### Vercel env vars (Web project)

- `VITE_API_BASE_URL`: `https://<your-api>.vercel.app`

### Auth

- `POST /api/auth/login` -> `{ token }` (local dev)
- `POST /auth/login` -> `{ token }` (Vercel deployment)

Example:

```bash
curl -s \
  -X POST http://localhost:3001/api/auth/login \
  -H "content-type: application/json" \
  -d '{"email":"youremail@domain.com","password":"admin1234"}'
```

### Prompts

- `GET /api/prompts` list/search
- `GET /api/prompts/:promptId` detail
- `GET /api/prompts/:promptId/active?env=prod` active published version for env
- `POST /api/prompts` create (auth)
- `PATCH /api/prompts/:promptId` update (auth)
- `DELETE /api/prompts/:promptId` soft delete (auth)

On Vercel, these are typically available without the `/api` prefix as well (e.g. `GET /prompts`).

Create prompt example:

```bash
TOKEN="<paste token>"

curl -s \
  -X POST http://localhost:3001/api/prompts \
  -H "content-type: application/json" \
  -H "authorization: Bearer $TOKEN" \
  -d '{
    "name": "My Prompt",
    "description": "Example",
    "ownerTeam": "Platform",
    "tags": ["demo"],
    "initialVersion": {
      "content": "Hello {{name}}",
      "modelName": "gpt-4o-mini",
      "temperature": 0.3,
      "maxTokens": 200,
      "topP": 1,
      "variables": [
        {"name":"name","type":"STRING","required":true}
      ]
    }
  }'
```

### Versioning

- `POST /api/prompts/:promptId/versions` create a new version (auth)

Example (fork latest version):

```bash
curl -s \
  -X POST http://localhost:3001/api/prompts/<promptId>/versions \
  -H "content-type: application/json" \
  -H "authorization: Bearer $TOKEN" \
  -d '{"fromVersionId":"<versionId>","notes":"Fork"}'
```

### Publish

- `POST /api/prompts/:promptId/publish` publish a version to an environment (auth)

```bash
curl -s \
  -X POST http://localhost:3001/api/prompts/<promptId>/publish \
  -H "content-type: application/json" \
  -H "authorization: Bearer $TOKEN" \
  -d '{"env":"prod","promptVersionId":"<versionId>","notes":"Release"}'
```

### Import / Export

- `GET /api/prompts/:promptId/export` export a JSON bundle
- `POST /api/prompts/import` import a JSON bundle (auth)

```bash
curl -s http://localhost:3001/api/prompts/<promptId>/export > bundle.json

curl -s \
  -X POST http://localhost:3001/api/prompts/import \
  -H "content-type: application/json" \
  -H "authorization: Bearer $TOKEN" \
  -d '{"mode":"merge","bundle":'"$(cat bundle.json)"'}'
```
