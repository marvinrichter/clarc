#!/usr/bin/env node
/**
 * merge-hooks.js — Merge clarc hooks into ~/.claude/hooks/hooks.json.
 *
 * For each clarc hook entry, checks if the same command string already exists
 * in the destination. If yes, skips with a warning. If no, adds the entry.
 * User-defined hooks are always preserved.
 *
 * Paths can be overridden via env vars for testing:
 *   CLARC_HOOKS_SOURCE — path to clarc hooks.json (default: ~/.clarc/hooks/hooks.json)
 *   CLAUDE_HOOKS_DEST  — path to user hooks.json  (default: ~/.claude/hooks/hooks.json)
 *
 * Usage:
 *   node scripts/merge-hooks.js [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const DRY_RUN = process.argv.includes('--dry-run');

const CLARC_HOOKS_SOURCE =
  process.env.CLARC_HOOKS_SOURCE ||
  path.join(os.homedir(), '.clarc', 'hooks', 'hooks.json');

const CLAUDE_HOOKS_DEST =
  process.env.CLAUDE_HOOKS_DEST ||
  path.join(os.homedir(), '.claude', 'hooks', 'hooks.json');

// --- Load source ---
if (!fs.existsSync(CLARC_HOOKS_SOURCE)) {
  // Not an error during install — clarc may not be set up yet in this HOME
  if (process.env.CLARC_HOOKS_SOURCE) {
    // Explicit path provided (e.g. in tests) — treat as error
    console.error(`  Error: clarc hooks not found: ${CLARC_HOOKS_SOURCE}`);
    process.exit(1);
  }
  console.log(`  Hooks: source not found (${CLARC_HOOKS_SOURCE}), skipping`);
  process.exit(0);
}

const clarc = JSON.parse(fs.readFileSync(CLARC_HOOKS_SOURCE, 'utf8'));
const clarcHooks = clarc.hooks || {};

// --- Load destination ---
let dest = { hooks: {} };
if (fs.existsSync(CLAUDE_HOOKS_DEST)) {
  dest = JSON.parse(fs.readFileSync(CLAUDE_HOOKS_DEST, 'utf8'));
  if (!dest.hooks) dest.hooks = {};
}

// --- Collect all command strings present in an event's entries ---
function commandsInEvent(hooks, event) {
  const cmds = new Set();
  for (const entry of hooks[event] || []) {
    for (const h of entry.hooks || []) {
      if (h.command) cmds.add(h.command);
    }
  }
  return cmds;
}

// --- Merge ---
let added = 0;
let skipped = 0;

for (const [event, entries] of Object.entries(clarcHooks)) {
  if (!dest.hooks[event]) dest.hooks[event] = [];

  for (const entry of entries) {
    const entryCmds = (entry.hooks || []).map(h => h.command).filter(Boolean);
    const existing = commandsInEvent(dest.hooks, event);
    const alreadyPresent = entryCmds.some(cmd => existing.has(cmd));

    if (alreadyPresent) {
      const label = entry.description
        ? entry.description.slice(0, 60)
        : entryCmds[0] || 'unknown';
      console.log(`  ⚠  skipped  ${event}/${entry.matcher}: ${label}`);
      skipped++;
    } else {
      dest.hooks[event].push(entry);
      const label = entry.description
        ? entry.description.slice(0, 60)
        : entryCmds[0] || 'unknown';
      console.log(`  ✔  added    ${event}/${entry.matcher}: ${label}`);
      added++;
    }
  }
}

// --- Write (unless dry-run) ---
if (!DRY_RUN) {
  fs.mkdirSync(path.dirname(CLAUDE_HOOKS_DEST), { recursive: true });
  fs.writeFileSync(CLAUDE_HOOKS_DEST, JSON.stringify(dest, null, 2) + '\n', 'utf8');
}

const dryLabel = DRY_RUN ? ' (dry run — not written)' : ` → ${CLAUDE_HOOKS_DEST}`;
console.log(`\n  Hooks: ${added} added, ${skipped} skipped${dryLabel}`);
