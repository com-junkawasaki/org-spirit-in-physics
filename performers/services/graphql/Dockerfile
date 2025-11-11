FROM rust:1.90-slim as builder

WORKDIR /app

# Install dependencies including build tools for native crates
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    build-essential \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy Cargo files
COPY Cargo.toml ./
# Cargo.lock is optional - will be generated if not present
COPY Cargo.lock* ./

# Copy source code
COPY src ./src

# Build the application
RUN cargo build --release

FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the binary from builder
COPY --from=builder /app/target/release/graphql-service /app/graphql-service

EXPOSE 8081

CMD ["/app/graphql-service"]

