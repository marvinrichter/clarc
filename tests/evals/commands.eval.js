#!/usr/bin/env node
/**
 * Structural eval for commands/*.md files
 *
 * Validates that every command file:
 *   - Has a YAML frontmatter block with a description field
 *   - Has non-empty body content
 *   - Commands that reference external binaries (codeagent-wrapper) have a guard block
 *
 * Run with: node tests/evals/commands.eval.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COMMANDS_DIR = path.join(__dirname, '../../commands');

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

/** Parse YAML frontmatter (first --- block) */
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

console.log('\n=== Command Structural Evals ===\n');

const files = fs
  .readdirSync(COMMANDS_DIR)
  .filter(f => f.endsWith('.md'))
  .sort();

if (files.length === 0) {
  console.log('No command files found — skipping.');
  process.exit(0);
}

// Commands that require external binary — must have a guard block
const EXTERNAL_DEP_PATTERN = /codeagent-wrapper|ace-tool/;
const GUARD_PATTERN = /codeagent-wrapper.*MISSING.*stop/s;

for (const file of files) {
  const fpath = path.join(COMMANDS_DIR, file);
  const content = fs.readFileSync(fpath, 'utf8');
  const label = file.replace('.md', '');

  console.log(`\n[${label}]`);

  const parsed = parseFrontmatter(content);
  // Commands may use YAML frontmatter OR a markdown `# Title` heading — both are valid
  const headingMatch = content.trimStart().match(/^#\s+(.+)/m);
  const hasHeading = Boolean(headingMatch);
  check('has frontmatter or heading', parsed !== null || hasHeading, 'missing both --- frontmatter and # heading');
  if (!parsed && !hasHeading) continue;

  const descText = parsed ? parsed.meta.description || '' : headingMatch ? headingMatch[1] : '';
  const body = parsed ? parsed.body : content;
  check('has description/title >= 10 chars', descText.length >= 10, `length=${descText.length}`);
  check('has body content', body.trim().length > 20, `body is only ${body.trim().length} chars`);

  // Commands referencing external binaries must have a guard
  if (EXTERNAL_DEP_PATTERN.test(content)) {
    check('has prerequisite guard block', GUARD_PATTERN.test(content), 'uses codeagent-wrapper but missing guard block — add prerequisites check');
  }
}

console.log(`\nPassed: ${passed}`);
console.log(`Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
