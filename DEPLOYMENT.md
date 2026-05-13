# Deployment Guide

## 1. Scope

This document defines the recommended deployment approach for the Contract AI Review App using **Docker Compose** on a **single host** with a **reverse proxy and TLS termination**.

The first production-ready topology includes:

- `proxy`: public entrypoint, HTTPS termination, reverse proxy
- `web`: Vite-built frontend served as static assets
- `api`: NestJS application
- `postgres`: PostgreSQL database
- mounted volumes for database persistence and uploaded contract files

This guide is intentionally written so the same structure can also be used for local/dev with different environment files.

---

## 2. Recommended Topology

```text
Internet
  |
  v
[ Reverse Proxy + TLS ]
  |               \
  |                \--> /api/* -> api
  \-------------------> /*      -> web

Internal Docker Network
  - web
  - api
  - postgres

Persistent Volumes
  - postgres_data
  - uploads_data
  - proxy_data
  - proxy_config
```

### Why this topology

- keeps only the proxy exposed to the public internet
- terminates TLS in one place
- isolates `api` and `postgres` on a private Docker network
- supports persistent uploads for the MVP local-disk storage strategy
- remains simple enough for self-hosted production

---

## 3. Recommended Service Responsibilities

| Service | Responsibility | Publicly exposed |
| --- | --- | --- |
| `proxy` | HTTPS termination, host routing, optional compression/security headers | Yes |
| `web` | Vite frontend static site (nginx) | No |
| `api` | Auth, upload, parsing, AI orchestration, business APIs | No |
| `postgres` | Application database | No |

---

## 4. Directory and File Expectations

Recommended deployment assets:

```text
deploy/
  compose/
    docker-compose.yml
    .env
    env/
      api.env
      web.env
      postgres.env
    caddy/
      Caddyfile
```

If the repository later chooses a flatter layout, keep the same asset separation:

- one Compose file
- one shared `.env`
- per-service env files when secrets/config become larger
- one reverse proxy config file

---

## 5. Environment Variables

### 5.1 Shared / Infra

| Variable | Purpose |
| --- | --- |
| `APP_DOMAIN` | Public hostname, for example `contracts.example.com` |
| `TZ` | Optional timezone |
| `POSTGRES_DB` | Database name |
| `POSTGRES_USER` | Database user |
| `POSTGRES_PASSWORD` | Database password |

### 5.2 API

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `production` in production |
| `PORT` | Internal API port, for example `3001` |
| `DATABASE_URL` | Prisma PostgreSQL connection string |
| `JWT_SECRET` | Access token secret |
| `JWT_EXPIRES_IN` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRES_IN` | Refresh token lifetime |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI endpoint |
| `AZURE_OPENAI_API_KEY` | Azure OpenAI credential |
| `AZURE_OPENAI_MODELS` | Allowed models, comma-separated |
| `AZURE_OPENAI_TIMEOUT_MS` | Request timeout (shared with Anthropic) |
| `ANTHROPIC_ENDPOINT` | Anthropic API endpoint (optional, defaults to `https://api.anthropic.com`) |
| `ANTHROPIC_API_KEY` | Anthropic API key (optional) |
| `ANTHROPIC_MODELS` | Allowed Claude models, comma-separated (optional) |
| `FILE_UPLOAD_DIR` | Mounted upload directory, for example `/app/uploads` |
| `MAX_UPLOAD_SIZE_MB` | Upload limit |
| `ENTRA_CLIENT_ID` | Entra application client ID |
| `ENTRA_CLIENT_SECRET` | Entra client secret |
| `ENTRA_TENANT_ID` | Entra tenant ID |
| `ENTRA_REDIRECT_URI` | Public callback URL |
| `CORS_ORIGIN` | Web origin, for example `https://contracts.example.com` |

### 5.3 Web

| Variable | Purpose |
| --- | --- |
| `VITE_APP_NAME` | Optional UI display name |
| `VITE_API_BASE_URL` | Public API URL, usually `https://<domain>/api` |

---

## 6. Production Compose Example

The exact image names will depend on the CI/CD pipeline. The following example shows the intended shape.

```yaml
services:
  proxy:
    image: caddy:2.10
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    environment:
      TZ: ${TZ:-UTC}
    volumes:
      - ./caddy/Caddyfile:/etc/caddy/Caddyfile:ro
      - proxy_data:/data
      - proxy_config:/config
    depends_on:
      - web
      - api
    networks:
      - edge
      - internal

  web:
    image: ghcr.io/your-org/contract-ai-review-web:latest
    restart: unless-stopped
    env_file:
      - ./env/web.env
    expose:
      - "80"
    networks:
      - internal

  api:
    image: ghcr.io/your-org/contract-ai-review-api:latest
    restart: unless-stopped
    env_file:
      - ./env/api.env
    expose:
      - "3001"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - uploads_data:/app/uploads
    networks:
      - internal

  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    env_file:
      - ./env/postgres.env
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 10s
      timeout: 5s
      retries: 10
    networks:
      - internal

volumes:
  postgres_data:
  uploads_data:
  proxy_data:
  proxy_config:

networks:
  edge:
  internal:
    internal: true
```

---

## 7. Reverse Proxy Example

The guide recommends **Caddy** because it keeps the first production deployment simple and provides automatic HTTPS when the public DNS is already pointed at the host.

Example `Caddyfile`:

```caddyfile
{$APP_DOMAIN} {
  encode gzip zstd

  @api path /api/* /auth/* /models* /documents* /analysis* /compare* /history* /field-templates* /prompt-templates*
  reverse_proxy @api api:3001

  reverse_proxy web:80
}
```

### Notes

- If the final API is mounted under `/api`, keep all backend routes under that prefix for consistency.
- If the Vite app uses client-side routing, configure the web container with SPA fallback to `index.html`.
- If the infrastructure already has an upstream load balancer or WAF, TLS may be terminated there instead, but the internal reverse proxy pattern is still valid.
- If automatic certificates are not possible, switch Caddy to manually provided certificates or replace it with Nginx/Traefik.

---

## 8. Database Migrations

Production deployment should **not** rely on the API container to silently auto-migrate on startup.

Recommended order:

1. Pull latest images
2. Start or keep `postgres` running
3. Run Prisma migrations as a one-off task
4. Start or restart `api`
5. Start or restart `web`
6. Validate health endpoints through the proxy

Example one-off migration command:

```bash
docker compose run --rm api pnpm prisma migrate deploy
```

If a separate lightweight migration image/service is later introduced, that is even better than coupling migrations to the runtime container.

---

## 9. First Deployment Procedure

1. Provision a Linux host with Docker Engine and Docker Compose.
2. Create DNS record for `APP_DOMAIN` pointing to the host.
3. Prepare deployment directory and environment files.
4. Ensure ports `80` and `443` are open to the host.
5. Start database first:
   ```bash
   docker compose up -d postgres
   ```
6. Run database migrations:
   ```bash
   docker compose run --rm api pnpm prisma migrate deploy
   ```
7. Start the full stack:
   ```bash
   docker compose up -d
   ```
8. Validate:
   - HTTPS certificate issuance succeeds
   - web homepage loads
   - API health endpoint responds
   - uploads persist after container restart

---

## 10. Upgrade Procedure

1. Backup database and uploaded files.
2. Pull updated images:
   ```bash
   docker compose pull
   ```
3. Run migrations for the new release:
   ```bash
   docker compose run --rm api pnpm prisma migrate deploy
   ```
4. Recreate application services:
   ```bash
   docker compose up -d api web proxy
   ```
5. Verify application and login flows.

---

## 11. Backup and Recovery

### 11.1 What to back up

- PostgreSQL data
- uploaded contract files from the mounted upload volume
- environment files / secrets references
- reverse proxy configuration

### 11.2 Minimum backup recommendation

- daily PostgreSQL logical dump
- regular snapshot/copy of upload volume
- restore drill in a non-production environment

Example PostgreSQL backup:

```bash
docker compose exec -T postgres pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup.sql
```

---

## 12. Required Health and Operational Endpoints

The implementation should expose at least:

- `GET /api/health` for API readiness/liveness
- a lightweight web health check or root-page readiness check

At minimum, API health should verify:

- application boot success
- database connectivity
- upload directory availability

AI Foundry dependency health can be tracked separately and should not necessarily block all readiness unless the product requires hard dependency validation.

---

## 13. Security Notes

- Never commit real secrets into the repository.
- Keep `postgres` off public ports in production.
- Keep `api` off public ports in production.
- Store uploads in a mounted directory outside the web root.
- Use strong secrets for JWT and refresh token signing.
- Restrict host-level access to deployment env files and backup artifacts.
- Prefer Docker image pinning or immutable release tags instead of floating tags in production.

---

## 14. MVP-to-Future Evolution

This Compose-based deployment should be designed so the application can later evolve without major restructuring:

- local upload volume -> Azure Blob Storage
- synchronous analysis -> background queue workers
- single host Compose -> orchestrated environment
- inline logs -> centralized logging/monitoring

The key design rule is to avoid baking host-specific assumptions into application logic. Storage paths, public URLs, model configuration, and auth secrets must remain environment-driven.

---

## 15. Azure Deployment (App Service)

This section covers deploying the application to **Azure App Service** as a single Docker container.

### 15.1 Architecture

```text
Internet
  │
  ▼
┌──────────────────────────────────┐
│  Azure App Service (Web App)     │
│  ┌────────────────────────────┐  │
│  │  Single Container          │  │
│  │  nginx :80 → static files  │  │
│  │            → /api/* proxy  │  │
│  │  NestJS :3001 (API)        │  │
│  │  supervisord (process mgr) │  │
│  └────────────────────────────┘  │
└──────────────────┬───────────────┘
                   │
       ┌───────────┼───────────┐
       ▼           ▼           ▼
  Azure PG    Azure Blob   Azure OpenAI
  Flexible    Storage      + Doc Intel
```

### 15.2 Azure Services

| Service | Purpose | SKU |
|---------|---------|-----|
| App Service | Host unified container (web + API) | B1 (Basic) |
| Container Registry | Store Docker images | Basic |
| PostgreSQL Flexible Server | Database | Burstable B1ms |
| Blob Storage | File uploads (future) | Standard LRS |
| Key Vault | Secrets management | Standard |

### 15.3 Prerequisites

- Azure CLI installed and authenticated (`az login`)
- A configured `infra/main.bicepparam` with your values
- Secrets provided via CLI parameters (never committed)

### 15.4 First-Time Deployment

```bash
# 1. Log in to Azure
make azure-login

# 2. Deploy all infrastructure + build image + deploy app
make azure-deploy

# 3. Run database migrations
make azure-migrate

# 4. Seed initial data
make azure-seed

# 5. Verify
make azure-status
```

### 15.5 Subsequent Deployments

```bash
# Deploy code changes (rebuild image + update app)
make azure-deploy

# If there are new migrations
make azure-migrate
```

### 15.6 Available Make Targets

| Target | Description |
|--------|-------------|
| `make azure-login` | Log in to Azure CLI |
| `make azure-infra` | Deploy/update Bicep infrastructure |
| `make azure-build` | Build Docker image in ACR (remote) |
| `make azure-deploy-app` | Update Web App container image |
| `make azure-deploy` | Full deploy: infra + build + app |
| `make azure-migrate` | Run Prisma migrations |
| `make azure-seed` | Seed database |
| `make azure-logs` | Tail application logs |
| `make azure-status` | Show Web App status |
| `make azure-destroy` | ⚠️ Delete all Azure resources |

### 15.7 Azure DevOps Pipeline

The `azure-pipelines.yml` file defines a CI/CD pipeline with three stages:

1. **Build** — Builds the Docker image in ACR
2. **Deploy Infra** — Applies Bicep templates
3. **Deploy App** — Updates the Web App container + runs migrations

Required pipeline variables (set in Azure DevOps):
- `AZURE_SUBSCRIPTION` — Service connection name
- `AZURE_RESOURCE_GROUP` — Resource group name
- `AZURE_ACR_NAME` — Container Registry name
- `AZURE_APP_NAME` — Web App name
- Plus any secrets (set as secret variables)

### 15.8 Configuration

Environment variables are set via App Service Configuration (populated by Bicep).
Sensitive values should be provided as CLI parameters during `az deployment group create`:

```bash
az deployment group create \
  --resource-group contract-ai-rg \
  --template-file infra/main.bicep \
  --parameters infra/main.bicepparam \
  --parameters pgAdminPassword='...' jwtSecret='...' azureOpenAiApiKey='...'
```

### 15.9 File Structure

```text
Dockerfile.azure            # Unified frontend + backend container
deploy/
  nginx.conf                # nginx: static files + API reverse proxy
  supervisord.conf          # Process manager for nginx + NestJS
infra/
  main.bicep                # Main Bicep template
  main.bicepparam           # Parameter file
  modules/
    app-service.bicep       # App Service Plan + Web App
    container-registry.bicep # ACR
    postgresql.bicep        # PostgreSQL Flexible Server
    storage.bicep           # Blob Storage
    keyvault.bicep          # Key Vault
azure-pipelines.yml         # Azure DevOps CI/CD pipeline
```
