package templates

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	gatewayv1 "gateway.networking.k8s.io/v1"
)

#NixCacheService: corev1.#Service & {
	#config: #Config
	apiVersion: "v1"
	kind:       "Service"
	metadata: {
		name:      "\(#config.metadata.name)-nix-cache"
		namespace: #config.metadata.namespace
		labels:    #config.metadata.labels
	}
	spec: corev1.#ServiceSpec & {
		type: corev1.#ServiceTypeClusterIP
		selector: #config.selector.labels & {
			app: "nix-cache"
		}
		ports: [
			{
				name:       "http"
				port:       #config.nix_cache.port
				targetPort: "http"
				protocol:   "TCP"
			},
		]
	}
}

#NixCacheStatefulSet: appsv1.#StatefulSet & {
	#config: #Config
	apiVersion: "apps/v1"
	kind:       "StatefulSet"
	metadata: {
		name:      "\(#config.metadata.name)-nix-cache"
		namespace: #config.metadata.namespace
		labels:    #config.metadata.labels
	}
	spec: appsv1.#StatefulSetSpec & {
		replicas: 1
		serviceName: "\(#config.metadata.name)-nix-cache"
		selector: metav1.#LabelSelector & {
			matchLabels: #config.selector.labels & {
				app: "nix-cache"
			}
		}
		template: {
			metadata: {
				labels: #config.selector.labels & {
					app: "nix-cache"
				}
			}
			spec: corev1.#PodSpec & {
				containers: [
					{
						name:  "harmonia"
						image: #config.nix_cache.image.reference
						ports: [
							{
								name:          "http"
								containerPort: #config.nix_cache.port
							},
						]
						env: [
							{
								name: "PORT"
								value: "\(#config.nix_cache.port)"
							}
						]
						volumeMounts: [
							{
								name:      "nix-store"
								mountPath: "/nix"
							},
						]
					},
				]
			}
		}
		volumeClaimTemplates: [
			{
				metadata: name: "nix-store"
				spec: {
					accessModes: ["ReadWriteOnce"]
					resources: requests: storage: #config.nix_cache.storage
				}
			},
		]
	}
}

#NixCacheRoute: gatewayv1.#HTTPRoute & {
	#config: #Config
	apiVersion: "gateway.networking.k8s.io/v1"
	kind:       "HTTPRoute"
	metadata: {
		name:      "\(#config.metadata.name)-nix-cache-route"
		namespace: #config.metadata.namespace
		labels:    #config.metadata.labels
	}
	spec: gatewayv1.#HTTPRouteSpec & {
		parentRefs: [
			{
				name:      "infra-gateway"
				namespace: #config.metadata.namespace
			},
		]
		hostnames: [#config.gateway.hostname]
		rules: [
			{
				matches: [
					{
						path: {
							type:  "PathPrefix"
							value: "/nix-cache"
						}
					},
				]
				filters: [
					{
						type: "URLRewrite"
						urlRewrite: {
							path: {
								type:               "ReplacePrefixMatch"
								replacePrefixMatch: "/"
							}
						}
					},
				]
				backendRefs: [
					{
						name: "\(#config.metadata.name)-nix-cache"
						port: #config.nix_cache.port
					},
				]
			},
		]
	}
}

