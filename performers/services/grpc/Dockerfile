FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git make curl
RUN curl -sSL "https://github.com/bufbuild/buf/releases/latest/download/buf-$(uname -s)-$(uname -m)" -o "/usr/local/bin/buf" &&     chmod +x "/usr/local/bin/buf"
RUN go install github.com/sqlc-dev/sqlc/cmd/sqlc@latest
RUN go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
RUN go install connectrpc.com/connect/cmd/protoc-gen-connect-go@latest
RUN apk add --no-cache nodejs npm && npm install -g @bufbuild/protoc-gen-es@1.10.1 @connectrpc/protoc-gen-connect-es@1.7.0

# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Generate code and build
RUN make generate && go build -o bin/grpc-service ./cmd/server

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates curl

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/bin/grpc-service .

EXPOSE 8080

CMD ["./grpc-service"]
