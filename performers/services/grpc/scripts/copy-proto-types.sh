#!/bin/bash
# Copy generated TypeScript types to frontend apps

set -e

# Source directory (where buf generates TypeScript files)
SOURCE_DIR="gen/proto-ts"

# Frontend apps that need the types
FRONTEND_APPS=(
  "../../apps/web/src/generated/proto"
  "../../apps/participant/src/generated/proto"
)

# Check if source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
  echo "Error: $SOURCE_DIR does not exist. Run 'make generate' first."
  exit 1
fi

# Copy to each frontend app
for APP_DIR in "${FRONTEND_APPS[@]}"; do
  if [ -d "$(dirname "$APP_DIR")" ]; then
    echo "Copying proto types to $APP_DIR..."
    mkdir -p "$APP_DIR"
    cp -r "$SOURCE_DIR"/* "$APP_DIR"/
    echo "✓ Copied to $APP_DIR"
  else
    echo "Warning: $(dirname "$APP_DIR") does not exist, skipping..."
  fi
done

echo "Done copying proto types to frontend apps."
