# Multi-stage build for Rust application
# Note: Using nightly Rust for Bevy 0.13 compatibility (edition2024 support)
FROM rustlang/rust:nightly-slim as builder

WORKDIR /app

# Install dependencies
RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    curl \
    libasound2-dev \
    libudev-dev \
    && rm -rf /var/lib/apt/lists/*

# Configure Cargo for better caching and disk usage
ENV CARGO_NET_GIT_FETCH_WITH_CLI=true
ENV CARGO_INCREMENTAL=0
ENV CARGO_TARGET_DIR=/app/target

# Copy manifests first for better layer caching
COPY Cargo.toml Cargo.lock* ./

# Create dummy source to cache dependencies
RUN mkdir -p src && echo "fn main() {}" > src/main.rs

# Build dependencies only (cached layer)
# This layer will be cached unless Cargo.toml changes
RUN cargo build --release --locked && \
    rm -rf src && \
    # Clean up to save space (keep .rlib files for linking)
    rm -rf target/release/deps/*.d || true && \
    rm -rf target/release/incremental || true

# Copy source code
COPY src ./src
COPY resources ./resources

# Build for release (only rebuilds our code, dependencies are cached)
RUN cargo build --release --locked && \
    # Clean up intermediate files to save space
    rm -rf target/release/deps/*.d || true && \
    rm -rf target/release/incremental || true && \
    # Strip debug symbols to reduce binary size
    strip target/release/great-sprit || true

# Runtime stage
FROM debian:bookworm-slim

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

# Copy binary from builder
COPY --from=builder /app/target/release/great-sprit /app/great-sprit

# Expose port
EXPOSE 8080

# Run the application
CMD ["./great-sprit"]

