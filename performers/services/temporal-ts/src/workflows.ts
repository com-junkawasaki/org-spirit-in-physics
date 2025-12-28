import { proxyActivities } from '@temporalio/workflow';
import type * as activities from './activities';
import type * as bddActivities from './bdd_activities';
import { WordNode, WordLink, TimelineDataPoint, AnalysisResults } from './types';

const {
  runStructureAnalysisActivity,
  runBDDTestActivity
} = proxyActivities<typeof activities>({
  startToCloseTimeout: '1 minute',
});

// Activities from the Go worker
const goActivities = proxyActivities({
  taskQueue: 'onboarding-queue',
  startToCloseTimeout: '1 minute',
});

const {
  runCucumberTests
} = proxyActivities<typeof bddActivities>({
  startToCloseTimeout: '5 minutes',
});

/**
 * Workflow for running BDD tests via Cucumber
 */
export async function runBDDWorkflow(feature?: string): Promise<{ success: boolean; output: string; error?: string }> {
  return await runCucumberTests(feature);
}

/**
 * Workflow for running BDD tests
 */
export async function bddTestWorkflow(featurePath?: string): Promise<{ success: boolean; output: string; error?: string }> {
  return await runBDDTestActivity(featurePath);
}

/**
 * Integrated Timeline Workflow
 * Fetches data and performs analysis in one workflow
 */
export async function timelineIntegratedWorkflow(
  participantId: string,
  sessionId: string
): Promise<{
  points: TimelineDataPoint[];
  analysis: AnalysisResults;
}> {
  // 1. Fetch timeline points via Go activity
  const rawPoints: any[] = await (goActivities as any).FetchTimelineActivity(participantId, sessionId);
  
  // Normalize points to snake_case for consistency and Go unmarshaling
  const points: TimelineDataPoint[] = rawPoints.map(p => {
    const word = p.word ?? '';
    const isWordEvent = word && word !== '' && word !== 'Unknown';
    
    // Robust timestamp conversion to Protobuf format
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

    // Convert to highly compact format to stay under 2MB limit
    const emotions: any[] = [];
    (p.emotions || []).forEach((e: any) => {
      const threshold = isWordEvent ? 0.05 : 0.2;
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

  // 2. Fetch other data needed for analysis
  const rawEmotionVectors = await (goActivities as any).FetchEmotionVectorsActivity(participantId, sessionId);
  
  // Convert emotionVectorsResult to the Record format expected by analysis
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
  
  // 3. Prepare for analysis (Only include points with stimulus words)
  const wordPoints = points.filter(p => p.w && p.w !== 'Unknown');
  const nodes: WordNode[] = wordPoints.map((p, i) => {
    const vec = emotionVectors[p.w] || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    // [joy, sadness, anger, fear, surprise, disgust, calm, focus, excitement, confusion]
    
    // Crude projection of 10D emotion space to 3D
    const x = (vec[0]! + vec[4]! + vec[8]!) - (vec[1]! + vec[2]! + vec[3]! + vec[5]!);
    const y = (vec[2]! + vec[3]! + vec[4]! + vec[8]!) - (vec[0]! + vec[6]! + vec[7]! + vec[9]!);
    const z = (vec[7]! + vec[6]!) - (vec[9]! + vec[4]!);

    return {
      id: `node-${i}`,
      label: p.w || '',
      scale: 1.0 + (p.rv || 0) * 5.0,
      initial: [x * 100, y * 100, z * 100],
      nodeType: 'word'
    };
  });
  
  const links: WordLink[] = [];
  for (let i = 1; i < nodes.length; i++) {
    links.push({
      source: nodes[i-1]!.id,
      target: nodes[i]!.id,
      weight: 0.5
    });
  }

  // 4. Run analysis activity (TS activity)
  const analysis = await runStructureAnalysisActivity(nodes, links, emotionVectors, points);

  return { points, analysis };
}

/**
 * Workflow for running visualization structure analysis
 */
export async function visualizationAnalysisWorkflow(
  nodes: WordNode[],
  links: WordLink[],
  emotionVectors: Record<string, number[]>,
  sessionData: TimelineDataPoint[]
): Promise<AnalysisResults> {
  return await runStructureAnalysisActivity(nodes, links, emotionVectors, sessionData);
}

