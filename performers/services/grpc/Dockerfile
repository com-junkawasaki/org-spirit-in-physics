FROM rust:latest as builder

# Install protobuf-compiler
RUN apt-get update && apt-get install -y \
    protobuf-compiler \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy proto files
COPY proto /app/proto

# Copy Cargo files
COPY Cargo.toml Cargo.lock* /app/
COPY build.rs /app/

# Copy source code
COPY src /app/src

# Build the application
RUN cargo build --release

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/grpc-service /app/grpc-service

EXPOSE 8083

CMD ["./grpc-service"]

