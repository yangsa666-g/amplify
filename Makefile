# =============================================================================
# Contract AI Review — Makefile
# =============================================================================
# Usage: make <target>
#   Run `make help` to see all available targets.

.DEFAULT_GOAL := help
COMPOSE        := docker compose
API_SVC        := api
DB_SVC         := postgres

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
