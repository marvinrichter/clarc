#!/usr/bin/env node
/**
 * sync-instincts — Team instinct sharing for continuous-learning-v2.
 *
 * Wraps instinct-cli.py with a project convention:
 *   .claude/shared-instincts.md  ← git-tracked team instincts
 *
 * Commands:
 *   push      Export your project instincts → .claude/shared-instincts.md
 *             (commit and push to share with team)
 *   pull      Preview then import .claude/shared-instincts.md
 *             (shows dry-run diff with confidence comparison first)
 *   pull --yes  Skip confirmation and import directly
 *   status    Show shared instincts file info
 *
 * Merge strategy (handled by instinct-cli.py):
 *   - NEW instincts are added
 *   - UPDATE only if shared confidence > local confidence
 *   - SKIP if local confidence is equal or higher
 *
 * Usage:
 *   node scripts/sync-instincts.js push
 *   node scripts/sync-instincts.js pull
 *   node scripts/sync-instincts.js pull --yes
 *   node scripts/sync-instincts.js status
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const SHARED_FILE = path.join(process.cwd(), '.claude', 'shared-instincts.md');
const CLI = path.join(__dirname, '..', 'skills', 'continuous-learning-v2', 'scripts', 'instinct-cli.py');

function findPython() {
  for (const bin of ['python3', 'python', 'py']) {
    const result = spawnSync(bin, ['--version'], { stdio: 'pipe' });
    if (result.status === 0) return bin;
  }
  return null;
}

function runCli(args, opts = {}) {
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
  return spawnSync(python, [CLI, ...args], {
    stdio: opts.silent ? 'pipe' : 'inherit',
    cwd: process.cwd(),
  });
}

function fileHash(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 12);
  } catch {
    return null;
  }
}

function confirm(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => { rl.close(); resolve(answer.trim().toLowerCase()); });
  });
}

const [, , command, ...rest] = process.argv;
const skipConfirm = rest.includes('--yes') || rest.includes('-y');

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

    // Step 1: Dry-run preview
    console.log(`\nPreviewing merge from ${SHARED_FILE}...\n`);
    const dryRun = runCli(['import', SHARED_FILE, '--dry-run']);

    if (dryRun.status !== 0) {
      console.error('Preview failed. Aborting import.');
      process.exit(dryRun.status ?? 1);
    }

    // Step 2: Confirm (unless --yes)
    if (skipConfirm) {
      console.log('\n--yes flag set, proceeding with import...\n');
      const result = runCli(['import', SHARED_FILE]);
      process.exit(result.status ?? 0);
    } else {
      confirm('\nImport these instincts? [y/N] ').then(answer => {
        if (answer === 'y' || answer === 'yes') {
          console.log('Importing...\n');
          const result = runCli(['import', SHARED_FILE]);
          process.exit(result.status ?? 0);
        } else {
          console.log('Aborted. No changes made.');
          process.exit(0);
        }
      });
    }
    break;
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
    const content = fs.readFileSync(SHARED_FILE, 'utf8');
    const instinctCount = (content.match(/^---$/gm) || []).length / 2;
    const lines = content.split('\n').filter(Boolean).length;
    console.log(`Shared instincts: ${SHARED_FILE}`);
    console.log(`  Instincts     : ~${Math.round(instinctCount)}`);
    console.log(`  Last modified : ${stat.mtime.toISOString()}`);
    console.log(`  Lines         : ${lines}`);
    console.log(`  Hash          : ${hash}`);
    console.log('');
    console.log('Run "pull" to preview and load into your local instinct store.');
    process.exit(0);
  }

  default:
    console.log('Usage: node scripts/sync-instincts.js <push|pull|status> [--yes]');
    console.log('');
    console.log('Commands:');
    console.log('  push        Export project instincts → .claude/shared-instincts.md (commit to share)');
    console.log('  pull        Preview (dry-run diff) then import with confirmation');
    console.log('  pull --yes  Skip confirmation and import directly');
    console.log('  status      Show shared instincts file info');
    console.log('');
    console.log('Merge: NEW added, UPDATE only if shared confidence > local, SKIP otherwise.');
    process.exit(1);
}
