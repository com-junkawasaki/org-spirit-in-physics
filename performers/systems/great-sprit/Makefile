.PHONY: build up down logs test clean init-db

# Build Docker images
build:
	docker-compose build

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

# Clean up
clean:
	docker-compose down -v
	docker system prune -f

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

