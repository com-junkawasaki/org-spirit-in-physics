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
					}, {
						name:  "LAKEFS_BLOCKSTORE_S3_ENDPOINT"
						value: #config.lakefs.blockstore.s3.endpoint
					}, {
						name:  "LAKEFS_BLOCKSTORE_S3_FORCE_PATH_STYLE"
						value: "\(#config.lakefs.blockstore.s3.forcePathStyle)"
					}, {
						name:  "LAKEFS_BLOCKSTORE_S3_CREDENTIALS_ACCESS_KEY_ID"
						value: #config.lakefs.blockstore.s3.accessKeyId
					}, {
						name:  "LAKEFS_BLOCKSTORE_S3_CREDENTIALS_SECRET_ACCESS_KEY"
						value: #config.lakefs.blockstore.s3.secretAccessKey
					}]
				}]
			}
		}
	}
}

#LakeFSRoute: {
	#config: #Config
	apiVersion: "gateway.networking.k8s.io/v1"
	kind:       "HTTPRoute"
	metadata: {
		labels:      #config.metadata.labels
		annotations: #config.metadata.annotations
		namespace:   #config.metadata.namespace
		name:        "\(#config.metadata.name)-lakefs"
	}
	spec: {
		parentRefs: [{
			name:      "\(#config.metadata.name)-gateway"
			namespace: #config.metadata.namespace
		}]
		hostnames: [#config.gateway.hostname]
		rules: [{
			matches: [{
				path: {
					type:  "PathPrefix"
					value: "/lakefs"
				}
			}]
			filters: [{
				type: "URLRewrite"
				urlRewrite: {
					path: {
						type:               "ReplacePrefixMatch"
						replacePrefixMatch: "/"
					}
				}
			}]
			backendRefs: [{
				name: "\(#config.metadata.name)-lakefs"
				port: #config.lakefs.port
			}]
		}]
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
						  curl -X POST "$LAKEFS_URL/setup_admin" -H "Content-Type: application/json" -d '{"user_name": "admin", "access_key_id": "AKIAIOSFODNN7EXAMPLE", "secret_access_key": "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"}'
						fi
						
						echo "Creating repository \(#config.lakefs.setup.repository)..."
						curl -X POST "$LAKEFS_URL/api/v1/repositories" -u "AKIAIOSFODNN7EXAMPLE:wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY" -H "Content-Type: application/json" -d '{"name": "\(#config.lakefs.setup.repository)", "storage_namespace": "s3://\(#config.lakefs.setup.repository)", "default_branch": "main"}' || echo "Repository might already exist"
						
						echo "lakeFS setup complete."
						""",
					]
				}]
			}
		}
	}
}

