package templates

#HTTPRoute: {
	#config: #Config
	apiVersion: "gateway.networking.k8s.io/v1"
	kind:       "HTTPRoute"
	metadata:   #config.metadata & {
		name: "\(#config.metadata.name)-route"
	}
	spec: {
		parentRefs: [{
			name:      #config.routing.gatewayName
			namespace: #config.routing.gatewayNamespace
		}]
		hostnames: [#config.routing.hostname]
		rules: [{
			matches: [{
				path: {
					type:  "PathPrefix"
					value: #config.routing.path
				}
			}]
			backendRefs: [{
				name: #config.metadata.name
				port: #config.service.port
			}]
		}]
	}
}

