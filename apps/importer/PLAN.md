# Spirit in Physics — Import/ETL Plan (ArangoDB, participant/time-first)

## Goal
- participant と time を一級軸にした時系列解析パイプラインを構築。
- dataset/participants/ の生データから ArangoDB へ正規化投入。
- Hume の language.csv を `participant_session_hume` に取り込み、`participant_session_responses.event_ts` 近傍の時間窓で支配感情を集約し `emotion` に反映。

## Collections (ArangoDB, document)
- participants
  - _key: string (participantId)
  - created_at: string (ISO)
  - consent: object

- participant_sessions
  - _key: string (`${participant_id}-${session_index}`)
  - participant_id: string (FK: participants._key)
  - session_index: int
  - start_ts: number (ms epoch)
  - end_ts: number (ms epoch | null)
  - duration_ms: number | null
  - number_of_words: number | null
  - total_events: number | null
  - avg_response_time_ms: number | null

- participant_session_responses
  - _key: string (auto)
  - participant_id: string
  - session_id: string (FK: participant_sessions._key)
  - stimulus_word: string | null
  - response_word: string | null
  - reaction_time_ms: number
  - event_ts: number (ms epoch, 時系列主キー)
  - emotion: string | null
  - emotion_confidence: number | null

- participant_session_hume
  - _key: string (auto)
  - participant_id: string
  - session_id: string (FK: participant_sessions._key)
  - t_ms: number (ms epoch, (= session.start_ts + mid(BeginTime,EndTime)*1000))
  - text: string
  - confidence: number | null
  - scores: object { Admiration: number, Anger: number, ... } 既知感情カラム一式

## Indexes
- participant_sessions: hash(participant_id)
- participant_session_responses: hash(participant_id), hash(session_id), persistent(event_ts)
- participant_session_hume: hash(participant_id), hash(session_id), persistent(t_ms)

## Import Pipeline
- Step 1: session_data.json → participants / participant_sessions / participant_session_responses
  - events からセッション境界を検出（session_started/recording_started〜ended）。
  - `word_displayed` と直後の `speech_detected` の差から `reaction_time_ms` を算出。
  - `event_ts` は `speech_detected.timestamp`（ms epoch）。

- Step 2: Hume language.csv → participant_session_hume
  - language.csv（BeginTime/EndTime 秒）を `session.start_ts` に相対加算して絶対 `t_ms` を作成。
  - 各行のテキスト `Text` と感情スコア列（すべて）を `scores` に格納。
  - どのセッションに属するかは `(session.start_ts .. session.end_ts)` に `t_ms` が入るものへ紐付け。曖昧なら mid 秒の最近傍セッション。

- Step 3: 感情付与（Enrichment）
  - 各 `participant_session_responses.event_ts` 周辺の時間窓 [event_ts - W, event_ts + W]（既定 W=1500ms）で `participant_session_hume` を探索。
  - 窓内行の `scores` を集約（加重平均。重み=各行の `confidence` or (EndTime-BeginTime) 秒）。最大スコアの感情を `emotion`、その値を `emotion_confidence` として `participant_session_responses` に書き戻し。
  - 窓内にデータが無ければ `emotion=null`。

## Time alignment rules
- セッション開始時刻: `session_started.timestamp`（存在しなければ `recording_started` を代用）。
- language.csv の行 ts: `t_ms = session.start_ts + ((BeginTime + EndTime)/2)*1000`
- 窓幅 W: デフォルト 1500ms（要チューニング）。
- タイムゾーン: すべて epoch ms（UTC）で統一。

## ID/Keys
- participants._key = participantId（データセットのディレクトリ名）
- participant_sessions._key = `${participant_id}-${session_index}`
- participant_session_responses / participant_session_hume は Arango 自動 _key に任せる（time-first 主軸は event_ts / t_ms）。

## Minimal ETL scripts (Python, python-arango)

### 1) session_data.json → participants/participant_sessions/participant_session_responses
```python
# scripts/import_sessions_responses.py
# participants/participant_sessions/participant_session_responses を upsert。
# 要点: session_started で開始, response_window_opened→speech_detected で RT 算出,
# event_ts に speech_detected.timestamp。
```

### 2) Hume language.csv → participant_session_hume
```python
# scripts/import_hume_language.py
# language.csv を participant_session_hume へ投入。
# t_ms を算出し、最寄り/包含セッションの session_id に紐付けて格納。
```

### 3) Enrichment: participant_session_responses ← participant_session_hume（近傍集約）
```python
# scripts/enrich_responses_from_hume.py
# 各 response の event_ts±W のウィンドウで hume を探索し、scores を加重平均。
# 最大スコアの感情と値を emotion / emotion_confidence に反映。
```

## Query examples (AQL)
- Participant 一覧（可視化用）
```aql
FOR p IN participants
  LET session_count = LENGTH(FOR s IN participant_sessions FILTER s.participant_id == p._key RETURN 1)
  LET response_count = LENGTH(FOR r IN participant_session_responses FILTER r.participant_id == p._key RETURN 1)
  RETURN { id: p._key, session_count, total_responses: response_count }
```

- タイムライン（responses + emotion）取得
```aql
FOR r IN participant_session_responses
  FILTER r.participant_id == @pid
  SORT r.event_ts ASC
  RETURN r
```

## Parameters / Tuning
- 時間窓 `WINDOW_MS`: 1000〜3000ms で AB テスト（初期 1500ms）。
- セッション境界が未明確なデータは距離優先マッチ。距離が 5分超なら破棄。

## Next
- [ ] scripts/ を `apps/importer/` に追加し、`python-arango` を使用。
- [ ] dataset を対象に Step1→Step2→Step3 を順次実行。
- [ ] Visualizer `/participants` ページで件数・RT・emotion が反映されるか確認。

