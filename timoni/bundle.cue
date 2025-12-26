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
				gateway: hostname: "spirit-in-physics.gftd.ai"
			}
		}

		"grpc-service": {
			module: {
				url: "file://./modules/app"
			}
			namespace: "spirit-in-physics"
			values: {
				image: repository: "spirit-grpc-service"
				service: port: 8080
				env: [
					{name: "DATABASE_URL", value: "postgresql://postgres:postgres@infra-timescaledb:5432/spirit_in_physics"},
					{name: "TEMPORAL_ADDRESS", value: "infra-temporal:7233"},
				]
			}
		}

		"import-service": {
			module: {
				url: "file://./modules/app"
			}
			namespace: "spirit-in-physics"
			values: {
				image: repository: "spirit-import-service"
				service: port: 8082
				env: [
					{name: "DATABASE_URL", value: "postgresql://postgres:postgres@infra-timescaledb:5432/spirit_in_physics"},
				]
			}
		}

		"participant": {
			module: {
				url: "file://./modules/app"
			}
			namespace: "spirit-in-physics"
			values: {
				image: repository: "spirit-participant"
				service: port: 25250
				routing: {
					enabled:          true
					hostname:         "participant.spirit-in-physics.gftd.ai"
					gatewayName:      "infra-gateway"
					gatewayNamespace: "spirit-in-physics"
				}
				env: [
					{name: "GRAPHQL_API_URL", value: "http://grpc-service:8080/graphql"},
				]
			}
		}

		"researcher": {
			module: {
				url: "file://./modules/app"
			}
			namespace: "spirit-in-physics"
			values: {
				image: repository: "spirit-researcher"
				service: port: 3000
				routing: {
					enabled:          true
					hostname:         "researcher.spirit-in-physics.gftd.ai"
					gatewayName:      "infra-gateway"
					gatewayNamespace: "spirit-in-physics"
				}
				env: [
					{name: "GRAPHQL_API_URL", value: "http://grpc-service:8080/graphql"},
				]
			}
		}

		"paper": {
			module: {
				url: "file://./modules/app"
			}
			namespace: "spirit-in-physics"
			values: {
				image: repository: "spirit-paper"
				service: port: 4321
				routing: {
					enabled:          true
					hostname:         "paper.spirit-in-physics.gftd.ai"
					gatewayName:      "infra-gateway"
					gatewayNamespace: "spirit-in-physics"
				}
				env: [
					{name: "GRAPHQL_API_URL", value: "http://grpc-service:8080/graphql"},
				]
			}
		}

		"demo": {
			module: {
				url: "file://./modules/app"
			}
			namespace: "spirit-in-physics"
			values: {
				image: repository: "spirit-demo"
				service: port: 4322
				routing: {
					enabled:          true
					hostname:         "demo.spirit-in-physics.gftd.ai"
					gatewayName:      "infra-gateway"
					gatewayNamespace: "spirit-in-physics"
				}
			}
		}
	}
}

