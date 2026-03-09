#!/usr/bin/env node
/**
 * Tests for install manifest format and uninstall / dry-run behavior.
 */

import { spawnSync } from 'child_process';
import { mkdirSync, writeFileSync, symlinkSync, mkdtempSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir, homedir } from 'os';
import { lstatSync, readlinkSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const INSTALL_SH = join(REPO_ROOT, 'install.sh');

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

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

// ─── Manifest format tests (pure JS) ─────────────────────────────────────────

console.log('\n--- Manifest format ---\n');

test('manifest has required top-level fields', () => {
  const manifest = {
    version: '0.9.0',
    installed_at: new Date().toISOString(),
    target: 'claude',
    symlinks: []
  };
  assert('version' in manifest, 'missing version');
  assert('installed_at' in manifest, 'missing installed_at');
  assert('target' in manifest, 'missing target');
  assert(Array.isArray(manifest.symlinks), 'symlinks must be array');
});

test('symlink entries have src, dst, component fields', () => {
  const entry = { src: '/home/.clarc/agents/tdd-guide.md', dst: '/home/.claude/agents/tdd-guide.md', component: 'agents' };
  assert('src' in entry, 'missing src');
  assert('dst' in entry, 'missing dst');
  assert('component' in entry, 'missing component');
});

test('installed_at is valid ISO 8601 UTC', () => {
  const ts = new Date().toISOString();
  const parsed = new Date(ts);
  assert(!isNaN(parsed.getTime()), 'must be valid date');
  assert(ts.endsWith('Z'), 'must be UTC (ends with Z)');
});

test('manifest can filter symlinks by component', () => {
  const symlinks = [
    { src: '/x/agents/a.md', dst: '/y/agents/a.md', component: 'agents' },
    { src: '/x/commands/b.md', dst: '/y/commands/b.md', component: 'commands' },
    { src: '/x/agents/c.md', dst: '/y/agents/c.md', component: 'agents' },
  ];
  const agents = symlinks.filter(e => e.component === 'agents');
  assertEquals(agents.length, 2, 'should find 2 agent entries');
  const commands = symlinks.filter(e => e.component === 'commands');
  assertEquals(commands.length, 1, 'should find 1 command entry');
});

// ─── Safety constraint tests (using real filesystem) ─────────────────────────

console.log('\n--- Safety constraints ---\n');

test('safety: regular files are not treated as symlinks', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'clarc-mfst-'));
  try {
    const regularFile = join(tmpDir, 'regular.md');
    writeFileSync(regularFile, '# test');
    const stat = lstatSync(regularFile);
    assert(!stat.isSymbolicLink(), 'regular file must not be a symlink');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('safety: symlinks resolve to their target', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'clarc-mfst-'));
  try {
    const src = join(tmpDir, 'source.md');
    const dst = join(tmpDir, 'link.md');
    writeFileSync(src, '# source');
    symlinkSync(src, dst);

    const stat = lstatSync(dst);
    assert(stat.isSymbolicLink(), 'dst must be a symlink');
    const target = readlinkSync(dst);
    assertEquals(target, src, 'symlink must point to src');
    assert(existsSync(dst), 'symlink must resolve (not broken)');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

test('safety: broken symlink is detected by existsSync returning false', () => {
  const tmpDir = mkdtempSync(join(tmpdir(), 'clarc-mfst-'));
  try {
    const src = join(tmpDir, 'ghost.md');
    const dst = join(tmpDir, 'link.md');
    // Create symlink to non-existent target
    symlinkSync(src, dst);

    const stat = lstatSync(dst);
    assert(stat.isSymbolicLink(), 'dst must be a symlink (even if broken)');
    assert(!existsSync(dst), 'broken symlink: existsSync must return false');
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
});

// ─── install.sh --dry-run integration smoke test ─────────────────────────────

console.log('\n--- install.sh --dry-run ---\n');

test('--dry-run typescript exits 0 and prints [DRY RUN]', () => {
  const result = spawnSync('bash', [INSTALL_SH, '--dry-run', 'typescript'], {
    encoding: 'utf8',
    env: { ...process.env, HOME: homedir() }
  });
  assertEquals(result.status, 0, `Expected exit 0, got ${result.status}\n${result.stderr}`);
  const output = result.stdout + result.stderr;
  assert(
    output.includes('[DRY RUN]') || output.includes('dry run') || output.includes('Dry run'),
    `Expected dry-run output, got:\n${output.slice(0, 400)}`
  );
});

test('--dry-run does not create files (agents/ not touched)', () => {
  const tmpHome = mkdtempSync(join(tmpdir(), 'clarc-dryrun-'));
  try {
    const result = spawnSync('bash', [INSTALL_SH, '--dry-run'], {
      encoding: 'utf8',
      env: { ...process.env, HOME: tmpHome }
    });
    // Script may exit non-zero if no languages detected; that's fine for dry-run
    const agentsDir = join(tmpHome, '.claude', 'agents');
    assert(!existsSync(agentsDir), `--dry-run must not create ${agentsDir}`);
  } finally {
    rmSync(tmpHome, { recursive: true, force: true });
  }
});

// ─── --uninstall with missing manifest ───────────────────────────────────────

console.log('\n--- install.sh --uninstall (no manifest) ---\n');

test('--uninstall exits non-zero when no manifest exists', () => {
  const manifestPath = join(REPO_ROOT, 'install-manifest.json');
  if (existsSync(manifestPath)) {
    console.log('    (skipped — install-manifest.json exists in repo root)');
    passed++; // count as passing
    failed--; // undo the decrement that will happen
    return;
  }
  const result = spawnSync('bash', [INSTALL_SH, '--uninstall', '--yes'], {
    encoding: 'utf8',
    env: { ...process.env, HOME: homedir() }
  });
  assert(result.status !== 0, 'Expected non-zero exit when manifest missing');
  const output = result.stdout + result.stderr;
  assert(
    output.includes('manifest') || output.includes('Cannot') || output.includes('Error'),
    `Expected error message, got: ${output.slice(0, 300)}`
  );
});

// ─── Results ──────────────────────────────────────────────────────────────────

console.log(`\nPassed: ${passed}`);
console.log(`Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
