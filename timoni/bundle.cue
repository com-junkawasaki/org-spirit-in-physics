bundle: {
	apiVersion: "v1alpha1"
	name:       "spirit-in-physics"
	instances: {
		infra: {
			module: {
				url: "file://./modules/infra"
			}
			namespace: "spirit-in-physics"
			values: {
				timescaledb: {
					enabled: true
					image: {
						repository: "timescale/timescaledb"
						tag:        "latest-pg15"
					}
				}
				temporal: {
					enabled: true
					image: {
						repository: "temporalio/auto-setup"
						tag:        "latest"
					}
				}
				minio: {
					enabled: true
					image: {
						repository: "minio/minio"
						tag:        "latest"
					}
				}
				nix_cache: {
					enabled: false
					storage: "20Gi"
				}
				gateway: {
					hostname: "sip.junkawasaki.com"
				}
			}
		}

		"grpc-service": {
			module: {
				url: "file://./modules/app"
			}
			namespace: "spirit-in-physics"
			values: {
				image: {
					repository: "asia-northeast1-docker.pkg.dev/com-junkawasaki-sip/spirit-in-physics/grpc-service"
					tag:        "latest"
					pullPolicy: "IfNotPresent"
				}
				resources: requests: {
					cpu:    "100m"
					memory: "256Mi"
				}
				service: port: 8080
				env: [
					{name: "DATABASE_URL", value: "postgresql://postgres:postgres@infra-timescaledb:5432/spirit_in_physics"},
					{name: "TEMPORAL_ADDRESS", value: "infra-temporal:7233"},
					{name: "MINIO_ENDPOINT", value: "infra-minio:9000"},
					{name: "MINIO_ROOT_USER", value: "minioadmin"},
					{name: "MINIO_ROOT_PASSWORD", value: "minioadmin"},
				]
			}
		}

		"import-service": {
			module: {
				url: "file://./modules/app"
			}
			namespace: "spirit-in-physics"
			values: {
				image: {
					repository: "asia-northeast1-docker.pkg.dev/com-junkawasaki-sip/spirit-in-physics/import-service"
					tag:        "latest"
					pullPolicy: "IfNotPresent"
				}
				service: port: 8082
				env: [
					{name: "DATABASE_URL", value: "postgresql://postgres:postgres@infra-timescaledb:5432/spirit_in_physics"},
					{name: "TEMPORAL_ADDRESS", value: "infra-temporal:7233"},
					{name: "DATASET_PATH", value: "/dataset"},
				]
			}
		}

		"import-worker": {
			module: {
				url: "file://./modules/app"
			}
			namespace: "spirit-in-physics"
			values: {
				image: {
					repository: "asia-northeast1-docker.pkg.dev/com-junkawasaki-sip/spirit-in-physics/import-service"
					tag:        "latest"
					pullPolicy: "IfNotPresent"
				}
				command: ["python", "worker.py"]
				env: [
					{name: "DATABASE_URL", value: "postgresql://postgres:postgres@infra-timescaledb:5432/spirit_in_physics"},
					{name: "TEMPORAL_ADDRESS", value: "infra-temporal:7233"},
					{name: "DATASET_PATH", value: "/dataset"},
				]
			}
		}

		"portal": {
			module: {
				url: "file://./modules/app"
			}
			namespace: "spirit-in-physics"
			values: {
				image: {
					repository: "asia-northeast1-docker.pkg.dev/com-junkawasaki-sip/spirit-in-physics/svelte-app"
					tag:        "latest"
					pullPolicy: "IfNotPresent"
				}
				resources: requests: {
					cpu:    "100m"
					memory: "128Mi"
				}
				service: port: 80
				env: [
					{
						name: "PUBLIC_CLERK_PUBLISHABLE_KEY"
						valueFrom: secretKeyRef: {
							name: "clerk-secrets"
							key:  "PUBLIC_CLERK_PUBLISHABLE_KEY"
						}
					},
					{
						name: "CLERK_SECRET_KEY"
						valueFrom: secretKeyRef: {
							name: "clerk-secrets"
							key:  "CLERK_SECRET_KEY"
						}
					},
					{name: "PUBLIC_API_URL", value: "https://sip.junkawasaki.com/api"},
				]
			}
		}

		"temporal-ts": {
			module: {
				url: "file://./modules/app"
			}
			namespace: "spirit-in-physics"
			values: {
				image: {
					repository: "asia-northeast1-docker.pkg.dev/com-junkawasaki-sip/spirit-in-physics/temporal-ts"
					tag:        "latest"
					pullPolicy: "IfNotPresent"
				}
				service: port: 3000
				env: [
					{name: "TEMPORAL_ADDRESS", value: "infra-temporal:7233"},
					{name: "TASK_QUEUE", value: "visualization-analysis-queue"},
				]
			}
		}
	}
}
