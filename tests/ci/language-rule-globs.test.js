/**
 * Tests for validate-language-rule-globs.js
 *
 * Verifies: fails on missing globs/alwaysApply, passes on correct frontmatter,
 * passes on the real project (all language rules must have globs after migration).
 *
 * Run with: node tests/ci/language-rule-globs.test.js
 */

import assert from 'assert';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const validatorPath = path.join(__dirname, '../../scripts/ci/validate-language-rule-globs.js');

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    return true;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

function createTempRulesDir() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'globs-test-'));
  // Mimic rules/ structure with a language subdir
  fs.mkdirSync(path.join(tmp, 'typescript'));
  fs.mkdirSync(path.join(tmp, 'common'));
  return tmp;
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * Run the validator with a custom RULES_DIR injected.
 */
function runValidator(rulesDir) {
  let source = fs.readFileSync(validatorPath, 'utf8');
  source = source.replace(/^#!.*\n/, '');
  source = source.replace(
    /const RULES_DIR = .*?;/,
    `const RULES_DIR = ${JSON.stringify(rulesDir)};`
  );
  try {
    const stdout = execFileSync('node', ['-e', source], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000,
    });
    return { code: 0, stdout, stderr: '' };
  } catch (err) {
    return { code: err.status || 1, stdout: err.stdout || '', stderr: err.stderr || '' };
  }
}

function runTests() {
  console.log('\n=== Testing validate-language-rule-globs ===\n');
  let passed = 0;
  let failed = 0;

  // ── Fixture: file missing both globs and alwaysApply ──
  if (test('fails when globs and alwaysApply are missing', () => {
    const tmp = createTempRulesDir();
    fs.writeFileSync(path.join(tmp, 'typescript', 'coding-style.md'), [
      '---',
      'paths:',
      '  - "**/*.ts"',
      '---',
      '# TypeScript Coding Style',
    ].join('\n'));
    const result = runValidator(tmp);
    cleanup(tmp);
    assert.strictEqual(result.code, 1, `Expected exit 1, got ${result.code}`);
    assert.ok(result.stderr.includes('missing globs'), `Expected "missing globs" in stderr: ${result.stderr}`);
    assert.ok(result.stderr.includes('missing alwaysApply'), `Expected "missing alwaysApply" in stderr: ${result.stderr}`);
  })) passed++; else failed++;

  // ── Fixture: file missing only alwaysApply ──
  if (test('fails when alwaysApply: false is missing', () => {
    const tmp = createTempRulesDir();
    fs.writeFileSync(path.join(tmp, 'typescript', 'coding-style.md'), [
      '---',
      'globs:',
      '  - "**/*.ts"',
      '---',
      '# TypeScript Coding Style',
    ].join('\n'));
    const result = runValidator(tmp);
    cleanup(tmp);
    assert.strictEqual(result.code, 1, `Expected exit 1, got ${result.code}`);
    assert.ok(result.stderr.includes('missing alwaysApply'), `Expected "missing alwaysApply" in stderr: ${result.stderr}`);
  })) passed++; else failed++;

  // ── Fixture: file missing only globs ──
  if (test('fails when globs list is missing', () => {
    const tmp = createTempRulesDir();
    fs.writeFileSync(path.join(tmp, 'typescript', 'coding-style.md'), [
      '---',
      'paths:',
      '  - "**/*.ts"',
      'alwaysApply: false',
      '---',
      '# TypeScript Coding Style',
    ].join('\n'));
    const result = runValidator(tmp);
    cleanup(tmp);
    assert.strictEqual(result.code, 1, `Expected exit 1, got ${result.code}`);
    assert.ok(result.stderr.includes('missing globs'), `Expected "missing globs" in stderr: ${result.stderr}`);
  })) passed++; else failed++;

  // ── Fixture: correct frontmatter ──
  if (test('passes when globs and alwaysApply: false are present', () => {
    const tmp = createTempRulesDir();
    fs.writeFileSync(path.join(tmp, 'typescript', 'coding-style.md'), [
      '---',
      'paths:',
      '  - "**/*.ts"',
      'globs:',
      '  - "**/*.{ts,tsx}"',
      'alwaysApply: false',
      '---',
      '# TypeScript Coding Style',
    ].join('\n'));
    const result = runValidator(tmp);
    cleanup(tmp);
    assert.strictEqual(result.code, 0, `Expected exit 0, got ${result.code}\nstderr: ${result.stderr}`);
  })) passed++; else failed++;

  // ── Fixture: common/ files are ignored ──
  if (test('skips common/ directory files', () => {
    const tmp = createTempRulesDir();
    // common/ file without globs — should not cause failure
    fs.writeFileSync(path.join(tmp, 'common', 'coding-style.md'), [
      '---',
      'paths:',
      '  - "**/*"',
      '---',
      '# Common Coding Style',
    ].join('\n'));
    // No language files — empty language dir should pass with 0 total
    const result = runValidator(tmp);
    cleanup(tmp);
    assert.strictEqual(result.code, 0, `Expected exit 0 (no language files), got ${result.code}\nstderr: ${result.stderr}`);
  })) passed++; else failed++;

  // ── Real project: all language rules must pass after migration ──
  if (test('passes on real project rules (after migration)', () => {
    try {
      const stdout = execFileSync('node', [validatorPath], {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 15000,
        cwd: path.join(__dirname, '../..'),
      });
      assert.ok(
        stdout.includes('0 failed'),
        `Expected 0 failures in real project, got:\n${stdout}`
      );
    } catch (err) {
      throw new Error(
        `Real project validation failed:\n${err.stderr || ''}\n${err.stdout || ''}`
      );
    }
  })) passed++; else failed++;

  console.log(`\nPassed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
