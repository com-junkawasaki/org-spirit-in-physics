.PHONY: generate build test run clean

# Generate code from protobuf and sqlc
generate:
	buf generate
	sqlc generate
	@echo "Generated code from protobuf and sqlc"

# Copy TypeScript types to frontend apps
copy-types: generate
	@./scripts/copy-proto-types.sh

# Build the application
build: generate
	go build -o bin/grpc-service ./cmd/server

# Run tests
test:
	go test ./...

# Run integration tests (requires database)
test-integration:
	go test -tags=integration ./internal/handlers/...

# Run the server
run: generate
	go run ./cmd/server

# Clean generated files
clean:
	rm -rf gen/
	rm -rf internal/db/*.go
	rm -rf bin/

# Install dependencies
deps:
	go mod download
	go install github.com/bufbuild/buf/cmd/buf@latest
	go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
