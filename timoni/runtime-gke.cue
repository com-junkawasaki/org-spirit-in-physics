runtime: {
	name: "gke-autopilot"
	cluster: "*"
}

bundle: {
	instances: {
		infra: {
			values: {
				gateway: {
					hostname: "sip.junkawasaki.com"
					issuerName: "letsencrypt-prod"
					// In Autopilot, we can omit staticIP to use ephemeral or manage separately
					// staticIP: "34.160.140.248"
				}
				minio: {
					enabled: false
				}
				lakefs: {
					enabled: true
					serviceAccount: {
						annotations: {
							"iam.gke.io/gcp-service-account": "gene-annex-sa@com-junkawasaki-sip.iam.gserviceaccount.com"
						}
					}
					blockstore: {
						type: "gs"
					}
					setup: {
						repository:       "spirit-in-physics"
						storageNamespace: "gs://com-junkawasaki-sip-dataset"
					}
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

