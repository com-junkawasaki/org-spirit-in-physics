#!/bin/bash
# scripts/setup-kcc.sh
set -e

PROJECT_ID="com-junkawasaki-sip"
CLUSTER_NAME="spirit-autopilot"
REGION="asia-northeast1"
NAMESPACE="spirit-in-physics"

echo "🚀 Installing Standalone Config Connector on GKE Autopilot (v1.28+ support)..."

# 1. Install Operator
if [ -f "operator-system/autopilot-configconnector-operator.yaml" ]; then
    echo "Applying Autopilot Config Connector Operator..."
    kubectl apply -f operator-system/autopilot-configconnector-operator.yaml
else
    echo "Downloading and applying operator..."
    gsutil cp gs://configconnector-operator/latest/release-bundle.tar.gz .
    tar -zxvf release-bundle.tar.gz
    kubectl apply -f operator-system/autopilot-configconnector-operator.yaml
fi

# 2. Create GCP Service Account for Config Connector
KCC_GSA_NAME="spirit-kcc-sa"
KCC_GSA_EMAIL="${KCC_GSA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

if ! gcloud iam service-accounts describe ${KCC_GSA_EMAIL} --project=${PROJECT_ID} > /dev/null 2>&1; then
    echo "Creating GSA ${KCC_GSA_NAME}..."
    gcloud iam service-accounts create ${KCC_GSA_NAME} --project=${PROJECT_ID}
fi

# 3. Grant Permissions to KCC GSA
echo "Adding IAM policy bindings for KCC GSA..."
gcloud projects add-iam-policy-binding ${PROJECT_ID} \
    --member="serviceAccount:${KCC_GSA_EMAIL}" \
    --role="roles/owner"

# 4. Bind KCC GSA to Kubernetes Service Account (Workload Identity)
echo "Binding GSA to KSA via Workload Identity..."
# Note: For namespaced mode, the KSA is cnrm-controller-manager in the namespace
gcloud iam service-accounts add-iam-policy-binding ${KCC_GSA_EMAIL} \
    --project=${PROJECT_ID} \
    --role="roles/iam.workloadIdentityUser" \
    --member="serviceAccount:${PROJECT_ID}.svc.id.goog[cnrm-system/cnrm-controller-manager]"

# 5. Configure ConfigConnector (Namespaced Mode)
cat <<EOF | kubectl apply -f -
apiVersion: core.cnrm.cloud.google.com/v1beta1
kind: ConfigConnector
metadata:
  name: configconnector.core.cnrm.cloud.google.com
spec:
  mode: namespaced
EOF

# 6. Create ConfigConnectorContext for the namespace
# We wait a bit for the CRDs to be ready
echo "Waiting for CRDs to be ready..."
sleep 10

cat <<EOF | kubectl apply -f -
apiVersion: core.cnrm.cloud.google.com/v1beta1
kind: ConfigConnectorContext
metadata:
  name: configconnectorcontext.core.cnrm.cloud.google.com
  namespace: ${NAMESPACE}
spec:
  googleServiceAccount: ${KCC_GSA_EMAIL}
EOF

echo "✨ Standalone Config Connector setup complete for namespace: ${NAMESPACE}"
