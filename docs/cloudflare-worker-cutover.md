# Cloudflare Worker Cutover

This repository is now targeting a Cloudflare-native runtime.

Primary design:

- frontend: Cloudflare Pages
- API: Cloudflare Workers
- relational data: D1
- blob storage: R2
- ordered session writes: Durable Objects
- async ingestion: Queues + Workflows

See:

- [Cloudflare Native Architecture](/Users/junkawasaki/github/spirit-in-physics/docs/cloudflare-native-architecture.md)
- [Kubernetes Archive](/Users/junkawasaki/github/spirit-in-physics/archive/kubernetes)
