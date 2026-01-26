#!/bin/bash
set -e

PROJECT_ID="com-junkawasaki-sip"
CLUSTER_NAME="spirit-autopilot"
REGION="asia-northeast1"
GSA_NAME="config-sync-sa"
GSA_EMAIL="${GSA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "Enabling Config Sync on cluster ${CLUSTER_NAME}..."
gcloud container fleet memberships register ${CLUSTER_NAME}-membership \
    --gke-cluster=${REGION}/${CLUSTER_NAME} \
    --enable-workload-identity || true

gcloud beta container fleet config-management enable --project=${PROJECT_ID}

gcloud beta container fleet config-management apply \
    --membership=${CLUSTER_NAME}-membership \
    --config-sync-version=1.17.0 \
    --config-sync-source-format=unstructured \
    --project=${PROJECT_ID} --location=global

# IAM Setup
if ! gcloud iam service-accounts describe ${GSA_EMAIL} > /dev/null 2>&1; then
    echo "Creating GSA ${GSA_NAME}..."
    gcloud iam service-accounts create ${GSA_NAME} --project=${PROJECT_ID}
fi

echo "Adding IAM policy bindings..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${GSA_EMAIL}" \
    --role="roles/artifactregistry.reader"

gcloud iam service-accounts add-iam-policy-binding ${GSA_EMAIL} \
    --project=${PROJECT_ID} \
    --role="roles/iam.workloadIdentityUser" \
    --member="serviceAccount:${PROJECT_ID}.svc.id.goog[config-management-system/root-reconciler]"

echo "Applying RootSync..."
kubectl apply -f config-sync/rootsync.yaml

echo "Setup complete. Run 'task push-manifest' to deploy."
