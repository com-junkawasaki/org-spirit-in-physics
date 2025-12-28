#!/bin/bash
set -e

PROJECT_ID="com-junkawasaki-sip"
REGION="asia-northeast1"
REPO="spirit-in-physics"
REGISTRY="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO}"

services=("grpc-image" "svelte-image" "import-image")
image_names=("grpc-service" "svelte-app" "import-service")

echo "=== Building and Pushing Images ==="

TAG=$(date +%Y%m%d%H%M%S)

echo "Processing grpc-image -> ${REGISTRY}/grpc-service:${TAG}"
nix build ".#grpc-image" --print-build-logs
./result | docker load
docker tag "spirit-grpc-service:latest" "${REGISTRY}/grpc-service:${TAG}"
docker tag "spirit-grpc-service:latest" "${REGISTRY}/grpc-service:latest"
docker push "${REGISTRY}/grpc-service:${TAG}"
docker push "${REGISTRY}/grpc-service:latest"

echo "Processing svelte-app -> ${REGISTRY}/svelte-app:${TAG}"
nix build ".#svelte-app" --print-build-logs
[ -d dist-svelte ] && chmod -R +w dist-svelte && rm -rf dist-svelte
mkdir -p dist-svelte
cp -rL result/* dist-svelte/
chmod -R +w dist-svelte
docker build --platform linux/amd64 -t "${REGISTRY}/svelte-app:${TAG}" -t "${REGISTRY}/svelte-app:latest" -f Dockerfile.svelte .
docker push "${REGISTRY}/svelte-app:${TAG}"
docker push "${REGISTRY}/svelte-app:latest"
chmod -R +w dist-svelte && rm -rf dist-svelte

echo "Processing import-service -> ${REGISTRY}/import-service:${TAG}"
# Using standard Docker build for Python to avoid Nix cross-compilation issues
docker build --platform linux/amd64 -t "${REGISTRY}/import-service:${TAG}" -t "${REGISTRY}/import-service:latest" -f Dockerfile.import .
docker push "${REGISTRY}/import-service:${TAG}"
docker push "${REGISTRY}/import-service:latest"

echo "Processing temporal-ts -> ${REGISTRY}/temporal-ts:${TAG}"
docker build --platform linux/amd64 -t "${REGISTRY}/temporal-ts:${TAG}" -t "${REGISTRY}/temporal-ts:latest" -f Dockerfile.temporal-ts .
docker push "${REGISTRY}/temporal-ts:${TAG}"
docker push "${REGISTRY}/temporal-ts:latest"

echo "=== Updating Deployments ==="
kubectl set image deployment/portal portal="${REGISTRY}/svelte-app:${TAG}" -n spirit-in-physics
kubectl set image deployment/grpc-service grpc-service="${REGISTRY}/grpc-service:${TAG}" -n spirit-in-physics
kubectl set image deployment/import-service import-service="${REGISTRY}/import-service:${TAG}" -n spirit-in-physics
kubectl set image deployment/import-worker import-worker="${REGISTRY}/import-service:${TAG}" -n spirit-in-physics
kubectl set image deployment/temporal-ts temporal-ts="${REGISTRY}/temporal-ts:${TAG}" -n spirit-in-physics

echo "=== Updating Timoni Bundle ==="
# We'll create a new bundle for production or update the existing one
# For now, let's just use a sed-like approach or create a production-values.cue

echo "=== Deploying with Timoni ==="
# Note: We need to ensure kubectl is pointing to the right cluster (already done in setup)
# timoni bundle apply -f timoni/bundle.cue ...

