package templates

#Gateway: {
	#config: #Config
	apiVersion: "gateway.networking.k8s.io/v1"
	kind:       "Gateway"
	metadata: {
		labels:      #config.metadata.labels
		namespace:   #config.metadata.namespace
		name:        "\(#config.metadata.name)-gateway"
		annotations: #config.metadata.annotations & {
			"cert-manager.io/cluster-issuer": #config.gateway.issuerName
		}
	}
	spec: {
		gatewayClassName: "envoy"
		listeners: [
			{
				name:     "http"
				port:     80
				protocol: "HTTP"
				hostname: #config.gateway.hostname
				allowedRoutes: namespaces: from: "Same"
			},
			{
				name:     "https"
				port:     443
				protocol: "HTTPS"
				hostname: #config.gateway.hostname
				tls: {
					mode: "Terminate"
					certificateRefs: [{
						name: "sip-tls-cert"
					}]
				}
				allowedRoutes: namespaces: from: "Same"
			},
		]
	}
}

#Certificate: {
	#config: #Config
	apiVersion: "cert-manager.io/v1"
	kind:       "Certificate"
	metadata: {
		namespace: #config.metadata.namespace
		name:      "sip-tls-cert"
	}
	spec: {
		secretName: "sip-tls-cert"
		issuerRef: {
			name: #config.gateway.issuerName
			kind: "ClusterIssuer"
		}
		commonName: #config.gateway.hostname
		dnsNames: [
			#config.gateway.hostname,
		]
	}
}

#ClusterIssuer: {
	#config: #Config
	apiVersion: "cert-manager.io/v1"
	kind:       "ClusterIssuer"
	metadata: {
		name: #config.gateway.issuerName
	}
	spec: acme: {
		server: "https://acme-v02.api.letsencrypt.org/directory"
		email:  "junkawasaki@gmail.com" // Use a real email for Let's Encrypt
		privateKeySecretRef: name: #config.gateway.issuerName
		solvers: [{
			http01: gatewayHTTPRoute: parentRefs: [{
				name: "\(#config.metadata.name)-gateway"
				namespace: #config.metadata.namespace
			}]
		}]
	}
}

