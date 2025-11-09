FROM rust:1.90-slim as builder

WORKDIR /app

# Install dependencies for diesel
RUN apt-get update && apt-get install -y \
    libpq-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files
COPY Cargo.toml Cargo.lock* ./
COPY diesel.toml ./

# Copy source code
COPY src ./src
COPY migrations ./migrations

# Build the application
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libpq5 \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the binary from builder
COPY --from=builder /app/target/release/timeline-batch /app/timeline-batch

# Set environment variables
ENV RUST_LOG=info
ENV DATABASE_URL=""

# Default command (can be overridden)
CMD ["/app/timeline-batch"]

