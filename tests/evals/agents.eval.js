#!/usr/bin/env node
/**
 * Structural eval for agents/*.md files
 *
 * Validates that every agent file:
 *   - Has a valid YAML frontmatter block
 *   - Contains required fields: name, description, model
 *   - Uses an allowed model alias
 *   - Has non-empty body content after frontmatter
 *
 * Run with: node tests/evals/agents.eval.js
 */

const fs = require('fs');
const path = require('path');

const AGENTS_DIR = path.join(__dirname, '../../agents');
const ALLOWED_MODELS = new Set(['haiku', 'sonnet', 'opus',
  'claude-haiku-4-5-20251001', 'claude-sonnet-4-6', 'claude-opus-4-6']);

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

/** Parse YAML frontmatter from markdown content. Returns { meta, body } or null. */
function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)/);
    if (kv) meta[kv[1].trim()] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: m[2] };
}

console.log('\n=== Agent Structural Evals ===\n');

const files = fs.readdirSync(AGENTS_DIR)
  .filter(f => f.endsWith('.md'))
  .sort();

if (files.length === 0) {
  console.log('No agent files found — skipping.');
  process.exit(0);
}

for (const file of files) {
  const fpath = path.join(AGENTS_DIR, file);
  const content = fs.readFileSync(fpath, 'utf8');
  const label = file.replace('.md', '');

  console.log(`\n[${label}]`);

  const parsed = parseFrontmatter(content);
  check('has frontmatter', parsed !== null, 'missing --- block');
  if (!parsed) continue;

  const { meta, body } = parsed;
  check('has name field', Boolean(meta.name), `got: ${meta.name}`);
  check('has description field', Boolean(meta.description), 'description is empty');
  check('description >= 20 chars', (meta.description || '').length >= 20,
    `length=${(meta.description || '').length}`);
  check('has model field', Boolean(meta.model), 'model is missing');
  check('model is allowed alias', ALLOWED_MODELS.has(meta.model),
    `got: "${meta.model}" — expected one of ${[...ALLOWED_MODELS].join(', ')}`);
  check('has body content', body.trim().length > 50,
    `body is only ${body.trim().length} chars`);
  check('name matches filename', meta.name === label,
    `name="${meta.name}" filename="${label}"`);
}

console.log(`\nPassed: ${passed}`);
console.log(`Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
