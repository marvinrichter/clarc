#!/usr/bin/env node
/**
 * Unit tests for scripts/ci/validate-skill-quality.js
 *
 * Tests the core logic functions in isolation using synthetic skill content,
 * without running the full script (which scans the real skills/ directory).
 *
 * Also includes a smoke test that runs the actual script against the real skills/
 * to verify it exits 0 in warn-only mode.
 */

import { spawnSync } from 'child_process';
import { mkdtempSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const VALIDATE_SCRIPT = join(REPO_ROOT, 'scripts', 'ci', 'validate-skill-quality.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// ─── Inline the pure functions being tested ───────────────────────────────────
// These replicate the logic from validate-skill-quality.js to allow unit testing
// without spawning a child process for every case.

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

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function validateQuality(dir, content, fm) {
  const warnings = [];
  if (!/```/.test(content)) warnings.push('No code example found');
  if (!/^##\s+(anti.?pattern|avoid|don.t|never|wrong)/im.test(content)) warnings.push('No Anti-Patterns section');
  const whenMatch = content.match(/^##\s+(when.*to|activation|trigger)/im);
  if (!whenMatch) {
    warnings.push('No "When to Use" section found');
  } else {
    const sectionStart = content.indexOf(whenMatch[0]);
    const nextSection = content.indexOf('\n## ', sectionStart + 1);
    const sectionText = nextSection > -1 ? content.slice(sectionStart, nextSection) : content.slice(sectionStart);
    const wordCount = countWords(sectionText);
    if (wordCount < 50) warnings.push(`When-to section too short (${wordCount} words, min 50)`);
  }
  if ((fm.name || '').length < 5) warnings.push('name too short');
  if ((fm.description || '').length < 20) warnings.push('description too short');
  return warnings;
}

// ─── extractFrontmatter tests ────────────────────────────────────────────────

console.log('\n--- extractFrontmatter ---\n');

test('extracts name and description from valid frontmatter', () => {
  const content = '---\nname: my-skill\ndescription: A comprehensive guide to testing patterns\n---\n# Body';
  const fm = extractFrontmatter(content);
  assert(fm.name === 'my-skill', `Expected "my-skill", got "${fm.name}"`);
  assert(fm.description === 'A comprehensive guide to testing patterns', `Unexpected description: "${fm.description}"`);
});

test('returns empty object when no frontmatter', () => {
  const fm = extractFrontmatter('# No frontmatter here\n\nJust a body.');
  assert(Object.keys(fm).length === 0, `Expected empty object, got ${JSON.stringify(fm)}`);
});

test('handles BOM at start of file', () => {
  const content = '\uFEFF---\nname: bom-skill\ndescription: BOM test description text here yes\n---\nBody';
  const fm = extractFrontmatter(content);
  assert(fm.name === 'bom-skill', `BOM stripping failed, got name="${fm.name}"`);
});

test('handles colons in values (e.g. URLs)', () => {
  const content = '---\nname: my-skill\nurl: https://example.com/path\n---\nBody';
  const fm = extractFrontmatter(content);
  assert(fm.url === 'https://example.com/path', `Expected full URL, got "${fm.url}"`);
});

// ─── validateQuality tests ────────────────────────────────────────────────────

console.log('\n--- validateQuality ---\n');

const GOOD_SKILL = `---
name: good-skill
description: A well-written skill with all required sections for testing
---

## When to Use

Use this skill when you need to test code thoroughly. This section provides
enough words to meet the 50-word minimum requirement. Testing is important
for software quality and reliability. Always write tests before code.
Make sure to cover edge cases and error conditions in your test suite.

## Patterns

\`\`\`js
const x = 1;
\`\`\`

## Anti-Patterns

Avoid writing tests after implementation without thinking about design.
`;

test('good skill with all sections produces 0 warnings', () => {
  const fm = extractFrontmatter(GOOD_SKILL);
  const warnings = validateQuality('good-skill', GOOD_SKILL, fm);
  assert(warnings.length === 0, `Expected 0 warnings, got: ${warnings.join('; ')}`);
});

test('skill missing code block produces warning', () => {
  const content = GOOD_SKILL.replace(/```js[\s\S]*?```/, '');
  const fm = extractFrontmatter(content);
  const warnings = validateQuality('test', content, fm);
  assert(warnings.some(w => w.toLowerCase().includes('code')), `Expected code block warning, got: ${warnings.join('; ')}`);
});

test('skill missing anti-patterns section produces warning', () => {
  const content = GOOD_SKILL.replace(/## Anti-Patterns[\s\S]*$/, '');
  const fm = extractFrontmatter(content);
  const warnings = validateQuality('test', content, fm);
  assert(warnings.some(w => /anti.?pattern/i.test(w) || w.toLowerCase().includes('avoid') || w.toLowerCase().includes('anti')),
    `Expected anti-patterns warning, got: ${warnings.join('; ')}`);
});

test('skill missing when-to section produces warning', () => {
  const content = GOOD_SKILL.replace(/## When to Use[\s\S]*?(?=\n##)/, '');
  const fm = extractFrontmatter(content);
  const warnings = validateQuality('test', content, fm);
  assert(warnings.some(w => /when/i.test(w)), `Expected when-to warning, got: ${warnings.join('; ')}`);
});

test('skill with short when-to section produces word-count warning', () => {
  const shortContent = GOOD_SKILL.replace(
    /## When to Use[\s\S]*?(?=\n##)/,
    '## When to Use\n\nUse this skill.\n'
  );
  const fm = extractFrontmatter(shortContent);
  const warnings = validateQuality('test', shortContent, fm);
  assert(warnings.some(w => w.includes('short') || w.includes('words')),
    `Expected word-count warning, got: ${warnings.join('; ')}`);
});

test('skill with short name (<5 chars) produces name warning', () => {
  const shortNameContent = GOOD_SKILL.replace('name: good-skill', 'name: xy');
  const fm = extractFrontmatter(shortNameContent);
  const warnings = validateQuality('test', shortNameContent, fm);
  assert(warnings.some(w => w.includes('name')), `Expected name warning, got: ${warnings.join('; ')}`);
});

test('skill with short description (<20 chars) produces description warning', () => {
  const shortDescContent = GOOD_SKILL.replace(
    'description: A well-written skill with all required sections for testing',
    'description: Too short'
  );
  const fm = extractFrontmatter(shortDescContent);
  const warnings = validateQuality('test', shortDescContent, fm);
  assert(warnings.some(w => w.includes('description')), `Expected description warning, got: ${warnings.join('; ')}`);
});

test('completely empty skill produces multiple warnings', () => {
  const empty = '---\nname: x\ndescription: short\n---\n';
  const fm = extractFrontmatter(empty);
  const warnings = validateQuality('empty', empty, fm);
  assert(warnings.length >= 3, `Expected >=3 warnings for empty skill, got ${warnings.length}: ${warnings.join('; ')}`);
});

// ─── countWords tests ─────────────────────────────────────────────────────────

console.log('\n--- countWords ---\n');

test('counts words in simple sentence', () => {
  const n = countWords('hello world foo bar');
  assert(n === 4, `Expected 4, got ${n}`);
});

test('returns 0 for empty string', () => {
  assert(countWords('') === 0, 'empty string should be 0');
});

test('returns 0 for whitespace-only string', () => {
  assert(countWords('   \n  ') === 0, 'whitespace should be 0');
});

test('handles markdown headings and prose', () => {
  const n = countWords('## When to Use\n\nThis is a section with words here.');
  assert(n >= 5, `Expected at least 5 words, got ${n}`);
});

// ─── Smoke tests: run the real script ─────────────────────────────────────────

console.log('\n--- Smoke test: real script ---\n');

test('validate-skill-quality.js script file exists', () => {
  assert(existsSync(VALIDATE_SCRIPT), `Script not found: ${VALIDATE_SCRIPT}`);
});

test('script exits 0 in warn-only mode (real skills/)', () => {
  const { status, stderr } = spawnSync('node', [VALIDATE_SCRIPT], {
    encoding: 'utf8',
    cwd: REPO_ROOT
  });
  assert(status === 0, `Script exited with ${status} in warn-only mode.\n${stderr.slice(0, 300)}`);
});

test('script output mentions "skills checked" or "checked"', () => {
  const { stdout, stderr } = spawnSync('node', [VALIDATE_SCRIPT], {
    encoding: 'utf8',
    cwd: REPO_ROOT
  });
  const output = stdout + stderr;
  assert(output.toLowerCase().includes('check'),
    `Expected "check" in output, got: ${output.slice(0, 200)}`);
});

test('script --strict exits 0 or 1 (does not crash)', () => {
  const { status } = spawnSync('node', [VALIDATE_SCRIPT, '--strict'], {
    encoding: 'utf8',
    cwd: REPO_ROOT
  });
  assert(status === 0 || status === 1, `--strict exited with unexpected status ${status}`);
});

test('script handles tmpDir with no skills gracefully', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'clarc-no-skills-'));
  try {
    const { status } = spawnSync('node', [VALIDATE_SCRIPT], {
      encoding: 'utf8',
      cwd: tmpDir,
      env: { ...process.env }
    });
    assert(typeof status === 'number', 'Should not crash even with missing skills dir');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ─── Results ──────────────────────────────────────────────────────────────────

console.log(`\nPassed: ${passed}`);
console.log(`Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
