package templates

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

#TemporalService: {
	#config: #Config
	apiVersion: "v1"
	kind:       "Service"
	metadata: {
		labels:      #config.metadata.labels
		annotations: #config.metadata.annotations
		namespace:   #config.metadata.namespace
		name:        "\(#config.metadata.name)-temporal"
	}
	spec: {
		ports: [{
			port:       #config.temporal.port
			targetPort: #config.temporal.port
			protocol:   "TCP"
			name:       "grpc"
		}, {
			port:       #config.temporal.uiPort
			targetPort: #config.temporal.uiPort
			protocol:   "TCP"
			name:       "ui"
		}]
		selector: #config.selector.labels & {
			app: "temporal"
		}
	}
}

#TemporalDeployment: {
	#config: #Config
	apiVersion: "apps/v1"
	kind:       "Deployment"
	metadata: {
		labels:      #config.metadata.labels
		annotations: #config.metadata.annotations
		namespace:   #config.metadata.namespace
		name:        "\(#config.metadata.name)-temporal"
	}
	spec: appsv1.#DeploymentSpec & {
		replicas: 1
		selector: metav1.#LabelSelector & {
			matchLabels: #config.selector.labels & {
				app: "temporal"
			}
		}
		template: {
			metadata: {
				labels: #config.selector.labels & {
					app: "temporal"
				}
			}
			spec: corev1.#PodSpec & {
				containers: [{
					name:  "temporal"
					image: #config.temporal.image.reference
					ports: [{
						containerPort: #config.temporal.port
						name:          "grpc"
					}, {
						containerPort: #config.temporal.uiPort
						name:          "ui"
					}]
					env: [{
						name:  "DB"
						value: "postgres12"
					}, {
						name:  "DB_PORT"
						value: "\(#config.timescaledb.port)"
					}, {
						name:  "POSTGRES_USER"
						value: #config.timescaledb.user
					}, {
						name:  "POSTGRES_PWD"
						value: #config.timescaledb.password
					}, {
						name:  "POSTGRES_SEEDS"
						value: "\(#config.metadata.name)-timescaledb"
					}, {
						name:  "SKIP_DB_CREATE"
						value: "false"
					}, {
						name:  "BIND_ON_IP"
						value: "0.0.0.0"
					}]
					resources: #config.temporal.resources
				}]
			}
		}
	}
}

