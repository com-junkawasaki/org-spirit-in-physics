import { serve } from 'inngest/next';
import { inngest } from '@/lib/participant/inngest';
import {
  videoAnalysisWorkflow,
  videoAnalysisFailureWorkflow,
  resultsProcessingWorkflow
} from '@/lib/participant/supervisors';
import {
  batchAnalysisWorkflow,
  batchAnalysisFailureWorkflow
} from '@/lib/participant/supervisors';

// Inngest API route handler (Next.js format)
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // Video analysis workflows
    videoAnalysisWorkflow,
    videoAnalysisFailureWorkflow,
    resultsProcessingWorkflow,

    // Batch analysis workflows
    batchAnalysisWorkflow,
    batchAnalysisFailureWorkflow,
  ],
});
