#!/usr/bin/env node
/**
 * sync-instincts — Team instinct sharing for continuous-learning-v2.
 *
 * Wraps instinct-cli.py with a project convention:
 *   .claude/shared-instincts.md  ← git-tracked team instincts
 *
 * Commands:
 *   push   Export your project instincts → .claude/shared-instincts.md
 *          (commit and push to share with team)
 *   pull   Import .claude/shared-instincts.md → your local instinct store
 *          (run after git pull to adopt team instincts)
 *   status Show whether local and shared instincts are in sync
 *
 * Usage:
 *   node scripts/sync-instincts.js push
 *   node scripts/sync-instincts.js pull
 *   node scripts/sync-instincts.js status
 *
 * Or add to package.json scripts:
 *   "instincts:push": "node scripts/sync-instincts.js push",
 *   "instincts:pull": "node scripts/sync-instincts.js pull"
 */

const { execFileSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SHARED_FILE = path.join(process.cwd(), '.claude', 'shared-instincts.md');
const CLI = path.join(__dirname, '..', 'skills', 'continuous-learning-v2', 'scripts', 'instinct-cli.py');

function findPython() {
  for (const bin of ['python3', 'python', 'py']) {
    const result = spawnSync(bin, ['--version'], { stdio: 'pipe' });
    if (result.status === 0) return bin;
  }
  return null;
}

function runCli(args) {
  const python = findPython();
  if (!python) {
    console.error('Error: Python 3 is required. Install from https://python.org');
    process.exit(1);
  }
  if (!fs.existsSync(CLI)) {
    console.error(`Error: instinct-cli.py not found at ${CLI}`);
    console.error('Is continuous-learning-v2 skill installed?');
    process.exit(1);
  }
  return spawnSync(python, [CLI, ...args], { stdio: 'inherit', cwd: process.cwd() });
}

function fileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
  } catch {
    return null;
  }
}

const [, , command] = process.argv;

switch (command) {
  case 'push': {
    console.log(`Exporting project instincts → ${SHARED_FILE}`);
    fs.mkdirSync(path.dirname(SHARED_FILE), { recursive: true });
    const result = runCli(['export', SHARED_FILE, '--scope', 'project']);
    if (result.status === 0) {
      console.log('\nNext steps:');
      console.log('  git add .claude/shared-instincts.md');
      console.log('  git commit -m "chore: update shared instincts"');
      console.log('  git push');
    }
    process.exit(result.status ?? 0);
  }

  case 'pull': {
    if (!fs.existsSync(SHARED_FILE)) {
      console.error(`No shared instincts found at ${SHARED_FILE}`);
      console.error('Run "node scripts/sync-instincts.js push" on another machine first.');
      process.exit(1);
    }
    console.log(`Importing team instincts from ${SHARED_FILE}`);
    const result = runCli(['import', SHARED_FILE]);
    process.exit(result.status ?? 0);
  }

  case 'status': {
    const exists = fs.existsSync(SHARED_FILE);
    if (!exists) {
      console.log('No shared instincts file found (.claude/shared-instincts.md).');
      console.log('Run "push" to create one from your project instincts.');
      process.exit(0);
    }
    const hash = fileHash(SHARED_FILE);
    const stat = fs.statSync(SHARED_FILE);
    const lines = fs.readFileSync(SHARED_FILE, 'utf8').split('\n').filter(Boolean).length;
    console.log(`Shared instincts: ${SHARED_FILE}`);
    console.log(`  Last modified : ${stat.mtime.toISOString()}`);
    console.log(`  Lines         : ${lines}`);
    console.log(`  Hash          : ${hash}`);
    console.log('');
    console.log('Run "pull" to load into your local instinct store.');
    process.exit(0);
  }

  default:
    console.log('Usage: node scripts/sync-instincts.js <push|pull|status>');
    console.log('');
    console.log('Commands:');
    console.log('  push    Export project instincts → .claude/shared-instincts.md (commit to share)');
    console.log('  pull    Import .claude/shared-instincts.md → local instinct store');
    console.log('  status  Show shared instincts file info');
    process.exit(1);
}
