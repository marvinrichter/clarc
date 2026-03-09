#!/usr/bin/env node
/**
 * update-rules.js — Apply or preview upstream clarc rule updates
 *
 * Usage:
 *   node ~/.clarc/scripts/update-rules.js           # apply updates
 *   node ~/.clarc/scripts/update-rules.js --dry-run # preview only (no changes)
 *   node ~/.clarc/scripts/update-rules.js --force   # overwrite user-modified files
 *
 * Safety protocol:
 *   - Compares installed rules against upstream (git pull first)
 *   - Skips files that were modified by the user after install (mtime > install mtime)
 *   - In --force mode: overwrites user-modified files with a warning
 *   - Never deletes files (only adds or updates)
 *   - Prints a summary at the end
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';

const CLARC_HOME = join(homedir(), '.clarc');
const CLAUDE_DIR = join(homedir(), '.claude');
const INSTALLED_VERSION_FILE = join(CLARC_HOME, 'installed-rules-version');
const UPSTREAM_VERSION_FILE = join(CLARC_HOME, 'rules', 'RULES_VERSION');

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const DIM = '\x1b[2m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const FORCE = args.includes('--force');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function readVersion(filePath) {
  if (!existsSync(filePath)) return null;
  try {
    return readFileSync(filePath, 'utf8').trim();
  } catch {
    return null;
  }
}

function getInstallTimestamp() {
  if (!existsSync(INSTALLED_VERSION_FILE)) return null;
  try {
    return statSync(INSTALLED_VERSION_FILE).mtimeMs;
  } catch {
    return null;
  }
}

/**
 * Walk a directory recursively, returning all file paths relative to the root.
 */
function walkDir(dir, rel = '') {
  if (!existsSync(dir)) return [];
  const results = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    const absPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(absPath, relPath));
    } else if (entry.name.endsWith('.md') || entry.name === 'RULES_VERSION' || entry.name === 'CHANGELOG.md') {
      results.push(relPath);
    }
  }
  return results;
}

/**
 * Check if a target file was modified by the user after install.
 * Returns true if the file exists AND was modified after the install timestamp.
 */
function isUserModified(targetPath, installTimestamp) {
  if (!existsSync(targetPath)) return false;
  if (!installTimestamp) return false;
  try {
    const { mtimeMs } = statSync(targetPath);
    // Add 5s buffer to account for file system timestamp precision
    return mtimeMs > installTimestamp + 5000;
  } catch {
    return false;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log(`\n${BOLD}clarc ${DRY_RUN ? 'rules-diff' : 'update-rules'}${RESET}\n`);

// 1. Check clarc installation
if (!existsSync(CLARC_HOME)) {
  console.error(`${YELLOW}~/.clarc not found. Run: npx github:marvinrichter/clarc to install.${RESET}`);
  process.exit(1);
}

// 2. Read versions
const installedVersion = readVersion(INSTALLED_VERSION_FILE);
const upstreamVersion = readVersion(UPSTREAM_VERSION_FILE);

if (installedVersion) {
  console.log(`Installed: ${DIM}v${installedVersion}${RESET}`);
} else {
  console.log(`${YELLOW}Installed version: unknown (run ./install.sh to record)${RESET}`);
}

if (upstreamVersion) {
  console.log(`Available: ${CYAN}v${upstreamVersion}${RESET}`);
} else {
  console.log(`${YELLOW}Upstream version file not found at ${UPSTREAM_VERSION_FILE}${RESET}`);
}

console.log('');

if (installedVersion && upstreamVersion && installedVersion === upstreamVersion) {
  console.log(`${GREEN}✅ Rules are up to date (v${installedVersion})${RESET}\n`);
  process.exit(0);
}

// 3. Discover upstream rule files
const upstreamRulesDir = join(CLARC_HOME, 'rules');
const upstreamFiles = walkDir(upstreamRulesDir);

if (upstreamFiles.length === 0) {
  console.error(`${YELLOW}No rule files found in ${upstreamRulesDir}${RESET}`);
  process.exit(1);
}

// 4. Compare upstream against installed claude rules dir
const installedRulesDir = join(CLAUDE_DIR, 'rules');
const installTimestamp = getInstallTimestamp();

const stats = { added: 0, changed: 0, skipped: 0, unchanged: 0 };
const report = { added: [], changed: [], skipped: [], unchanged: [] };

for (const relPath of upstreamFiles) {
  // Skip RULES_VERSION and CHANGELOG from rule-by-rule comparison
  if (relPath === 'RULES_VERSION' || relPath === 'CHANGELOG.md' || relPath === 'README.md') continue;

  const srcPath = join(upstreamRulesDir, relPath);
  const dstPath = join(installedRulesDir, relPath);

  const srcContent = existsSync(srcPath) ? readFileSync(srcPath, 'utf8') : null;
  const dstContent = existsSync(dstPath) ? readFileSync(dstPath, 'utf8') : null;

  if (!dstContent) {
    // New file — safe to add
    report.added.push(relPath);
    stats.added++;
    if (!DRY_RUN) {
      mkdirSync(dirname(dstPath), { recursive: true });
      writeFileSync(dstPath, srcContent, 'utf8');
    }
  } else if (srcContent === dstContent) {
    report.unchanged.push(relPath);
    stats.unchanged++;
  } else {
    // File has changed upstream — check for user modifications
    const userModified = isUserModified(dstPath, installTimestamp);
    if (userModified && !FORCE) {
      report.skipped.push(relPath);
      stats.skipped++;
    } else {
      const userNote = userModified && FORCE ? ' (user-modified, --force applied)' : '';
      report.changed.push(relPath + userNote);
      stats.changed++;
      if (!DRY_RUN) {
        mkdirSync(dirname(dstPath), { recursive: true });
        writeFileSync(dstPath, srcContent, 'utf8');
      }
    }
  }
}

// 5. Print report
for (const f of report.added) {
  console.log(`${GREEN}+${RESET} ${f}  ${DIM}(NEW)${RESET}`);
}
for (const f of report.changed) {
  console.log(`${CYAN}~${RESET} ${f}  ${DIM}(CHANGED)${RESET}`);
}
for (const f of report.skipped) {
  console.log(`${YELLOW}!${RESET} ${f}  ${DIM}(user-modified, skipped — use --force to overwrite)${RESET}`);
}

if (report.unchanged.length > 0 && (stats.added + stats.changed + stats.skipped) === 0) {
  console.log(`${DIM}All ${stats.unchanged} rule files unchanged.${RESET}`);
}

console.log('');
const summaryParts = [];
if (stats.added) summaryParts.push(`${GREEN}${stats.added} new${RESET}`);
if (stats.changed) summaryParts.push(`${CYAN}${stats.changed} updated${RESET}`);
if (stats.skipped) summaryParts.push(`${YELLOW}${stats.skipped} skipped (user-modified)${RESET}`);
if (stats.unchanged) summaryParts.push(`${DIM}${stats.unchanged} unchanged${RESET}`);
console.log(summaryParts.join('  ·  '));
console.log('');

// 6. Apply version file (not in dry-run)
if (!DRY_RUN) {
  if (existsSync(UPSTREAM_VERSION_FILE)) {
    writeFileSync(INSTALLED_VERSION_FILE, upstreamVersion + '\n', 'utf8');
    console.log(`${GREEN}✅ Rules updated to v${upstreamVersion}${RESET}`);
  }
  if (stats.skipped > 0) {
    console.log(`${YELLOW}${stats.skipped} user-modified file(s) skipped. Run --force to overwrite.${RESET}`);
  }
} else {
  if (stats.added + stats.changed > 0) {
    console.log(`Run ${BOLD}/update-rules${RESET} to apply these changes.`);
  }
}

console.log('');
