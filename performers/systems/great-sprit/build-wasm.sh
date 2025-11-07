#!/bin/bash
# Build WebAssembly module for Bevy visualization

set -e

echo "Building WebAssembly module..."

# Install wasm32 target if not already installed
if ! rustup target list --installed | grep -q "wasm32-unknown-unknown"; then
    echo "Installing wasm32-unknown-unknown target..."
    rustup target add wasm32-unknown-unknown
fi

# Build for WebAssembly
echo "Building for wasm32-unknown-unknown..."
cargo build --release --target wasm32-unknown-unknown --lib

# Install wasm-bindgen-cli if not available
if ! command -v wasm-bindgen &> /dev/null; then
    echo "Installing wasm-bindgen-cli..."
    cargo install wasm-bindgen-cli
fi

# Generate bindings
echo "Generating wasm-bindgen bindings..."
wasm-bindgen \
    --target web \
    --out-dir resources/wasm \
    --out-name great_sprit \
    target/wasm32-unknown-unknown/release/great_sprit.wasm

# Optimize WASM file (optional, requires wasm-opt)
if command -v wasm-opt &> /dev/null; then
    echo "Optimizing WASM file..."
    wasm-opt -Oz -o resources/wasm/great_sprit_bg.wasm resources/wasm/great_sprit_bg.wasm
else
    echo "wasm-opt not found, skipping optimization. Install with: npm install -g wasm-opt"
fi

echo "WebAssembly build complete!"
echo "Output: resources/wasm/"

