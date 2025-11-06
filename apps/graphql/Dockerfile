# Build stage
FROM rust:1.75-slim as builder

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install diesel CLI
RUN cargo install diesel_cli --no-default-features --features postgres

# Copy Cargo files
COPY Cargo.toml ./
# Create a dummy Cargo.lock if it doesn't exist (for first build)
RUN touch Cargo.lock || true

# Copy source code
COPY src ./src
COPY diesel.toml ./

# Build the application
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies and tools
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    libpq5 \
    postgresql-client \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Copy diesel CLI from builder
COPY --from=builder /usr/local/cargo/bin/diesel /usr/local/bin/diesel

# Copy the binary from builder
COPY --from=builder /app/target/release/graphql /app/graphql

# Copy source directory structure for schema generation
COPY src ./src
COPY diesel.toml ./

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Expose port
EXPOSE 8080

# Use entrypoint script
ENTRYPOINT ["/entrypoint.sh"]
CMD ["./graphql"]

