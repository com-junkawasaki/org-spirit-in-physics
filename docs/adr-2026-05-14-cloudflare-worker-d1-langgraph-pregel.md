# ADR: Cloudflare Workers, D1, LangGraph Pregel による実装方針

Date: 2026-05-14

Status: Accepted

## Context

このリポジトリは、すでに Kubernetes/GKE 前提の構成から Cloudflare
native な実行基盤へ移行しつつある。現時点の主な実装は次の通り。

- `apps/api-worker`: Hono を使った TypeScript Cloudflare Worker API。
- `apps/api-worker/wrangler.jsonc`: public、`www`、researcher hostname 向け
  Worker route と D1/R2 binding。
- `apps/api-worker/migrations/0001_initial.sql`: D1 向けの初期 schema。
  participants、assessment events、sessions、artifacts を持つ。
- `apps/api-worker/src/db/client.ts`: `kysely-d1` 経由の Kysely client。
- `apps/api-worker/src/index.ts`: health、capabilities、participants、
  sessions、storage、assessment events、timeline projection の部分移植。
- `docs/cloudflare-native-architecture.md`: Cloudflare native target
  architecture。

一方で、legacy backend は `archive/legacy-runtime/performers/services/api` と
`archive/legacy-runtime/performers/services/importer` に archive した。ここには Go API、Python
importer、PostgreSQL/TimescaleDB 的な前提、container runtime、Kubernetes
deployment 資材が含まれる。今後の実装はこの形を Kubernetes 上で再構築する
のではなく、edge HTTP endpoint、serverless persistence、object storage、
明示的な graph execution として再定義する。

LangGraph Pregel は、assessment と analysis workflow の orchestration model
として採用する。Pregel は node が channel から state を読み、更新を書き戻し、
bounded step で進む message-passing graph runtime である。この repo の
domain では、participant assessment、word-response ingestion、artifact
registration、normalization、timeline projection、analysis をそれぞれ明示的
な graph node として表現できる。

## Decision

Kubernetes ではなく、Cloudflare Workers と D1 を primary runtime /
relational persistence layer として採用する。workflow orchestration には
LangGraph Pregel を使い、Worker runtime 内で実行できる単位に分割する。

target implementation は次の通り。

- Cloudflare Workers が `/api/*` の API route を処理する。
- D1 が transactional metadata と queryable metadata を保持する。
- R2 が source files、Hume payload、audio-derived output、CSV import、
  exported analysis bundle などの large artifact を保持する。
- LangGraph Pregel が assessment と analysis を resumable graph run として
  実行する。
- D1 が Pregel run metadata、checkpoint、node output、idempotency key、
  final projection を永続化する。
- 重い処理や retry 前提の graph step は、小さい Worker invocation に分割し、
  必要になった段階で Cloudflare Queues または Workflows から起動する。
- Kubernetes は archived runtime として扱い、新規実装の target にはしない。

## Implementation Mapping

### Worker API

`apps/api-worker` を main backend package として維持する。

現時点でこの decision に沿っている route は次の通り。

- `GET /api/health`
- `GET /api/capabilities`
- `GET /api/participants`
- `GET /api/participants/by-email`
- `POST /api/participants`
- `GET /api/stimulus-words`
- `GET /api/sessions`
- `POST /api/storage/upload`
- `GET /api/storage/object/*`
- `GET /api/timeline/*`
- `POST /api/assessments/*`

次の実装単位では、`src/index.ts` に inline で置かれている assessment event
handler を graph-oriented module に切り出す。

- `apps/api-worker/src/graph/assessment.ts`
- `apps/api-worker/src/graph/checkpoint.ts`
- `apps/api-worker/src/graph/nodes/*.ts`

Worker entrypoint は thin controller として残す。HTTP input の parse、payload
validation、auth、graph invocation、stable API response の返却に責務を絞る。

### D1

D1 は indexed lookup が必要な operational record の source of truth とする。

- participants
- sessions
- assessment events
- artifact index rows
- graph runs
- graph checkpoints
- graph node events
- aggregate snapshots

既存 schema は意図的に小さい。置き換えるのではなく、graph persistence 用の
table を追加する。

```sql
CREATE TABLE graph_runs (
  id TEXT PRIMARY KEY,
  graph_name TEXT NOT NULL,
  participant_id TEXT,
  session_id TEXT,
  status TEXT NOT NULL,
  input_json TEXT NOT NULL,
  output_json TEXT,
  error_json TEXT,
  created_at_ms INTEGER NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

CREATE TABLE graph_checkpoints (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  channel_values_json TEXT NOT NULL,
  pending_writes_json TEXT,
  created_at_ms INTEGER NOT NULL
);

CREATE UNIQUE INDEX graph_checkpoints_run_step_idx
  ON graph_checkpoints(run_id, step_index);

CREATE TABLE graph_node_events (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  node_name TEXT NOT NULL,
  input_json TEXT,
  output_json TEXT,
  status TEXT NOT NULL,
  created_at_ms INTEGER NOT NULL
);
```

timestamp は epoch milliseconds、ID は text として保存する。これは既存の D1
schema と揃えるためである。大きな intermediate payload は D1 に保存しない。
R2 に保存し、D1 には object key または compact snapshot のみを保存する。

### LangGraph Pregel

`@langchain/langgraph/pregel` を `apps/api-worker` に導入する。ただし、Cloudflare
Workers runtime で bundle 可能であることを CI で確認してから production path
に載せる。graph code は `fs`、`net`、process-local durable state などの Node
API に依存しない。

proposed graph nodes は次の通り。

- `receiveAssessmentEvent`: incoming event payload を normalize / validate する。
- `upsertParticipant`: participant metadata を作成または更新する。
- `upsertSession`: session を開始、更新、完了する。
- `appendAssessmentEvent`: normalized event を D1 に append する。
- `registerArtifact`: artifact index row を D1 に書き、R2 object key を紐づける。
- `projectTimeline`: assessment events から timeline points を生成する。
- `analyzeTimeline`: gap、density region、duplicate、emotion vector を計算する。
- `persistSnapshot`: researcher view 向け aggregate snapshot を保存する。

Pregel channel は小さい JSON 値だけを運ぶ。

- `input`: HTTP/API payload。
- `participant`: normalized participant context。
- `session`: normalized session context。
- `events`: event reference または小さい event record。
- `artifacts`: R2 object reference。
- `timeline`: projected timeline point reference。
- `analysis`: aggregate payload または R2 object reference。
- `errors`: structured recoverable errors。

同じ input と checkpoint に対して graph は deterministic に振る舞うべきである。
side effect は stable key を使って idempotent にする。

- event id
- participant id
- session id
- artifact object key
- graph run id
- graph step index

### R2

R2 は relational join が不要な large payload の保存先とする。

- uploaded files
- Hume artifacts
- source CSVs
- large graph intermediate outputs
- exported timeline bundles
- generated reports

`apps/api-worker/wrangler.jsonc` にはすでに `ARTIFACTS` binding がある。graph
には base64 payload ではなく R2 object key を渡す設計に寄せる。現在の
base64 upload endpoint は compatibility path として残してよいが、大きな file
では direct upload または multipart upload に置き換える。

## Consequences

positive consequences:

- backend のために Kubernetes cluster、ingress、service mesh、container
  registry、controller lifecycle を運用しなくてよい。
- API deployment は Worker deploy と D1 migration に縮小される。
- runtime dependency は in-cluster service ではなく Cloudflare binding として
  明示される。
- assessment と analysis workflow は暗黙の process behavior ではなく、
  observable graph run になる。
- D1 schema は現在の partial Worker implementation と整合したまま拡張できる。

tradeoffs:

- D1 は SQLite-compatible であり PostgreSQL-compatible ではない。Go API 側の
  SQL と data model は直接移植できない。
- Worker execution limit に合わせ、graph step は小さく resumable にする必要が
  ある。
- Pregel checkpointing は D1/R2 向けに明示的に実装する必要がある。process
  memory は durable state として扱えない。
- 重い analysis は、最初の Worker-local implementation 後に Queues または
  Workflows へ逃がす可能性がある。
- LangGraph dependency が Worker runtime で問題なく bundle / deploy できるか
  を production 採用前に検証する必要がある。

## Migration Plan

1. 既存の `apps/api-worker` route を維持する。
2. `graph_runs`、`graph_checkpoints`、`graph_node_events` の D1 migration を
   追加する。
3. `@langchain/langgraph` を `apps/api-worker` に追加し、TypeScript build と
   Worker bundle compatibility を確認する。
4. `src/index.ts` の assessment event write を graph node に切り出す。
5. `start`、`session-start`、`word-response`、`artifact`、`complete` を扱う
   assessment graph を実装する。
6. Pregel step ごとに D1 checkpoint を保存する。
7. timeline projection と analysis を graph node 配下へ移す。
8. large graph output は R2 に保存し、D1 には reference または compact snapshot
   のみを書く。
9. `/api/capabilities` に graph-backed endpoint を反映する。
10. endpoint parity と data migration が完了するまで、archive した legacy
    Go/Python/Kubernetes implementation は reference material として残す。

## Rejected Alternatives

### Kubernetes を orchestration layer として維持する

この repository はすでに Cloudflare native deployment を target にしている。
Kubernetes を維持すると、この migration が解消しようとしている operational
complexity が残るため採用しない。

### Go API をそのまま Workers に移植する

旧 API は server process と PostgreSQL-like storage behavior を前提にしている。
直接移植すると Worker/D1 の制約が見えにくくなり、新 runtime の設計が曖昧に
なるため採用しない。

### すべての payload を D1 に保存する

large artifact や intermediate analysis payload は relational lookup を必要と
しない。D1 は metadata、checkpoint、compact projection に限定し、large object
は R2 に置く。

### Pregel を Cloudflare 外だけで実行する

別 backend runtime を再導入することになるため、初期実装では採用しない。
Worker runtime compatibility または execution limit が block になった場合のみ、
外部 graph execution を再検討する。

## Verification

この ADR に沿った最小 verification は次の通り。

- `pnpm --dir apps/api-worker check`
- `pnpm --dir apps/api-worker db:migrate:local`
- `pnpm --dir apps/api-worker dev`
- `GET /api/health`
- `POST /api/assessments/start`
- `POST /api/assessments/session-start`
- `POST /api/assessments/word-response`
- `POST /api/assessments/complete`
- `GET /api/timeline/integrated?participantId=...`

Pregel 導入後は次も確認する。

- graph run に対して `graph_runs` と `graph_checkpoints` が作成される。
- 同じ event を retry しても idempotent に処理される。
- timeline snapshot が graph state から再生成できる。
- Wrangler で Worker bundle が deploy できる。

## References

- Existing architecture: `docs/cloudflare-native-architecture.md`
- Existing setup: `docs/cloudflare-svelte-worker-setup.md`
- Cloudflare Workers docs: https://developers.cloudflare.com/workers/
- Cloudflare D1 docs: https://developers.cloudflare.com/d1/
- Cloudflare Workers bindings docs: https://developers.cloudflare.com/workers/runtime-apis/bindings/
- LangGraph Pregel docs: https://docs.langchain.com/oss/javascript/langgraph/pregel
