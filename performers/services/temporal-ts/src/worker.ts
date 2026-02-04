import { DaprServer, DaprClient, CommunicationProtocolEnum } from '@dapr/dapr';
import * as workflows from './dapr/workflows';
import * as activities from './dapr/activities';

const DAPR_HOST = process.env.DAPR_HOST || 'localhost';
const DAPR_HTTP_PORT = process.env.DAPR_HTTP_PORT || '3500';
const APP_PORT = process.env.APP_PORT || '3002';

async function run() {
  console.log('Starting Dapr TypeScript Worker...');

  // Initialize Dapr Client
  const daprClient = new DaprClient({
    daprHost: DAPR_HOST,
    daprPort: DAPR_HTTP_PORT,
    communicationProtocol: CommunicationProtocolEnum.HTTP
  });

  // Initialize Dapr Server for receiving invocations
  const server = new DaprServer({
    serverHost: '0.0.0.0',
    serverPort: APP_PORT,
    clientOptions: {
      daprHost: DAPR_HOST,
      daprPort: DAPR_HTTP_PORT
    }
  });

  // Register workflow endpoints (exposed as service invocation)

  // Visualization Analysis Workflow
  await server.invoker.listen('run_structure_analysis', async (data: any) => {
    console.log('Received run_structure_analysis request');
    const { nodes, links, emotionVectors, sessionData } = data.body || data;
    const result = await workflows.visualizationAnalysisWorkflow({
      nodes,
      links,
      emotionVectors,
      sessionData
    });
    return result;
  });

  // Timeline Integrated Workflow
  await server.invoker.listen('get_integrated_timeline', async (data: any) => {
    console.log('Received get_integrated_timeline request');
    const { participantId, sessionId } = data.body || data;
    const result = await workflows.timelineIntegratedWorkflow(daprClient, {
      participantId,
      sessionId
    });
    return result;
  });

  // BDD Test Workflow
  await server.invoker.listen('run_bdd_test', async (data: any) => {
    console.log('Received run_bdd_test request');
    const { featurePath } = data.body || data || {};
    const result = await workflows.bddTestWorkflow({ featurePath });
    return result;
  });

  // Run Cucumber BDD Workflow
  await server.invoker.listen('run_cucumber_tests', async (data: any) => {
    console.log('Received run_cucumber_tests request');
    const { feature } = data.body || data || {};
    const result = await workflows.runBDDWorkflow({ featurePath: feature });
    return result;
  });

  // Assessment Workflow endpoints

  // Initialize assessment
  await server.invoker.listen('assessment/initialize', async (data: any) => {
    console.log('Received assessment/initialize request');
    const { participantId, email, mode } = data.body || data;
    const result = await workflows.initializeAssessment(daprClient, participantId, email, mode);
    return result;
  });

  // Get assessment state (query)
  await server.invoker.listen('assessment/status', async (data: any) => {
    console.log('Received assessment/status request');
    const { participantId } = data.body || data;
    const result = await workflows.getAssessmentState(daprClient, participantId);
    return result || { error: 'Assessment not found' };
  });

  // Update consent (signal)
  await server.invoker.listen('assessment/update-consent', async (data: any) => {
    console.log('Received assessment/update-consent request');
    const { participantId, demographics } = data.body || data;
    const result = await workflows.updateConsent(daprClient, participantId, demographics);
    return result || { error: 'Assessment not found' };
  });

  // Start session (signal)
  await server.invoker.listen('assessment/start-session', async (data: any) => {
    console.log('Received assessment/start-session request');
    const { participantId, sessionNumber } = data.body || data;
    const result = await workflows.startSession(daprClient, participantId, sessionNumber);
    return result || { error: 'Assessment not found' };
  });

  // Record word response (signal)
  await server.invoker.listen('assessment/record-response', async (data: any) => {
    console.log('Received assessment/record-response request');
    const { participantId, response } = data.body || data;
    const result = await workflows.recordWordResponse(daprClient, participantId, response);
    return result || { error: 'Assessment not found' };
  });

  // Update artifact (signal)
  await server.invoker.listen('assessment/update-artifact', async (data: any) => {
    console.log('Received assessment/update-artifact request');
    const { participantId, artifact } = data.body || data;
    const result = await workflows.updateArtifact(daprClient, participantId, artifact);
    return result || { error: 'Assessment not found' };
  });

  // Complete assessment (signal)
  await server.invoker.listen('assessment/complete', async (data: any) => {
    console.log('Received assessment/complete request');
    const { participantId } = data.body || data;
    const result = await workflows.completeAssessment(daprClient, participantId);
    return result || { error: 'Assessment not found' };
  });

  // Delete assessment
  await server.invoker.listen('assessment/delete', async (data: any) => {
    console.log('Received assessment/delete request');
    const { participantId } = data.body || data;
    await workflows.deleteAssessment(daprClient, participantId);
    return { success: true };
  });

  // Individual activity endpoints for direct invocation

  await server.invoker.listen('activity/detect_gap_areas', async (data: any) => {
    console.log('Received activity/detect_gap_areas request');
    const { nodes, links, emotionVectors, sessionData, options } = data.body || data;
    return await activities.detectGapAreasActivity(nodes, links, emotionVectors, sessionData, options);
  });

  await server.invoker.listen('activity/analyze_density', async (data: any) => {
    console.log('Received activity/analyze_density request');
    const { nodes, options } = data.body || data;
    return await activities.analyzeDensityActivity(nodes, options);
  });

  await server.invoker.listen('activity/detect_duplicates', async (data: any) => {
    console.log('Received activity/detect_duplicates request');
    const { nodes, emotionVectors, sessionData, options } = data.body || data;
    return await activities.detectDuplicatesActivity(nodes, emotionVectors, sessionData, options);
  });

  await server.invoker.listen('activity/detect_ghost_patterns', async (data: any) => {
    console.log('Received activity/detect_ghost_patterns request');
    const { nodes, emotionVectors, sessionData, options } = data.body || data;
    return await activities.detectGhostPatternsActivity(nodes, emotionVectors, sessionData, options);
  });

  // Health check endpoint
  await server.invoker.listen('health', async () => {
    return { status: 'healthy', service: 'dapr-ts-worker' };
  });

  // Start the server
  await server.start();
  console.log(`Dapr TypeScript Worker started on port ${APP_PORT}`);
  console.log('Available endpoints:');
  console.log('  - run_structure_analysis');
  console.log('  - get_integrated_timeline');
  console.log('  - run_bdd_test');
  console.log('  - run_cucumber_tests');
  console.log('  - assessment/initialize');
  console.log('  - assessment/status');
  console.log('  - assessment/update-consent');
  console.log('  - assessment/start-session');
  console.log('  - assessment/record-response');
  console.log('  - assessment/update-artifact');
  console.log('  - assessment/complete');
  console.log('  - assessment/delete');
  console.log('  - activity/*');
  console.log('  - health');
}

run().catch((err) => {
  console.error('Failed to start Dapr TypeScript Worker:', err);
  process.exit(1);
});
