package templates

#MinIORoute: {
	#config: #Config
	apiVersion: "gateway.networking.k8s.io/v1"
	kind:       "HTTPRoute"
	metadata: {
		labels:      #config.metadata.labels
		namespace:   #config.metadata.namespace
		name:        "\(#config.metadata.name)-minio-route"
	}
	spec: {
		parentRefs: [{
			name:      "\(#config.metadata.name)-gateway"
			namespace: #config.metadata.namespace
		}]
		hostnames: ["spirit.localhost"]
		rules: [{
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
		}]
	}
}

#MinIOConsoleRoute: {
	#config: #Config
	apiVersion: "gateway.networking.k8s.io/v1"
	kind:       "HTTPRoute"
	metadata: {
		labels:      #config.metadata.labels
		namespace:   #config.metadata.namespace
		name:        "\(#config.metadata.name)-minio-console-route"
	}
	spec: {
		parentRefs: [{
			name:      "\(#config.metadata.name)-gateway"
			namespace: #config.metadata.namespace
		}]
		hostnames: ["spirit.localhost"]
		rules: [{
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
		}]
	}
}

#TemporalUIRoute: {
	#config: #Config
	apiVersion: "gateway.networking.k8s.io/v1"
	kind:       "HTTPRoute"
	metadata: {
		labels:      #config.metadata.labels
		namespace:   #config.metadata.namespace
		name:        "\(#config.metadata.name)-temporal-ui-route"
	}
	spec: {
		parentRefs: [{
			name:      "\(#config.metadata.name)-gateway"
			namespace: #config.metadata.namespace
		}]
		hostnames: ["spirit.localhost"]
		rules: [{
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
		}]
	}
}

