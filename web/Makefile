# ─── Bizgrow Docker Commands ──────────────────────────────────────────────────
# Usage: make <command>
# Requires: Docker + Docker Compose

.PHONY: help dev prod stop logs shell migrate health clean

# Default target
help:
	@echo ""
	@echo "  Bizgrow Docker Commands"
	@echo "  ─────────────────────────────────────────"
	@echo "  make dev       Start development environment"
	@echo "  make prod      Start production environment"
	@echo "  make stop      Stop all containers"
	@echo "  make logs      Tail all logs"
	@echo "  make logs-app  Tail app logs only"
	@echo "  make shell     Open shell in app container"
	@echo "  make migrate   Run database migrations"
	@echo "  make health    Check services health"
	@echo "  make clean     Remove containers + volumes"
	@echo ""

# ─── Development ──────────────────────────────────────────────────────────────
dev:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

dev-bg:
	docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build

# ─── Production ───────────────────────────────────────────────────────────────
prod:
	docker compose up -d --build
	@echo "✅ Production started"
	@make health

prod-pull:
	docker compose pull && docker compose up -d
	@echo "✅ Updated and restarted"

# ─── Stop ─────────────────────────────────────────────────────────────────────
stop:
	docker compose down

# ─── Logs ─────────────────────────────────────────────────────────────────────
logs:
	docker compose logs -f --tail=100

logs-app:
	docker compose logs -f --tail=100 app

logs-socket:
	docker compose logs -f --tail=100 socket

logs-mysql:
	docker compose logs -f --tail=100 mysql

logs-nginx:
	docker compose logs -f --tail=100 nginx

# ─── Shell ────────────────────────────────────────────────────────────────────
shell:
	docker exec -it bizgrow_app sh

shell-mysql:
	docker exec -it bizgrow_mysql mysql -u bizgrow -p finance_engine_db

# ─── Database ─────────────────────────────────────────────────────────────────
migrate:
	docker exec bizgrow_app npx drizzle-kit push
	@echo "✅ Migration selesai"

migrate-bp:
	docker exec bizgrow_app node run-bp-migration.js
	@echo "✅ Business plan migration selesai"

db-backup:
	docker exec bizgrow_mysql mysqldump -u root -p finance_engine_db > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup tersimpan"

# ─── Health ───────────────────────────────────────────────────────────────────
health:
	@echo "🏥 Checking services..."
	@docker compose ps
	@echo ""
	@curl -sf http://localhost:3000/health | jq '.' || echo "❌ App not responding"
	@curl -sf http://localhost:13338/health | jq '.' || echo "❌ Socket not responding"

# ─── Clean ────────────────────────────────────────────────────────────────────
clean:
	@echo "⚠️  This will remove all containers and volumes!"
	@read -p "Are you sure? [y/N] " confirm; \
	if [ "$$confirm" = "y" ]; then \
		docker compose down -v --remove-orphans; \
		echo "✅ Cleaned"; \
	else \
		echo "Cancelled"; \
	fi

# ─── Build only ───────────────────────────────────────────────────────────────
build:
	docker compose build --no-cache

build-app:
	docker build -t bizgrow-app .

build-socket:
	docker build -f Dockerfile.socket -t bizgrow-socket .
