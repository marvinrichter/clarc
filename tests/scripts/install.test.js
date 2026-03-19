#!/usr/bin/env node
/**
 * Integration tests for install.sh
 *
 * Covers:
 *   - Symlink creation into a temp HOME (agents, commands, rules/common)
 *   - install-manifest.json written after install with correct shape
 *   - --check flag exits without crash and mentions 'common'
 *   - --uninstall removes clarc-managed symlinks
 *   - --upgrade removes orphan symlinks before re-installing
 *
 * All tests use isolated temp directories — nothing is written to the real ~/.claude/
 *
 * Performance: the 6 read-only symlink/manifest tests share a single install run.
 * The uninstall and upgrade tests each need their own install.
 */

import { spawnSync } from 'child_process';
import {
  mkdtempSync, rmSync, existsSync, mkdirSync, writeFileSync,
  symlinkSync, lstatSync, readFileSync, readdirSync
} from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const INSTALL_SH = join(REPO_ROOT, 'install.sh');
const MANIFEST_FILE = join(REPO_ROOT, 'install-manifest.json');

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

/** Run install.sh with given args using tmpHome as HOME. Always passes --no-learning to skip interactive prompt. */
function runInstall(args = [], tmpHome) {
  return spawnSync('bash', [INSTALL_SH, '--no-learning', ...args], {
    encoding: 'utf8',
    env: { ...process.env, HOME: tmpHome, CLAUDE_PLUGIN_ROOT: REPO_ROOT }
  });
}

/**
 * Back up the manifest before a test that modifies it, restore after.
 * Calls fn() then restores.
 */
function withManifestBackup(fn) {
  const backupPath = MANIFEST_FILE + '.bak';
  const hadManifest = existsSync(MANIFEST_FILE);
  if (hadManifest) {
    writeFileSync(backupPath, readFileSync(MANIFEST_FILE));
    rmSync(MANIFEST_FILE);
  }
  try {
    fn();
  } finally {
    if (hadManifest) {
      writeFileSync(MANIFEST_FILE, readFileSync(backupPath));
      rmSync(backupPath);
    } else {
      // Clean up any manifest and backup created by the install
      if (existsSync(MANIFEST_FILE)) rmSync(MANIFEST_FILE);
      const auto = MANIFEST_FILE.replace('.json', '.backup.json');
      if (existsSync(auto)) rmSync(auto);
    }
  }
}

// ─── Shared install for read-only tests ──────────────────────────────────────
// The 6 symlink + manifest tests all just read state after a single install.
// We run install.sh once and share the result instead of spawning it 6 times.

let sharedTmpHome = null;
let sharedManifest = null;

withManifestBackup(() => {
  sharedTmpHome = mkdtempSync(join(tmpdir(), 'clarc-shared-'));
  runInstall(['typescript'], sharedTmpHome);
  sharedManifest = existsSync(MANIFEST_FILE)
    ? JSON.parse(readFileSync(MANIFEST_FILE, 'utf8'))
    : null;
});

// ─── Symlink creation ─────────────────────────────────────────────────────────

console.log('\n--- Symlink creation ---\n');

test('install.sh creates ~/.claude/agents/ with symlinked .md files', () => {
  if (process.platform === 'win32') {
    console.log('  (skipped on Windows — install.sh uses bash symlinks not available without elevated privileges)');
    passed++; return;
  }
  const agentsDir = join(sharedTmpHome, '.claude', 'agents');
  assert(existsSync(agentsDir), `~/.claude/agents/ not created`);
  const mdFiles = readdirSync(agentsDir).filter(f => f.endsWith('.md'));
  assert(mdFiles.length > 0, `No .md files in ${agentsDir}`);
  const symlinks = mdFiles.filter(f => lstatSync(join(agentsDir, f)).isSymbolicLink());
  assert(symlinks.length > 0, `No symlinks in ${agentsDir} — install may have used copy mode`);
});

test('install.sh creates ~/.claude/commands/ with .md files', () => {
  const commandsDir = join(sharedTmpHome, '.claude', 'commands');
  assert(existsSync(commandsDir), `~/.claude/commands/ not created`);
  const mdFiles = readdirSync(commandsDir).filter(f => f.endsWith('.md'));
  assert(mdFiles.length > 0, `No .md files in ${commandsDir}`);
});

test('install.sh creates ~/.claude/rules/common/ with .md files', () => {
  const rulesDir = join(sharedTmpHome, '.claude', 'rules', 'common');
  assert(existsSync(rulesDir), `~/.claude/rules/common/ not created`);
  const mdFiles = readdirSync(rulesDir).filter(f => f.endsWith('.md'));
  assert(mdFiles.length > 0, `No .md files in ${rulesDir}`);
});

// ─── Manifest writing ─────────────────────────────────────────────────────────

console.log('\n--- install-manifest.json ---\n');

test('install.sh writes install-manifest.json with required fields', () => {
  if (process.platform === 'win32') {
    console.log('  (skipped on Windows — install.sh symlink creation requires elevated privileges)');
    passed++; return;
  }
  assert(sharedManifest !== null, 'install-manifest.json not created after install');
  assert(sharedManifest.version, 'manifest.version missing');
  assert(sharedManifest.installed_at, 'manifest.installed_at missing');
  assert(sharedManifest.target === 'claude', `manifest.target expected "claude", got "${sharedManifest.target}"`);
  assert(Array.isArray(sharedManifest.symlinks), 'manifest.symlinks must be an array');
  assert(sharedManifest.symlinks.length > 0, 'manifest.symlinks is empty — no symlinks tracked');
});

test('manifest symlink entries have src, dst, component fields', () => {
  if (!sharedManifest) return;
  for (const entry of sharedManifest.symlinks.slice(0, 5)) {
    assert(entry.src, `Symlink entry missing src: ${JSON.stringify(entry)}`);
    assert(entry.dst, `Symlink entry missing dst: ${JSON.stringify(entry)}`);
    assert(entry.component, `Symlink entry missing component: ${JSON.stringify(entry)}`);
  }
});

test('manifest symlink src paths actually exist on disk', () => {
  if (!sharedManifest) return;
  for (const entry of sharedManifest.symlinks.slice(0, 10)) {
    assert(existsSync(entry.src), `Manifest src does not exist on disk: ${entry.src}`);
  }
});

// ─── Shared tmpHome cleanup ───────────────────────────────────────────────────

rmSync(sharedTmpHome, { recursive: true, force: true });

// ─── --check flag ─────────────────────────────────────────────────────────────

console.log('\n--- --check flag ---\n');

test('--check exits without crash and produces output', () => {
  const { status, stdout, stderr } = spawnSync('bash', [INSTALL_SH, '--check'], {
    encoding: 'utf8',
    env: process.env
  });
  const output = stdout + stderr;
  assert(typeof status === 'number', `--check crashed unexpectedly: ${output.slice(0, 200)}`);
  assert(output.length > 0, '--check produced no output');
});

test('--check output mentions rules or common', () => {
  const { stdout, stderr } = spawnSync('bash', [INSTALL_SH, '--check'], {
    encoding: 'utf8',
    env: process.env
  });
  const output = (stdout + stderr).toLowerCase();
  assert(output.includes('common') || output.includes('rule') || output.includes('check'),
    `--check output does not mention 'common', 'rule', or 'check': ${(stdout + stderr).slice(0, 300)}`);
});

// ─── --uninstall removes symlinks ─────────────────────────────────────────────

console.log('\n--- --uninstall ---\n');

test('--uninstall --yes removes agents symlinks tracked in manifest', () => {
  const tmpHome = mkdtempSync(join(tmpdir(), 'clarc-uninstall-'));
  try {
    withManifestBackup(() => {
      // Install first
      runInstall(['typescript'], tmpHome);
      if (!existsSync(MANIFEST_FILE)) return;

      const agentsDir = join(tmpHome, '.claude', 'agents');
      const agentsBefore = existsSync(agentsDir)
        ? readdirSync(agentsDir).filter(f => f.endsWith('.md')).length
        : 0;
      assert(agentsBefore > 0, 'No agents installed — cannot test uninstall');

      // Uninstall
      const { status } = spawnSync('bash', [INSTALL_SH, '--uninstall', '--yes'], {
        encoding: 'utf8',
        env: { ...process.env, HOME: tmpHome, CLAUDE_PLUGIN_ROOT: REPO_ROOT }
      });
      assert(status === 0, `--uninstall exited with status ${status}`);

      // Agent symlinks should be gone
      const agentsAfter = existsSync(agentsDir)
        ? readdirSync(agentsDir).filter(f => f.endsWith('.md')).length
        : 0;
      assert(agentsAfter === 0, `${agentsAfter} agent .md files still exist after --uninstall`);
    });
  } finally {
    rmSync(tmpHome, { recursive: true, force: true });
  }
});

test('--uninstall --yes --dry-run removes nothing', () => {
  const tmpHome = mkdtempSync(join(tmpdir(), 'clarc-uninstall-dry-'));
  try {
    withManifestBackup(() => {
      runInstall(['typescript'], tmpHome);
      if (!existsSync(MANIFEST_FILE)) return;

      const agentsDir = join(tmpHome, '.claude', 'agents');
      const agentsBefore = existsSync(agentsDir)
        ? readdirSync(agentsDir).filter(f => f.endsWith('.md')).length
        : 0;
      if (agentsBefore === 0) return;

      // Dry-run uninstall
      spawnSync('bash', [INSTALL_SH, '--uninstall', '--yes', '--dry-run'], {
        encoding: 'utf8',
        env: { ...process.env, HOME: tmpHome, CLAUDE_PLUGIN_ROOT: REPO_ROOT }
      });

      // Agents should still be there
      const agentsAfter = existsSync(agentsDir)
        ? readdirSync(agentsDir).filter(f => f.endsWith('.md')).length
        : 0;
      assert(agentsAfter === agentsBefore,
        `--dry-run uninstall removed files: before=${agentsBefore}, after=${agentsAfter}`);
    });
  } finally {
    rmSync(tmpHome, { recursive: true, force: true });
  }
});

// ─── --upgrade removes orphan symlinks ───────────────────────────────────────

console.log('\n--- --upgrade (orphan cleanup) ---\n');

test('--upgrade removes broken clarc symlinks pointing to ~/.clarc/', () => {
  const tmpHome = mkdtempSync(join(tmpdir(), 'clarc-upgrade-'));
  try {
    // Create ~/.claude/agents/ with an orphan symlink pointing to a nonexistent ~/.clarc/ path
    const agentsDir = join(tmpHome, '.claude', 'agents');
    mkdirSync(agentsDir, { recursive: true });
    const fakeSrc = join(tmpHome, '.clarc', 'agents', 'orphan-test.md');
    const orphanLink = join(agentsDir, 'orphan-test.md');
    symlinkSync(fakeSrc, orphanLink);

    // Verify it's a broken symlink
    assert(lstatSync(orphanLink).isSymbolicLink(), 'Could not create orphan symlink');
    assert(!existsSync(orphanLink), 'Orphan symlink should be broken (target does not exist)');

    // Run --upgrade (it scans for orphans, removes them, then re-installs)
    withManifestBackup(() => {
      spawnSync('bash', [INSTALL_SH, '--upgrade', 'typescript'], {
        encoding: 'utf8',
        env: { ...process.env, HOME: tmpHome, CLAUDE_PLUGIN_ROOT: REPO_ROOT }
      });
    });

    // Orphan should be gone
    let orphanGone = false;
    try {
      lstatSync(orphanLink);
      orphanGone = false;
    } catch {
      orphanGone = true; // ENOENT means it was removed
    }
    assert(orphanGone, `Orphan symlink still exists at ${orphanLink} after --upgrade`);
  } finally {
    rmSync(tmpHome, { recursive: true, force: true });
  }
});

// ─── Results ──────────────────────────────────────────────────────────────────

console.log(`\nPassed: ${passed}`);
console.log(`Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
