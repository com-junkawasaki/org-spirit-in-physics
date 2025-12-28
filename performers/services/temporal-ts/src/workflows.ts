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
  const points: TimelineDataPoint[] = rawPoints.map(p => ({
    time: p.time,
    participant_id: p.participantId ?? p.participant_id,
    session_id: p.sessionId ?? p.session_id,
    word: p.word ?? '',
    reaction_time: p.reactionTime ?? p.reaction_time ?? 0,
    has_response: p.hasResponse ?? p.has_response ?? false,
    emotions: (p.emotions || []).map((e: any) => ({
      name: e.name || '',
      score: e.score || 0,
      fileType: e.fileType || e.file_type || ''
    })),
    physiological: p.physiological || [],
    reaction_value: p.reactionValue ?? p.reaction_value ?? 0,
    event_type: p.eventType ?? p.event_type,
    metadata: p.metadata
  }));

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
  
  // 3. Prepare for analysis
  const nodes: WordNode[] = points.map((p, i) => ({
    id: `node-${i}`,
    label: p.word || '',
    scale: 1.0 + (p.reaction_value || 0) * 5.0,
    initial: [i * 50, Math.sin(i / 10) * 100, Math.cos(i / 10) * 100] // Better dummy initial positions
  }));
  
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

