import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execPromise = promisify(exec);

export async function runCucumberTests(feature?: string): Promise<{ success: boolean; output: string; error?: string }> {
  const bddDirPath = path.resolve(process.cwd(), './bdd');
  // We use npx cucumber-js with the necessary loader and import flags
  const command = `npx cucumber-js ${feature || ''} --import 'step_definitions/*.ts' --loader ts-node/esm`;

  try {
    const { stdout, stderr } = await execPromise(command, { 
      cwd: bddDirPath,
      env: { ...process.env, NODE_OPTIONS: '--loader ts-node/esm --no-warnings' }
    });
    return {
      success: true,
      output: stdout + (stderr ? `\nStderr: ${stderr}` : '')
    };
  } catch (error: any) {
    return {
      success: false,
      output: error.stdout || '',
      error: error.message || 'Cucumber test failed'
    };
  }
}

