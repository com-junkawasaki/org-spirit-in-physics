runtime: {
	name: "orbstack"
	cluster: "orbstack"
}

bundle: {
	instances: {
		infra: {
			values: {
				gateway: {
					hostname: [
						"localhost",
						"envoy-spirit-in-physics-infra-gateway-2d53dc11.envoy-gateway-system.orb.local",
						"spirit-in-physics.orb.local",
						"spirit.localhost",
						"sip.junkawasaki.com",
					]
					issuerName: "letsencrypt-staging"
				}
			}
		}
		"grpc-service": {
			values: {
				volumeMounts: [
					{name: "dataset", mountPath: "/dataset"},
				]
				volumes: [
					{
						name: "dataset"
						hostPath: {
							path: "/Volumes/251214/jun784/spirit-in-physics/dataset/participants"
							type: "Directory"
						}
					},
				]
			}
		}
		"import-service": {
			values: {
				volumeMounts: [
					{name: "dataset", mountPath: "/dataset"},
				]
				volumes: [
					{
						name: "dataset"
						hostPath: {
							path: "/Volumes/251214/jun784/spirit-in-physics/dataset/participants"
							type: "Directory"
						}
					},
				]
			}
		}
		"import-worker": {
			values: {
				volumeMounts: [
					{name: "dataset", mountPath: "/dataset"},
				]
				volumes: [
					{
						name: "dataset"
						hostPath: {
							path: "/Volumes/251214/jun784/spirit-in-physics/dataset/participants"
							type: "Directory"
						}
					},
				]
			}
		}
		"participant": {
			values: {
				routing: {
					hostname: "participant.spirit-in-physics.orb.local"
				}
			}
		}
		"researcher": {
			values: {
				routing: {
					hostname: "researcher.spirit-in-physics.orb.local"
				}
			}
		}
		"paper": {
			values: {
				routing: {
					hostname: "paper.spirit-in-physics.orb.local"
				}
			}
		}
		"demo": {
			values: {
				routing: {
					hostname: "demo.spirit-in-physics.orb.local"
				}
			}
		}
		"portal": {
			module: {
				url: "file://./modules/app"
			}
			namespace: "spirit-in-physics"
			values: {
				image: {
					pullPolicy: "IfNotPresent"
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
				env: [
					{name: "PUBLIC_CLERK_PUBLISHABLE_KEY", value: "pk_test_cmVsYXhlZC13aWxkY2F0LTk3LmNsZXJrLmFjY291bnRzLmRldiQ"},
					{name: "CLERK_SECRET_KEY", value: "sk_test_dummy"},
					{name: "PUBLIC_API_URL", value: "http://spirit.localhost/api"},
				]
			}
		}
	}
}
