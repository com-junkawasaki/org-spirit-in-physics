package templates

import (
	corev1 "k8s.io/api/core/v1"
	timoniv1 "timoni.sh/core/v1alpha1"
)

// Config defines the schema and defaults for the Instance values.
#Config: {
	kubeVersion!: string
	clusterVersion: timoniv1.#SemVer & {#Version: kubeVersion, #Minimum: "1.20.0"}
	moduleVersion!: string
	metadata: timoniv1.#Metadata & {#Version: moduleVersion}
	metadata: labels: timoniv1.#Labels
	metadata: annotations: *{} | timoniv1.#Annotations
	selector: timoniv1.#Selector & {#Name: metadata.name}

	// TimescaleDB settings
	timescaledb: {
		enabled: *true | bool
		image: {
			repository: *"timescale/timescaledb" | string
			tag:        *"latest-pg15" | string
			digest:     *"" | string
			reference:  "\(repository):\(tag)"
		}
		user:     *"postgres" | string
		password: *"postgres" | string // In production, use secrets
		database: *"spirit_in_physics" | string
		storage:  *"10Gi" | string
		port:     *5432 | int & >0 & <=65535
		resources: timoniv1.#ResourceRequirements & {
			requests: {
				cpu:    *"100m" | timoniv1.#CPUQuantity
				memory: *"256Mi" | timoniv1.#MemoryQuantity
			}
		}
	}

	// Temporal settings
	temporal: {
		enabled: *true | bool
		image: {
			repository: *"temporalio/auto-setup" | string
			tag:        *"latest" | string
			digest:     *"" | string
			reference:  "\(repository):\(tag)"
		}
		port: *7233 | int
		uiPort: *8088 | int
	}

	// MinIO settings
	minio: {
		enabled: *true | bool
		image: {
			repository: *"minio/minio" | string
			tag:        *"latest" | string
			digest:     *"" | string
			reference:  "\(repository):\(tag)"
		}
		rootUser:     *"minioadmin" | string
		rootPassword: *"minioadmin" | string
		port:         *9000 | int
		consolePort:  *9001 | int
		storage:      *"10Gi" | string
	}

	// Gateway settings
	gateway: {
		enabled: *true | bool
		hostname: string
		issuerName: *"letsencrypt-prod" | string
	}

	imagePullSecrets?: [...timoniv1.#ObjectReference]
	tolerations?: [...corev1.#Toleration]
	affinity?: corev1.#Affinity
}

// Instance takes the config values and outputs the Kubernetes objects.
#Instance: {
	config: #Config

	objects: {
		if config.timescaledb.enabled {
			tsdb_svc: #TimescaleDBService & {#config: config}
			tsdb_sts: #TimescaleDBStatefulSet & {#config: config}
		}
		if config.temporal.enabled {
			temporal_svc: #TemporalService & {#config: config}
			temporal_deploy: #TemporalDeployment & {#config: config}
		}
		if config.minio.enabled {
			minio_svc: #MinIOService & {#config: config}
			minio_sts: #MinIOStatefulSet & {#config: config}
		}
		if config.gateway.enabled {
			gateway: #Gateway & {#config: config}
			issuer: #ClusterIssuer & {#config: config}
		}
	}
}
