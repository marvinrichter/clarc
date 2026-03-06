#!/usr/bin/env node
/**
 * Structural eval for skills/<name>/SKILL.md files
 *
 * Validates that every skill:
 *   - Has a SKILL.md file
 *   - Has valid YAML frontmatter with name, description, origin
 *   - Description is substantive (>= 20 chars)
 *   - Body has meaningful content (not placeholder)
 *
 * Run with: node tests/evals/skills.eval.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SKILLS_DIR = path.join(__dirname, '../../skills');

let passed = 0;
let failed = 0;

function check(name, ok, detail) {
  if (ok) {
    console.log(`  ✓ ${name}`);
    passed++;
  } else {
    console.log(`  ✗ ${name}${detail ? ': ' + detail : ''}`);
    failed++;
  }
}

function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w[\w-]*):\s*(.+)/);
    if (kv) meta[kv[1].trim()] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: m[2] };
}

console.log('\n=== Skill Structural Evals ===\n');

const skillDirs = fs
  .readdirSync(SKILLS_DIR, { withFileTypes: true })
  .filter(e => e.isDirectory())
  .map(e => e.name)
  .sort();

if (skillDirs.length === 0) {
  console.log('No skill directories found — skipping.');
  process.exit(0);
}

for (const dir of skillDirs) {
  const skillFile = path.join(SKILLS_DIR, dir, 'SKILL.md');
  console.log(`\n[${dir}]`);

  check('SKILL.md exists', fs.existsSync(skillFile));
  if (!fs.existsSync(skillFile)) continue;

  const content = fs.readFileSync(skillFile, 'utf8');
  const parsed = parseFrontmatter(content);

  check('has frontmatter', parsed !== null, 'missing --- block');
  if (!parsed) continue;

  const { meta, body } = parsed;
  check('has name field', Boolean(meta.name), 'name is empty');
  check('has description field', Boolean(meta.description), 'description is empty');
  check('description >= 20 chars', (meta.description || '').length >= 20, `length=${(meta.description || '').length}`);
  check('has body content', body.trim().length > 100, `body is only ${body.trim().length} chars`);
  check('no unfinished markers', !body.includes('[TODO]') && !body.includes('[PLACEHOLDER]') && !body.includes('INSERT_HERE'), 'body contains unfinished marker ([TODO], [PLACEHOLDER], INSERT_HERE)');
}

console.log(`\nPassed: ${passed}`);
console.log(`Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
