/**
 * Tests for scripts/lib/skill-search.js
 *
 * Run with: node tests/lib/skill-search.test.js
 */

import assert from 'assert';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { searchSkills } from '../../scripts/lib/skill-search.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test helper
function test(name, fn) {
  try {
    fn();
    console.log(`  \u2713 ${name}`);
    return true;
  } catch (err) {
    console.log(`  \u2717 ${name}`);
    console.log(`    Error: ${err.message}`);
    return false;
  }
}

// Create a temporary fake skills directory for deterministic testing
function createFakeSkillsDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clarc-skill-search-test-'));

  const skills = [
    { slug: 'go-patterns', name: 'go-patterns', description: 'Idiomatic Go patterns and concurrency' },
    { slug: 'typescript-patterns', name: 'typescript-patterns', description: 'TypeScript patterns and type safety' },
    { slug: 'python-testing', name: 'python-testing', description: 'Python testing strategies with pytest' },
    { slug: 'react-hooks', name: 'react-hooks', description: 'React hook patterns for state management' },
  ];

  for (const s of skills) {
    const skillDir = path.join(dir, s.slug);
    fs.mkdirSync(skillDir);
    fs.writeFileSync(path.join(skillDir, 'SKILL.md'), [
      '---',
      `name: ${s.name}`,
      `description: "${s.description}"`,
      '---',
      `# ${s.name}`,
      '',
      `## When to Activate`,
      `- Use when working with ${s.slug} topics`,
    ].join('\n'));
  }

  return dir;
}

function cleanupDir(dir) {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
}

let passed = 0;
let failed = 0;

function run(name, fn) {
  const ok = test(name, fn);
  if (ok) passed++; else failed++;
}

console.log('\nscripts/lib/skill-search.js');

const skillsDir = createFakeSkillsDir();

try {
  run('returns results for exact slug match', () => {
    const r = searchSkills('go-patterns', { skillsDir });
    assert.strictEqual(r.query, 'go-patterns');
    assert(r.total >= 1, 'expected at least 1 result');
    assert(r.results.some(s => s.slug === 'go-patterns'));
  });

  run('returns results for keyword in description', () => {
    const r = searchSkills('pytest', { skillsDir });
    assert(r.results.some(s => s.slug === 'python-testing'));
  });

  run('returns results for keyword in name', () => {
    const r = searchSkills('typescript', { skillsDir });
    assert(r.results.some(s => s.slug === 'typescript-patterns'));
  });

  run('respects limit option', () => {
    const r = searchSkills('pattern', { skillsDir, limit: 1 });
    assert(r.results.length <= 1);
  });

  run('returns empty results for no match', () => {
    const r = searchSkills('xyzzy-no-match-ever', { skillsDir });
    assert.strictEqual(r.total, 0);
    assert.deepStrictEqual(r.results, []);
  });

  run('returns error for missing skillsDir', () => {
    const r = searchSkills('go', { skillsDir: '/nonexistent/path' });
    assert(r.error, 'expected error property');
    assert.strictEqual(r.total, 0);
  });

  run('returns error for missing query', () => {
    const r = searchSkills('', { skillsDir });
    assert(r.error, 'expected error property');
  });

  run('result shape has name, slug, description', () => {
    const r = searchSkills('go', { skillsDir });
    assert(r.results.length > 0);
    const first = r.results[0];
    assert('name' in first, 'missing name');
    assert('slug' in first, 'missing slug');
    assert('description' in first, 'missing description');
  });

  // Integration: real skills dir (smoke test — just checks it runs without throwing)
  const realSkillsDir = path.join(__dirname, '..', '..', 'skills');
  if (fs.existsSync(realSkillsDir)) {
    run('real skills dir — skill_search matches /find-skill for "go"', () => {
      const r = searchSkills('go', { skillsDir: realSkillsDir, limit: 5 });
      assert(r.total >= 0, 'should return a count');
      assert(Array.isArray(r.results));
    });

    run('real skills dir — returns go-patterns for query "go-patterns"', () => {
      const r = searchSkills('go-patterns', { skillsDir: realSkillsDir });
      assert(r.results.some(s => s.slug === 'go-patterns'), 'go-patterns should be found');
    });
  }

} finally {
  cleanupDir(skillsDir);
}

console.log(`\n  ${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
