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
	}
}
