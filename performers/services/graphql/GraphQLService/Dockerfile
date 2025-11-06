# Multi-stage build for GraphQL Server
# Build stage
FROM rust:1.83-slim AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy activities Cargo files first for dependency caching
COPY activities/Cargo.toml activities/Cargo.lock ./activities/

# Copy GraphQL Service Cargo files
COPY performers/services/graphql/GraphQLService/Cargo.toml performers/services/graphql/GraphQLService/Cargo.lock ./performers/services/graphql/GraphQLService/

# Create dummy source files to build dependencies
RUN mkdir -p activities/src && \
    echo "fn main() {}" > activities/src/lib.rs && \
    mkdir -p performers/services/graphql/GraphQLService/src && \
    echo "fn main() {}" > performers/services/graphql/GraphQLService/src/main.rs

# Build dependencies (this layer will be cached if Cargo files don't change)
RUN cd performers/services/graphql/GraphQLService && \
    cargo build --release && \
    rm src/main.rs

# Copy activities source code
COPY activities/src ./activities/src

# Copy GraphQL Service source code
COPY performers/services/graphql/GraphQLService/src ./performers/services/graphql/GraphQLService/src

# Build the application
RUN cd performers/services/graphql/GraphQLService && \
    touch src/main.rs && \
    cargo build --release --bin graphql-server

# Runtime stage
FROM debian:bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd -m -u 1000 appuser

# Copy the binary from builder stage
COPY --from=builder /app/performers/services/graphql/GraphQLService/target/release/graphql-server /usr/local/bin/graphql-server

# Set user
USER appuser

# Expose port
EXPOSE 3003

# Set default environment variables
ENV PORT=3003
ENV RUST_LOG=info

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3003/health || exit 1

# Run the application
CMD ["graphql-server"]

