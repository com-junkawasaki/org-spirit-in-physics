#!/bin/bash
# Generate TypeScript types from proto files using buf

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_ROOT="$(cd "$PACKAGE_ROOT/../.." && pwd)"
PROTO_DIR="$PROJECT_ROOT/performers/services/grpc/proto"
OUT_DIR="$PACKAGE_ROOT/src/generated"

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
buf generate --template "$PACKAGE_ROOT/buf.gen.yaml" proto

# Move generated files to correct location
if [ -d "$PROJECT_ROOT/performers/services/grpc/src/generated" ]; then
    echo "Moving generated files to $OUT_DIR..."
    mkdir -p "$OUT_DIR"
    cp -r "$PROJECT_ROOT/performers/services/grpc/src/generated"/* "$OUT_DIR/"
    rm -rf "$PROJECT_ROOT/performers/services/grpc/src/generated"
fi

echo "Type generation complete!"

