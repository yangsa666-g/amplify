# =============================================================================
# Contract AI Review — Makefile
# =============================================================================
# Usage: make <target>
#   Run `make help` to see all available targets.

.DEFAULT_GOAL := help
COMPOSE        := docker compose
API_SVC        := api
DB_SVC         := postgres

# ─── Load .env.azure for Azure deployment targets ────────────────────────────
ifneq (,$(wildcard .env.azure))
  include .env.azure
  export
endif

# ─── Azure Configuration ─────────────────────────────────────────────────────
# Override these via environment or .env file
AZURE_SUBSCRIPTION   ?= 2caeef69-d54a-43b6-9c53-363a5209abbe
AZURE_RESOURCE_GROUP ?= rg-d-app-10009620
AZURE_LOCATION       ?= southeastasia
AZURE_IMAGE_TAG      ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo latest)
AZURE_ACR_NAME       ?= devamplify
AZURE_APP_NAME       ?= dev-amplify-app
AZURE_IMAGE_NAME      = contract-ai-review

# ─── Colors ──────────────────────────────────────────────────────────────────
BOLD  := \033[1m
RESET := \033[0m
GREEN := \033[32m
CYAN  := \033[36m
GRAY  := \033[90m

# =============================================================================
# HELP
# =============================================================================

.PHONY: help
help: ## Show this help message
	@echo ""
	@echo "$(BOLD)Contract AI Review$(RESET)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"} \
	  /^[a-zA-Z0-9_-]+:.*##/ { \
	    printf "  $(CYAN)%-22s$(RESET) %s\n", $$1, $$2 \
	  } \
	  /^##@/ { \
	    printf "\n$(BOLD)%s$(RESET)\n", substr($$0, 5) \
	  }' $(MAKEFILE_LIST)
	@echo ""

# =============================================================================
##@ 🚀 Quick Start
# =============================================================================

.PHONY: setup
setup: ## First-time setup: copy .env, install deps, run DB migrations
	@if [ ! -f .env ]; then \
	  cp .env.example .env; \
	  echo "$(GREEN)✔ Created .env from .env.example — please fill in your secrets$(RESET)"; \
	else \
	  echo "$(GRAY)  .env already exists, skipping copy$(RESET)"; \
	fi
	@pnpm install
	@echo "$(GREEN)✔ Dependencies installed$(RESET)"
	@echo ""
	@echo "$(BOLD)Next steps:$(RESET)"
	@echo "  1. Edit $(BOLD).env$(RESET) and set AZURE_OPENAI_ENDPOINT / AZURE_OPENAI_API_KEY / SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD"
	@echo "  2. Run $(BOLD)make up$(RESET) to start all services"
	@echo "  3. Run $(BOLD)make migrate$(RESET) to apply DB schema"
	@echo "  4. Run $(BOLD)make seed$(RESET) to seed default data"

.PHONY: up
up: ## Start all services (build if needed)
	$(COMPOSE) up --build -d
	@echo ""
	@echo "$(GREEN)✔ Services started$(RESET)"
	@echo "  Web → http://localhost:3000"
	@echo "  API → http://localhost:3001"
	@make --no-print-directory status

.PHONY: up-dev
up-dev: ## Start local dev servers (no Docker, requires local Node/pnpm)
	pnpm dev

.PHONY: down
down: ## Stop all services
	$(COMPOSE) down

.PHONY: restart
restart: ## Restart all services
	$(COMPOSE) restart

.PHONY: restart-api
restart-api: ## Restart only the API service
	$(COMPOSE) restart $(API_SVC)

# =============================================================================
##@ 🗄  Database
# =============================================================================

.PHONY: migrate
migrate: ## Apply pending Prisma migrations
	$(COMPOSE) exec $(API_SVC) node_modules/.bin/prisma migrate deploy
	@echo "$(GREEN)✔ Migrations applied$(RESET)"

.PHONY: migrate-resolve
migrate-resolve: ## Mark a failed migration as resolved (already applied manually). Usage: make migrate-resolve name=<migration_name>
	$(COMPOSE) exec $(API_SVC) node_modules/.bin/prisma migrate resolve --applied $(name)
	@echo "$(GREEN)✔ Migration marked as applied$(RESET)"

.PHONY: migrate-dev
migrate-dev: ## Create & apply a new migration (dev only). Usage: make migrate-dev name=add_column
	$(COMPOSE) exec $(API_SVC) node_modules/.bin/prisma migrate dev --name $(name)

.PHONY: seed
seed: ## Seed default templates and admin user (reads SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD from .env)
	$(COMPOSE) exec $(API_SVC) node_modules/.bin/prisma db seed
	@echo "$(GREEN)✔ Seed complete$(RESET)"

.PHONY: db-reset
db-reset: ## ⚠ Drop & recreate DB, re-run migrations and seed
	@echo "$(BOLD)WARNING: This will destroy all data. Press Ctrl-C to cancel.$(RESET)"
	@sleep 3
	$(COMPOSE) exec $(API_SVC) node_modules/.bin/prisma migrate reset --force
	@echo "$(GREEN)✔ Database reset$(RESET)"

.PHONY: db-studio
db-studio: ## Open Prisma Studio (DB GUI) on http://localhost:5555
	cd apps/api && node_modules/.bin/prisma studio

.PHONY: psql
psql: ## Open a psql shell inside the postgres container
	$(COMPOSE) exec $(DB_SVC) psql -U $${POSTGRES_USER:-postgres} -d $${POSTGRES_DB:-contract_ai}

# =============================================================================
##@ 🔨 Build & Code Quality
# =============================================================================

.PHONY: build
build: ## Build all packages and apps (Turborepo)
	pnpm build

.PHONY: build-api
build-api: ## Build only the API
	cd apps/api && pnpm build

.PHONY: build-web
build-web: ## Build only the web frontend
	cd apps/web && pnpm build

.PHONY: typecheck
typecheck: ## Run TypeScript type-check across all packages
	pnpm typecheck

.PHONY: lint
lint: ## Run ESLint across all packages
	pnpm lint

.PHONY: lint-fix
lint-fix: ## Run ESLint with auto-fix
	pnpm lint -- --fix

# =============================================================================
##@ 🐳 Docker
# =============================================================================

.PHONY: build-images
build-images: ## Build Docker images without starting containers
	$(COMPOSE) build

.PHONY: pull
pull: ## Pull latest base images
	$(COMPOSE) pull

.PHONY: status
status: ## Show running container status
	$(COMPOSE) ps

.PHONY: health
health: ## Check API health endpoint
	@curl -sf http://localhost:3001/health | python3 -m json.tool 2>/dev/null \
	  || echo "$(BOLD)API not reachable$(RESET)"

# =============================================================================
##@ 📋 Logs
# =============================================================================

.PHONY: logs
logs: ## Tail logs from all services
	$(COMPOSE) logs -f

.PHONY: logs-api
logs-api: ## Tail API logs
	$(COMPOSE) logs -f $(API_SVC)

.PHONY: logs-web
logs-web: ## Tail web logs
	$(COMPOSE) logs -f web

.PHONY: logs-db
logs-db: ## Tail postgres logs
	$(COMPOSE) logs -f $(DB_SVC)

# =============================================================================
##@ 🧹 Cleanup
# =============================================================================

.PHONY: clean
clean: ## Remove build artifacts (dist, generated)
	find . -name "dist" -not -path "*/node_modules/*" -type d -exec rm -rf {} + 2>/dev/null; true
	find . -name "generated" -not -path "*/node_modules/*" -type d -exec rm -rf {} + 2>/dev/null; true
	@echo "$(GREEN)✔ Build artifacts removed$(RESET)"

.PHONY: clean-all
clean-all: down clean ## Stop containers and remove build artifacts
	$(COMPOSE) down -v --remove-orphans
	@echo "$(GREEN)✔ Containers and volumes removed$(RESET)"

.PHONY: nuke
nuke: ## ⚠ Remove EVERYTHING: containers, volumes, node_modules
	@echo "$(BOLD)WARNING: This removes all data and node_modules. Press Ctrl-C to cancel.$(RESET)"
	@sleep 3
	$(COMPOSE) down -v --remove-orphans
	find . -name "node_modules" -type d -prune -exec rm -rf {} + 2>/dev/null; true
	@echo "$(GREEN)✔ Full cleanup done$(RESET)"

# =============================================================================
##@ ☁️  Azure Deployment
# =============================================================================

.PHONY: azure-login
azure-login: ## Log in to Azure CLI (interactive)
	az login
	@echo "$(GREEN)✔ Logged in to Azure$(RESET)"

.PHONY: azure-infra
azure-infra: ## Deploy/update Azure infrastructure (Bicep) — reads secrets from .env
	@echo "$(BOLD)Deploying infrastructure to $(AZURE_RESOURCE_GROUP)...$(RESET)"
	az deployment group create \
	  --subscription $(AZURE_SUBSCRIPTION) \
	  --resource-group $(AZURE_RESOURCE_GROUP) \
	  --template-file infra/main.bicep \
	  --parameters infra/main.bicepparam \
	  --parameters imageTag=$(AZURE_IMAGE_TAG) \
	    pgAdminPassword='$(POSTGRES_PASSWORD)' \
	    jwtSecret='$(JWT_SECRET)' \
	    azureOpenAiEndpoint='$(AZURE_OPENAI_ENDPOINT)' \
	    azureOpenAiApiKey='$(AZURE_OPENAI_API_KEY)' \
	    azureOpenAiModels='$(AZURE_OPENAI_MODELS)' \
	    azureOpenAiTimeoutMs='$(AZURE_OPENAI_TIMEOUT_MS)' \
	    azureDocIntelEndpoint='$(AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT)' \
	    azureDocIntelKey='$(AZURE_DOCUMENT_INTELLIGENCE_KEY)' \
	    anthropicEndpoint='$(ANTHROPIC_ENDPOINT)' \
	    anthropicApiKey='$(ANTHROPIC_API_KEY)' \
	    anthropicModels='$(ANTHROPIC_MODELS)' \
	    entraClientId='$(ENTRA_CLIENT_ID)' \
	    entraClientSecret='$(ENTRA_CLIENT_SECRET)' \
	    entraTenantId='$(ENTRA_TENANT_ID)' \
	    entraRedirectUri='$(ENTRA_REDIRECT_URI)' \
	    seedAdminEmail='$(SEED_ADMIN_EMAIL)' \
	    seedAdminPassword='$(SEED_ADMIN_PASSWORD)' \
	    seedAdminName='$(SEED_ADMIN_NAME)' \
	  --output table
	@echo "$(GREEN)✔ Infrastructure deployed$(RESET)"

.PHONY: azure-acr-login
azure-acr-login: ## Log in to Azure Container Registry
	az acr login --name $(AZURE_ACR_NAME) --subscription $(AZURE_SUBSCRIPTION)
	@echo "$(GREEN)✔ Logged in to ACR $(AZURE_ACR_NAME)$(RESET)"

.PHONY: azure-build
azure-build: ## Build Docker image in ACR (remote build, no local Docker needed)
	@echo "$(BOLD)Building image in ACR...$(RESET)"
	az acr build \
	  --subscription $(AZURE_SUBSCRIPTION) \
	  --registry $(AZURE_ACR_NAME) \
	  --image $(AZURE_IMAGE_NAME):$(AZURE_IMAGE_TAG) \
	  --image $(AZURE_IMAGE_NAME):latest \
	  --file Dockerfile.azure \
	  .
	@echo "$(GREEN)✔ Image built: $(AZURE_IMAGE_NAME):$(AZURE_IMAGE_TAG)$(RESET)"

.PHONY: azure-deploy-app
azure-deploy-app: ## Update Web App to use the latest image
	@echo "$(BOLD)Updating Web App container...$(RESET)"
	az webapp config container set \
	  --subscription $(AZURE_SUBSCRIPTION) \
	  --resource-group $(AZURE_RESOURCE_GROUP) \
	  --name $(AZURE_APP_NAME) \
	  --container-image-name $(AZURE_ACR_NAME).azurecr.io/$(AZURE_IMAGE_NAME):$(AZURE_IMAGE_TAG) \
	  --container-registry-url https://$(AZURE_ACR_NAME).azurecr.io \
	  --output none
	az webapp restart \
	  --subscription $(AZURE_SUBSCRIPTION) \
	  --resource-group $(AZURE_RESOURCE_GROUP) \
	  --name $(AZURE_APP_NAME) \
	  --output none
	@echo "$(GREEN)✔ Web App updated and restarted$(RESET)"
	@echo "  URL → https://$(AZURE_APP_NAME).azurewebsites.net"

.PHONY: azure-deploy
azure-deploy: azure-infra azure-build azure-deploy-app ## 🚀 Full Azure deploy: infra + build + update app
	@echo ""
	@echo "$(GREEN)$(BOLD)✔ Deployment complete!$(RESET)"
	@echo "  URL → https://$(AZURE_APP_NAME).azurewebsites.net"

.PHONY: azure-migrate
azure-migrate: ## Run database migrations on Azure (via Web App SSH)
	@echo "$(BOLD)Running Prisma migrations...$(RESET)"
	az webapp ssh --subscription $(AZURE_SUBSCRIPTION) --resource-group $(AZURE_RESOURCE_GROUP) --name $(AZURE_APP_NAME) \
	  --command "cd /app/apps/api && node_modules/.bin/prisma migrate deploy"
	@echo "$(GREEN)✔ Migrations applied$(RESET)"

.PHONY: azure-seed
azure-seed: ## Seed database on Azure
	@echo "$(BOLD)Seeding database...$(RESET)"
	az webapp ssh --subscription $(AZURE_SUBSCRIPTION) --resource-group $(AZURE_RESOURCE_GROUP) --name $(AZURE_APP_NAME) \
	  --command "cd /app/apps/api && node_modules/.bin/prisma db seed"
	@echo "$(GREEN)✔ Seed complete$(RESET)"

.PHONY: azure-logs
azure-logs: ## Tail Azure Web App logs
	az webapp log tail --subscription $(AZURE_SUBSCRIPTION) --resource-group $(AZURE_RESOURCE_GROUP) --name $(AZURE_APP_NAME)

.PHONY: azure-status
azure-status: ## Show Azure Web App status
	@az webapp show --subscription $(AZURE_SUBSCRIPTION) --resource-group $(AZURE_RESOURCE_GROUP) --name $(AZURE_APP_NAME) \
	  --query "{name:name, state:state, url:defaultHostName, resourceGroup:resourceGroup}" \
	  --output table

.PHONY: azure-destroy
azure-destroy: ## ⚠ Delete ALL Azure resources in the resource group
	@echo "$(BOLD)WARNING: This will delete ALL resources in $(AZURE_RESOURCE_GROUP). Press Ctrl-C to cancel.$(RESET)"
	@sleep 5
	az group delete --subscription $(AZURE_SUBSCRIPTION) --name $(AZURE_RESOURCE_GROUP) --yes --no-wait
	@echo "$(GREEN)✔ Resource group deletion initiated$(RESET)"
