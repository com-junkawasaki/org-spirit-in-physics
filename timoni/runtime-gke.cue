runtime: {
	name: "gke-autopilot"
	cluster: "*"
}

bundle: {
	instances: {
		infra: {
			values: {
				gateway: {
					hostname: "spirit-in-physics.com"
					issuerName: "letsencrypt-prod"
					staticIP: "34.160.140.248"
				}
				minio: {
					enabled: false
				}
				temporal: {
					enabled: true
				}
			}
		}

		"grpc-service": {
			values: {
				image: {
					repository: "asia-northeast1-docker.pkg.dev/com-junkawasaki-sip/spirit-in-physics/grpc-service"
					tag:        "latest"
					pullPolicy: "Always"
				}
				volumes: []
				volumeMounts: []
			}
		}

		"import-service": {
			values: {
				image: {
					repository: "asia-northeast1-docker.pkg.dev/com-junkawasaki-sip/spirit-in-physics/import-service"
					tag:        "latest"
					pullPolicy: "Always"
				}
				volumes: []
				volumeMounts: []
			}
		}

		"import-worker": {
			values: {
				image: {
					repository: "asia-northeast1-docker.pkg.dev/com-junkawasaki-sip/spirit-in-physics/import-service"
					tag:        "latest"
					pullPolicy: "Always"
				}
				volumes: []
				volumeMounts: []
			}
		}

		"portal": {
			values: {
				image: {
					repository: "asia-northeast1-docker.pkg.dev/com-junkawasaki-sip/spirit-in-physics/svelte-app"
					tag:        "latest"
					pullPolicy: "Always"
				}
				resources: {
					requests: {
						cpu: "100m"
						memory: "256Mi"
					}
					limits: {
						cpu: "500m"
						memory: "512Mi"
					}
				}
			}
		}
	}
}

