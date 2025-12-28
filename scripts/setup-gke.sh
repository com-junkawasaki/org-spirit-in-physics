#!/bin/bash
set -e

# Configuration
PROJECT_ID="com-junkawasaki-sip"
REGION="asia-northeast1"
CLUSTER_NAME="spirit-in-physics"
RESERVED_IP_NAME="sip-static-ip"

echo "=== GKE Setup for $PROJECT_ID ==="

# 1. Project Selection
echo "Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID || {
    echo "Error: Could not set project. Please run 'gcloud auth login' first."
    exit 1
}

# 2. Enable APIs
echo "Enabling necessary GCP APIs..."
gcloud services enable \
    container.googleapis.com \
    compute.googleapis.com \
    artifactregistry.googleapis.com \
    iam.googleapis.com \
    secretmanager.googleapis.com \
    logging.googleapis.com \
    monitoring.googleapis.com

# 3. Create Artifact Registry
echo "Creating Artifact Registry..."
gcloud artifacts repositories create spirit-in-physics \
    --repository-format=docker \
    --location=$REGION \
    --description="Docker repository for Spirit in Physics" || echo "Repository already exists"

# 4. Reserve Static IP
echo "Reserving static IP..."
gcloud compute addresses create $RESERVED_IP_NAME \
    --global || echo "IP address already exists"

# 5. Create GKE Cluster
echo "Creating GKE Cluster (Standard, Cost Optimized)..."
# - Machine Type: e2-medium (2 vCPU, 4GB RAM) - Good balance for basic apps
# - Node Count: Single zone to minimize cost (1-2 node autoscaling)
# - Spot Instances: Significant cost reduction
gcloud container clusters create $CLUSTER_NAME \
    --zone "${REGION}-a" \
    --num-nodes 1 \
    --machine-type e2-medium \
    --enable-autoscaling --min-nodes 1 --max-nodes 2 \
    --spot \
    --workload-pool "${PROJECT_ID}.svc.id.goog" \
    --gateway-api=standard \
    --labels=project=spirit-in-physics || echo "Cluster already exists"

# 6. Get Credentials
echo "Configuring kubectl..."
gcloud container clusters get-credentials $CLUSTER_NAME --zone "${REGION}-a"

# 7. Install Envoy Gateway
# Based on workspace rules, Envoy is used for Gateway
echo "Installing Envoy Gateway (v1.2.4) with force-conflicts..."
kubectl apply --server-side --force-conflicts -f https://github.com/envoyproxy/gateway/releases/download/v1.2.4/install.yaml

echo "=== GKE Setup Finished ==="
echo "Static IP reserved: $RESERVED_IP_NAME"
gcloud compute addresses describe $RESERVED_IP_NAME --global --format="value(address)"

