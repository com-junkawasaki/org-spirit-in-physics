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

