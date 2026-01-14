package templates

// HTTP to HTTPS redirect route
#HTTPSRedirect: {
	#config: #Config
	apiVersion: "gateway.networking.k8s.io/v1"
	kind:       "HTTPRoute"
	metadata: {
		labels:      #config.metadata.labels
		namespace:   #config.metadata.namespace
		name:        "\(#config.metadata.name)-https-redirect"
	}
	spec: {
		if (#config.gateway.hostname & string) != _|_ {
			hostnames: [#config.gateway.hostname]
		}
		if (#config.gateway.hostname & [...string]) != _|_ {
			hostnames: #config.gateway.hostname
		}
		parentRefs: [{
			name:      "\(#config.metadata.name)-gateway"
			namespace: #config.metadata.namespace
			sectionName: "http-0"
		}]
		rules: [{
			matches: [{
				path: {
					type:  "PathPrefix"
					value: "/"
				}
			}]
			filters: [{
				type: "RequestRedirect"
				requestRedirect: {
					scheme:     "https"
					statusCode: 301
				}
			}]
		}]
	}
}

#MainRoute: {
	#config: #Config
	apiVersion: "gateway.networking.k8s.io/v1"
	kind:       "HTTPRoute"
	metadata: {
		labels:      #config.metadata.labels
		namespace:   #config.metadata.namespace
		name:        "\(#config.metadata.name)-main-route"
	}
	spec: {
		if (#config.gateway.hostname & string) != _|_ {
			hostnames: [#config.gateway.hostname]
		}
		if (#config.gateway.hostname & [...string]) != _|_ {
			hostnames: #config.gateway.hostname
		}
		parentRefs: [{
			name:      "\(#config.metadata.name)-gateway"
			namespace: #config.metadata.namespace
			sectionName: "https-0"
		}]
		rules: [
			{
				matches: [{
					path: {
						type:  "PathPrefix"
						value: "/api"
					}
				}]
				backendRefs: [{
					name: "grpc-service"
					port: 8080
				}]
			},
			{
				matches: [{
					path: {
						type:  "PathPrefix"
						value: "/import"
					}
				}]
				backendRefs: [{
					name: "import-service"
					port: 8082
				}]
			},
			{
				matches: [{
					path: {
						type:  "PathPrefix"
						value: "/temporal"
					}
				}]
				backendRefs: [{
					name: "\(#config.metadata.name)-temporal"
					port: #config.temporal.uiPort
				}]
			},
			{
				matches: [{
					path: {
						type:  "PathPrefix"
						value: "/minio-console"
					}
				}]
				backendRefs: [{
					name: "\(#config.metadata.name)-minio"
					port: #config.minio.consolePort
				}]
			},
			{
				matches: [{
					path: {
						type:  "PathPrefix"
						value: "/minio"
					}
				}]
				backendRefs: [{
					name: "\(#config.metadata.name)-minio"
					port: #config.minio.port
				}]
			},
			{
				matches: [{
					path: {
						type:  "PathPrefix"
						value: "/"
					}
				}]
				backendRefs: [{
					name: "portal"
					port: 80
				}]
			},
		]
	}
}
