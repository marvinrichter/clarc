#!/usr/bin/env node
/**
 * PostToolUse Hook — Auto-Checkpoint
 *
 * Creates a lightweight Git checkpoint after every Edit or Write tool call.
 * This lets users undo Claude's changes via the /undo command.
 *
 * Strategy:
 * - No initial commit in repo → git stash (reversible with git stash pop)
 * - Initial commit exists → fixup commit [skip ci] (reversible with git reset HEAD~1)
 * - Not in a Git repo → no-op, no error
 *
 * Rate limiting: max 1 checkpoint per 60 seconds (prevents spam).
 * Log: ~/.clarc/checkpoints.log (append-only, capped at 50 entries)
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { scanForSecrets } from '../lib/secret-scanner.js';

const CHECKPOINT_INTERVAL_MS = 60_000; // 1 checkpoint per 60s max
const MAX_LOG_ENTRIES = 50;
const CLARC_DIR = path.join(os.homedir(), '.clarc');
const LOG_FILE = path.join(CLARC_DIR, 'checkpoints.log');

function log(msg) {
  process.stderr.write(`[AutoCheckpoint] ${msg}\n`);
}

function git(args, cwd) {
  return new Promise((resolve) => {
    const child = spawn('git', args, { cwd, stdio: 'pipe' });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      resolve({ status: null, stdout, stderr });
    }, 10_000);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('close', code => {
      clearTimeout(timer);
      resolve({ status: code, stdout, stderr });
    });
  });
}

async function isGitRepo(cwd) {
  const r = await git(['rev-parse', '--git-dir'], cwd);
  return r.status === 0;
}

async function hasInitialCommit(cwd) {
  const r = await git(['rev-parse', 'HEAD'], cwd);
  return r.status === 0;
}

async function hasUnstagedChanges(cwd) {
  const r = await git(['status', '--porcelain'], cwd);
  return r.status === 0 && r.stdout.trim().length > 0;
}

function ensureClarcDir() {
  if (!fs.existsSync(CLARC_DIR)) {
    fs.mkdirSync(CLARC_DIR, { recursive: true });
  }
}

function readLog() {
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeLog(entries) {
  ensureClarcDir();
  // Cap at MAX_LOG_ENTRIES (keep newest)
  const capped = entries.slice(-MAX_LOG_ENTRIES);
  fs.writeFileSync(LOG_FILE, JSON.stringify(capped, null, 2), 'utf8');
}

function appendLogEntry(entry) {
  const entries = readLog();
  entries.push(entry);
  writeLog(entries);
}

function isRateLimited() {
  const entries = readLog();
  if (entries.length === 0) return false;
  const last = entries[entries.length - 1];
  return last && Date.now() - new Date(last.timestamp).getTime() < CHECKPOINT_INTERVAL_MS;
}

// Read hook input from stdin
let stdinData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { stdinData += chunk; });
process.stdin.on('end', () => {
  main().catch(err => {
    log(`Error: ${err.message}`);
    process.exit(0);
  });
});

async function main() {
  // Parse tool name from hook input
  let toolName = '';
  let toolInput = {};
  try {
    const input = JSON.parse(stdinData);
    toolName = input.tool_name || '';
    toolInput = input.tool_input || {};
  } catch {
    // Ignore parse errors — run anyway
  }

  // Only act on Edit and Write tools
  if (toolName !== 'Edit' && toolName !== 'Write') {
    process.exit(0);
  }

  const cwd = process.cwd();

  if (!await isGitRepo(cwd)) {
    log('Not a git repo — skipping checkpoint');
    process.exit(0);
  }

  if (!await hasUnstagedChanges(cwd)) {
    log('No changes to checkpoint');
    process.exit(0);
  }

  if (isRateLimited()) {
    log('Rate limited — skipping checkpoint (< 60s since last)');
    process.exit(0);
  }

  const timestamp = new Date().toISOString();
  const filePath = toolInput.file_path || toolInput.path || 'unknown';

  if (!await hasInitialCommit(cwd)) {
    // Strategy: git stash
    const stashMsg = `clarc-checkpoint-${timestamp}`;
    const r = await git(['stash', 'push', '--include-untracked', '--message', stashMsg], cwd);
    if (r.status !== 0) {
      log(`Stash failed: ${r.stderr}`);
      process.exit(0);
    }
    const entry = { timestamp, strategy: 'stash', stashMessage: stashMsg, file: filePath, cwd };
    appendLogEntry(entry);
    log(`Checkpoint created via stash: ${stashMsg}`);
  } else {
    // Strategy: fixup commit
    const commitMsg = `chore: clarc-checkpoint [skip ci]`;
    // Stage only the edited file to avoid capturing unrelated dirty files.
    // Fall back to -A only when filePath is unknown (shouldn't happen for Edit/Write).
    if (filePath && filePath !== 'unknown') {
      await git(['add', filePath], cwd);
    } else {
      await git(['add', '-A'], cwd);
    }

    // Secret guard: scan staged diff before committing.
    // auto-checkpoint uses --no-verify (bypasses pre-commit hooks), so we
    // must scan here directly. We abort the checkpoint (not the Edit) on
    // detection — the file is already saved, only the git history entry is skipped.
    const diffResult = await git(['diff', '--staged', '--unified=0'], cwd);
    if (diffResult.status === 0 && diffResult.stdout) {
      const secrets = scanForSecrets(diffResult.stdout);
      if (secrets.length > 0) {
        log('SECRET GUARD — Potential secret detected in staged changes. Checkpoint skipped to prevent secret entering git history.');
        for (const { type, snippet } of secrets) {
          log(`  ${type}: ${snippet}`);
        }
        log('Remove the secret and use an environment variable instead.');
        await git(['reset', 'HEAD'], cwd); // unstage
        process.exit(0);
      }
    }

    const r = await git(['commit', '--no-verify', '-m', commitMsg], cwd);
    if (r.status !== 0) {
      log(`Commit failed: ${r.stderr}`);
      process.exit(0);
    }
    const hashResult = await git(['rev-parse', '--short', 'HEAD'], cwd);
    const hash = hashResult.stdout.trim();
    const entry = { timestamp, strategy: 'commit', commitHash: hash, file: filePath, cwd };
    appendLogEntry(entry);
    log(`Checkpoint created via commit: ${hash}`);
  }

  process.exit(0);
}
