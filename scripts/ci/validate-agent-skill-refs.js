#!/usr/bin/env node
/**
 * Validate agent uses_skills references.
 *
 * Check D — uses_skills integrity: every skill listed in an agent's
 * uses_skills frontmatter field must resolve to skills/<name>/SKILL.md.
 *
 * Exits 0 if all references are valid (or no agent has uses_skills).
 * Exits 1 if any reference points to a missing skill directory.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const AGENTS_DIR = path.join(__dirname, '../../agents');
const SKILLS_DIR = path.join(__dirname, '../../skills');

let hasErrors = false;
let totalRefs = 0;
let checkedAgents = 0;

/**
 * Parse YAML frontmatter from a markdown file.
 * Returns a plain object with string values and array values where applicable.
 */
function parseFrontmatter(content) {
  const cleanContent = content.replace(/^\uFEFF/, '');
  const match = cleanContent.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const result = {};
  const lines = match[1].split(/\r?\n/);
  let currentKey = null;
  let currentArray = null;

  for (const line of lines) {
    // YAML array item
    if (/^\s{2}-\s+/.test(line) && currentKey) {
      const value = line.replace(/^\s{2}-\s+/, '').trim();
      if (!currentArray) {
        currentArray = [];
        result[currentKey] = currentArray;
      }
      currentArray.push(value);
      continue;
    }

    // Key: value line
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      currentArray = null;
      currentKey = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      result[currentKey] = value || null;
    }
  }

  return result;
}

if (!fs.existsSync(AGENTS_DIR)) {
  console.log('[D] No agents directory found, skipping uses_skills check');
  process.exit(0);
}

const agentFiles = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));

for (const file of agentFiles) {
  const filePath = path.join(AGENTS_DIR, file);
  const content = fs.readFileSync(filePath, 'utf-8');
  const fm = parseFrontmatter(content);

  if (!fm) continue;

  const usesSkills = fm.uses_skills;
  if (!usesSkills) continue;

  // uses_skills can be a single string or array
  const skills = Array.isArray(usesSkills) ? usesSkills : [usesSkills];

  checkedAgents++;
  for (const skill of skills) {
    if (!skill || typeof skill !== 'string') continue;
    totalRefs++;
    const skillPath = path.join(SKILLS_DIR, skill, 'SKILL.md');
    if (!fs.existsSync(skillPath)) {
      console.error(`[D] ERROR: ${file} — uses_skills: '${skill}' but skills/${skill}/SKILL.md does not exist`);
      hasErrors = true;
    }
  }
}

if (!hasErrors) {
  console.log(`[D] All ${totalRefs} uses_skills references valid across ${checkedAgents} agents`);
}

if (hasErrors) {
  process.exit(1);
}
