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
  const points: TimelineDataPoint[] = await (goActivities as any).FetchTimelineActivity(participantId, sessionId);
  
  // 2. Fetch other data needed for analysis
  const emotionVectorsResult = await (goActivities as any).FetchEmotionVectorsActivity(participantId, sessionId);
  
  // Convert emotionVectorsResult to the Record format expected by analysis
  const emotionVectors: Record<string, number[]> = {};
  if (Array.isArray(emotionVectorsResult)) {
    emotionVectorsResult.forEach((v: any) => {
      emotionVectors[v.word] = [
        v.joySum || 0, v.sadnessSum || 0, v.angerSum || 0, v.fearSum || 0,
        v.surpriseSum || 0, v.disgustSum || 0, v.calmSum || 0, v.focusSum || 0,
        v.excitementSum || 0, v.confusionSum || 0
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

