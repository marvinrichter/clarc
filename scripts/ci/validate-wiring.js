#!/usr/bin/env node
/**
 * Validate cross-component references in clarc.
 *
 * Check A — Commands → Agents: Does a command reference an agent that exists?
 * Check B — Agents → Skills: Does an agent reference a skill that exists?
 * Check C — Skills → Skills: Do cross-skill references resolve?
 * Check D — code-reviewer routing table: All listed agents exist?
 * Check E — Hook dispatch: Does post-edit-format-dispatch.js reference scripts that exist?
 * Check F — hooks.json → scripts: All referenced hook scripts exist?
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../..');

const AGENTS_DIR = path.join(ROOT, 'agents');
const SKILLS_DIR = path.join(ROOT, 'skills');
const COMMANDS_DIR = path.join(ROOT, 'commands');
const HOOKS_JSON = path.join(ROOT, 'hooks/hooks.json');
const DISPATCH_JS = path.join(ROOT, 'scripts/hooks/post-edit-format-dispatch.js');
const HOOKS_SCRIPTS_DIR = path.join(ROOT, 'scripts/hooks');

let errors = 0;
let warnings = 0;

// Common non-agent prose words that may appear before "agent" in documentation
const NON_AGENT_WORDS = new Set([
  'single',
  'each',
  'every',
  'this',
  'that',
  'an',
  'the',
  'a',
  'worker',
  'routing',
  'specialized',
  'individual',
  'specific',
  'new',
  'sub',
  'parallel',
  'background',
  'reviewer',
  'debugger'
]);

function logError(check, message) {
  console.log(`\u2717 [${check}] ${message}`);
  errors++;
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function listFiles(dir, ext) {
  try {
    return fs.readdirSync(dir).filter(f => f.endsWith(ext));
  } catch {
    return [];
  }
}

function findMatches(content, pattern) {
  const results = new Set();
  for (const m of content.matchAll(pattern)) {
    if (m[1]) results.add(m[1]);
  }
  return results;
}

// ─── Check A: Commands → Agents ────────────────────────────────────────────

function checkCommandsToAgents() {
  const commandFiles = listFiles(COMMANDS_DIR, '.md');
  // Require explicit delegation verb: "Invoke the X agent", "Delegate to X agent", "Launch X agent"
  const delegatePattern = /(?:invoke|delegate[sd]? to|launch)\s+(?:the\s+)?[*`]?([a-z][\w-]+)[`*]?\s+agent/gi;
  // Arrow delegation: "→ **agent-name** agent"
  const arrowPattern = /\u2192\s*\*\*([a-z][\w-]+)\*\*\s+agent/gi;

  for (const file of commandFiles) {
    const content = readFile(path.join(COMMANDS_DIR, file));
    if (!content) continue;

    const refs = new Set([...findMatches(content, delegatePattern), ...findMatches(content, arrowPattern)].filter(r => !NON_AGENT_WORDS.has(r)));

    for (const ref of refs) {
      if (!fs.existsSync(path.join(AGENTS_DIR, `${ref}.md`))) {
        logError('A', `commands/${file} \u2192 agents/${ref}.md (not found)`);
      }
    }
  }
}

// ─── Check B: Agents → Skills ──────────────────────────────────────────────

function checkAgentsToSkills() {
  const agentFiles = listFiles(AGENTS_DIR, '.md');
  // Match "skill: foo-bar" or "skills/foo-bar" but not "skills/foo-bar/baz" (sub-paths)
  const skillRefPattern = /\bskills?[:\/]\s*([a-z][\w-]+)(?:\/SKILL\.md)?(?!\s*\/\s*\w)/gi;

  for (const file of agentFiles) {
    const content = readFile(path.join(AGENTS_DIR, file));
    if (!content) continue;

    const refs = findMatches(content, skillRefPattern);
    // Filter out common non-skill words
    const NON_SKILL = new Set(['md', 'json', 'yaml', 'js', 'common', 'commands', 'agents']);
    for (const ref of refs) {
      if (NON_SKILL.has(ref)) continue;
      if (!fs.existsSync(path.join(SKILLS_DIR, ref, 'SKILL.md'))) {
        logError('B', `agents/${file} \u2192 skills/${ref}/SKILL.md (not found)`);
      }
    }
  }
}

// ─── Check C: Skills → Skills ──────────────────────────────────────────────

function checkSkillsToSkills() {
  const skillDirs = fs.existsSync(SKILLS_DIR) ? fs.readdirSync(SKILLS_DIR).filter(d => fs.existsSync(path.join(SKILLS_DIR, d, 'SKILL.md'))) : [];

  // "See: foo-bar" or "See also: foo-bar" at line start or after whitespace
  const seePattern = /^See(?:\s+also)?:\s+([a-z][\w-]+)/gim;

  for (const dir of skillDirs) {
    const content = readFile(path.join(SKILLS_DIR, dir, 'SKILL.md'));
    if (!content) continue;

    const refs = findMatches(content, seePattern);
    const NON_SKILL_REFS = new Set(['http', 'https', 'ftp', 'file', 'the', 'also']);
    for (const ref of refs) {
      if (NON_SKILL_REFS.has(ref)) continue;
      if (!fs.existsSync(path.join(SKILLS_DIR, ref, 'SKILL.md'))) {
        logError('C', `skills/${dir}/SKILL.md \u2192 skills/${ref}/SKILL.md (not found)`);
      }
    }
  }
}

// ─── Check D: code-reviewer routing table ──────────────────────────────────

function checkCodeReviewerRouting() {
  const content = readFile(path.join(AGENTS_DIR, 'code-reviewer.md'));
  if (!content) {
    logError('D', 'agents/code-reviewer.md not found');
    return;
  }

  // Match `typescript-reviewer` or **typescript-reviewer** patterns
  const routePattern = /[`*]{1,2}([a-z][\w-]+-reviewer)[`*]{1,2}/g;
  const refs = findMatches(content, routePattern);

  for (const ref of refs) {
    if (!fs.existsSync(path.join(AGENTS_DIR, `${ref}.md`))) {
      logError('D', `code-reviewer.md routes to agents/${ref}.md (not found)`);
    }
  }
}

// ─── Check E: Hook dispatch → scripts ──────────────────────────────────────

function checkHookDispatch() {
  const content = readFile(DISPATCH_JS);
  if (!content) {
    logError('E', 'scripts/hooks/post-edit-format-dispatch.js not found');
    return;
  }

  // Match: require('./post-edit-format-foo') or import from './post-edit-format-foo.js'
  const requirePattern = /['"]\.\/([^'"]+)['"]/g;
  const refs = findMatches(content, requirePattern);

  for (const ref of refs) {
    const scriptName = ref.endsWith('.js') ? ref : `${ref}.js`;
    const scriptPath = path.join(HOOKS_SCRIPTS_DIR, scriptName);
    if (!fs.existsSync(scriptPath)) {
      logError('E', `post-edit-format-dispatch.js \u2192 scripts/hooks/${scriptName} (not found)`);
    }
  }
}

// ─── Check F: hooks.json → scripts ─────────────────────────────────────────

function checkHooksJson() {
  const content = readFile(HOOKS_JSON);
  if (!content) {
    logError('F', 'hooks/hooks.json not found');
    return;
  }

  let hooks;
  try {
    hooks = JSON.parse(content);
  } catch {
    logError('F', 'hooks/hooks.json is invalid JSON');
    return;
  }

  // hooks.hooks is { PreToolUse: [...], PostToolUse: [...], ... }
  const hooksObj = hooks.hooks || {};
  const allEntries = Array.isArray(hooksObj) ? hooksObj : Object.values(hooksObj).flat();

  for (const entry of allEntries) {
    const hookList = entry.hooks || [];
    for (const hook of hookList) {
      if (hook.type !== 'command') continue;
      const cmd = hook.command || '';
      const scriptMatch = cmd.match(/scripts\/hooks\/([\w-]+\.(?:js|py|sh))/);
      if (!scriptMatch) continue;
      const scriptPath = path.join(ROOT, 'scripts/hooks', scriptMatch[1]);
      if (!fs.existsSync(scriptPath)) {
        logError('F', `hooks.json \u2192 scripts/hooks/${scriptMatch[1]} (not found)`);
      }
    }
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

console.log('clarc wiring validator\n');

checkCommandsToAgents();
checkAgentsToSkills();
checkSkillsToSkills();
checkCodeReviewerRouting();
checkHookDispatch();
checkHooksJson();

if (errors === 0 && warnings === 0) {
  console.log('\u2713 All cross-component references valid');
  process.exit(0);
} else {
  console.log(`\n${errors} error(s), ${warnings} warning(s) found`);
  process.exit(errors > 0 ? 1 : 0);
}
