#!/usr/bin/env node
/**
 * Run all tests — parallel execution for faster feedback.
 *
 * Usage: node tests/run-all.js
 *
 * All test files run concurrently. Results are printed in deterministic
 * order (same as the testFiles array) after all processes complete.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testsDir = __dirname;
const testFiles = [
  'lib/utils.test.js',
  'lib/package-manager.test.js',
  'lib/session-manager.test.js',
  'lib/session-aliases.test.js',
  'lib/project-detect.test.js',
  'lib/skill-search.test.js',
  'hooks/hooks.test.js',
  'hooks/evaluate-session.test.js',
  'hooks/suggest-compact.test.js',
  'integration/hooks.test.js',
  'ci/validators.test.js',
  'scripts/claw.test.js',
  'scripts/setup-package-manager.test.js',
  'scripts/skill-create-output.test.js',
  'scripts/install-manifest.test.js',
  'evals/agents.eval.js',
  'evals/commands.eval.js',
  'evals/skills.eval.js',
  'artifacts/hooks.test.js',
  'mcp/mcp-server.test.js',
  'scripts/install.test.js',
  'scripts/validate-quality.test.js'
];

const BOX_W = 58;
const boxLine = s => `║${s.padEnd(BOX_W)}║`;

console.log('╔' + '═'.repeat(BOX_W) + '╗');
console.log(boxLine('           Everything Claude Code - Test Suite'));
console.log('╚' + '═'.repeat(BOX_W) + '╝');
console.log();

/**
 * Spawn a single test file and collect all output + timing.
 * Resolves when the process exits.
 */
function runFile(testFile) {
  const testPath = path.join(testsDir, testFile);
  if (!fs.existsSync(testPath)) {
    return Promise.resolve({ testFile, stdout: '', stderr: '', skipped: true });
  }

  return new Promise(resolve => {
    const start = Date.now();
    let stdout = '';
    let stderr = '';

    const proc = spawn(process.execPath, [testPath], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    proc.stdout.on('data', d => (stdout += d));
    proc.stderr.on('data', d => (stderr += d));

    proc.on('close', () => {
      resolve({ testFile, stdout, stderr, elapsed: Date.now() - start, skipped: false });
    });
  });
}

// Launch all tests in parallel
const results = await Promise.all(testFiles.map(runFile));

let totalPassed = 0;
let totalFailed = 0;

for (const { testFile, stdout, stderr, elapsed, skipped } of results) {
  if (skipped) {
    console.log(`⚠ Skipping ${testFile} (file not found)`);
    continue;
  }

  const elapsedStr = elapsed >= 1000
    ? `${(elapsed / 1000).toFixed(1)}s`
    : `${elapsed}ms`;

  console.log(`\n━━━ Running ${testFile} (${elapsedStr}) ━━━`);

  if (stdout) console.log(stdout);
  if (stderr) console.log(stderr);

  const combined = stdout + stderr;
  const passedMatch = combined.match(/Passed:\s*(\d+)/);
  const failedMatch = combined.match(/Failed:\s*(\d+)/);

  if (passedMatch) totalPassed += parseInt(passedMatch[1], 10);
  if (failedMatch) totalFailed += parseInt(failedMatch[1], 10);
}

const totalTests = totalPassed + totalFailed;

console.log('\n╔' + '═'.repeat(BOX_W) + '╗');
console.log(boxLine('                     Final Results'));
console.log('╠' + '═'.repeat(BOX_W) + '╣');
console.log(boxLine(`  Total Tests: ${String(totalTests).padStart(4)}`));
console.log(boxLine(`  Passed:      ${String(totalPassed).padStart(4)}  ✓`));
console.log(boxLine(`  Failed:      ${String(totalFailed).padStart(4)}  ${totalFailed > 0 ? '✗' : ' '}`));
console.log('╚' + '═'.repeat(BOX_W) + '╝');

process.exit(totalFailed > 0 ? 1 : 0);
