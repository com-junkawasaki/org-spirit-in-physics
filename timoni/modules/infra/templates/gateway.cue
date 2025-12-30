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
		_hlist: {
			if (#config.gateway.hostname & string) != _|_ {
				res: [#config.gateway.hostname]
			}
			if (#config.gateway.hostname & [...string]) != _|_ {
				res: #config.gateway.hostname
			}
		}
		_types: ["http", "https"]
		listeners: [
			for t in _types
			for i, h in _hlist.res {
				{
					name:     "\(t)-\(i)"
					hostname: h
					if t == "http" {
						port:     80
						protocol: "HTTP"
					}
					if t == "https" {
						port:     443
						protocol: "HTTPS"
						tls: {
							mode: "Terminate"
							certificateRefs: [{
								name: "sip-tls-cert"
							}]
						}
					}
					allowedRoutes: namespaces: from: "Same"
				}
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
		if (#config.gateway.hostname & string) != _|_ {
			commonName: #config.gateway.hostname
			dnsNames: [
				#config.gateway.hostname,
			]
		}
		if (#config.gateway.hostname & [...string]) != _|_ {
			// Pick a short enough name for commonName (max 64 chars)
			commonName: [ for h in #config.gateway.hostname if len(h) < 64 { h }][0]
			dnsNames:   #config.gateway.hostname
		}
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

