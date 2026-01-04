package templates

import (
	timoniv1 "timoni.sh/core/v1alpha1"
)

#ConfigMap: timoniv1.#ImmutableConfig & {
	#config: #Config
	#Kind:   timoniv1.#ConfigMapKind
	#Meta:   #config.metadata
	#Data: {
		"envoy.yaml": """
			static_resources:
			  listeners:
			  - name: listener_0
			    address:
			      socket_address:
			        address: 0.0.0.0
			        port_value: 80
			    filter_chains:
			    - filters:
			      - name: envoy.filters.network.http_connection_manager
			        typed_config:
			          "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
			          stat_prefix: ingress_http
			          route_config:
			            name: local_route
			            virtual_hosts:
			            - name: local_service
			              domains: ["*"]
			              routes:
			              - match:
			                  prefix: "/"
			                route:
			                  cluster: local_service
			          http_filters:
			          - name: envoy.filters.http.router
			            typed_config:
			              "@type": type.googleapis.com/envoy.extensions.filters.http.router.v3.Router

			  clusters:
			  - name: local_service
			    connect_timeout: 0.25s
			    type: STATIC
			    lb_policy: ROUND_ROBIN
			    load_assignment:
			      cluster_name: local_service
			      endpoints:
			      - lb_endpoints:
			        - endpoint:
			            address:
			              socket_address:
			                address: 127.0.0.1
			                port_value: 8080
			"""
		"index.html": """
			<!doctype html>
			<html lang="en">
			<head>
			 	<meta charset="utf-8">
			 	<meta http-equiv="refresh" content="10" />
				<title>\(#config.metadata.name)</title>
				<style>
				html { color-scheme: light dark; }
				body { width: 35em; margin: 0 auto;
				font-family: Tahoma, Verdana, Arial, sans-serif; }
				</style>
			</head>
			<body>
				<h1> \(#config.message) from \(#config.metadata.name)!</h1>
				<p>If you see this page, the <b>\(#config.metadata.name)</b> instance is successfully deployed in the <b>\(#config.metadata.namespace)</b> namespace by Timoni.</p>
			</body>
			</html>
			"""
	}
}
