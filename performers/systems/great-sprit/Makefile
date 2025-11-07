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
	@sleep 5
	@make init-db
	@echo "Services started with test data!"

# Restart services
restart: down up
	@make init-db

