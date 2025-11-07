.PHONY: build up down logs test clean init-db clean-cache

# Build Docker images with BuildKit
build:
	DOCKER_BUILDKIT=1 docker-compose build

# Start services
up:
	docker-compose up -d

# Stop services
down:
	docker-compose down

# View logs
logs:
	docker-compose logs -f great-sprit

# Run tests
test:
	docker-compose exec great-sprit cargo test

# Clean up containers and volumes
clean:
	docker-compose down -v
	docker system prune -f

# Clean build cache (frees disk space)
clean-cache:
	@echo "Cleaning Docker build cache..."
	docker builder prune -af
	@echo "Cleaning Cargo cache in containers..."
	docker-compose run --rm great-sprit cargo clean || true
	@echo "Cache cleaned!"

# Initialize TerminusDB with test data
init-db:
	docker-compose exec terminusdb bash /app/test-data/terminusdb/init.sh

# Start with test data initialization
start: build up
	@echo "Waiting for services to start..."
	@sleep 10
	@echo "Initializing TerminusDB with test data..."
	@make init-db || echo "Warning: Database initialization may have failed, but services are running"
	@echo "Services started! GraphQL API: http://localhost:8080"
	@echo "TerminusDB: http://localhost:6363"

# Restart services
restart: down up
	@make init-db

# Check disk usage
disk-usage:
	@echo "Docker disk usage:"
	@docker system df
	@echo ""
	@echo "Docker build cache usage:"
	@docker builder du || echo "BuildKit not available"
