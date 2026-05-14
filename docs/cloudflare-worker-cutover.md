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
- [ADR: Cloudflare Workers, D1, LangGraph Pregel](/Users/junkawasaki/github/spirit-in-physics/docs/adr-2026-05-14-cloudflare-worker-d1-langgraph-pregel.md)
- [Kubernetes Archive](/Users/junkawasaki/github/spirit-in-physics/archive/kubernetes)
- [Legacy Runtime Archive](/Users/junkawasaki/github/spirit-in-physics/archive/legacy-runtime)
- [Legacy Runtime Archive Notes](/Users/junkawasaki/github/spirit-in-physics/docs/legacy-runtime-archive.md)
