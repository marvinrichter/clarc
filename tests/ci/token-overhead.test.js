/**
 * Token overhead regression test for session-start.js
 *
 * Runs the session-start hook in a cold-start fixture (no session files, no .clarc/,
 * no agent instincts, no git history) and asserts the injected output stays within
 * a defined character budget (~2000 tokens).
 *
 * This test prevents regressions where new output() calls are added without
 * accounting for their context window cost.
 *
 * Run with: node tests/ci/token-overhead.test.js
 */

import assert from 'assert';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSION_START = path.join(__dirname, '../../scripts/hooks/session-start.js');

// Approximate token budget: chars / 4 ≈ tokens. 8000 chars ≈ 2000 tokens.
const COLD_START_BUDGET_CHARS = 8000;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

/**
 * Run session-start in a temporary directory with minimal state.
 * Returns the captured stdout (what gets injected into Claude's context).
 */
function runSessionStart(cwd, env = {}) {
  const result = spawnSync(process.execPath, [SESSION_START], {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 15000,
    env: {
      ...process.env,
      HOME: cwd,                 // isolate from real ~/.clarc/
      CLARC_SESSIONS_DIR: path.join(cwd, 'sessions'),
      CLARC_LEARNED_DIR: path.join(cwd, 'learned'),
      ...env,
    },
  });
  return {
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    code: result.status,
  };
}

function runTests() {
  console.log('\n=== Testing session-start token overhead ===\n');

  let passed = 0;
  let failed = 0;

  // ── Cold start: empty directory, no history ──
  if (test(`cold-start output stays under ${COLD_START_BUDGET_CHARS} chars (~${Math.round(COLD_START_BUDGET_CHARS / 4)} tokens)`, () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'token-overhead-test-'));

    // Create bare directories so session-start doesn't error
    fs.mkdirSync(path.join(tmp, 'sessions'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'learned'), { recursive: true });

    try {
      const { stdout, code } = runSessionStart(tmp);
      assert.ok(
        code === 0 || code === null,
        `session-start exited with code ${code}`
      );
      assert.ok(
        stdout.length <= COLD_START_BUDGET_CHARS,
        `Cold-start output exceeds budget: ${stdout.length} chars (limit: ${COLD_START_BUDGET_CHARS})\n` +
        `Approximate tokens: ~${Math.round(stdout.length / 4)}\n` +
        `Output preview:\n${stdout.slice(0, 500)}`
      );
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  // ── Output is deterministic (no timestamps or random tokens in output) ──
  if (test('cold-start output is stable across two runs', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'token-overhead-stable-'));
    fs.mkdirSync(path.join(tmp, 'sessions'), { recursive: true });
    fs.mkdirSync(path.join(tmp, 'learned'), { recursive: true });

    try {
      const run1 = runSessionStart(tmp);
      const run2 = runSessionStart(tmp);

      // Both runs should produce the same stdout (no stochastic content)
      // Strip any date lines that include today's date (repomap has a date stamp)
      const normalize = s => s.replace(/\d{4}-\d{2}-\d{2}/g, 'DATE');
      assert.strictEqual(
        normalize(run1.stdout),
        normalize(run2.stdout),
        'Output differed between runs — session-start has non-deterministic output'
      );
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
