# Weather Data Visualization - Makefile
# Convenient commands for Docker operations

.PHONY: help setup up down restart logs health import-data clean backup restore

# Default target
help: ## Show this help message
	@echo "Weather Data Visualization - Docker Commands"
	@echo "============================================"
	@echo ""
	@echo "Available commands:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@echo ""

setup: ## Run initial setup (creates containers and imports data)
	@echo "🚀 Running initial setup..."
	./setup.sh

up: ## Start all services
	@echo "🚀 Starting all services..."
	docker-compose up -d
	@echo "✅ Services started. Run 'make health' to check status."

build: ## Build and start all services
	@echo "🔨 Building and starting all services..."
	docker-compose up --build -d
	@echo "✅ Services built and started. Run 'make health' to check status."

down: ## Stop all services
	@echo "🛑 Stopping all services..."
	docker-compose down
	@echo "✅ Services stopped."

restart: ## Restart all services
	@echo "🔄 Restarting all services..."
	docker-compose restart
	@echo "✅ Services restarted."

logs: ## Show logs from all services
	@echo "📋 Showing logs from all services..."
	docker-compose logs -f

logs-backend: ## Show backend logs
	@echo "📋 Showing backend logs..."
	docker-compose logs -f backend

logs-frontend: ## Show frontend logs
	@echo "📋 Showing frontend logs..."
	docker-compose logs -f frontend

logs-mongodb: ## Show MongoDB logs
	@echo "📋 Showing MongoDB logs..."
	docker-compose logs -f mongodb

health: ## Check health of all services
	@./health-check.sh

import-data: ## Import CSV data into MongoDB
	@echo "📥 Importing CSV data..."
	./import-data.sh

clean: ## Stop services and remove containers (keeps volumes)
	@echo "🧹 Cleaning up containers..."
	docker-compose down --remove-orphans
	@echo "✅ Containers removed. Data volumes preserved."

clean-all: ## Stop services and remove everything including volumes (⚠️  DESTRUCTIVE)
	@echo "⚠️  WARNING: This will delete all data!"
	@read -p "Are you sure? [y/N] " confirm && [ "$$confirm" = "y" ]
	docker-compose down -v --remove-orphans
	docker system prune -f
	@echo "✅ Everything cleaned up."

backup: ## Backup MongoDB data
	@echo "💾 Creating MongoDB backup..."
	@mkdir -p backups
	docker exec data_stream_mongodb mongodump --db data_stream --out /tmp/backup
	docker cp data_stream_mongodb:/tmp/backup ./backups/backup-$(shell date +%Y%m%d-%H%M%S)
	@echo "✅ Backup created in backups/ directory."

restore: ## Restore MongoDB data from latest backup
	@echo "📂 Available backups:"
	@ls -la backups/ 2>/dev/null || echo "No backups found."
	@read -p "Enter backup directory name: " backup_dir && \
	docker cp ./backups/$$backup_dir data_stream_mongodb:/tmp/restore && \
	docker exec data_stream_mongodb mongorestore --db data_stream --drop /tmp/restore/data_stream
	@echo "✅ Database restored."

shell-backend: ## Open shell in backend container
	@docker exec -it data_stream_backend sh

shell-mongodb: ## Open MongoDB shell
	@docker exec -it data_stream_mongodb mongosh data_stream

shell-frontend: ## Open shell in frontend container
	@docker exec -it data_stream_frontend sh

dev-backend: ## Run backend in development mode locally
	@echo "🔧 Starting backend in development mode..."
	@cd backend && npm install && npm run dev

dev-frontend: ## Run frontend in development mode locally
	@echo "🔧 Starting frontend in development mode..."
	@cd frontend && npm install && npm start

install: ## Install dependencies for local development
	@echo "📦 Installing dependencies..."
	@npm install
	@cd backend && npm install
	@cd frontend && npm install
	@echo "✅ Dependencies installed."

status: ## Show status of Docker containers
	@echo "📊 Docker container status:"
	@docker-compose ps

ports: ## Show port mappings
	@echo "🌐 Port mappings:"
	@echo "  Frontend: http://localhost:3000"
	@echo "  Backend:  http://localhost:4000/graphql"
	@echo "  MongoDB:  localhost:27017"
