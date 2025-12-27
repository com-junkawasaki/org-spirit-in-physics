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
				gateway: hostname: "localhost"
			}
		}

		"grpc-service": {
			module: {
				url: "file://./modules/app"
			}
			namespace: "spirit-in-physics"
			values: {
				image: {
					repository: "spirit-grpc-service"
					tag:        "latest"
					pullPolicy: "IfNotPresent"
				}
				service: port: 8080
				routing: {
					enabled:          true
					hostname:         "api.localhost"
					gatewayName:      "infra-gateway"
					gatewayNamespace: "spirit-in-physics"
				}
				env: [
					{name: "DATABASE_URL", value: "postgresql://postgres:postgres@infra-timescaledb:5432/spirit_in_physics"},
					{name: "TEMPORAL_ADDRESS", value: "infra-temporal:7233"},
					{name: "MINIO_ENDPOINT", value: "infra-minio:9000"},
					{name: "MINIO_ROOT_USER", value: "minioadmin"},
					{name: "MINIO_ROOT_PASSWORD", value: "minioadmin"},
				]
				volumeMounts: [
					{name: "dataset", mountPath: "/dataset"},
				]
				volumes: [
					{
						name: "dataset"
						hostPath: {
							path: "/Volumes/251214/jun784/spirit-in-physics/dataset/participants"
							type: "Directory"
						}
					},
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
					repository: "spirit-import-service"
					tag:        "latest"
					pullPolicy: "IfNotPresent"
				}
				service: port: 8082
				routing: {
					enabled:          true
					hostname:         "import.localhost"
					gatewayName:      "infra-gateway"
					gatewayNamespace: "spirit-in-physics"
				}
				env: [
					{name: "DATABASE_URL", value: "postgresql://postgres:postgres@infra-timescaledb:5432/spirit_in_physics"},
					{name: "TEMPORAL_ADDRESS", value: "infra-temporal:7233"},
					{name: "DATASET_PATH", value: "/dataset"},
				]
				volumeMounts: [
					{name: "dataset", mountPath: "/dataset"},
				]
				volumes: [
					{
						name: "dataset"
						hostPath: {
							path: "/Volumes/251214/jun784/spirit-in-physics/dataset/participants"
							type: "Directory"
						}
					},
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
					repository: "spirit-import-service"
					tag:        "latest"
					pullPolicy: "IfNotPresent"
				}
				command: ["python", "worker.py"]
				env: [
					{name: "DATABASE_URL", value: "postgresql://postgres:postgres@infra-timescaledb:5432/spirit_in_physics"},
					{name: "TEMPORAL_ADDRESS", value: "infra-temporal:7233"},
					{name: "DATASET_PATH", value: "/dataset"},
				]
				volumeMounts: [
					{name: "dataset", mountPath: "/dataset"},
				]
				volumes: [
					{
						name: "dataset"
						hostPath: {
							path: "/Volumes/251214/jun784/spirit-in-physics/dataset/participants"
							type: "Directory"
						}
					},
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
					repository: "spirit-svelte-app"
					tag:        "latest"
					pullPolicy: "IfNotPresent"
				}
				service: port: 80
				routing: {
					enabled:          true
					hostname:         "spirit.localhost"
					path:             "/"
					gatewayName:      "infra-gateway"
					gatewayNamespace: "spirit-in-physics"
				}
				env: [
					{name: "PUBLIC_SUPABASE_URL", value: "https://pxsuqemlayhnmcxuiigk.supabase.co"},
					{name: "PUBLIC_SUPABASE_ANON_KEY", value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4c3VxZW1sYXlobm1jeHVpaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1MTY5NzIsImV4cCI6MjA2NjA5Mjk3Mn0.CoFBY4BZLhiiSFZL-PpRyZDJFoNNnMoXg4BtwT76NWs"},
					{name: "PUBLIC_CLERK_PUBLISHABLE_KEY", value: "pk_test_cmVsYXhlZC13aWxkY2F0LTk3LmNsZXJrLmFjY291bnRzLmRldiQ"},
					{name: "PUBLIC_API_URL", value: "http://api.localhost"},
				]
			}
		}
	}
}
