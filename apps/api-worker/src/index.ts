import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Kysely } from 'kysely';
import { STIMULUS_WORDS } from './stimulus-words';
import { createDb } from './db/client';
import type {
  ArtifactRow,
  AssessmentEventRow,
  Database,
  NewArtifactRow,
  NewAssessmentEventRow,
  NewParticipantRow,
  NewSessionRow,
  ParticipantPatch,
  ParticipantRow,
  SessionPatch,
  SessionRow,
} from './db/schema';

type R2Bucket = {
  put: (
    key: string,
    value: ArrayBuffer | ArrayBufferView | string | ReadableStream,
    options?: { httpMetadata?: { contentType?: string } },
  ) => Promise<unknown>;
  get: (
    key: string,
  ) => Promise<
    | {
        body: ReadableStream | null;
        httpMetadata?: { contentType?: string };
      }
    | null
  >;
};

type Bindings = {
  API_MODE?: string;
  DB?: D1Database;
  ARTIFACTS?: R2Bucket;
};

type TimelinePoint = {
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

const app = new Hono<{ Bindings: Bindings }>();

app.use(
  '/api/*',
  cors({
    origin: '*',
    allowHeaders: ['Content-Type'],
    allowMethods: ['GET', 'POST', 'OPTIONS'],
  }),
);

function requireDb(c: { env: Bindings }): D1Database {
  if (!c.env.DB) {
    throw new Error('D1 binding `DB` is not configured.');
  }
  return c.env.DB;
}

function getDb(c: { env: Bindings }): Kysely<Database> {
  return createDb(requireDb(c));
}

function requireBucket(c: { env: Bindings }): R2Bucket {
  if (!c.env.ARTIFACTS) {
    throw new Error('R2 binding `ARTIFACTS` is not configured.');
  }
  return c.env.ARTIFACTS;
}

function getRequestOrigin(url: string): string {
  return new URL(url).origin;
}

function mapParticipant(row: ParticipantRow) {
  return {
    id: row.id,
    email: row.email ?? '',
    ageGroup: row.age_group ?? '',
    gender: row.gender ?? '',
    ethnicity: row.ethnicity ?? '',
    incomeRange: row.income_range ?? '',
    medicalHistory: row.medical_history_json ? JSON.parse(row.medical_history_json) : [],
    isPublic: row.is_public !== 0,
    createdAt: row.created_at_ms,
    updatedAt: row.updated_at_ms,
  };
}

function mapSession(row: SessionRow, artifacts: ArtifactRow[]) {
  return {
    id: row.id,
    participantId: row.participant_id,
    sessionIndex: row.session_index,
    status: row.status,
    startTs: row.start_ts_ms,
    endTs: row.end_ts_ms,
    createdAt: row.created_at_ms,
    updatedAt: row.updated_at_ms,
    artifacts: artifacts.map((artifact) => ({
      id: artifact.id,
      artifactType: artifact.artifact_type,
      fileName: artifact.file_name,
      contentType: artifact.content_type,
      objectKey: artifact.object_key,
      publicUrl: artifact.public_url,
      createdAt: artifact.created_at_ms,
    })),
  };
}

function parseJson<T>(value: string): T | null {
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function parseSessionIndex(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const direct = Number(value);
  if (Number.isFinite(direct)) {
    return direct;
  }
  const match = value.match(/(\d+)$/);
  return match ? Number(match[1]) : null;
}

function getStimulusWordLabel(stimulusWordId: unknown): string {
  const id = Number(stimulusWordId);
  const word = STIMULUS_WORDS.find(
    (candidate) => candidate.id === id,
  );
  return word?.japanese ?? String(stimulusWordId ?? '');
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
    const payload = parseJson<Record<string, unknown>>(event.payload_json);
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

app.get('/api/health', (c) => {
  return c.json({
    ok: true,
    runtime: 'cloudflare-worker',
    mode: c.env.API_MODE ?? 'worker-partial',
    date: '2026-04-12',
  });
});

app.get('/api/capabilities', (c) => {
  return c.json({
    ok: true,
    runtime: 'cloudflare-worker',
    available: ['health', 'capabilities', 'participants', 'stimulus-words', 'assessment-events', 'sessions', 'storage', 'timeline'],
    pending: ['preferences', 'imports'],
    mode: c.env.API_MODE ?? 'worker-partial',
  });
});

app.get('/api/participants', async (c) => {
  const db = getDb(c);
  const rows = await db.selectFrom('participants').selectAll().orderBy('updated_at_ms', 'desc').execute();
  return c.json({ participants: rows.map(mapParticipant) });
});

app.get('/api/participants/by-email', async (c) => {
  const email = c.req.query('email');
  if (!email) {
    return c.json({ message: 'email is required' }, 400);
  }
  const db = getDb(c);
  const row = await db.selectFrom('participants').selectAll().where('email', '=', email).executeTakeFirst();
  return c.json({ participant: row ? mapParticipant(row) : null });
});

app.post('/api/participants', async (c) => {
  const payload = await c.req.json<Record<string, unknown>>();
  const now = Date.now();
  const medicalHistory = Array.isArray(payload.medicalHistory) ? payload.medicalHistory : [];
  const db = getDb(c);
  const participantValues: NewParticipantRow = {
    id: String(payload.id ?? ''),
    email: String(payload.email ?? ''),
    age_group: String(payload.ageGroup ?? ''),
    gender: String(payload.gender ?? ''),
    ethnicity: String(payload.ethnicity ?? ''),
    income_range: String(payload.incomeRange ?? ''),
    medical_history_json: JSON.stringify(medicalHistory),
    is_public: payload.isPublic === false ? 0 : 1,
    created_at_ms: now,
    updated_at_ms: now,
  };
  const participantPatch: ParticipantPatch = {
    email: participantValues.email,
    age_group: participantValues.age_group,
    gender: participantValues.gender,
    ethnicity: participantValues.ethnicity,
    income_range: participantValues.income_range,
    medical_history_json: participantValues.medical_history_json,
    is_public: participantValues.is_public,
    updated_at_ms: now,
  };

  await db
    .insertInto('participants')
    .values(participantValues)
    .onConflict((oc) => oc.column('id').doUpdateSet(participantPatch))
    .execute();

  const row = await db.selectFrom('participants').selectAll().where('id', '=', participantValues.id).executeTakeFirst();

  return c.json({ participant: row ? mapParticipant(row) : null });
});

app.get('/api/stimulus-words', (c) => {
  return c.json({ words: STIMULUS_WORDS });
});

app.get('/api/storage/object/*', async (c) => {
  const objectKey = decodeURIComponent(c.req.path.replace('/api/storage/object/', ''));
  const bucket = requireBucket(c);
  const object = await bucket.get(objectKey);
  if (!object) {
    return c.json({ message: 'artifact not found' }, 404);
  }
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
    },
  });
});

app.get('/api/sessions', async (c) => {
  const participantId = c.req.query('participantId');
  const db = getDb(c);
  const sessionsQuery = participantId
    ? db.selectFrom('sessions').selectAll().where('participant_id', '=', participantId)
    : db.selectFrom('sessions').selectAll();
  const artifactsQuery = participantId
    ? db.selectFrom('artifacts').selectAll().where('participant_id', '=', participantId)
    : db.selectFrom('artifacts').selectAll();
  const [sessionsRes, artifactsRes] = await Promise.all([
    sessionsQuery.orderBy('start_ts_ms', 'desc').execute(),
    artifactsQuery.orderBy('created_at_ms', 'desc').execute(),
  ]);
  const artifactsBySession = new Map<string, ArtifactRow[]>();
  for (const artifact of artifactsRes) {
    const key = `${artifact.participant_id}:${artifact.session_index}`;
    const list = artifactsBySession.get(key) ?? [];
    list.push(artifact);
    artifactsBySession.set(key, list);
  }
  return c.json({
    sessions: sessionsRes.map((session) =>
      mapSession(session, artifactsBySession.get(`${session.participant_id}:${session.session_index}`) ?? []),
    ),
  });
});

app.post('/api/storage/upload', async (c) => {
  const payload = await c.req.json<{
    participantId?: string;
    fileName?: string;
    fileDataBase64?: string;
    contentType?: string;
    artifactType?: string;
    sessionIndex?: number;
  }>();
  if (!payload.participantId || !payload.fileName || !payload.fileDataBase64 || !payload.artifactType) {
    return c.json({ message: 'participantId, fileName, fileDataBase64, and artifactType are required' }, 400);
  }

  const bucket = requireBucket(c);
  const db = getDb(c);
  const sessionIndex = payload.sessionIndex ?? 0;
  const fileBytes = Uint8Array.from(atob(payload.fileDataBase64), (char) => char.charCodeAt(0));
  const objectKey = `${payload.participantId}/session-${sessionIndex}/${payload.artifactType}/${Date.now()}-${payload.fileName}`;
  await bucket.put(objectKey, fileBytes, {
    httpMetadata: {
      contentType: payload.contentType ?? 'application/octet-stream',
    },
  });

  const publicUrl = `${getRequestOrigin(c.req.url)}/api/storage/object/${encodeURIComponent(objectKey)}`;
  const artifactId = crypto.randomUUID();
  const artifactValues: NewArtifactRow = {
    id: artifactId,
    participant_id: payload.participantId,
    session_index: sessionIndex,
    artifact_type: payload.artifactType,
    file_name: payload.fileName,
    content_type: payload.contentType ?? 'application/octet-stream',
    object_key: objectKey,
    public_url: publicUrl,
    created_at_ms: Date.now(),
  };
  await db.insertInto('artifacts').values(artifactValues).execute();

  return c.json({ publicUrl });
});

app.get('/api/timeline/integrated', async (c) => {
  const participantId = c.req.query('participantId');
  if (!participantId) {
    return c.json({ message: 'participantId is required' }, 400);
  }
  const requestedSessionIndex = parseSessionIndex(c.req.query('sessionId'));
  const events = await readAssessmentEvents(getDb(c), participantId);
  const points = buildTimelinePoints(events, requestedSessionIndex);
  return c.json({
    points,
    analysis: buildAnalysis(points),
  });
});

app.get('/api/timeline/analysis', async (c) => {
  const participantId = c.req.query('participantId');
  if (!participantId) {
    return c.json({ message: 'participantId is required' }, 400);
  }
  const requestedSessionIndex = parseSessionIndex(c.req.query('sessionId'));
  const events = await readAssessmentEvents(getDb(c), participantId);
  const points = buildTimelinePoints(events, requestedSessionIndex);
  return c.json(buildAnalysis(points));
});

app.get('/api/timeline/word-statistics', async (c) => {
  const participantId = c.req.query('participantId');
  if (!participantId) {
    return c.json({ message: 'participantId is required' }, 400);
  }
  const requestedSessionIndex = parseSessionIndex(c.req.query('sessionId'));
  const events = await readAssessmentEvents(getDb(c), participantId);
  const points = buildTimelinePoints(events, requestedSessionIndex);
  return c.json({ statistics: buildWordStatistics(points) });
});

app.get('/api/timeline/word-aggregates', async (c) => {
  const participantId = c.req.query('participantId');
  if (!participantId) {
    return c.json({ message: 'participantId is required' }, 400);
  }
  const requestedSessionIndex = parseSessionIndex(c.req.query('sessionId'));
  const events = await readAssessmentEvents(getDb(c), participantId);
  const points = buildTimelinePoints(events, requestedSessionIndex);
  return c.json({ aggregates: buildWordAggregates(points) });
});

app.get('/api/timeline/emotion-vectors', async (c) => {
  const participantId = c.req.query('participantId');
  if (!participantId) {
    return c.json({ message: 'participantId is required' }, 400);
  }
  const requestedSessionIndex = parseSessionIndex(c.req.query('sessionId'));
  const events = await readAssessmentEvents(getDb(c), participantId);
  const points = buildTimelinePoints(events, requestedSessionIndex);
  return c.json({ vectors: buildEmotionVectors(points) });
});

async function insertAssessmentEvent(c: { env: Bindings }, eventType: string, payload: Record<string, unknown>) {
  const db = getDb(c);
  const id = crypto.randomUUID();
  const eventValues: NewAssessmentEventRow = {
    id,
    participant_id: String(payload.participantId ?? ''),
    event_type: eventType,
    payload_json: JSON.stringify(payload),
    created_at_ms: Date.now(),
  };
  await db.insertInto('assessment_events').values(eventValues).execute();
}

app.post('/api/assessments/start', async (c) => {
  const payload = await c.req.json<Record<string, unknown>>();
  await insertAssessmentEvent(c, 'start', payload);
  return c.json({ workflowId: `assessment-${payload.participantId ?? 'unknown'}`, runId: crypto.randomUUID() });
});

app.post('/api/assessments/session-start', async (c) => {
  const payload = await c.req.json<Record<string, unknown>>();
  await insertAssessmentEvent(c, 'session-start', payload);
  const db = getDb(c);
  const now = Date.now();
  const participantId = String(payload.participantId ?? '');
  const sessionIndex = Number(payload.sessionNumber ?? 0);
  const sessionId = crypto.randomUUID();
  const sessionValues: NewSessionRow = {
    id: sessionId,
    participant_id: participantId,
    session_index: sessionIndex,
    status: 'in_progress',
    start_ts_ms: now,
    end_ts_ms: null,
    created_at_ms: now,
    updated_at_ms: now,
  };
  const sessionPatch: SessionPatch = {
    status: 'in_progress',
    updated_at_ms: now,
  };
  await db
    .insertInto('sessions')
    .values(sessionValues)
    .onConflict((oc) =>
      oc.columns(['participant_id', 'session_index']).doUpdateSet(sessionPatch),
    )
    .execute();
  return c.json({ success: true });
});

app.post('/api/assessments/word-response', async (c) => {
  const payload = await c.req.json<Record<string, unknown>>();
  await insertAssessmentEvent(c, 'word-response', payload);
  return c.json({ success: true });
});

app.post('/api/assessments/artifact', async (c) => {
  const payload = await c.req.json<Record<string, unknown>>();
  await insertAssessmentEvent(c, 'artifact', payload);
  return c.json({ success: true });
});

app.post('/api/assessments/complete', async (c) => {
  const payload = await c.req.json<Record<string, unknown>>();
  await insertAssessmentEvent(c, 'complete', payload);
  const db = getDb(c);
  const participantId = String(payload.participantId ?? '');
  const sessionIndex = Number(payload.session ?? payload.sessionIndex ?? payload.sessionNumber ?? 0);
  const now = Date.now();
  await db
    .updateTable('sessions')
    .set({
      status: 'completed',
      end_ts_ms: now,
      updated_at_ms: now,
    })
    .where('participant_id', '=', participantId)
    .where('session_index', '=', sessionIndex)
    .where('status', '!=', 'completed')
    .execute();
  return c.json({ success: true });
});

app.all('/api/*', (c) => {
  return c.json(
    {
      ok: false,
      error: 'not_implemented',
      message: 'This Cloudflare Worker API endpoint has not been ported from the legacy backend yet.',
    },
    501,
  );
});

app.all('*', (c) => c.notFound());

export default app;
