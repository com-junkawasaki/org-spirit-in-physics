#!/usr/bin/env node

/**
 * Pact Test Watcher for Spirit in Physics
 * Monitors file changes and runs Pact tests automatically
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const WATCH_DIRS = [
  'apps/backend/src/main/kotlin',
  'apps/patient/lib',
  'apps/patient/__tests__/pact',
  'apps/admin/src',
  'apps/visualizer/lib'
];

const WATCH_EXTENSIONS = ['.kt', '.ts', '.tsx', '.js', '.spec.ts'];

let debounceTimer = null;
const DEBOUNCE_DELAY = 2000; // 2 seconds

function runPactTests() {
  console.log('\n🧪 Running Pact Contract Tests...');

  const pactScript = spawn('./scripts/local-dev-pact.sh', [], {
    stdio: 'inherit',
    shell: true
  });

  pactScript.on('close', (code) => {
    if (code === 0) {
      console.log('✅ Pact tests completed successfully');
    } else {
      console.log('❌ Pact tests failed');
    }
  });

  pactScript.on('error', (error) => {
    console.error('Error running Pact tests:', error);
  });
}

function shouldTriggerTest(filePath) {
  const ext = path.extname(filePath);
  return WATCH_EXTENSIONS.includes(ext) &&
         WATCH_DIRS.some(dir => filePath.includes(dir));
}

function watchFiles() {
  WATCH_DIRS.forEach(dir => {
    const fullPath = path.join(process.cwd(), dir);

    if (!fs.existsSync(fullPath)) {
      console.log(`⚠️  Watch directory not found: ${fullPath}`);
      return;
    }

    console.log(`👀 Watching: ${dir}`);

    fs.watch(fullPath, { recursive: true }, (eventType, filename) => {
      if (filename && shouldTriggerTest(filename)) {
        console.log(`📝 File changed: ${filename}`);

        // Debounce test execution
        if (debounceTimer) {
          clearTimeout(debounceTimer);
        }

        debounceTimer = setTimeout(() => {
          runPactTests();
        }, DEBOUNCE_DELAY);
      }
    });
  });
}

function startWatcher() {
  console.log('🚀 Starting Pact Test Watcher');
  console.log('Watching directories:');
  WATCH_DIRS.forEach(dir => console.log(`  - ${dir}`));
  console.log('\nFile extensions monitored:', WATCH_EXTENSIONS.join(', '));
  console.log('\nPress Ctrl+C to stop watching\n');

  // Initial test run
  runPactTests();

  // Start file watching
  watchFiles();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Stopping Pact Test Watcher...');
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  process.exit(0);
});

if (require.main === module) {
  startWatcher();
}

module.exports = { startWatcher };
