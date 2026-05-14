import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type { Pregel } from '@langchain/langgraph/pregel';
import type { Kysely } from 'kysely';
import type {
  AssessmentEventRow,
  Database,
  NewAggregateSnapshotRow,
  NewGraphCheckpointRow,
  NewGraphNodeEventRow,
  NewGraphRunRow,
} from '../db/schema';
import { STIMULUS_WORDS } from '../stimulus-words';

type JsonObject = Record<string, unknown>;

export type TimelinePoint = {
  time: string;
  participantId: string;
  sessionId: string;
  word: string;
  reactionTime: number;
  hasResponse: boolean;
  emotions: Array<{ name: string; score: number; fileType: string }>;
  physiological: Array<{ value: number; measurementType: string }>;
  reactionValue: number;
  eventType: string;
};

export type TimelineGraphResult = {
  runId: string;
  participantId: string;
  sessionId: string;
  points: TimelinePoint[];
  analysis: ReturnType<typeof buildAnalysis>;
  wordStatistics: ReturnType<typeof buildWordStatistics>;
  wordAggregates: ReturnType<typeof buildWordAggregates>;
  emotionVectors: ReturnType<typeof buildEmotionVectors>;
};

const TimelineAnnotation = Annotation.Root({
  runId: Annotation<string>,
  participantId: Annotation<string>,
  sessionIndex: Annotation<number | null>,
  sessionId: Annotation<string>,
  nowMs: Annotation<number>,
  events: Annotation<AssessmentEventRow[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  points: Annotation<TimelinePoint[]>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  analysis: Annotation<ReturnType<typeof buildAnalysis>>,
  wordStatistics: Annotation<ReturnType<typeof buildWordStatistics>>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  wordAggregates: Annotation<ReturnType<typeof buildWordAggregates>>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  emotionVectors: Annotation<ReturnType<typeof buildEmotionVectors>>({
    reducer: (_left, right) => right,
    default: () => [],
  }),
  status: Annotation<string>,
});

type TimelineState = typeof TimelineAnnotation.State;
type TimelineUpdate = Partial<TimelineState>;
type TimelinePregel = Pregel<
  any,
  any,
  Record<string, unknown>,
  TimelineState,
  TimelineState
>;

function parseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function getStimulusWordLabel(stimulusWordId: unknown): string {
  const id = Number(stimulusWordId);
  const word = STIMULUS_WORDS.find((candidate) => candidate.id === id);
  return word?.japanese ?? String(stimulusWordId ?? '');
}

function toJson(value: unknown): string {
  return JSON.stringify(value);
}

function getSnapshotSessionId(participantId: string, sessionIndex: number | null): string {
  return sessionIndex === null ? `${participantId}:all` : `${participantId}:${sessionIndex}`;
}

async function recordNodeEvent(
  db: Kysely<Database>,
  runId: string,
  stepIndex: number,
  nodeName: string,
  input: unknown,
  output: unknown,
  status = 'completed',
) {
  const values: NewGraphNodeEventRow = {
    id: crypto.randomUUID(),
    run_id: runId,
    step_index: stepIndex,
    node_name: nodeName,
    input_json: toJson(input),
    output_json: toJson(output),
    status,
    created_at_ms: Date.now(),
  };
  await db.insertInto('graph_node_events').values(values).execute();
}

async function recordCheckpoint(
  db: Kysely<Database>,
  runId: string,
  stepIndex: number,
  channelValues: unknown,
) {
  const values: NewGraphCheckpointRow = {
    id: crypto.randomUUID(),
    run_id: runId,
    step_index: stepIndex,
    channel_values_json: toJson(channelValues),
    pending_writes_json: null,
    created_at_ms: Date.now(),
  };
  await db
    .insertInto('graph_checkpoints')
    .values(values)
    .onConflict((oc) =>
      oc.columns(['run_id', 'step_index']).doUpdateSet({
        channel_values_json: values.channel_values_json,
        pending_writes_json: values.pending_writes_json,
        created_at_ms: values.created_at_ms,
      }),
    )
    .execute();
}

async function readAssessmentEvents(db: Kysely<Database>, participantId: string) {
  return db
    .selectFrom('assessment_events')
    .selectAll()
    .where('participant_id', '=', participantId)
    .orderBy('created_at_ms', 'asc')
    .execute();
}

function buildTimelinePoints(
  events: AssessmentEventRow[],
  requestedSessionIndex: number | null,
): TimelinePoint[] {
  const points: TimelinePoint[] = [];
  for (const event of events) {
    const payload = parseJson<JsonObject>(event.payload_json);
    if (!payload) continue;
    const sessionIndex =
      Number(payload.session ?? payload.sessionIndex ?? payload.sessionNumber ?? 0) || 0;
    if (requestedSessionIndex !== null && sessionIndex !== requestedSessionIndex) {
      continue;
    }
    if (event.event_type !== 'word-response') {
      continue;
    }

    const reactionTimeMs = Number(payload.reactionTimeMs ?? 0);
    const reactionValue = reactionTimeMs > 0 ? Number((1 / reactionTimeMs).toFixed(6)) : 0;
    const word = String(
      payload.responseWord || getStimulusWordLabel(payload.stimulusWordId),
    ).trim();
    points.push({
      time: new Date(event.created_at_ms).toISOString(),
      participantId: event.participant_id,
      sessionId: `${event.participant_id}:${sessionIndex}`,
      word,
      reactionTime: reactionTimeMs / 1000,
      hasResponse: Boolean(payload.responseWord),
      emotions: [],
      physiological: [],
      reactionValue,
      eventType: event.event_type,
    });
  }
  return points;
}

function buildAnalysis(points: TimelinePoint[]) {
  const gapAreas: Array<{ id: string; start: string; end: string; durationMs: number }> = [];
  const densityRegions: Array<{ id: string; start: string; end: string; pointCount: number; isOvercrowded: boolean }> = [];
  const duplicates: Array<{ id: string; word: string; count: number }> = [];
  const ghostPatterns: Array<{ id: string; word: string; intensity: number }> = [];

  const sorted = [...points].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  for (let i = 1; i < sorted.length; i += 1) {
    const previousTs = new Date(sorted[i - 1].time).getTime();
    const currentTs = new Date(sorted[i].time).getTime();
    const diff = currentTs - previousTs;
    if (diff > 15_000) {
      gapAreas.push({
        id: `gap-${i}`,
        start: sorted[i - 1].time,
        end: sorted[i].time,
        durationMs: diff,
      });
    }
  }

  const byWord = new Map<string, TimelinePoint[]>();
  for (const point of points) {
    if (!point.word) continue;
    const list = byWord.get(point.word) ?? [];
    list.push(point);
    byWord.set(point.word, list);
  }
  for (const [word, entries] of byWord.entries()) {
    if (entries.length > 1) {
      duplicates.push({ id: `dup-${word}`, word, count: entries.length });
    }
    if (entries.length >= 3) {
      ghostPatterns.push({
        id: `ghost-${word}`,
        word,
        intensity: Number((entries.length / Math.max(points.length, 1)).toFixed(4)),
      });
    }
  }

  const bucketStart = new Map<number, TimelinePoint[]>();
  for (const point of points) {
    const ts = new Date(point.time).getTime();
    const bucket = Math.floor(ts / 30_000) * 30_000;
    const list = bucketStart.get(bucket) ?? [];
    list.push(point);
    bucketStart.set(bucket, list);
  }
  for (const [bucket, entries] of bucketStart.entries()) {
    densityRegions.push({
      id: `density-${bucket}`,
      start: new Date(bucket).toISOString(),
      end: new Date(bucket + 30_000).toISOString(),
      pointCount: entries.length,
      isOvercrowded: entries.length >= 5,
    });
  }

  return {
    gapAreas,
    densityRegions,
    duplicates,
    ghostPatterns,
    overallDensity: points.length / Math.max(bucketStart.size, 1),
  };
}

function buildWordStatistics(points: TimelinePoint[]) {
  const groups = new Map<string, TimelinePoint[]>();
  for (const point of points) {
    const key = `${point.sessionId}:${point.word}`;
    const list = groups.get(key) ?? [];
    list.push(point);
    groups.set(key, list);
  }

  return Array.from(groups.values()).map((entries) => {
    const sample = entries[0];
    const reactionTimes = entries.map((entry) => entry.reactionTime);
    const reactionValues = entries.map((entry) => entry.reactionValue);
    const avgReactionTime = reactionTimes.reduce((sum, value) => sum + value, 0) / entries.length;
    const avgReactionValue = reactionValues.reduce((sum, value) => sum + value, 0) / entries.length;
    const varianceReactionTime =
      reactionTimes.reduce((sum, value) => sum + (value - avgReactionTime) ** 2, 0) / entries.length;
    const varianceReactionValue =
      reactionValues.reduce((sum, value) => sum + (value - avgReactionValue) ** 2, 0) / entries.length;
    return {
      participantId: sample.participantId,
      sessionId: sample.sessionId,
      word: sample.word,
      count: entries.length,
      avgReactionTime,
      stdReactionTime: Math.sqrt(varianceReactionTime),
      varReactionTime: varianceReactionTime,
      avgReactionValue,
      stdReactionValue: Math.sqrt(varianceReactionValue),
      varReactionValue: varianceReactionValue,
      avgPhysiological: 0,
      stdPhysiological: 0,
      varPhysiological: 0,
      speedIndex: avgReactionTime > 0 ? Number((1 / avgReactionTime).toFixed(6)) : 0,
      physSeries: [],
      rtSeries: reactionTimes,
    };
  });
}

function buildWordAggregates(points: TimelinePoint[]) {
  return buildWordStatistics(points).map((stat) => ({
    participantId: stat.participantId,
    sessionId: stat.sessionId,
    word: stat.word,
    count: stat.count,
    avgReactionValue: stat.avgReactionValue,
    sumReactionValue: stat.avgReactionValue * stat.count,
    avgReactionTime: stat.avgReactionTime,
    sumReactionTime: stat.avgReactionTime * stat.count,
    avgPhysiological: 0,
    sumPhysAbs: 0,
    physSeries: [],
    rtSeries: stat.rtSeries,
    rvSeries: Array.from({ length: stat.count }, () => stat.avgReactionValue),
  }));
}

function buildEmotionVectors(points: TimelinePoint[]) {
  const groups = new Map<string, TimelinePoint[]>();
  for (const point of points) {
    const key = `${point.sessionId}:${point.word}`;
    const list = groups.get(key) ?? [];
    list.push(point);
    groups.set(key, list);
  }
  return Array.from(groups.values()).map((entries) => {
    const sample = entries[0];
    const intensity = entries.reduce((sum, entry) => sum + entry.reactionValue, 0);
    return {
      participantId: sample.participantId,
      sessionId: sample.sessionId,
      word: sample.word,
      joySum: intensity,
      sadnessSum: 0,
      angerSum: 0,
      fearSum: 0,
      surpriseSum: intensity / Math.max(entries.length, 1),
      disgustSum: 0,
      calmSum: 0,
      focusSum: intensity,
      excitementSum: intensity,
      confusionSum: 0,
      emotionEntryCount: 0,
    };
  });
}

async function persistSnapshot(
  db: Kysely<Database>,
  participantId: string,
  sessionId: string,
  aggregateType: string,
  payload: unknown,
  points: TimelinePoint[],
  nowMs: number,
) {
  const times = points.map((point) => new Date(point.time).getTime()).filter(Number.isFinite);
  const values: NewAggregateSnapshotRow = {
    id: crypto.randomUUID(),
    participant_id: participantId,
    session_id: sessionId,
    aggregate_type: aggregateType,
    payload_json: toJson(payload),
    first_ts_ms: times.length > 0 ? Math.min(...times) : null,
    last_ts_ms: times.length > 0 ? Math.max(...times) : null,
    updated_at_ms: nowMs,
  };

  await db
    .insertInto('aggregate_snapshots')
    .values(values)
    .onConflict((oc) =>
      oc.columns(['participant_id', 'session_id', 'aggregate_type']).doUpdateSet({
        payload_json: values.payload_json,
        first_ts_ms: values.first_ts_ms,
        last_ts_ms: values.last_ts_ms,
        updated_at_ms: values.updated_at_ms,
      }),
    )
    .execute();
}

function buildTimelineGraph(db: Kysely<Database>): TimelinePregel {
  const loadEvents = async (state: TimelineState): Promise<TimelineUpdate> => {
    const events = await readAssessmentEvents(db, state.participantId);
    const output: TimelineUpdate = { events, status: 'events-loaded' };
    await recordNodeEvent(db, state.runId, 1, 'loadAssessmentEvents', { participantId: state.participantId }, { count: events.length });
    await recordCheckpoint(db, state.runId, 1, { ...state, events, status: output.status });
    return output;
  };

  const projectTimeline = async (state: TimelineState): Promise<TimelineUpdate> => {
    const points = buildTimelinePoints(state.events, state.sessionIndex);
    const output: TimelineUpdate = { points, status: 'timeline-projected' };
    await recordNodeEvent(db, state.runId, 2, 'projectTimeline', { eventCount: state.events.length }, { pointCount: points.length });
    await recordCheckpoint(db, state.runId, 2, { ...state, points, status: output.status });
    return output;
  };

  const analyzeTimeline = async (state: TimelineState): Promise<TimelineUpdate> => {
    const analysis = buildAnalysis(state.points);
    const wordStatistics = buildWordStatistics(state.points);
    const wordAggregates = buildWordAggregates(state.points);
    const emotionVectors = buildEmotionVectors(state.points);
    const output: TimelineUpdate = {
      analysis,
      wordStatistics,
      wordAggregates,
      emotionVectors,
      status: 'timeline-analyzed',
    };
    await recordNodeEvent(db, state.runId, 3, 'analyzeTimeline', { pointCount: state.points.length }, {
      wordStatisticsCount: wordStatistics.length,
      wordAggregatesCount: wordAggregates.length,
      emotionVectorsCount: emotionVectors.length,
    });
    await recordCheckpoint(db, state.runId, 3, { ...state, ...output });
    return output;
  };

  const persistSnapshots = async (state: TimelineState): Promise<TimelineUpdate> => {
    await Promise.all([
      persistSnapshot(db, state.participantId, state.sessionId, 'integrated', {
        points: state.points,
        analysis: state.analysis,
      }, state.points, state.nowMs),
      persistSnapshot(db, state.participantId, state.sessionId, 'analysis', state.analysis, state.points, state.nowMs),
      persistSnapshot(db, state.participantId, state.sessionId, 'word_statistics', state.wordStatistics, state.points, state.nowMs),
      persistSnapshot(db, state.participantId, state.sessionId, 'word_aggregates', state.wordAggregates, state.points, state.nowMs),
      persistSnapshot(db, state.participantId, state.sessionId, 'emotion_vectors', state.emotionVectors, state.points, state.nowMs),
    ]);
    const output: TimelineUpdate = { status: 'snapshots-persisted' };
    await recordNodeEvent(db, state.runId, 4, 'persistSnapshot', { sessionId: state.sessionId }, { snapshotCount: 5 });
    await recordCheckpoint(db, state.runId, 4, { ...state, status: output.status });
    return output;
  };

  return new StateGraph(TimelineAnnotation)
    .addNode('loadAssessmentEvents', loadEvents)
    .addNode('projectTimeline', projectTimeline)
    .addNode('analyzeTimeline', analyzeTimeline)
    .addNode('persistSnapshot', persistSnapshots)
    .addEdge(START, 'loadAssessmentEvents')
    .addEdge('loadAssessmentEvents', 'projectTimeline')
    .addEdge('projectTimeline', 'analyzeTimeline')
    .addEdge('analyzeTimeline', 'persistSnapshot')
    .addEdge('persistSnapshot', END)
    .compile() as unknown as TimelinePregel;
}

export async function runTimelineGraph(
  db: Kysely<Database>,
  participantId: string,
  sessionIndex: number | null,
): Promise<TimelineGraphResult> {
  const runId = crypto.randomUUID();
  const nowMs = Date.now();
  const sessionId = getSnapshotSessionId(participantId, sessionIndex);
  const runValues: NewGraphRunRow = {
    id: runId,
    graph_name: 'timeline',
    participant_id: participantId,
    session_id: sessionId,
    status: 'running',
    input_json: toJson({ participantId, sessionIndex }),
    output_json: null,
    error_json: null,
    created_at_ms: nowMs,
    updated_at_ms: nowMs,
  };
  await db.insertInto('graph_runs').values(runValues).execute();

  try {
    const graph = buildTimelineGraph(db);
    const result = await graph.invoke({
      runId,
      participantId,
      sessionIndex,
      sessionId,
      nowMs,
      events: [],
      points: [],
      analysis: buildAnalysis([]),
      wordStatistics: [],
      wordAggregates: [],
      emotionVectors: [],
      status: 'received',
    });

    const output: TimelineGraphResult = {
      runId,
      participantId,
      sessionId,
      points: result.points,
      analysis: result.analysis,
      wordStatistics: result.wordStatistics,
      wordAggregates: result.wordAggregates,
      emotionVectors: result.emotionVectors,
    };

    await db
      .updateTable('graph_runs')
      .set({
        status: 'completed',
        output_json: toJson({
          participantId,
          sessionId,
          pointCount: output.points.length,
        }),
        updated_at_ms: Date.now(),
      })
      .where('id', '=', runId)
      .execute();

    return output;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .updateTable('graph_runs')
      .set({
        status: 'failed',
        error_json: toJson({ message }),
        updated_at_ms: Date.now(),
      })
      .where('id', '=', runId)
      .execute();
    throw error;
  }
}
