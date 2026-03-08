#!/usr/bin/env node
/**
 * Validate naming conventions across clarc components.
 *
 * Check A — Agents: lowercase-hyphen filenames, required frontmatter, description ≥10 words
 * Check B — Skills: name frontmatter matches directory name
 * Check C — Commands: lowercase-hyphen, no built-in collisions, description frontmatter present
 * Check D — Rules ↔ Agents: rules/<lang>/ should have agents/<lang>-reviewer.md
 * Check E — Rules ↔ Skills: rules/<lang>/ should have skills/<lang>-patterns/SKILL.md
 * Check F — Dispatch ↔ Rules: languages in dispatch should have rules/<lang>/
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../..');

const AGENTS_DIR = path.join(ROOT, 'agents');
const SKILLS_DIR = path.join(ROOT, 'skills');
const COMMANDS_DIR = path.join(ROOT, 'commands');
const RULES_DIR = path.join(ROOT, 'rules');
const DISPATCH_JS = path.join(ROOT, 'scripts/hooks/post-edit-format-dispatch.js');

let errors = 0;
let warnings = 0;

// Claude Code built-in commands — do not collide
const BUILTIN_COMMANDS = new Set(['help', 'clear', 'exit', 'quit', 'history', 'version', 'new', 'open', 'save', 'load', 'run', 'stop', 'reset', 'login', 'logout', 'config', 'settings', 'update']);

// Languages with special naming (not straight <lang>)
const _LANG_ALIAS = { golang: 'go', csharp: 'csharp' }; // reserved for future use

function logError(check, message) {
  console.log(`\u2717 [${check}] ${message}`);
  errors++;
}

function logWarn(check, message) {
  console.log(`\u26A0 [${check}] ${message}`);
  warnings++;
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

function listDirs(dir) {
  try {
    return fs.readdirSync(dir).filter(d => {
      return fs.statSync(path.join(dir, d)).isDirectory();
    });
  } catch {
    return [];
  }
}

function extractFrontmatter(content) {
  const match = content.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }
  return fm;
}

// ─── Check A: Agents ────────────────────────────────────────────────────────

function checkAgents() {
  const files = listFiles(AGENTS_DIR, '.md');
  const lowerHyphen = /^[a-z][a-z0-9-]*\.md$/;

  for (const file of files) {
    if (!lowerHyphen.test(file)) {
      logError('A', `agents/${file} — filename should be lowercase-hyphen (e.g. code-reviewer.md)`);
    }

    const content = readFile(path.join(AGENTS_DIR, file));
    if (!content) continue;

    const fm = extractFrontmatter(content);
    if (!fm.name) logError('A', `agents/${file} — missing 'name' in frontmatter`);
    if (!fm.model) logError('A', `agents/${file} — missing 'model' in frontmatter`);
    if (!fm.tools) logError('A', `agents/${file} — missing 'tools' in frontmatter`);

    const desc = fm.description || '';
    const wordCount = desc.split(/\s+/).filter(Boolean).length;
    if (!desc) {
      logError('A', `agents/${file} — missing 'description' in frontmatter`);
    } else if (wordCount < 10) {
      logWarn('A', `agents/${file} — description too short (${wordCount} words, recommend ≥10)`);
    }
  }
}

// ─── Check B: Skills ────────────────────────────────────────────────────────

function checkSkills() {
  const dirs = listDirs(SKILLS_DIR);

  for (const dir of dirs) {
    const skillFile = path.join(SKILLS_DIR, dir, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;

    const content = readFile(skillFile);
    if (!content) continue;

    const fm = extractFrontmatter(content);
    if (fm.name && fm.name !== dir) {
      logError('B', `skills/${dir}/SKILL.md — 'name' frontmatter ('${fm.name}') does not match directory name ('${dir}')`);
    }
  }
}

// ─── Check C: Commands ───────────────────────────────────────────────────────

function checkCommands() {
  const files = listFiles(COMMANDS_DIR, '.md');
  const lowerHyphen = /^[a-z][a-z0-9-]*\.md$/;

  for (const file of files) {
    if (!lowerHyphen.test(file)) {
      logError('C', `commands/${file} — filename should be lowercase-hyphen (e.g. code-review.md)`);
    }

    const commandName = file.replace(/\.md$/, '');
    if (BUILTIN_COMMANDS.has(commandName)) {
      logError('C', `commands/${file} — collides with Claude Code built-in command '${commandName}'`);
    }

    const content = readFile(path.join(COMMANDS_DIR, file));
    if (!content) continue;

    const fm = extractFrontmatter(content);
    if (!fm.description) {
      logError('C', `commands/${file} — missing 'description' in frontmatter`);
    }
  }
}

// ─── Check D: Rules ↔ Agents ────────────────────────────────────────────────

function checkRulesToAgents() {
  if (!fs.existsSync(RULES_DIR)) return;
  const langDirs = listDirs(RULES_DIR).filter(d => d !== 'common');

  for (const lang of langDirs) {
    const agentName = `${lang}-reviewer`;
    const agentPath = path.join(AGENTS_DIR, `${agentName}.md`);
    if (!fs.existsSync(agentPath)) {
      logWarn('D', `rules/${lang}/ exists but agents/${agentName}.md not found`);
    }
  }
}

// ─── Check E: Rules ↔ Skills ────────────────────────────────────────────────

function checkRulesToSkills() {
  if (!fs.existsSync(RULES_DIR)) return;
  const langDirs = listDirs(RULES_DIR).filter(d => d !== 'common');

  for (const lang of langDirs) {
    const skillName = `${lang}-patterns`;
    const skillPath = path.join(SKILLS_DIR, skillName, 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      logWarn('E', `rules/${lang}/ exists but skills/${skillName}/SKILL.md not found`);
    }
  }
}

// ─── Check F: Dispatch ↔ Rules ───────────────────────────────────────────────

function checkDispatchToRules() {
  const content = readFile(DISPATCH_JS);
  if (!content) return;

  // Find language keys in EXT_MAP: '.ext': 'post-edit-format-<lang>.js'
  const dispatchPattern = /['"]\.([a-z]+)['"]\s*:\s*['"]post-edit-format-([a-z]+)\.js['"]/g;
  const langs = new Set();
  for (const m of content.matchAll(dispatchPattern)) {
    langs.add(m[2]); // the <lang> part of post-edit-format-<lang>.js
  }

  for (const lang of langs) {
    const rulesPath = path.join(RULES_DIR, lang);
    if (!fs.existsSync(rulesPath)) {
      logWarn('F', `dispatch has post-edit-format-${lang}.js but rules/${lang}/ not found`);
    }
  }
}

// ─── Main ──────────────────────────────────────────────────────────────────

console.log('clarc naming convention validator\n');

checkAgents();
checkSkills();
checkCommands();
checkRulesToAgents();
checkRulesToSkills();
checkDispatchToRules();

if (errors === 0 && warnings === 0) {
  console.log('\u2713 All naming conventions valid');
  process.exit(0);
} else {
  console.log(`\n${errors} error(s), ${warnings} warning(s) found`);
  process.exit(errors > 0 ? 1 : 0);
}
