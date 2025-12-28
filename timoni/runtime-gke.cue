runtime: {
	name: "gke"
	cluster: "*"
}

bundle: {
	instances: {
		infra: {
			values: {
				gateway: {
					hostname: "sip.junkawasaki.com"
					issuerName: "letsencrypt-prod"
				}
				lakefs: {
					enabled: true
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
			}
		}
	}
}

