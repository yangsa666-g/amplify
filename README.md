# Amplify — Document Intelligence Platform (DIP)

An AI-powered document analysis platform that helps you upload, parse, and analyze documents using Azure OpenAI and Anthropic Claude models.

## Features

- **Document Analysis** — Upload PDF, DOCX, or TXT documents and get structured AI-generated analysis using customizable field and prompt templates
- **Document Comparison** — Run prompt-driven AI analysis across 2–5 ordered documents and receive a free-form Markdown report
- **Multi-model Support** — Switch between Azure OpenAI (GPT-4, GPT-5 series) and Anthropic Claude models
- **Template Management** — Create personal or system-wide field templates and prompt templates to standardize analysis
- **Analysis History** — Browse and revisit past analyses
- **Admin Dashboard** — Manage users, view system-wide history, and configure system templates
- **External API** — Programmatic access to upload / analyze / compare endpoints via API key authentication
- **Microsoft Entra ID SSO** — Optional single sign-on via Azure Entra ID, alongside local username/password login

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Ant Design, Zustand, TanStack Query, React Router |
| Backend | NestJS, Prisma ORM, PostgreSQL |
| AI | Azure OpenAI API, Anthropic Claude API |
| Document Parsing | Azure Document Intelligence (OCR), Mammoth (DOCX) |
| File Storage | Local disk (dev) / Azure Blob Storage (production) |
| Auth | JWT + Refresh Tokens, Microsoft Entra ID SSO (OIDC), API Key (for External API) |
| Monorepo | pnpm workspaces, Turborepo |

## Project Structure

```
amplify/
├── apps/
│   ├── api/          # NestJS backend (port 3001)
│   └── web/          # React + Vite frontend (port 3000)
├── packages/         # Shared packages
├── deploy/           # nginx, supervisord, entrypoint configs
├── Dockerfile.azure        # Azure Global unified single-container image
├── Dockerfile.Azure.China  # Azure China image (MCR China base images)
├── docker-compose.yml
├── Makefile
├── .env.example
└── .env.azure.example
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- Azure OpenAI resource (required)
- Azure Document Intelligence resource (required for PDF OCR)

## Quick Start (Docker Compose)

```bash
# 1. Clone and set up environment
git clone <repo-url>
cd amplify
make setup         # copies .env.example → .env, installs deps

# 2. Edit .env and fill in required secrets:
#    AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY,
#    AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT, AZURE_DOCUMENT_INTELLIGENCE_KEY,
#    SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD

# 3. Start all services
make up            # starts postgres, api, web via Docker Compose

# 4. Apply migrations and seed initial data
make migrate
make seed

# 5. Open the app
open http://localhost:3000
```

## Development (without Docker)

```bash
pnpm install
pnpm dev           # starts api on :3001 and web on :3000 concurrently
```

> Requires a running PostgreSQL instance. Set `DATABASE_URL` in `.env` accordingly.

## Environment Variables

Copy `.env.example` to `.env` and fill in the values.

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Secret for signing JWT tokens. In production must be a strong random string — **≥ 16 chars and not a placeholder** (see _Startup validation_ below) |
| `AZURE_OPENAI_ENDPOINT` | ✅ | Azure OpenAI endpoint URL |
| `AZURE_OPENAI_API_KEY` | ✅ | Azure OpenAI API key |
| `AZURE_OPENAI_MODELS` | ✅ | Comma-separated list of deployed model names |
| `MODEL_CREDENTIALS_ENCRYPTION_KEY` | ❌ | Base64 key material encoding at least 32 bytes, used to encrypt API keys for OpenAI-compatible models managed in the admin UI. Generate once with `openssl rand -base64 32` (or 48) and keep it stable |
| `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` | ✅ | Azure Document Intelligence endpoint |
| `AZURE_DOCUMENT_INTELLIGENCE_KEY` | ✅ | Azure Document Intelligence key |
| `ANTHROPIC_API_KEY` | ❌ | Anthropic API key (enables Claude models) |
| `ANTHROPIC_MODELS` | ❌ | Comma-separated list of Claude model names |
| `SEED_ADMIN_EMAIL` | ❌ | Admin account email for initial seed |
| `SEED_ADMIN_PASSWORD` | ❌ | Admin account password for initial seed |
| `MAX_UPLOAD_SIZE_MB` | ❌ | Max upload file size in MB (default: 20) |
| `AUDIT_LOG_RETENTION_DAYS` | ❌ | Days to retain admin audit logs before automatic cleanup (default: 180, valid range: 1-3650) |
| `ENTRA_CLIENT_ID` | ❌ | Entra app (client) ID. Blank disables SSO entirely |
| `ENTRA_CLIENT_SECRET` | ❌ | Entra client secret (required when SSO is enabled) |
| `ENTRA_TENANT_ID` | ❌ | Entra directory (tenant) GUID — single-tenant |
| `ENTRA_REDIRECT_URI` | ❌ | Public callback URL, e.g. `https://<host>/api/auth/entra/callback` |
| `ENTRA_POST_LOGIN_REDIRECT` | ❌ | SPA landing URL after callback, e.g. `https://<host>/auth/callback` |

Admins can add OpenAI-compatible endpoints under **System Settings → Models** when
`MODEL_CREDENTIALS_ENCRYPTION_KEY` is configured. Environment-based Azure OpenAI and Anthropic
models continue to work without this variable. The encryption key must remain stable; changing or
losing it makes stored model API keys unreadable.

### Startup validation (fail-fast)

On boot the API validates its environment and **refuses to start** if `DATABASE_URL` or `JWT_SECRET` is missing — there is no insecure default fallback. In production (`NODE_ENV=production`) it additionally rejects a `JWT_SECRET` (and `COOKIE_SECRET`, if set) that is a known placeholder (e.g. `change-me-in-production`) or shorter than 16 characters.

A misconfigured secret makes the API process exit on startup. Behind nginx (the Azure single-container setup) this surfaces as **HTTP 502 on every `/api/*` route**, with `Invalid environment configuration: ...` in the API logs. Generate a strong value with:

```bash
openssl rand -base64 48
```

### Microsoft Entra ID SSO (optional)

SSO runs alongside local login — leaving `ENTRA_CLIENT_ID` blank disables it cleanly
(the "SSO with Entra ID" button and the `/auth/entra/*` endpoints stay off).

The flow is backend-driven OAuth2 Authorization Code + PKCE: Microsoft redirects to the
NestJS callback, which validates the `id_token` (signature/issuer/audience/nonce via MSAL),
provisions or links the local user, then issues the app's own JWT + refresh token — so the
rest of the auth stack is unchanged. Behavior:

- **First-time tenant users** are auto-provisioned (JIT) with the `user` role; an admin promotes them later.
- **A matching local email** is auto-linked to the Entra identity (the account switches to SSO). This relies on the single-tenant restriction (`tid` is verified on every callback) and Entra-verified emails.
- Identity is keyed on the stable Entra object id (`oid`), so a user's email can change without losing their account.

**Azure app registration** (one-time): register a **single-tenant** app, add a **Web** platform
redirect URI matching `ENTRA_REDIRECT_URI` (local: `http://localhost:3000/api/auth/entra/callback`),
create a client secret, and grant delegated `openid`, `profile`, `email` permissions. Put the
client/tenant IDs and secret into `.env` (local) or App Service settings / Key Vault (production).

## Available Make Targets

```
make help          # Show all available targets

# Quick start
make setup         # First-time setup
make up            # Start all services
make down          # Stop all services
make restart       # Restart all services

# Database
make migrate       # Apply pending migrations
make seed          # Seed default data and admin user
make db-reset      # ⚠️ Drop and recreate database
make db-studio     # Open Prisma Studio at http://localhost:5555
make psql          # Open psql shell

# Code quality
make build         # Build all packages
make typecheck     # TypeScript type-check
make lint          # ESLint

# Azure deployment
make azure-login   # Login to Azure CLI
make azure-build   # Build image in Azure Container Registry
make azure-deploy  # Full deploy: infra + build + app
make azure-logs    # Tail application logs
make azure-status  # Show Web App status
```

## Azure Deployment

The application supports deployment to **Azure App Service** as a single Docker container (nginx serving the frontend + NestJS API).

### Required Azure Services

| Service | Purpose |
|---|---|
| Azure Container Registry | Docker image storage |
| Azure App Service | Container hosting |
| Azure Database for PostgreSQL | Application database |
| Azure Blob Storage | File uploads |
| Azure OpenAI | AI analysis |
| Azure Document Intelligence | PDF OCR |

### Deploy

```bash
# 1. Copy and fill in Azure config
cp .env.azure.example .env.azure
# Edit .env.azure with your Azure resource details

# 2. Build image and deploy to App Service
make azure-build
make azure-deploy-app
```

### Azure China

Azure China uses the separate `Dockerfile.Azure.China`; all of its base images
are pulled from the China Microsoft Container Registry endpoint (`mcr.azure.cn`),
so the build does not need `docker.io`. Create a dedicated `.env.azure.china`
file with the China subscription, ACR (normally `<name>.azurecr.cn`), and Web
App values, then deploy with either form:

```bash
cp .env.azure.example .env.azure.china
# Edit .env.azure.china with China-specific resource values
make azure-china-build
make azure-china-deploy

# Equivalent generic targets
make azure-build AZURE_ENV=china
make azure-deploy AZURE_ENV=china
```

The existing `azure-*` targets default to Azure Global and load `.env.azure`.
China targets set the Azure CLI cloud to `AzureChinaCloud` and load
`.env.azure.china`. `make azure-global-deploy` is available as an explicit
Global alias.

Keep comments in Azure environment files on their own lines. Because Make reads
these files directly, the space before an inline `#` comment becomes part of the
variable value and can break resource names, image URLs, and credentials.

> **App settings (not `.env.azure`).** The container does **not** bundle `.env.azure`; the API reads its configuration from the App Service application settings (environment variables). Make sure `DATABASE_URL`, `JWT_SECRET`, and the Azure OpenAI / Document Intelligence keys are all set there.

When Azure Database for PostgreSQL uses a Private Endpoint, set `DATABASE_URL` to
its canonical hostname: `<server>.postgres.database.azure.com` for Azure Global
or `<server>.postgres.database.chinacloudapi.cn` for Azure China. Do not put the
`privatelink` hostname in the connection string. The Private DNS zone resolves
the canonical hostname to the private IP, and that hostname matches the server's
TLS certificate. The application normalizes existing Global and China private-link
hostnames for the API, migrations, and seed process during the transition.

### Troubleshooting

**`502 Bad Gateway` on `/api/*` after a deploy.** nginx is up but the NestJS process isn't listening — almost always because the API crashed on startup. The most common cause is a missing or weak `JWT_SECRET` app setting (see [Startup validation](#startup-validation-fail-fast)). Inspect the logs and fix the setting:

```bash
# Look for "Invalid environment configuration" near the top of the API output
az webapp log tail -n <app-name> -g <resource-group>

# Set a strong secret and restart
az webapp config appsettings set -n <app-name> -g <resource-group> \
  --settings JWT_SECRET="$(openssl rand -base64 48)"
az webapp restart -n <app-name> -g <resource-group>
```

Note: rotating `JWT_SECRET` invalidates existing access/refresh tokens, so users will need to log in again.

## API Overview

The backend exposes two distinct API surfaces:

- **Internal API** — Used by the web frontend. Authenticated with JWT access + refresh tokens.
- **External API** (`/v1/*`) — For programmatic / third-party integration. Authenticated with an API key.

Full OpenAPI documentation is available at `http://localhost:3001/docs` when the API is running.

### Internal API (selected endpoints)

| Method | Path | Description |
|---|---|---|
| `POST` | `/auth/login` | Login with email/password |
| `POST` | `/auth/refresh` | Refresh access token |
| `POST` | `/documents/upload` | Upload a document file |
| `GET` | `/documents/:id/text` | Get extracted text |
| `POST` | `/analysis/run` | Run document analysis |
| `GET` | `/analysis/:id` | Get analysis result |
| `POST` | `/compare/run` | Run AI analysis across 2–5 documents |
| `GET` | `/compare/:id` | Get a comparison result |
| `GET` | `/models` | List available AI models |
| `GET` | `/field-templates` | List field templates |
| `GET` | `/prompt-templates` | List prompt templates |

### External API

The External API lets external systems run the same upload → analyze / compare workflow as the web app, without going through user login. All endpoints are namespaced under `/v1` and require an API key.

**Authentication.** Pass your API key in the `X-API-Key` header on every request. Keys are issued and revoked from the Admin Dashboard, and each key is bound to a user account — calls inherit that user's permissions and quotas.

```http
X-API-Key: <your-api-key>
```

**Endpoints:**

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/documents/upload` | Upload a document (`multipart/form-data`, max 50 MB). Returns `documentId`. Text extraction is asynchronous — poll until `textExtractionStatus` is `success`. |
| `POST` | `/v1/analysis/run` | Run field extraction + risk analysis on an uploaded document. Synchronous; typically 10–60 s. |
| `GET`  | `/v1/analysis/:id` | Retrieve a previous analysis job result. |
| `POST` | `/v1/compare/run` | Run prompt-driven AI analysis across 2–5 ordered documents. |
| `GET`  | `/v1/compare/:id` | Retrieve the configuration, ordered documents, Markdown result, timings, and token usage for a compare job. |
| `GET`  | `/v1/models` | List models available to the API key owner. |
| `GET`  | `/v1/prompt-templates?type=contract_comparison` | List selectable document-comparison prompt templates. |

**Example — full analysis flow:**

```bash
# 1. Upload a document
DOC_ID=$(curl -s -X POST http://localhost:3001/v1/documents/upload \
  -H "X-API-Key: $API_KEY" \
  -F "file=@document.pdf" | jq -r .id)

# 2. Run analysis (after textExtractionStatus = success)
curl -X POST http://localhost:3001/v1/analysis/run \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"documentId\": \"$DOC_ID\", \"model\": \"gpt-5.4\"}"
```

Analysis responses include aggregate and per-stage token usage when reported by the model provider.

**Example — compare two documents with AI:**

```bash
OLD_ID=$(curl -s -X POST http://localhost:3001/v1/documents/upload \
  -H "X-API-Key: $API_KEY" \
  -F "file=@document-v1.pdf" | jq -r .id)

NEW_ID=$(curl -s -X POST http://localhost:3001/v1/documents/upload \
  -H "X-API-Key: $API_KEY" \
  -F "file=@document-v2.pdf" | jq -r .id)

# Wait for both documents to finish text extraction, then run comparison.
curl -X POST http://localhost:3001/v1/compare/run \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"documentIds\":[\"$OLD_ID\",\"$NEW_ID\"],\"model\":\"gpt-5.4\",\"reasoningEffort\":\"medium\"}"
```

`documentIds` must contain 2–5 unique IDs. Their order is preserved in the prompt and result metadata. Omit `promptTemplateId` to use the default contract-comparison template. Compare responses contain the Markdown report, analysis timing, and token usage.

See `/docs` for the full request/response schemas.

## Roadmap

1. Support Consumer Identity or Local Account sign up for a trial
2. Enterprise feature requires Enterprise licenses
3. Built-in LLM model will be charged by request

## License

Licensed under the [Apache License 2.0](LICENSE).

Copyright © 2026 Sa Yang.
