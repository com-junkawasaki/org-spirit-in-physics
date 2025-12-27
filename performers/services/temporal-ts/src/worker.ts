import { Worker, NativeConnection } from '@temporalio/worker';
import * as activities from './activities';
import * as bddActivities from './bdd_activities';

async function run() {
  const address = process.env.TEMPORAL_ADDRESS || 'localhost:7233';
  console.log(`Connecting to Temporal at ${address}...`);
  
  const connection = await NativeConnection.connect({
    address: address,
  });

  const worker = await Worker.create({
    connection,
    workflowsPath: require.resolve('./workflows'),
    activities: { ...activities, ...bddActivities },
    taskQueue: process.env.TASK_QUEUE || 'visualization-analysis-queue',
  });

  console.log('Visualization Analysis Temporal Worker started...');
  await worker.run();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
