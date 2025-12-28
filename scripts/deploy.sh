#!/bin/bash
set -e

PROJECT_ID="com-junkawasaki-sip"
REGION="asia-northeast1"
REPO="spirit-in-physics"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}"

services=("grpc-image" "svelte-image" "import-image")
image_names=("grpc-service" "svelte-app" "import-service")

echo "=== Building and Pushing Images ==="

for i in "${!services[@]}"; do
    service=${services[$i]}
    image_name=${image_names[$i]}
    target_tag="${REGISTRY}/${image_name}:latest"
    
    echo "Processing $service -> $target_tag"
    
    # Build the image and load into local docker
    nix build ".#${service}" --print-build-logs
    ./result | docker load
    
    # Tag and Push
    docker tag "spirit-${image_name}:latest" "$target_tag"
    docker push "$target_tag"
    
    echo "Successfully pushed $target_tag"
done

echo "=== Updating Timoni Bundle ==="
# We'll create a new bundle for production or update the existing one
# For now, let's just use a sed-like approach or create a production-values.cue

echo "=== Deploying with Timoni ==="
# Note: We need to ensure kubectl is pointing to the right cluster (already done in setup)
# timoni bundle apply -f timoni/bundle.cue ...

