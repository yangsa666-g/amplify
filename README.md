# Amplify

An AI-powered contract analysis platform that helps you upload, parse, and analyze legal documents using Azure OpenAI and Anthropic Claude models.

## Features

- **Contract Analysis** — Upload PDF, DOCX, or TXT contracts and get structured AI-generated analysis using customizable field and prompt templates
- **Contract Comparison** — Side-by-side diff and AI-powered summary of changes between two contract versions
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
├── Dockerfile.azure  # Unified single-container image (nginx + NestJS)
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
| `JWT_SECRET` | ✅ | Secret for signing JWT tokens |
| `AZURE_OPENAI_ENDPOINT` | ✅ | Azure OpenAI endpoint URL |
| `AZURE_OPENAI_API_KEY` | ✅ | Azure OpenAI API key |
| `AZURE_OPENAI_MODELS` | ✅ | Comma-separated list of deployed model names |
| `AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT` | ✅ | Azure Document Intelligence endpoint |
| `AZURE_DOCUMENT_INTELLIGENCE_KEY` | ✅ | Azure Document Intelligence key |
| `ANTHROPIC_API_KEY` | ❌ | Anthropic API key (enables Claude models) |
| `ANTHROPIC_MODELS` | ❌ | Comma-separated list of Claude model names |
| `SEED_ADMIN_EMAIL` | ❌ | Admin account email for initial seed |
| `SEED_ADMIN_PASSWORD` | ❌ | Admin account password for initial seed |
| `MAX_UPLOAD_SIZE_MB` | ❌ | Max upload file size in MB (default: 20) |
| `ENTRA_CLIENT_ID` | ❌ | Entra app (client) ID. Blank disables SSO entirely |
| `ENTRA_CLIENT_SECRET` | ❌ | Entra client secret (required when SSO is enabled) |
| `ENTRA_TENANT_ID` | ❌ | Entra directory (tenant) GUID — single-tenant |
| `ENTRA_REDIRECT_URI` | ❌ | Public callback URL, e.g. `https://<host>/api/auth/entra/callback` |
| `ENTRA_POST_LOGIN_REDIRECT` | ❌ | SPA landing URL after callback, e.g. `https://<host>/auth/callback` |

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
| `POST` | `/documents/upload` | Upload a contract file |
| `GET` | `/documents/:id/text` | Get extracted text |
| `POST` | `/analysis` | Run contract analysis |
| `GET` | `/analysis/:id` | Get analysis result |
| `POST` | `/compare` | Compare two contracts |
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
| `POST` | `/v1/documents/upload` | Upload a contract (`multipart/form-data`, max 50 MB). Returns `documentId`. Text extraction is asynchronous — poll until `textExtractionStatus` is `success`. |
| `POST` | `/v1/analysis/run` | Run field extraction + risk analysis on an uploaded document. Synchronous; typically 10–60 s. |
| `GET`  | `/v1/analysis/:id` | Retrieve a previous analysis job result. |
| `POST` | `/v1/compare/run` | Run a line-level diff between two uploaded documents. |
| `GET`  | `/v1/compare/:id` | Retrieve a previous compare job result. |

**Example — full analysis flow:**

```bash
# 1. Upload a contract
DOC_ID=$(curl -s -X POST http://localhost:3001/v1/documents/upload \
  -H "X-API-Key: $API_KEY" \
  -F "file=@contract.pdf" | jq -r .id)

# 2. Run analysis (after textExtractionStatus = success)
curl -X POST http://localhost:3001/v1/analysis/run \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"documentId\": \"$DOC_ID\", \"model\": \"gpt-5.4\"}"
```

See `/docs` for the full request/response schemas.

## License

Licensed under the [Apache License 2.0](LICENSE).

Copyright © 2026 Sa Yang.
