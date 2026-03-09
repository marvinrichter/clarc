#!/usr/bin/env node
/**
 * SessionStart Hook: Context-aware command banner.
 *
 * Detects project stack and prints the top 3 most relevant clarc commands
 * for this project type. Fires once per session, suppressible via config.
 *
 * Suppression: .clarc/config.json { "suppress_context_banner": true }
 *              or ~/.clarc/config.json { "suppress_context_banner": true }
 *
 * Cooldown: At most once per day (tracked in ~/.clarc/banner-cooldown.json)
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { detectProjectType } from '../lib/project-detect.js';

// ─── Stack → Top 3 Commands ──────────────────────────────────────────────────

const BANNER_MAP = {
  nextjs:     ['/e2e', '/a11y-audit', '/web-perf'],
  react:      ['/e2e', '/a11y-audit', '/storybook-audit'],
  vue:        ['/e2e', '/a11y-audit', '/code-review'],
  angular:    ['/e2e', '/a11y-audit', '/code-review'],
  nuxt:       ['/e2e', '/a11y-audit', '/web-perf'],
  svelte:     ['/e2e', '/a11y-audit', '/code-review'],
  nestjs:     ['/typescript-review', '/database-review', '/security'],
  express:    ['/typescript-review', '/security', '/api-contract'],
  django:     ['/python-review', '/database-review', '/security'],
  fastapi:    ['/python-review', '/security', '/api-contract'],
  flask:      ['/python-review', '/security', '/database-review'],
  spring:     ['/java-review', '/database-review', '/security'],
  rails:      ['/ruby-review', '/database-review', '/security'],
  phoenix:    ['/elixir-review', '/database-review', '/security'],
  gin:        ['/go-review', '/security', '/api-contract'],
  echo:       ['/go-review', '/security', '/api-contract'],
  actix:      ['/rust-review', '/security', '/api-contract'],
  axum:       ['/rust-review', '/security', '/api-contract'],
  laravel:    ['/php-review', '/database-review', '/security'],
  symfony:    ['/php-review', '/database-review', '/security'],
  fullstack:  ['/e2e', '/security', '/code-review'],
  typescript: ['/typescript-review', '/tdd', '/security'],
  javascript: ['/code-review', '/tdd', '/security'],
  python:     ['/python-review', '/tdd', '/security'],
  golang:     ['/go-review', '/go-test', '/go-build'],
  rust:       ['/rust-review', '/rust-test', '/rust-build'],
  ruby:       ['/ruby-review', '/tdd', '/database-review'],
  java:       ['/java-review', '/tdd', '/database-review'],
  swift:      ['/swift-review', '/swift-build', '/tdd'],
  kotlin:     ['/code-review', '/tdd', '/database-review'],
  elixir:     ['/elixir-review', '/tdd', '/database-review'],
  csharp:     ['/code-review', '/tdd', '/database-review'],
  php:        ['/php-review', '/tdd', '/security'],
  unknown:    ['/context', '/plan', '/tdd'],
};

// ─── Config helpers ──────────────────────────────────────────────────────────

function isSuppressed() {
  for (const configPath of [
    path.join(process.cwd(), '.clarc', 'config.json'),
    path.join(os.homedir(), '.clarc', 'config.json'),
  ]) {
    try {
      const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      if (cfg.suppress_context_banner) return true;
    } catch { /* not found */ }
  }
  return false;
}

// ─── Daily cooldown ──────────────────────────────────────────────────────────

const COOLDOWN_PATH = path.join(os.homedir(), '.clarc', 'banner-cooldown.json');
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function hasShownToday() {
  try {
    const state = JSON.parse(fs.readFileSync(COOLDOWN_PATH, 'utf8'));
    return state.lastShown && (Date.now() - state.lastShown) < ONE_DAY_MS;
  } catch { return false; }
}

function markShown() {
  try {
    fs.mkdirSync(path.dirname(COOLDOWN_PATH), { recursive: true });
    fs.writeFileSync(COOLDOWN_PATH, JSON.stringify({ lastShown: Date.now() }), 'utf8');
  } catch { /* ignore */ }
}

// ─── Main ──────────────────────────────────────────────────────────────────

const MAX_STDIN = 64 * 1024;
let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  if (data.length < MAX_STDIN) data += chunk.substring(0, MAX_STDIN - data.length);
});

process.stdin.on('end', () => {
  try {
    if (isSuppressed() || hasShownToday()) {
      process.stdout.write(data);
      process.exit(0);
    }

    const { primary, frameworks, languages } = detectProjectType(process.cwd());
    const stack = primary !== 'unknown' ? primary : (frameworks[0] || languages[0] || 'unknown');

    const commands = BANNER_MAP[stack] || BANNER_MAP.unknown;
    const label = stack === 'unknown' ? 'this project' : stack;

    process.stderr.write(`\n[clarc] ${label} detected → top commands: ${commands.join('  ')}\n`);
    process.stderr.write(`[clarc] Run /context for full recommendations or /guide <task> for a workflow.\n\n`);

    markShown();
  } catch {
    // Never break the session
  }

  process.stdout.write(data);
  process.exit(0);
});
