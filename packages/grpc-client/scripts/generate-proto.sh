#!/bin/bash
# Generate TypeScript types from proto files using buf

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PROTO_DIR="$PROJECT_ROOT/performers/services/grpc/proto"
OUT_DIR="$SCRIPT_DIR/../src/generated"

echo "Generating TypeScript types from proto files..."
echo "Proto directory: $PROTO_DIR"
echo "Output directory: $OUT_DIR"

# Create output directory
mkdir -p "$OUT_DIR"

# Check if buf is installed
if ! command -v buf &> /dev/null; then
    echo "buf is not installed. Installing via npm..."
    npm install -g @bufbuild/buf
fi

# Generate TypeScript code using buf
cd "$PROJECT_ROOT/performers/services/grpc"
buf generate --template "$SCRIPT_DIR/../buf.gen.yaml" proto

echo "Type generation complete!"

