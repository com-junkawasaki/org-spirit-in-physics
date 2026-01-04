package templates

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

#TimescaleDBService: {
	#config: #Config
	apiVersion: "v1"
	kind:       "Service"
	metadata: {
		labels:      #config.metadata.labels
		annotations: #config.metadata.annotations
		namespace:   #config.metadata.namespace
		name:        "\(#config.metadata.name)-timescaledb"
	}
	spec: {
		ports: [{
			port:       #config.timescaledb.port
			targetPort: #config.timescaledb.port
			protocol:   "TCP"
			name:       "postgres"
		}]
		selector: #config.selector.labels & {
			app: "timescaledb"
		}
	}
}

#TimescaleDBStatefulSet: {
	#config: #Config
	apiVersion: "apps/v1"
	kind:       "StatefulSet"
	metadata: {
		labels:      #config.metadata.labels
		annotations: #config.metadata.annotations
		namespace:   #config.metadata.namespace
		name:        "\(#config.metadata.name)-timescaledb"
	}
	spec: appsv1.#StatefulSetSpec & {
		serviceName: "\(#config.metadata.name)-timescaledb"
		replicas:    1
		selector: metav1.#LabelSelector & {
			matchLabels: #config.selector.labels & {
				app: "timescaledb"
			}
		}
		template: {
			metadata: {
				labels: #config.selector.labels & {
					app: "timescaledb"
				}
			}
			spec: corev1.#PodSpec & {
				securityContext: {
					fsGroup: 70
				}
				initContainers: [{
					name:  "fix-permissions"
					image: "busybox"
					command: ["sh", "-c", "chown -R 70:70 /var/lib/postgresql/data"]
					volumeMounts: [{
						name:      "data"
						mountPath: "/var/lib/postgresql/data"
					}]
				}]
				containers: [{
					name:  "timescaledb"
					image: #config.timescaledb.image.reference
					args: ["-c", "max_connections=200"]
					ports: [{
						containerPort: #config.timescaledb.port
						name:          "postgres"
					}]
					env: [{
						name:  "POSTGRES_USER"
						value: #config.timescaledb.user
					}, {
						name:  "POSTGRES_PASSWORD"
						value: #config.timescaledb.password
					}, {
						name:  "POSTGRES_DB"
						value: #config.timescaledb.database
					}, {
						name:  "PGDATA"
						value: "/var/lib/postgresql/data/pgdata"
					}]
					resources: #config.timescaledb.resources
					volumeMounts: [{
						name:      "data"
						mountPath: "/var/lib/postgresql/data"
					}]
				}]
			}
		}
		volumeClaimTemplates: [{
			metadata: name: "data"
			spec: corev1.#PersistentVolumeClaimSpec & {
				accessModes: ["ReadWriteOnce"]
				resources: requests: storage: resource.#Quantity & #config.timescaledb.storage
			}
		}]
	}
}

