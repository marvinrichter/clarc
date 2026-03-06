#!/usr/bin/env node
/**
 * sync-instincts — Team instinct sharing for continuous-learning-v2.
 *
 * Two transport formats:
 *
 *   YAML (default, git-diff-friendly):
 *     .claude/instincts/*.yaml  ← one file per instinct, clean git diffs
 *
 *   Markdown (legacy):
 *     .claude/shared-instincts.md  ← single aggregated file
 *
 * Commands:
 *   push      Copy project instincts → .claude/instincts/ (yaml) or
 *             export → .claude/shared-instincts.md (--md)
 *   pull      Import .claude/instincts/*.yaml (or --md for legacy)
 *             Shows dry-run diff first, then confirms before applying
 *   pull --yes  Skip confirmation
 *   status    Show shared instincts info
 *
 * Merge strategy (handled by instinct-cli.py import):
 *   - NEW instincts are added
 *   - UPDATE only if shared confidence > local confidence
 *   - SKIP if local confidence is equal or higher
 *
 * Usage:
 *   node scripts/sync-instincts.js push
 *   node scripts/sync-instincts.js pull
 *   node scripts/sync-instincts.js pull --yes
 *   node scripts/sync-instincts.js push --md   (legacy single-file)
 *   node scripts/sync-instincts.js status
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const readline = require('readline');

const REPO_ROOT = process.cwd();
const YAML_DIR = path.join(REPO_ROOT, '.claude', 'instincts');
const SHARED_FILE = path.join(REPO_ROOT, '.claude', 'shared-instincts.md');
const CLI = path.join(__dirname, '..', 'skills', 'continuous-learning-v2', 'scripts', 'instinct-cli.py');
const HOMUNCULUS_DIR = path.join(process.env.HOME || process.env.USERPROFILE || '', '.claude', 'homunculus');

function findPython() {
  for (const bin of ['python3', 'python', 'py']) {
    const r = spawnSync(bin, ['--version'], { stdio: 'pipe' });
    if (r.status === 0) return bin;
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
    cwd: REPO_ROOT,
  });
}

/**
 * Resolve the project-scoped personal instincts directory using the same
 * SHA256-of-git-remote algorithm as detect-project.sh.
 * Returns null if not in a git repo or no remote is configured.
 */
function getProjectInstinctsDir() {
  const r = spawnSync('git', ['remote', 'get-url', 'origin'], {
    stdio: 'pipe', encoding: 'utf8', cwd: REPO_ROOT,
  });
  const remoteUrl = r.stdout?.trim();
  if (!remoteUrl) return null;

  const projectId = crypto.createHash('sha256').update(remoteUrl).digest('hex').slice(0, 12);
  return path.join(HOMUNCULUS_DIR, 'projects', projectId, 'instincts', 'personal');
}

function fileHash(filePath) {
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(filePath, 'utf8')).digest('hex').slice(0, 12);
  } catch { return null; }
}

function confirm(question) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, answer => { rl.close(); resolve(answer.trim().toLowerCase()); });
  });
}

const [, , command, ...rest] = process.argv;
const skipConfirm = rest.includes('--yes') || rest.includes('-y');
const useMd = rest.includes('--md');

switch (command) {
  case 'push': {
    if (useMd) {
      // Legacy: export single .md file
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

    // Default: copy individual .yaml files
    const srcDir = getProjectInstinctsDir();
    if (!srcDir) {
      console.error('Error: Could not determine project instincts directory.');
      console.error('Make sure you are in a git repo with a remote "origin".');
      process.exit(1);
    }
    if (!fs.existsSync(srcDir)) {
      console.error(`No project instincts found at ${srcDir}`);
      console.error('Run /learn or continuous-learning-v2 hooks to build instincts first.');
      process.exit(1);
    }

    const yamlFiles = fs.readdirSync(srcDir).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
    if (yamlFiles.length === 0) {
      console.log('No instinct YAML files found in project instincts directory.');
      process.exit(0);
    }

    fs.mkdirSync(YAML_DIR, { recursive: true });
    for (const file of yamlFiles) {
      fs.copyFileSync(path.join(srcDir, file), path.join(YAML_DIR, file));
    }

    console.log(`Exported ${yamlFiles.length} instinct(s) → ${YAML_DIR}`);
    console.log('\nNext steps:');
    console.log('  git add .claude/instincts/');
    console.log('  git commit -m "chore: update shared instincts"');
    console.log('  git push');
    process.exit(0);
  }

  case 'pull': {
    if (useMd) {
      // Legacy: import from single .md file
      if (!fs.existsSync(SHARED_FILE)) {
        console.error(`No shared instincts found at ${SHARED_FILE}`);
        console.error('Run "node scripts/sync-instincts.js push --md" on another machine first.');
        process.exit(1);
      }
      console.log(`\nPreviewing merge from ${SHARED_FILE}...\n`);
      const dryRun = runCli(['import', SHARED_FILE, '--dry-run']);
      if (dryRun.status !== 0) { console.error('Preview failed. Aborting.'); process.exit(dryRun.status ?? 1); }
      if (skipConfirm) {
        console.log('\n--yes flag set, proceeding with import...\n');
        process.exit(runCli(['import', SHARED_FILE]).status ?? 0);
      }
      confirm('\nImport these instincts? [y/N] ').then(answer => {
        if (answer === 'y' || answer === 'yes') {
          process.exit(runCli(['import', SHARED_FILE]).status ?? 0);
        } else { console.log('Aborted.'); process.exit(0); }
      });
      break;
    }

    // Default: import individual .yaml files
    if (!fs.existsSync(YAML_DIR)) {
      console.error(`No shared instincts directory found at ${YAML_DIR}`);
      console.error('Run "node scripts/sync-instincts.js push" on another machine first.');
      process.exit(1);
    }

    const yamlFiles = fs.readdirSync(YAML_DIR).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
    if (yamlFiles.length === 0) {
      console.log('No instinct YAML files found in .claude/instincts/');
      process.exit(0);
    }

    console.log(`\nFound ${yamlFiles.length} instinct file(s) in ${YAML_DIR}`);
    console.log('\nPreviewing merge (dry-run)...\n');

    let anyFailed = false;
    for (const file of yamlFiles) {
      const filePath = path.join(YAML_DIR, file);
      const dryRun = runCli(['import', filePath, '--dry-run']);
      if (dryRun.status !== 0) { anyFailed = true; }
    }
    if (anyFailed) { console.error('\nPreview had errors. Aborting import.'); process.exit(1); }

    if (skipConfirm) {
      console.log('\n--yes flag set, proceeding with import...\n');
      let exitCode = 0;
      for (const file of yamlFiles) {
        const r = runCli(['import', path.join(YAML_DIR, file)]);
        if (r.status !== 0) exitCode = r.status ?? 1;
      }
      process.exit(exitCode);
    } else {
      confirm(`\nImport ${yamlFiles.length} instinct(s)? [y/N] `).then(answer => {
        if (answer === 'y' || answer === 'yes') {
          console.log('Importing...\n');
          let exitCode = 0;
          for (const file of yamlFiles) {
            const r = runCli(['import', path.join(YAML_DIR, file)]);
            if (r.status !== 0) exitCode = r.status ?? 1;
          }
          process.exit(exitCode);
        } else { console.log('Aborted. No changes made.'); process.exit(0); }
      });
    }
    break;
  }

  case 'status': {
    const hasYaml = fs.existsSync(YAML_DIR);
    const hasMd = fs.existsSync(SHARED_FILE);

    if (!hasYaml && !hasMd) {
      console.log('No shared instincts found.');
      console.log('Run "push" to export from your project instincts.');
      process.exit(0);
    }

    if (hasYaml) {
      const files = fs.readdirSync(YAML_DIR).filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));
      console.log(`Shared instincts (YAML): ${YAML_DIR}`);
      console.log(`  Files         : ${files.length}`);
      if (files.length > 0) {
        const stats = files.map(f => fs.statSync(path.join(YAML_DIR, f)));
        const newest = stats.reduce((a, b) => a.mtime > b.mtime ? a : b);
        console.log(`  Last modified : ${newest.mtime.toISOString()}`);
      }
    }

    if (hasMd) {
      const content = fs.readFileSync(SHARED_FILE, 'utf8');
      const instinctCount = (content.match(/^---$/gm) || []).length / 2;
      console.log(`\nLegacy shared instincts (.md): ${SHARED_FILE}`);
      console.log(`  Instincts     : ~${Math.round(instinctCount)}`);
      console.log(`  Hash          : ${fileHash(SHARED_FILE)}`);
    }

    console.log('\nRun "pull" to preview and load into your local instinct store.');
    process.exit(0);
  }

  default:
    console.log('Usage: node scripts/sync-instincts.js <push|pull|status> [--yes] [--md]');
    console.log('');
    console.log('Commands:');
    console.log('  push          Copy project instincts → .claude/instincts/*.yaml');
    console.log('  push --md     Export → .claude/shared-instincts.md (legacy)');
    console.log('  pull          Preview then import .claude/instincts/*.yaml');
    console.log('  pull --yes    Skip confirmation');
    console.log('  pull --md     Import from legacy .claude/shared-instincts.md');
    console.log('  status        Show shared instincts info');
    console.log('');
    console.log('Merge: NEW added, UPDATE only if shared confidence > local, SKIP otherwise.');
    process.exit(1);
}
