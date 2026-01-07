package templates

import (
	appsv1 "k8s.io/api/apps/v1"
	batchv1 "k8s.io/api/batch/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

#LakeFSService: {
	#config: #Config
	apiVersion: "v1"
	kind:       "Service"
	metadata: {
		labels:      #config.metadata.labels
		annotations: #config.metadata.annotations
		namespace:   #config.metadata.namespace
		name:        "\(#config.metadata.name)-lakefs"
	}
	spec: {
		ports: [{
			port:       #config.lakefs.port
			targetPort: #config.lakefs.port
			protocol:   "TCP"
			name:       "http"
		}]
		selector: #config.selector.labels & {
			app: "lakefs"
		}
	}
}

#LakeFSServiceAccount: {
	#config: #Config
	apiVersion: "v1"
	kind:       "ServiceAccount"
	metadata: {
		labels:      #config.metadata.labels
		annotations: #config.metadata.annotations & #config.lakefs.serviceAccount.annotations
		namespace:   #config.metadata.namespace
		name:        "\(#config.metadata.name)-lakefs"
	}
}

#LakeFSDeployment: {
	#config: #Config
	apiVersion: "apps/v1"
	kind:       "Deployment"
	metadata: {
		labels:      #config.metadata.labels
		annotations: #config.metadata.annotations
		namespace:   #config.metadata.namespace
		name:        "\(#config.metadata.name)-lakefs"
	}
	spec: appsv1.#DeploymentSpec & {
		replicas: 1
		selector: metav1.#LabelSelector & {
			matchLabels: #config.selector.labels & {
				app: "lakefs"
			}
		}
		template: {
			metadata: {
				labels: #config.selector.labels & {
					app: "lakefs"
				}
			}
			spec: corev1.#PodSpec & {
				serviceAccountName: "\(#config.metadata.name)-lakefs"
				containers: [{
					name:  "lakefs"
					image: #config.lakefs.image.reference
					ports: [{
						containerPort: #config.lakefs.port
						name:          "http"
					}]
					env: [{
						name:  "LAKEFS_DATABASE_TYPE"
						value: "postgres"
					}, {
						name:  "LAKEFS_DATABASE_POSTGRES_CONNECTION_STRING"
						value: #config.lakefs.database.connectionString
					}, {
						name:  "LAKEFS_AUTH_ENCRYPT_SECRET_KEY"
						value: #config.lakefs.auth.encryptSecretKey
					}, {
						name:  "LAKEFS_BLOCKSTORE_TYPE"
						value: #config.lakefs.blockstore.type
					},
						if #config.lakefs.blockstore.type == "s3" {
							{
								name:  "LAKEFS_BLOCKSTORE_S3_ENDPOINT"
								value: #config.lakefs.blockstore.s3.endpoint
							}
						},
						if #config.lakefs.blockstore.type == "s3" {
							{
								name:  "LAKEFS_BLOCKSTORE_S3_FORCE_PATH_STYLE"
								value: "\(#config.lakefs.blockstore.s3.forcePathStyle)"
							}
						},
						if #config.lakefs.blockstore.type == "s3" {
							{
								name:  "LAKEFS_BLOCKSTORE_S3_CREDENTIALS_ACCESS_KEY_ID"
								value: #config.lakefs.blockstore.s3.accessKeyId
							}
						},
						if #config.lakefs.blockstore.type == "s3" {
							{
								name:  "LAKEFS_BLOCKSTORE_S3_CREDENTIALS_SECRET_ACCESS_KEY"
								value: #config.lakefs.blockstore.s3.secretAccessKey
							}
						},
						if #config.lakefs.blockstore.type == "gs" && #config.lakefs.blockstore.gs.credentialsJson != _|_ {
							{
								name:  "LAKEFS_BLOCKSTORE_GS_CREDENTIALS_JSON"
								value: #config.lakefs.blockstore.gs.credentialsJson
							}
						},
					]
					resources: #config.lakefs.resources
				}]
			}
		}
	}
}

#LakeFSSetupJob: {
	#config: #Config
	apiVersion: "batch/v1"
	kind:       "Job"
	metadata: {
		labels:      #config.metadata.labels
		annotations: #config.metadata.annotations & {
			"helm.sh/hook": "post-install,post-upgrade"
		}
		namespace: #config.metadata.namespace
		name:      "\(#config.metadata.name)-lakefs-setup"
	}
	spec: batchv1.#JobSpec & {
		template: {
			spec: corev1.#PodSpec & {
				restartPolicy: "OnFailure"
				containers: [{
					name:  "setup"
					image: "curlimages/curl:latest"
					command: ["/bin/sh", "-c"]
					args: [
						"""
						set -e
						LAKEFS_URL="http://\(#config.metadata.name)-lakefs:\(#config.lakefs.port)"
						
						echo "Waiting for lakeFS to be ready at $LAKEFS_URL..."
						while ! curl -s "$LAKEFS_URL/_health" | grep -q "alive"; do
						  echo "LakeFS not ready yet..."
						  sleep 2
						done
						echo "LakeFS is ready!"
						
						echo "Checking if lakeFS is already setup..."
						if curl -s "$LAKEFS_URL/setup_admin" | grep -q "already setup"; then
						  echo "lakeFS is already setup."
						else
						  echo "Setting up lakeFS admin..."
						  curl -X POST "$LAKEFS_URL/setup_admin" -H "Content-Type: application/json" -d '{"user_name": "admin", "access_key_id": "\(#config.lakefs.setup.adminAccessKey)", "secret_access_key": "\(#config.lakefs.setup.adminSecretKey)"}'
						fi
						
						echo "Creating repository \(#config.lakefs.setup.repository)..."
						curl -X POST "$LAKEFS_URL/api/v1/repositories" -u "\(#config.lakefs.setup.adminAccessKey):\(#config.lakefs.setup.adminSecretKey)" -H "Content-Type: application/json" -d '{"name": "\(#config.lakefs.setup.repository)", "storage_namespace": "\(#config.lakefs.setup.storageNamespace)", "default_branch": "main"}' || echo "Repository might already exist"
						
						echo "lakeFS setup complete."
						""",
					]
				}]
			}
		}
	}
}

