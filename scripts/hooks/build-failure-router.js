#!/usr/bin/env node
/**
 * PostToolUse Hook: Build failure router.
 *
 * Detects compile/type/build errors in Bash command output and suggests
 * invoking the build-error-resolver agent with the relevant error context.
 *
 * Triggers on: PostToolUse Bash
 * Condition:   Output contains language-specific error patterns
 * Action:      Advisory message (never blocking)
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { logHook } from './hook-logger.js';

// ─── Error Patterns ────────────────────────────────────────────────────────

const BUILD_ERRORS = [
  { lang: 'TypeScript', pattern: /\berror TS\d+:|Found \d+ error/ },
  { lang: 'Go',         pattern: /\b(cannot find|undefined:|syntax error:|declared and not used|imported and not used)\b/ },
  { lang: 'Python',     pattern: /\b(SyntaxError|IndentationError|ModuleNotFoundError|ImportError|NameError):/  },
  { lang: 'Rust',       pattern: /\berror\[E\d+\]:|^error: /m },
  { lang: 'Java',       pattern: /\berror: (cannot find symbol|incompatible types|package .+ does not exist)/ },
  { lang: 'npm/node',   pattern: /\bERROR in |Module not found:|Cannot find module / },
  { lang: 'Generic',    pattern: /\bbuild failed\b|\bcompilation failed\b|\bexited with code [1-9]/i },
];

// ─── Config helpers ─────────────────────────────────────────────────────────

function isDisabled() {
  for (const configPath of [
    path.join(process.cwd(), '.clarc', 'hooks-config.json'),
    path.join(os.homedir(), '.clarc', 'hooks-config.json'),
  ]) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (cfg.disabled?.includes('build-failure-router')) return true;
    } catch { /* not found */ }
  }
  return false;
}

// ─── Main ──────────────────────────────────────────────────────────────────

const MAX_STDIN = 512 * 1024;
let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  if (data.length < MAX_STDIN) data += chunk.substring(0, MAX_STDIN - data.length);
});

process.stdin.on('end', () => {
  const start = Date.now();
  try {
    if (isDisabled()) { process.exit(0); }

    const input = JSON.parse(data);
    const cmd = input.tool_input?.command || '';
    const output = input.tool_response?.output || input.tool_output?.output || '';

    // Only check build/compile/test/type-check commands
    const isBuildCmd = /\b(tsc|go build|go vet|cargo build|cargo check|mvn|gradle|npm run build|pnpm build|bun run build|python -m|pytest|jest|vitest)\b/.test(cmd);
    if (!isBuildCmd) { process.exit(0); }

    for (const { lang, pattern } of BUILD_ERRORS) {
      if (pattern.test(output)) {
        console.error(`[build-failure-router] ${lang} build error detected.`);
        console.error('[build-failure-router] → Use the build-error-resolver agent to fix this.');
        console.error('[build-failure-router]   You can say: "fix the build error" or invoke the agent directly.');
        logHook('build-failure-router', 'Bash', cmd.slice(0, 60), 0, Date.now() - start);
        process.exit(0);
      }
    }
  } catch {
    // Invalid input — pass through silently
  }

  logHook('build-failure-router', 'Bash', '', 0, Date.now() - start);
  process.exit(0);
});
