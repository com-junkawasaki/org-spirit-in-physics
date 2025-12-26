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
				gateway: hostname: "127.0.0.1.nip.io"
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
					hostname:         "api.127.0.0.1.nip.io"
					gatewayName:      "infra-gateway"
					gatewayNamespace: "spirit-in-physics"
				}
				env: [
					{name: "DATABASE_URL", value: "postgresql://postgres:postgres@infra-timescaledb:5432/spirit_in_physics"},
					{name: "TEMPORAL_ADDRESS", value: "infra-temporal:7233"},
				]
			}
		}

		"participant": {
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
					hostname:         "participant.127.0.0.1.nip.io"
					gatewayName:      "infra-gateway"
					gatewayNamespace: "spirit-in-physics"
				}
				env: [
					{name: "VITE_SUPABASE_URL", value: "https://pxsuqemlayhnmcxuiigk.supabase.co"},
					{name: "VITE_SUPABASE_ANON_KEY", value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4c3VxZW1sYXlobm1jeHVpaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1MTY5NzIsImV4cCI6MjA2NjA5Mjk3Mn0.CoFBY4BZLhiiSFZL-PpRyZDJFoNNnMoXg4BtwT76NWs"},
					{name: "VITE_CLERK_PUBLISHABLE_KEY", value: "pk_test_cmVsYXhlZC13aWxkY2F0LTk3LmNsZXJrLmFjY291bnRzLmRldiQ"},
					{name: "VITE_API_URL", value: "http://api.127.0.0.1.nip.io"},
				]
			}
		}

		"researcher": {
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
					hostname:         "researcher.127.0.0.1.nip.io"
					gatewayName:      "infra-gateway"
					gatewayNamespace: "spirit-in-physics"
				}
				env: [
					{name: "VITE_SUPABASE_URL", value: "https://pxsuqemlayhnmcxuiigk.supabase.co"},
					{name: "VITE_SUPABASE_ANON_KEY", value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4c3VxZW1sYXlobm1jeHVpaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1MTY5NzIsImV4cCI6MjA2NjA5Mjk3Mn0.CoFBY4BZLhiiSFZL-PpRyZDJFoNNnMoXg4BtwT76NWs"},
					{name: "VITE_CLERK_PUBLISHABLE_KEY", value: "pk_test_cmVsYXhlZC13aWxkY2F0LTk3LmNsZXJrLmFjY291bnRzLmRldiQ"},
					{name: "VITE_API_URL", value: "http://api.127.0.0.1.nip.io"},
				]
			}
		}

		"paper": {
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
					hostname:         "paper.127.0.0.1.nip.io"
					gatewayName:      "infra-gateway"
					gatewayNamespace: "spirit-in-physics"
				}
				env: [
					{name: "VITE_SUPABASE_URL", value: "https://pxsuqemlayhnmcxuiigk.supabase.co"},
					{name: "VITE_SUPABASE_ANON_KEY", value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4c3VxZW1sYXlobm1jeHVpaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1MTY5NzIsImV4cCI6MjA2NjA5Mjk3Mn0.CoFBY4BZLhiiSFZL-PpRyZDJFoNNnMoXg4BtwT76NWs"},
					{name: "VITE_CLERK_PUBLISHABLE_KEY", value: "pk_test_cmVsYXhlZC13aWxkY2F0LTk3LmNsZXJrLmFjY291bnRzLmRldiQ"},
					{name: "VITE_API_URL", value: "http://api.127.0.0.1.nip.io"},
				]
			}
		}

		"demo": {
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
					hostname:         "demo.127.0.0.1.nip.io"
					gatewayName:      "infra-gateway"
					gatewayNamespace: "spirit-in-physics"
				}
				env: [
					{name: "VITE_SUPABASE_URL", value: "https://pxsuqemlayhnmcxuiigk.supabase.co"},
					{name: "VITE_SUPABASE_ANON_KEY", value: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB4c3VxZW1sYXlobm1jeHVpaWdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1MTY5NzIsImV4cCI6MjA2NjA5Mjk3Mn0.CoFBY4BZLhiiSFZL-PpRyZDJFoNNnMoXg4BtwT76NWs"},
					{name: "VITE_CLERK_PUBLISHABLE_KEY", value: "pk_test_cmVsYXhlZC13aWxkY2F0LTk3LmNsZXJrLmFjY291bnRzLmRldiQ"},
					{name: "VITE_API_URL", value: "http://api.127.0.0.1.nip.io"},
				]
			}
		}
	}
}

