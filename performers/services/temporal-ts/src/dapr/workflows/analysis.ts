/**
 * Dapr Workflow Definitions for Analysis
 *
 * Note: Dapr TypeScript SDK uses the DaprClient for workflow orchestration.
 * Workflows are implemented as stateful sequences using state store.
 */

import { DaprClient } from '@dapr/dapr';
import {
  WordNode,
  WordLink,
  TimelineDataPoint,
  AnalysisResults
} from '../../types';
import * as activities from '../activities';

// Workflow input/output types
export interface VisualizationAnalysisInput {
  nodes: WordNode[];
  links: WordLink[];
  emotionVectors: Record<string, number[]>;
  sessionData: TimelineDataPoint[];
}

export interface TimelineIntegratedInput {
  participantId: string;
  sessionId: string;
}

export interface TimelineIntegratedOutput {
  points: TimelineDataPoint[];
  analysis: AnalysisResults;
}

export interface BDDTestInput {
  featurePath?: string;
}

export interface BDDTestOutput {
  success: boolean;
  output: string;
  error?: string;
}

/**
 * Visualization Analysis Workflow
 * Runs structure analysis on provided nodes and links
 */
export async function visualizationAnalysisWorkflow(
  input: VisualizationAnalysisInput
): Promise<AnalysisResults> {
  const { nodes, links, emotionVectors, sessionData } = input;
  return await activities.runStructureAnalysisActivity(nodes, links, emotionVectors, sessionData);
}

/**
 * Timeline Integrated Workflow
 * Fetches data from Go service and performs analysis
 */
export async function timelineIntegratedWorkflow(
  daprClient: DaprClient,
  input: TimelineIntegratedInput
): Promise<TimelineIntegratedOutput> {
  const { participantId, sessionId } = input;

  // 1. Invoke Go service to fetch timeline points
  const rawPoints = await daprClient.invoker.invoke(
    'grpc-service',
    'timeline/points',
    'POST',
    { participant_id: participantId, session_id: sessionId }
  );

  // Normalize points to compact format
  const points: TimelineDataPoint[] = (rawPoints as any[]).map(p => {
    const word = p.word ?? '';
    const isWordEvent = word && word !== '' && word !== 'Unknown';

    let seconds = 0;
    let nanos = 0;
    if (p.time) {
      if (typeof p.time === 'string') {
        const d = new Date(p.time);
        seconds = Math.floor(d.getTime() / 1000);
        nanos = (d.getTime() % 1000) * 1000000;
      } else if (p.time.seconds !== undefined) {
        seconds = Number(p.time.seconds);
        nanos = Number(p.time.nanos);
      }
    }

    const emotions: any[] = [];
    (p.emotions || []).forEach((e: any) => {
      const threshold = isWordEvent ? 0.05 : 0.1;
      if (e.score >= threshold) {
        emotions.push({
          n: (e.name || '').toLowerCase(),
          s: e.score,
          f: e.fileType || e.file_type || ''
        });
      }
    });

    const physiological: any[] = (p.physiological || []).map((m: any) => ({
      v: m.value || 0,
      m: m.measurementType || m.measurement_type || ''
    }));

    return {
      t: { s: seconds, n: nanos },
      w: word,
      rt: p.reactionTime ?? p.reaction_time ?? 0,
      hr: p.hasResponse ?? p.has_response ?? false,
      e: emotions,
      p: physiological,
      rv: p.reactionValue ?? p.reaction_value ?? 0,
      et: p.eventType ?? p.event_type
    };
  });

  // 2. Fetch emotion vectors
  const rawEmotionVectors = await daprClient.invoker.invoke(
    'grpc-service',
    'timeline/emotion-vectors',
    'POST',
    { participant_id: participantId, session_id: sessionId }
  );

  const emotionVectors: Record<string, number[]> = {};
  if (Array.isArray(rawEmotionVectors)) {
    rawEmotionVectors.forEach((v: any) => {
      const word = v.word || '';
      emotionVectors[word] = [
        v.joySum ?? v.joy_sum ?? 0,
        v.sadnessSum ?? v.sadness_sum ?? 0,
        v.angerSum ?? v.anger_sum ?? 0,
        v.fearSum ?? v.fear_sum ?? 0,
        v.surpriseSum ?? v.surprise_sum ?? 0,
        v.disgustSum ?? v.disgust_sum ?? 0,
        v.calmSum ?? v.calm_sum ?? 0,
        v.focusSum ?? v.focus_sum ?? 0,
        v.excitementSum ?? v.excitement_sum ?? 0,
        v.confusionSum ?? v.confusion_sum ?? 0
      ];
    });
  }

  // 3. Prepare nodes and links for analysis
  const wordPoints = points.filter(p => p.w && p.w !== 'Unknown');
  const nodes: WordNode[] = wordPoints.map((p, i) => {
    const vec = emotionVectors[p.w] || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    const x = (vec[0]! + vec[4]! + vec[8]!) - (vec[1]! + vec[2]! + vec[3]! + vec[5]!);
    const y = (vec[2]! + vec[3]! + vec[4]! + vec[8]!) - (vec[0]! + vec[6]! + vec[7]! + vec[9]!);
    const z = (vec[7]! + vec[6]!) - (vec[9]! + vec[4]!);

    return {
      id: `node-${i}`,
      label: p.w || '',
      scale: 1.0 + (p.rv || 0) * 5.0,
      initial: [x * 100, y * 100, z * 100] as [number, number, number],
      nodeType: 'word' as const
    };
  });

  const links: WordLink[] = [];
  for (let i = 1; i < nodes.length; i++) {
    links.push({
      source: nodes[i - 1]!.id,
      target: nodes[i]!.id,
      weight: 0.5
    });
  }

  // 4. Run analysis
  const analysis = await activities.runStructureAnalysisActivity(nodes, links, emotionVectors, points);

  return { points, analysis };
}

/**
 * BDD Test Workflow
 */
export async function bddTestWorkflow(input: BDDTestInput): Promise<BDDTestOutput> {
  return await activities.runBDDTestActivity(input.featurePath);
}

/**
 * Run Cucumber BDD Workflow
 */
export async function runBDDWorkflow(input: BDDTestInput): Promise<BDDTestOutput> {
  return await activities.runCucumberTests(input.featurePath);
}
