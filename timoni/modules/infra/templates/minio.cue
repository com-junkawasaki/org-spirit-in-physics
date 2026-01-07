package templates

import (
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/resource"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

#MinIOService: {
	#config: #Config
	apiVersion: "v1"
	kind:       "Service"
	metadata: {
		labels:      #config.metadata.labels
		annotations: #config.metadata.annotations
		namespace:   #config.metadata.namespace
		name:        "\(#config.metadata.name)-minio"
	}
	spec: {
		ports: [{
			port:       #config.minio.port
			targetPort: #config.minio.port
			protocol:   "TCP"
			name:       "api"
		}, {
			port:       #config.minio.consolePort
			targetPort: #config.minio.consolePort
			protocol:   "TCP"
			name:       "console"
		}]
		selector: #config.selector.labels & {
			app: "minio"
		}
	}
}

#MinIOStatefulSet: {
	#config: #Config
	apiVersion: "apps/v1"
	kind:       "StatefulSet"
	metadata: {
		labels:      #config.metadata.labels
		annotations: #config.metadata.annotations
		namespace:   #config.metadata.namespace
		name:        "\(#config.metadata.name)-minio"
	}
	spec: appsv1.#StatefulSetSpec & {
		serviceName: "\(#config.metadata.name)-minio"
		replicas:    1
		selector: metav1.#LabelSelector & {
			matchLabels: #config.selector.labels & {
				app: "minio"
			}
		}
		template: {
			metadata: {
				labels: #config.selector.labels & {
					app: "minio"
				}
			}
			spec: corev1.#PodSpec & {
				containers: [{
					name:  "minio"
					image: #config.minio.image.reference
					args: ["server", "/data", "--console-address", ":\(#config.minio.consolePort)"]
					ports: [{
						containerPort: #config.minio.port
						name:          "api"
					}, {
						containerPort: #config.minio.consolePort
						name:          "console"
					}]
					env: [{
						name:  "MINIO_ROOT_USER"
						value: #config.minio.rootUser
					}, {
						name:  "MINIO_ROOT_PASSWORD"
						value: #config.minio.rootPassword
					}]
					resources: #config.minio.resources
					volumeMounts: [{
						name:      "data"
						mountPath: "/data"
					}]
				}]
			}
		}
		volumeClaimTemplates: [{
			metadata: name: "data"
			spec: corev1.#PersistentVolumeClaimSpec & {
				accessModes: ["ReadWriteOnce"]
				storageClassName: #config.minio.storageClass
				resources: requests: storage: resource.#Quantity & #config.minio.storage
			}
		}]
	}
}

