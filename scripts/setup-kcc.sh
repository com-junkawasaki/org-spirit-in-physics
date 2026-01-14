#!/bin/bash
# scripts/setup-kcc.sh
set -e

PROJECT_ID="com-junkawasaki-sip"
CLUSTER_NAME="spirit-autopilot"
REGION="asia-northeast1"
NAMESPACE="spirit-in-physics"

echo "🚀 Enabling Config Connector on GKE Autopilot cluster: ${CLUSTER_NAME}..."

# 1. Enable Config Connector Add-on
gcloud container clusters update ${CLUSTER_NAME} \
    --region ${REGION} \
    --update-addons ConfigConnector=ENABLED

# 2. Create GCP Service Account for Config Connector
KCC_GSA_NAME="spirit-kcc-sa"
KCC_GSA_EMAIL="${KCC_GSA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

if ! gcloud iam service-accounts describe ${KCC_GSA_EMAIL} > /dev/null 2>&1; then
    echo "Creating GSA ${KCC_GSA_NAME}..."
    gcloud iam service-accounts create ${KCC_GSA_NAME} --project=${PROJECT_ID}
fi

# 3. Grant Permissions to KCC GSA
echo "Adding IAM policy bindings for KCC GSA..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${KCC_GSA_EMAIL}" \
    --role="roles/owner" # For development, owner is easier. In production, use specific roles.

# 4. Bind KCC GSA to Kubernetes Service Account (Workload Identity)
echo "Binding GSA to KSA via Workload Identity..."
gcloud iam service-accounts add-iam-policy-binding ${KCC_GSA_EMAIL} \
    --role="roles/iam.workloadIdentityUser" \
    --member="serviceAccount:${PROJECT_ID}.svc.id.goog[cnrm-system/cnrm-controller-manager]"

# 5. Create ConfigConnectorContext for the namespace
cat <<EOF | kubectl apply -f -
apiVersion: core.cnrm.cloud.google.com/v1beta1
kind: ConfigConnectorContext
metadata:
  name: configconnectorcontext.core.cnrm.cloud.google.com
  namespace: ${NAMESPACE}
spec:
  googleServiceAccount: ${KCC_GSA_EMAIL}
EOF

echo "✨ Config Connector setup complete for namespace: ${NAMESPACE}"
echo "You can now push manifests for GCS and other Google Cloud resources."

