import { serve } from 'inngest/next';
import {
  fileImportWorkflow,
  fileImportFailureWorkflow,
  windowsGenerationWorkflow,
  kernelFusionWorkflow,
  kernelFusionFailureWorkflow,
  inngest,
} from '@/lib/researcher/workflows';

// Inngest API route handler (Next.js format)
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    // File import workflows
    fileImportWorkflow,
    fileImportFailureWorkflow,
    
    // Window generation workflow
    windowsGenerationWorkflow,
    
    // Kernel fusion workflow
    kernelFusionWorkflow,
    kernelFusionFailureWorkflow,
  ],
});
