#!/usr/bin/env node
/**
 * clarc doctor — health-check for clarc installations
 *
 * Usage:
 *   npx github:marvinrichter/clarc doctor
 *   clarc-doctor
 *   node scripts/doctor.js
 */

import { existsSync, readFileSync, readdirSync, readlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { execSync } from 'child_process';

const CLAUDE_DIR = join(homedir(), '.claude');
const CLARC_HOME = join(homedir(), '.clarc');

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';

let passed = 0;
let warnings = 0;
let failed = 0;

function ok(label, detail = '') {
  passed++;
  console.log(`${GREEN}✅${RESET} ${label}${detail ? `  ${DIM}${detail}${RESET}` : ''}`);
}

function warn(label, detail = '', fix = '') {
  warnings++;
  console.log(`${YELLOW}⚠️  ${label}${RESET}${detail ? `  ${DIM}${detail}${RESET}` : ''}`);
  if (fix) console.log(`   ${DIM}→ ${fix}${RESET}`);
}

function fail(label, detail = '', fix = '') {
  failed++;
  console.log(`${RED}❌ ${label}${RESET}${detail ? `  ${DIM}${detail}${RESET}` : ''}`);
  if (fix) console.log(`   ${DIM}→ ${fix}${RESET}`);
}

function countFiles(dir) {
  if (!existsSync(dir)) return 0;
  try {
    return readdirSync(dir).filter(f => f.endsWith('.md')).length;
  } catch {
    return 0;
  }
}

function lineCount(filePath) {
  if (!existsSync(filePath)) return 0;
  try {
    return readFileSync(filePath, 'utf8').split('\n').length;
  } catch {
    return 0;
  }
}

function isValidJson(filePath) {
  if (!existsSync(filePath)) return { valid: false, error: 'file not found' };
  try {
    JSON.parse(readFileSync(filePath, 'utf8'));
    return { valid: true };
  } catch (e) {
    return { valid: false, error: e.message };
  }
}


function getLatestVersion() {
  try {
    const result = execSync(
      'curl -sf https://raw.githubusercontent.com/marvinrichter/clarc/main/package.json 2>/dev/null',
      { timeout: 3000 }
    ).toString();
    return JSON.parse(result).version;
  } catch {
    return null;
  }
}

function getCurrentVersion() {
  // Try local clarc installation first
  const localPkg = join(CLARC_HOME, 'package.json');
  if (existsSync(localPkg)) {
    try {
      return JSON.parse(readFileSync(localPkg, 'utf8')).version;
    } catch {
      return null;
    }
  }
  return null;
}

// ─── Run checks ───────────────────────────────────────────────────────────────

console.log(`\n${BOLD}clarc doctor${RESET} — checking your installation\n`);

// 1. Node.js version
const nodeVersion = process.versions.node;
const [nodeMajor] = nodeVersion.split('.').map(Number);
if (nodeMajor >= 18) {
  ok(`Node.js ${nodeVersion}`);
} else {
  fail(`Node.js ${nodeVersion} (requires >=18)`, '', 'Install Node.js 18+: https://nodejs.org');
}

// 2. ~/.claude/ directory
if (existsSync(CLAUDE_DIR)) {
  ok(`~/.claude/ exists`);
} else {
  fail('~/.claude/ not found', '', 'Run: npx github:marvinrichter/clarc');
}

// 3. Agents
const agentsDir = join(CLAUDE_DIR, 'agents');
const agentCount = countFiles(agentsDir);
if (agentCount >= 10) {
  ok(`Agents: ${agentCount} installed`);
} else if (agentCount > 0) {
  warn(`Agents: only ${agentCount} found (expected 10+)`, '', 'Run: npx github:marvinrichter/clarc');
} else {
  fail('Agents: none found', agentsDir, 'Run: npx github:marvinrichter/clarc');
}

// 4. Skills
const skillsDir = join(CLAUDE_DIR, 'skills');
let skillCount = 0;
if (existsSync(skillsDir)) {
  try {
    skillCount = readdirSync(skillsDir)
      .filter(d => existsSync(join(skillsDir, d, 'SKILL.md'))).length;
  } catch {
    skillCount = 0;
  }
}
if (skillCount >= 20) {
  ok(`Skills: ${skillCount} installed`);
} else if (skillCount > 0) {
  warn(`Skills: only ${skillCount} found (expected 20+)`, '', 'Run: npx github:marvinrichter/clarc');
} else {
  fail('Skills: none found', skillsDir, 'Run: npx github:marvinrichter/clarc');
}

// 5. Commands
const commandsDir = join(CLAUDE_DIR, 'commands');
const commandCount = countFiles(commandsDir);
if (commandCount >= 20) {
  ok(`Commands: ${commandCount} installed`);
} else if (commandCount > 0) {
  warn(`Commands: only ${commandCount} found (expected 20+)`, '', 'Run: npx github:marvinrichter/clarc');
} else {
  fail('Commands: none found', commandsDir, 'Run: npx github:marvinrichter/clarc');
}

// 6. Hooks
const hooksDir = join(CLAUDE_DIR, 'hooks');
const hooksJsonPath = join(hooksDir, 'hooks.json');
if (existsSync(hooksDir)) {
  const jsonCheck = isValidJson(hooksJsonPath);
  if (jsonCheck.valid) {
    const hooks = JSON.parse(readFileSync(hooksJsonPath, 'utf8'));
    const hookCount = Array.isArray(hooks) ? hooks.length : Object.keys(hooks).length;
    ok(`Hooks: active (${hookCount} hook${hookCount !== 1 ? 's' : ''})`);
  } else if (existsSync(hooksJsonPath)) {
    fail('hooks.json: JSON syntax error', jsonCheck.error, `Fix: check ${hooksJsonPath}`);
  } else {
    warn('Hooks: hooks.json not found', '', 'Run clarc install to enable hooks');
  }
} else {
  warn('Hooks: not installed', '', 'Run: npx github:marvinrichter/clarc --enable-learning');
}

// 7. Symlink health — scan agents, commands, and rules for orphan clarc symlinks
if (existsSync(CLARC_HOME)) {
  const dirsToScan = [agentsDir, commandsDir, join(CLAUDE_DIR, 'rules')];
  let totalLinks = 0;
  let orphanLinks = 0;
  const orphanPaths = [];

  for (const scanDir of dirsToScan) {
    if (!existsSync(scanDir)) continue;
    try {
      const walk = (dir, depth = 0) => {
        if (depth > 2) return;
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = join(dir, entry.name);
          if (entry.isSymbolicLink()) {
            totalLinks++;
            // Check if symlink is broken
            if (!existsSync(fullPath)) {
              try {
                const target = readlinkSync(fullPath);
                // Only report clarc-managed orphans (point to ~/.clarc/)
                if (target.includes('/.clarc/') || target.includes(CLARC_HOME)) {
                  orphanLinks++;
                  orphanPaths.push(fullPath);
                }
              } catch { /* ignore read errors */ }
            }
          } else if (entry.isDirectory() && depth < 2) {
            walk(fullPath, depth + 1);
          }
        }
      };
      walk(scanDir);
    } catch { /* ignore permission errors */ }
  }

  if (orphanLinks > 0) {
    fail(
      `Symlinks: ${orphanLinks} orphan clarc symlink(s) (of ${totalLinks} total)`,
      orphanPaths.slice(0, 3).join(', ') + (orphanPaths.length > 3 ? ` +${orphanPaths.length - 3} more` : ''),
      `Run: ./install.sh --upgrade  (or cd ~/.clarc && git pull)`
    );
  } else if (totalLinks > 0) {
    ok(`Symlinks: ${totalLinks} healthy (no orphans)`);
  }
}

// 8. MEMORY.md size
const memoryPath = join(CLAUDE_DIR, 'MEMORY.md');
if (existsSync(memoryPath)) {
  const lines = lineCount(memoryPath);
  if (lines <= 180) {
    ok(`MEMORY.md: ${lines} lines`);
  } else if (lines <= 200) {
    warn(`MEMORY.md: ${lines} lines (approaching 200-line limit — clean up soon)`);
  } else {
    warn(`MEMORY.md: ${lines} lines (exceeds 200-line limit — lines after 200 are truncated)`, '', 'Archive older content to separate topic files');
  }
} else {
  ok('MEMORY.md: not present (optional)');
}

// 9. clarc version
const currentVersion = getCurrentVersion();
if (currentVersion) {
  ok(`clarc version: ${currentVersion}`);

  // Check for updates (best-effort, no failure if offline)
  const latestVersion = getLatestVersion();
  if (latestVersion && latestVersion !== currentVersion) {
    warn(`Update available: ${currentVersion} → ${latestVersion}`, '', 'Run: cd ~/.clarc && git pull');
  } else if (latestVersion) {
    ok('Up to date');
  }
} else {
  warn('clarc version: unknown', '', 'Run: npx github:marvinrichter/clarc to install to ~/.clarc/');
}

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log('');
if (failed === 0 && warnings === 0) {
  console.log(`${GREEN}${BOLD}All checks passed!${RESET} clarc is correctly installed.\n`);
} else {
  const parts = [];
  if (passed > 0) parts.push(`${GREEN}${passed} passed${RESET}`);
  if (warnings > 0) parts.push(`${YELLOW}${warnings} warning${warnings !== 1 ? 's' : ''}${RESET}`);
  if (failed > 0) parts.push(`${RED}${failed} failed${RESET}`);
  console.log(parts.join('  ·  ') + '\n');
}

if (failed > 0) process.exit(1);
