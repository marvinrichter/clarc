#!/usr/bin/env node
/**
 * Artifact tests for hooks/hooks.json
 *
 * Validates:
 *   - hooks.json is valid JSON
 *   - Top-level structure: { hooks: { <EventName>: [...] } }
 *   - All event names are from the known Claude Code set
 *   - Each hook entry has matcher + hooks array with type and command
 *   - Every node script referenced in a command actually exists on disk
 *   - Every shell script referenced in a command actually exists on disk
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const HOOKS_FILE = path.join(REPO_ROOT, 'hooks', 'hooks.json');

const VALID_EVENTS = new Set([
  'SessionStart', 'SessionEnd',
  'PreToolUse', 'PostToolUse',
  'PreCompact',
  'Stop', 'Notification'
]);

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// ─── Parse hooks.json ────────────────────────────────────────────────────────

console.log('\n--- hooks.json structure ---\n');

let hooksJson = null;

test('hooks.json exists', () => {
  assert(fs.existsSync(HOOKS_FILE), `Not found: ${HOOKS_FILE}`);
});

test('hooks.json is valid JSON', () => {
  const raw = fs.readFileSync(HOOKS_FILE, 'utf8');
  hooksJson = JSON.parse(raw); // throws on invalid JSON
});

if (!hooksJson) {
  console.log('\nPassed:', passed);
  console.log('Failed:', failed);
  process.exit(failed > 0 ? 1 : 0);
}

test('top-level has hooks object', () => {
  assert(hooksJson.hooks && typeof hooksJson.hooks === 'object',
    'Expected top-level "hooks" object');
});

test('at least 3 event types defined', () => {
  const count = Object.keys(hooksJson.hooks || {}).length;
  assert(count >= 3, `Only ${count} event types — expected at least 3`);
});

// ─── Event name validation ───────────────────────────────────────────────────

console.log('\n--- Event name validation ---\n');

for (const eventName of Object.keys(hooksJson.hooks || {})) {
  test(`event "${eventName}" is a known Claude Code event`, () => {
    assert(VALID_EVENTS.has(eventName),
      `Unknown event: "${eventName}". Valid events: ${[...VALID_EVENTS].join(', ')}`);
  });
}

// ─── Hook entry structure ────────────────────────────────────────────────────

console.log('\n--- Hook entry structure ---\n');

for (const [eventName, entries] of Object.entries(hooksJson.hooks || {})) {
  test(`${eventName}: is an array`, () => {
    assert(Array.isArray(entries), `Expected array, got ${typeof entries}`);
  });

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const label = `${eventName}[${i}]`;

    test(`${label}: has matcher field`, () => {
      assert(typeof entry.matcher === 'string' && entry.matcher.length > 0,
        'matcher must be a non-empty string');
    });

    test(`${label}: has hooks array`, () => {
      assert(Array.isArray(entry.hooks) && entry.hooks.length > 0,
        'hooks must be a non-empty array');
    });

    for (let j = 0; j < (entry.hooks || []).length; j++) {
      const hook = entry.hooks[j];
      const hookLabel = `${label}.hooks[${j}]`;

      test(`${hookLabel}: has type field`, () => {
        assert(typeof hook.type === 'string', 'type must be a string');
      });

      test(`${hookLabel}: has command field`, () => {
        assert(typeof hook.command === 'string' && hook.command.length > 0,
          'command must be a non-empty string');
      });
    }
  }
}

// ─── Referenced script existence ─────────────────────────────────────────────

console.log('\n--- Referenced scripts exist ---\n');

/** Extract path from a hook command, resolving ${CLAUDE_PLUGIN_ROOT} to REPO_ROOT */
function extractScriptPath(command) {
  // Replace the env var placeholder
  const resolved = command
    .replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, REPO_ROOT)
    .replace(/\$CLAUDE_PLUGIN_ROOT/g, REPO_ROOT);

  // Match: node "path" or node path or bash/sh "path" or bare path to .sh
  const nodeMatch = resolved.match(/node\s+"([^"]+)"/);
  if (nodeMatch) return nodeMatch[1];
  const nodeMatchUnquoted = resolved.match(/node\s+(\S+\.js)/);
  if (nodeMatchUnquoted) return nodeMatchUnquoted[1];
  const shellMatch = resolved.match(/(?:bash|sh)\s+"([^"]+\.sh)"/);
  if (shellMatch) return shellMatch[1];
  const bareShMatch = resolved.match(/^(\S+\.sh)/);
  if (bareShMatch) return bareShMatch[1].replace(/\$\{CLAUDE_PLUGIN_ROOT\}/g, REPO_ROOT);
  // Bare path (no node/bash prefix) pointing to a script file
  const bareMatch = resolved.match(/^"?([^"]+\.(js|sh))"?$/);
  if (bareMatch) return bareMatch[1];
  return null;
}

const checkedPaths = new Set();

for (const [eventName, entries] of Object.entries(hooksJson.hooks || {})) {
  for (let i = 0; i < entries.length; i++) {
    for (const hook of (entries[i].hooks || [])) {
      const scriptPath = extractScriptPath(hook.command || '');
      if (!scriptPath || checkedPaths.has(scriptPath)) continue;
      checkedPaths.add(scriptPath);

      const rel = path.relative(REPO_ROOT, scriptPath);
      test(`script exists: ${rel}`, () => {
        assert(fs.existsSync(scriptPath),
          `Script not found: ${scriptPath}\n    (from ${eventName}[${i}] command: ${hook.command})`);
      });
    }
  }
}

// ─── Results ──────────────────────────────────────────────────────────────────

console.log(`\nPassed: ${passed}`);
console.log(`Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
