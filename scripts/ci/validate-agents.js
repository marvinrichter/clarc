#!/usr/bin/env node
/**
 * Validate agent markdown files and system consistency.
 *
 * Check A — Frontmatter: agents/*.md have required fields (model, tools)
 * Check B — agents.md completeness: every agent in agents/ is listed in rules/common/agents.md
 * Check C — SKILL_MAP existence: every skill referenced in SKILL_MAPs exists on disk
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_AGENTS_DIR = path.join(__dirname, '../../agents');
const AGENTS_DIR = process.env.AGENTS_DIR_OVERRIDE || DEFAULT_AGENTS_DIR;
const AGENTS_MD = path.join(__dirname, '../../rules/common/agents.md');
const SESSION_START = path.join(__dirname, '../hooks/session-start.js');
const MCP_SERVER = path.join(__dirname, '../../mcp-server/index.js');
const SKILLS_DIR = path.join(__dirname, '../../skills');

const REQUIRED_FIELDS = ['model', 'tools'];
const VALID_MODELS = ['haiku', 'sonnet', 'opus'];

function extractFrontmatter(content) {
  const cleanContent = content.replace(/^\uFEFF/, '');
  const match = cleanContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const frontmatter = {};
  const lines = match[1].split(/\r?\n/);
  for (const line of lines) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      frontmatter[key] = value;
    }
  }
  return frontmatter;
}

/** Extract agent names from a SKILL_MAP block in JS source */
function extractSkillMapSkills(source) {
  const skills = new Set();
  // Match SKILL_MAP = { ... } blocks
  const mapMatch = source.match(/const SKILL_MAP\s*=\s*\{([\s\S]*?)\};/g);
  if (!mapMatch) return skills;

  for (const block of mapMatch) {
    // Extract quoted strings from array values: ['skill-a', 'skill-b']
    const skillMatches = block.matchAll(/'([a-z][a-z0-9-]+)'/g);
    for (const m of skillMatches) {
      // Skip language/framework keys (they appear as object keys too, but keys aren't quoted with '' in ES6)
      skills.add(m[1]);
    }
  }
  return skills;
}

let hasErrors = false;

// ─── Check A: Frontmatter validation ───────────────────────────────────────

function checkFrontmatter() {
  if (!fs.existsSync(AGENTS_DIR)) {
    console.log('No agents directory found, skipping frontmatter check');
    return;
  }

  const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));

  for (const file of files) {
    const filePath = path.join(AGENTS_DIR, file);
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf-8');
    } catch (err) {
      console.error(`[A] ERROR: ${file} - ${err.message}`);
      hasErrors = true;
      continue;
    }
    const frontmatter = extractFrontmatter(content);

    if (!frontmatter) {
      console.error(`[A] ERROR: ${file} - Missing frontmatter`);
      hasErrors = true;
      continue;
    }

    for (const field of REQUIRED_FIELDS) {
      if (!frontmatter[field] || !frontmatter[field].trim()) {
        console.error(`[A] ERROR: ${file} - Missing required field: ${field}`);
        hasErrors = true;
      }
    }

    if (frontmatter.model && !VALID_MODELS.includes(frontmatter.model)) {
      console.error(`[A] ERROR: ${file} - Invalid model '${frontmatter.model}'. Must be one of: ${VALID_MODELS.join(', ')}`);
      hasErrors = true;
    }
  }

  console.log(`[A] Checked frontmatter for ${files.length} agent files`);
  return files;
}

// ─── Check B: agents.md completeness ───────────────────────────────────────

function checkAgentsMdCompleteness(agentFiles) {
  if (!agentFiles || agentFiles.length === 0) return;
  if (!fs.existsSync(AGENTS_MD)) {
    console.error(`[B] ERROR: ${AGENTS_MD} not found`);
    hasErrors = true;
    return;
  }

  const agentsMdContent = fs.readFileSync(AGENTS_MD, 'utf-8');

  // Extract agent names from frontmatter
  const agentNames = [];
  for (const file of agentFiles) {
    const content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf-8');
    const fm = extractFrontmatter(content);
    if (fm && fm.name) {
      agentNames.push(fm.name.replace(/['"]/g, '').trim());
    } else {
      // Fall back to filename without .md
      agentNames.push(file.replace('.md', ''));
    }
  }

  let missingCount = 0;
  for (const name of agentNames) {
    if (!agentsMdContent.includes(name)) {
      console.error(`[B] ERROR: Agent '${name}' exists in agents/ but is not listed in rules/common/agents.md`);
      hasErrors = true;
      missingCount++;
    }
  }

  if (missingCount === 0) {
    console.log(`[B] All ${agentNames.length} agents present in rules/common/agents.md`);
  }
}

// ─── Check C: SKILL_MAP skill existence ────────────────────────────────────

function checkSkillMapExistence() {
  const sources = [
    { file: SESSION_START, label: 'session-start.js' },
    { file: MCP_SERVER, label: 'mcp-server/index.js' }
  ];

  let checkedCount = 0;
  let missingCount = 0;

  for (const { file, label } of sources) {
    if (!fs.existsSync(file)) {
      console.log(`[C] Skipping ${label} — file not found`);
      continue;
    }

    const source = fs.readFileSync(file, 'utf-8');
    const skills = extractSkillMapSkills(source);

    for (const skill of skills) {
      checkedCount++;
      const skillPath = path.join(SKILLS_DIR, skill, 'SKILL.md');
      if (!fs.existsSync(skillPath)) {
        console.error(`[C] ERROR: Skill '${skill}' referenced in SKILL_MAP (${label}) but skills/${skill}/SKILL.md does not exist`);
        hasErrors = true;
        missingCount++;
      }
    }
  }

  if (missingCount === 0) {
    console.log(`[C] All ${checkedCount} SKILL_MAP skill references resolve to existing files`);
  }
}

// ─── Run all checks ─────────────────────────────────────────────────────────

const agentFiles = checkFrontmatter();
// Checks B and C are project-wide checks — only run against the real agents dir
if (AGENTS_DIR === DEFAULT_AGENTS_DIR) {
  checkAgentsMdCompleteness(agentFiles);
  checkSkillMapExistence();
}

if (hasErrors) {
  process.exit(1);
}
console.log(`Validated ${(agentFiles || []).length} agent files`);
