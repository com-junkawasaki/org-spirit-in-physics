import { Annotation, END, START, StateGraph } from '@langchain/langgraph';
import type { Pregel } from '@langchain/langgraph/pregel';
import type { Kysely } from 'kysely';
import type {
  Database,
  NewAssessmentEventRow,
  NewGraphCheckpointRow,
  NewGraphNodeEventRow,
  NewGraphRunRow,
  NewSessionRow,
  SessionPatch,
} from '../db/schema';

export type AssessmentEventType =
  | 'start'
  | 'session-start'
  | 'word-response'
  | 'artifact'
  | 'complete';

type JsonObject = Record<string, unknown>;

const AssessmentAnnotation = Annotation.Root({
  eventType: Annotation<AssessmentEventType>,
  payload: Annotation<JsonObject>,
  runId: Annotation<string>,
  eventId: Annotation<string>,
  participantId: Annotation<string>,
  sessionIndex: Annotation<number>,
  sessionId: Annotation<string | null>,
  nowMs: Annotation<number>,
  status: Annotation<string>,
});

type AssessmentState = typeof AssessmentAnnotation.State;
type AssessmentUpdate = Partial<AssessmentState>;
type AssessmentPregel = Pregel<
  any,
  any,
  Record<string, unknown>,
  AssessmentState,
  AssessmentState
>;

export type AssessmentGraphResult = {
  workflowId: string;
  runId: string;
  eventId: string;
  participantId: string;
  sessionIndex: number;
  sessionId: string | null;
  status: string;
};

function getSessionIndex(payload: JsonObject): number {
  return Number(payload.session ?? payload.sessionIndex ?? payload.sessionNumber ?? 0) || 0;
}

function getStableEventId(payload: JsonObject): string {
  return String(payload.eventId ?? payload.id ?? crypto.randomUUID());
}

function getLogicalSessionId(participantId: string, sessionIndex: number): string | null {
  return participantId ? `${participantId}:${sessionIndex}` : null;
}

function toJson(value: unknown): string {
  return JSON.stringify(value);
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

function buildAssessmentGraph(db: Kysely<Database>): AssessmentPregel {
  const normalize = async (state: AssessmentState): Promise<AssessmentUpdate> => {
    const participantId = String(state.payload.participantId ?? '');
    const sessionIndex = getSessionIndex(state.payload);
    const eventId = getStableEventId(state.payload);
    const output: AssessmentUpdate = {
      participantId,
      sessionIndex,
      eventId,
      sessionId: getLogicalSessionId(participantId, sessionIndex),
      nowMs: Date.now(),
      status: 'normalized',
    };
    await recordNodeEvent(db, state.runId, 1, 'receiveAssessmentEvent', state, output);
    await recordCheckpoint(db, state.runId, 1, { ...state, ...output });
    return output;
  };

  const appendAssessmentEvent = async (state: AssessmentState): Promise<AssessmentUpdate> => {
    const eventValues: NewAssessmentEventRow = {
      id: state.eventId,
      participant_id: state.participantId,
      event_type: state.eventType,
      payload_json: toJson({
        ...state.payload,
        eventId: state.eventId,
        graphRunId: state.runId,
      }),
      created_at_ms: state.nowMs,
    };
    await db
      .insertInto('assessment_events')
      .values(eventValues)
      .onConflict((oc) => oc.column('id').doNothing())
      .execute();

    const output: AssessmentUpdate = { status: 'event-appended' };
    await recordNodeEvent(db, state.runId, 2, 'appendAssessmentEvent', eventValues, output);
    await recordCheckpoint(db, state.runId, 2, { ...state, ...output });
    return output;
  };

  const upsertSession = async (state: AssessmentState): Promise<AssessmentUpdate> => {
    if (state.eventType === 'session-start') {
      const sessionValues: NewSessionRow = {
        id: crypto.randomUUID(),
        participant_id: state.participantId,
        session_index: state.sessionIndex,
        status: 'in_progress',
        start_ts_ms: state.nowMs,
        end_ts_ms: null,
        created_at_ms: state.nowMs,
        updated_at_ms: state.nowMs,
      };
      const sessionPatch: SessionPatch = {
        status: 'in_progress',
        updated_at_ms: state.nowMs,
      };
      await db
        .insertInto('sessions')
        .values(sessionValues)
        .onConflict((oc) =>
          oc.columns(['participant_id', 'session_index']).doUpdateSet(sessionPatch),
        )
        .execute();
    }

    if (state.eventType === 'complete') {
      await db
        .updateTable('sessions')
        .set({
          status: 'completed',
          end_ts_ms: state.nowMs,
          updated_at_ms: state.nowMs,
        })
        .where('participant_id', '=', state.participantId)
        .where('session_index', '=', state.sessionIndex)
        .where('status', '!=', 'completed')
        .execute();
    }

    const output: AssessmentUpdate = { status: 'session-upserted' };
    await recordNodeEvent(db, state.runId, 3, 'upsertSession', state, output);
    await recordCheckpoint(db, state.runId, 3, { ...state, ...output });
    return output;
  };

  return new StateGraph(AssessmentAnnotation)
    .addNode('receiveAssessmentEvent', normalize)
    .addNode('appendAssessmentEvent', appendAssessmentEvent)
    .addNode('upsertSession', upsertSession)
    .addEdge(START, 'receiveAssessmentEvent')
    .addEdge('receiveAssessmentEvent', 'appendAssessmentEvent')
    .addEdge('appendAssessmentEvent', 'upsertSession')
    .addEdge('upsertSession', END)
    .compile() as unknown as AssessmentPregel;
}

export async function runAssessmentGraph(
  db: Kysely<Database>,
  eventType: AssessmentEventType,
  payload: JsonObject,
): Promise<AssessmentGraphResult> {
  const runId = crypto.randomUUID();
  const participantId = String(payload.participantId ?? '');
  const sessionIndex = getSessionIndex(payload);
  const sessionId = getLogicalSessionId(participantId, sessionIndex);
  const now = Date.now();

  const runValues: NewGraphRunRow = {
    id: runId,
    graph_name: 'assessment',
    participant_id: participantId || null,
    session_id: sessionId,
    status: 'running',
    input_json: toJson({ eventType, payload }),
    output_json: null,
    error_json: null,
    created_at_ms: now,
    updated_at_ms: now,
  };
  await db.insertInto('graph_runs').values(runValues).execute();

  try {
    const graph = buildAssessmentGraph(db);
    const result = await graph.invoke({
      eventType,
      payload,
      runId,
      eventId: '',
      participantId,
      sessionIndex,
      sessionId,
      nowMs: now,
      status: 'received',
    });

    const output: AssessmentGraphResult = {
      workflowId: `assessment-${result.participantId || 'unknown'}`,
      runId,
      eventId: result.eventId,
      participantId: result.participantId,
      sessionIndex: result.sessionIndex,
      sessionId: result.sessionId,
      status: 'completed',
    };

    await db
      .updateTable('graph_runs')
      .set({
        status: 'completed',
        output_json: toJson(output),
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
