#!/usr/bin/env node
/**
 * PostToolUse Hook: Lightweight system health check after editing clarc components.
 *
 * Triggered on: Edit/Write to agents/, skills/, commands/ directories.
 * Runs in <100ms to provide immediate feedback.
 *
 * Checks:
 * 1. Frontmatter present (name/description field)
 * 2. File references other clarc components → verifies they exist
 * 3. Naming convention not violated (lowercase-hyphen)
 *
 * Output:
 *   ✅ Silent on success
 *   ⚠️  [system-health] <message> on issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../..');

const AGENTS_DIR = path.join(ROOT, 'agents');
const SKILLS_DIR = path.join(ROOT, 'skills');
const COMMANDS_DIR = path.join(ROOT, 'commands');

const LOWERCASE_HYPHEN = /^[a-z][a-z0-9-]*\.(md|json|js)$/;

// ─── Helpers ───────────────────────────────────────────────────────────────

function warn(message) {
  process.stderr.write(`\u26A0\uFE0F  [system-health] ${message}\n`);
}

function hasFrontmatter(content, requiredField) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return false;
  return match[1].includes(`${requiredField}:`);
}

function findMatches(content, pattern) {
  const results = [];
  for (const m of content.matchAll(pattern)) {
    if (m[1]) results.push(m[1]);
  }
  return results;
}

// ─── Check 1: Frontmatter ───────────────────────────────────────────────────

function checkFrontmatter(filePath, content) {
  const rel = path.relative(ROOT, filePath);

  if (filePath.startsWith(AGENTS_DIR)) {
    if (!hasFrontmatter(content, 'name')) warn(`${rel} — missing 'name:' in frontmatter`);
    if (!hasFrontmatter(content, 'description')) warn(`${rel} — missing 'description:' in frontmatter`);
    if (!hasFrontmatter(content, 'model')) warn(`${rel} — missing 'model:' in frontmatter`);
  }

  if (filePath.startsWith(COMMANDS_DIR)) {
    if (!hasFrontmatter(content, 'description')) warn(`${rel} — missing 'description:' in frontmatter`);
  }
}

// ─── Check 2: Cross-References ─────────────────────────────────────────────

function checkReferences(filePath, content) {
  const rel = path.relative(ROOT, filePath);

  // Agent references: "invoke the X agent", "launch X agent"
  const agentPattern = /(?:invoke|launch|delegate[sd]? to)\s+(?:the\s+)?[*`]?([a-z][\w-]+)[`*]?\s+agent/gi;
  for (const ref of findMatches(content, agentPattern)) {
    if (!['single', 'each', 'any', 'an', 'the'].includes(ref)) {
      const agentPath = path.join(AGENTS_DIR, `${ref}.md`);
      if (!fs.existsSync(agentPath)) {
        warn(`${rel} — broken reference: agents/${ref}.md (not found)`);
      }
    }
  }

  // Skill references: "skills/foo-bar/SKILL.md" or "skill: foo-bar"
  const skillPattern = /skills\/([a-z][\w-]+)\/SKILL\.md/g;
  for (const ref of findMatches(content, skillPattern)) {
    const skillPath = path.join(SKILLS_DIR, ref, 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      warn(`${rel} — broken reference: skills/${ref}/SKILL.md (not found)`);
    }
  }
}

// ─── Check 3: Naming Convention ────────────────────────────────────────────

function checkNaming(filePath) {
  const fileName = path.basename(filePath);
  const rel = path.relative(ROOT, filePath);

  const isClarcComponent =
    filePath.startsWith(AGENTS_DIR) ||
    filePath.startsWith(SKILLS_DIR) ||
    filePath.startsWith(COMMANDS_DIR);

  if (isClarcComponent && !LOWERCASE_HYPHEN.test(fileName)) {
    warn(`${rel} — naming violation: expected lowercase-hyphen (e.g. code-reviewer.md)`);
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

const MAX_STDIN = 1024 * 1024;
let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  if (data.length < MAX_STDIN) data += chunk.substring(0, MAX_STDIN - data.length);
});

process.stdin.on('end', () => {
  let filePath = null;
  try {
    const input = JSON.parse(data);
    filePath = input.tool_input?.file_path || input.tool_input?.path;
  } catch {
    process.exit(0);
  }

  if (!filePath) process.exit(0);

  // Only check clarc component files
  const isComponent =
    filePath.startsWith(AGENTS_DIR) ||
    filePath.startsWith(COMMANDS_DIR) ||
    (filePath.startsWith(SKILLS_DIR) && filePath.endsWith('SKILL.md'));

  if (!isComponent) process.exit(0);
  if (!fs.existsSync(filePath)) process.exit(0);

  let content = '';
  try {
    content = fs.readFileSync(filePath, 'utf8');
  } catch {
    process.exit(0);
  }

  checkFrontmatter(filePath, content);
  checkReferences(filePath, content);
  checkNaming(filePath);

  process.exit(0);
});
