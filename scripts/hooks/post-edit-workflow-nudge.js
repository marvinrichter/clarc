#!/usr/bin/env node
/**
 * PostToolUse Hook: Workflow nudges after Edit/Write.
 *
 * Combines 4 advisory checks in a single async process to minimize overhead.
 * All nudges are suppressible via .clarc/hooks-config.json.
 *
 * Checks:
 *  1. security-scan-nudge  — file path contains auth/secret/token/api keywords
 *  2. code-review-nudge    — source file changed (with 5-min cooldown)
 *  3. doc-update-nudge     — new clarc component written (agents/skills/commands)
 *  4. tdd-sequence-guard   — source file written with no test counterpart
 *
 * Config: .clarc/hooks-config.json (project-local) or ~/.clarc/hooks-config.json (global)
 * {
 *   "disabled": ["code-review-nudge", "tdd-sequence-guard"],
 *   "code_review_cooldown_minutes": 5
 * }
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

// ─── Extension sets ─────────────────────────────────────────────────────────

const SOURCE_EXTS = new Set(['.ts', '.tsx', '.js', '.mjs', '.cjs', '.go', '.py', '.java', '.kt', '.rs', '.rb', '.ex', '.exs', '.cs', '.swift', '.cpp', '.c', '.php', '.scala']);
const TEST_INDICATORS = ['.test.', '.spec.', '_test.', 'test_', '/test/', '/tests/', '/spec/', '__tests__/'];

// ─── Security-sensitive path keywords ───────────────────────────────────────

const SECURITY_KEYWORDS = /\b(auth|authn|authz|login|logout|token|secret|password|passwd|credential|oauth|jwt|session|permission|role|rbac|acl|api[_-]?key|cors|csrf|xss|crypto|encrypt|decrypt|sign|verify)\b/i;

// ─── Clarc component directories ────────────────────────────────────────────

const CLARC_ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '../..');
const COMPONENT_DIRS = [
  path.join(CLARC_ROOT, 'agents'),
  path.join(CLARC_ROOT, 'skills'),
  path.join(CLARC_ROOT, 'commands'),
];

// ─── Config helpers ──────────────────────────────────────────────────────────

function loadConfig() {
  for (const configPath of [
    path.join(process.cwd(), '.clarc', 'hooks-config.json'),
    path.join(os.homedir(), '.clarc', 'hooks-config.json'),
  ]) {
    try { return JSON.parse(fs.readFileSync(configPath, 'utf8')); } catch { /* not found */ }
  }
  return {};
}

function isDisabled(cfg, hookId) {
  return Array.isArray(cfg.disabled) && cfg.disabled.includes(hookId);
}

// ─── Cooldown helpers ────────────────────────────────────────────────────────

const COOLDOWN_PATH = path.join(os.homedir(), '.clarc', 'nudge-cooldown.json');

function isCoolingDown(hookId, minutes = 5) {
  try {
    const cooldowns = JSON.parse(fs.readFileSync(COOLDOWN_PATH, 'utf8'));
    const last = cooldowns[hookId];
    if (last && (Date.now() - last) < minutes * 60 * 1000) return true;
  } catch { /* not found */ }
  return false;
}

function setCooldown(hookId) {
  let cooldowns = {};
  try { cooldowns = JSON.parse(fs.readFileSync(COOLDOWN_PATH, 'utf8')); } catch { /* not found */ }
  cooldowns[hookId] = Date.now();
  try {
    fs.mkdirSync(path.dirname(COOLDOWN_PATH), { recursive: true });
    fs.writeFileSync(COOLDOWN_PATH, JSON.stringify(cooldowns), 'utf8');
  } catch { /* write failed — ignore */ }
}

// ─── TDD: find test counterpart ──────────────────────────────────────────────

function isTestFile(filePath) {
  return TEST_INDICATORS.some(ind => filePath.includes(ind));
}

function hasTestCounterpart(filePath) {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath, path.extname(filePath));
  const ext = path.extname(filePath);

  // Common test file patterns to check
  const candidates = [
    path.join(dir, `${base}.test${ext}`),
    path.join(dir, `${base}.spec${ext}`),
    path.join(dir, `${base}_test${ext}`),
    path.join(dir, '..', 'tests', `${base}.test${ext}`),
    path.join(dir, '..', 'tests', `test_${base}${ext}`),
    path.join(dir, '__tests__', `${base}.test${ext}`),
  ];

  return candidates.some(p => fs.existsSync(p));
}

// ─── Main ──────────────────────────────────────────────────────────────────

const MAX_STDIN = 256 * 1024;
let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  if (data.length < MAX_STDIN) data += chunk.substring(0, MAX_STDIN - data.length);
});

process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const filePath = input.tool_input?.file_path || '';
    const toolName = input.tool_name || '';
    if (!filePath) process.exit(0);

    const cfg = loadConfig();
    const ext = path.extname(filePath).toLowerCase();
    const isSource = SOURCE_EXTS.has(ext);
    const isTest = isTestFile(filePath);
    const isWrite = toolName === 'Write';
    const isComponent = COMPONENT_DIRS.some(d => filePath.startsWith(d));

    // 1. Security scan nudge (with cooldown, same mechanism as code-review-nudge)
    if (!isDisabled(cfg, 'security-scan-nudge') && isSource && SECURITY_KEYWORDS.test(filePath)) {
      const cooldownMinutes = cfg.code_review_cooldown_minutes ?? 5;
      if (!isCoolingDown('security-scan-nudge', cooldownMinutes)) {
        console.error('[SECURITY] File touches security-sensitive area.');
        console.error('[SECURITY] → Consider running the security-reviewer agent.');
        console.error('[SECURITY]   Say: "review this for security issues" or use the Agent tool with security-reviewer.');
        setCooldown('security-scan-nudge');
      }
    }

    // 2. Code review nudge (with cooldown, skip test files)
    if (!isDisabled(cfg, 'code-review-nudge') && isSource && !isTest) {
      const cooldownMinutes = cfg.code_review_cooldown_minutes ?? 5;
      if (!isCoolingDown('code-review-nudge', cooldownMinutes)) {
        console.error('[code-review] Source file modified — consider running code-reviewer.');
        console.error('[code-review] → Say: "review this code" or invoke the code-reviewer agent.');
        setCooldown('code-review-nudge');
      }
    }

    // 3. Doc update nudge (Write only, clarc component directories)
    if (!isDisabled(cfg, 'doc-update-nudge') && isWrite && isComponent) {
      console.error('[doc-update] New clarc component detected.');
      console.error('[doc-update] → Run /update-codemaps and /update-docs to keep the index current.');
    }

    // 4. TDD sequence guard (Write only, source files, no test file)
    if (!isDisabled(cfg, 'tdd-sequence-guard') && isWrite && isSource && !isTest) {
      if (!hasTestCounterpart(filePath)) {
        const rel = path.relative(process.cwd(), filePath);
        console.error(`[tdd-guard] No test file found for ${rel}`);
        console.error('[tdd-guard] → TDD workflow: write the test first, then implement.');
        console.error('[tdd-guard]   Disable this nudge: add "tdd-sequence-guard" to disabled[] in .clarc/hooks-config.json');
      }
    }
  } catch {
    // Invalid input — pass through silently
  }

  process.exit(0);
});
