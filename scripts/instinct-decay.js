#!/usr/bin/env node
/**
 * instinct-decay — Weekly confidence decay for stale instincts.
 *
 * Decay model:
 *   unused 30–89 days:  confidence -= 0.02 per week
 *   unused 90–179 days: flag in output (no extra penalty)
 *   unused 180+ days:   auto-archive (move to archived/) if confidence < 0.50
 *
 * The script is idempotent for the same week (checks last-decay.json).
 * Designed to run as a SessionEnd hook — exits silently if decay already
 * ran within the past 6 days.
 *
 * Usage:
 *   node scripts/instinct-decay.js              # weekly gate (silent if recent)
 *   node scripts/instinct-decay.js --force      # run regardless of last-decay date
 *   node scripts/instinct-decay.js --dry-run    # preview changes without writing
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const HOMUNCULUS_DIR = path.join(os.homedir(), '.claude', 'homunculus');
const LAST_DECAY_FILE = path.join(HOMUNCULUS_DIR, 'last-decay.json');
const TODAY = new Date().toISOString().slice(0, 10);
const NOW_MS = Date.now();

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const DRY_RUN = args.includes('--dry-run');

const DECAY_PER_WEEK = 0.02;
const DECAY_THRESHOLD_DAYS = 30;
const FLAG_THRESHOLD_DAYS = 90;
const ARCHIVE_THRESHOLD_DAYS = 180;
const ARCHIVE_CONFIDENCE_THRESHOLD = 0.50;
const SIX_DAYS_MS = 6 * 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────
// Weekly gate
// ─────────────────────────────────────────────

function shouldRun() {
  if (FORCE) return true;
  try {
    const data = JSON.parse(fs.readFileSync(LAST_DECAY_FILE, 'utf8'));
    const lastRun = new Date(data.date).getTime();
    return (NOW_MS - lastRun) > SIX_DAYS_MS;
  } catch {
    return true; // No record — first run
  }
}

function recordLastRun() {
  fs.mkdirSync(HOMUNCULUS_DIR, { recursive: true });
  fs.writeFileSync(LAST_DECAY_FILE, JSON.stringify({ date: TODAY }), 'utf8');
}

// ─────────────────────────────────────────────
// File discovery
// ─────────────────────────────────────────────

function findInstinctFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'archived') {
      results.push(...findInstinctFiles(full));
    } else if (['.yaml', '.yml'].includes(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

// ─────────────────────────────────────────────
// Frontmatter parser/writer (minimal, same format as instinct-schema-migrate.js)
// ─────────────────────────────────────────────

function parseFrontmatter(fileContent) {
  const lines = fileContent.split('\n');
  if (lines[0]?.trim() !== '---') return null;

  const frontmatterLines = [];
  let closeIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      closeIdx = i;
      break;
    }
    frontmatterLines.push(lines[i]);
  }
  if (closeIdx === -1) return null;

  const fields = new Map();
  for (const line of frontmatterLines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim().replace(/^["']|["']$/g, '');
    fields.set(key, value);
  }

  const content = lines.slice(closeIdx + 1).join('\n');
  return { fields, content };
}

function serializeFrontmatter(fields) {
  const lines = ['---'];
  for (const [key, value] of fields.entries()) {
    const needsQuote = /[:#[\]{},|>&!%@`]/.test(String(value)) || String(value).startsWith(' ');
    lines.push(needsQuote ? `${key}: "${value}"` : `${key}: ${value}`);
  }
  lines.push('---');
  return lines.join('\n');
}

// ─────────────────────────────────────────────
// Age calculation
// ─────────────────────────────────────────────

function daysSince(dateStr) {
  if (!dateStr) return Infinity;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return Infinity;
  return (NOW_MS - d.getTime()) / (1000 * 60 * 60 * 24);
}

// ─────────────────────────────────────────────
// Archive helper
// ─────────────────────────────────────────────

function archiveInstinct(filePath) {
  const dir = path.dirname(filePath);
  const archivedDir = path.join(dir, 'archived');
  const destFile = path.join(archivedDir, path.basename(filePath));
  if (!DRY_RUN) {
    fs.mkdirSync(archivedDir, { recursive: true });
    fs.renameSync(filePath, destFile);
  }
  return destFile;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

function main() {
  if (!shouldRun()) {
    // Silent exit — decay ran recently
    process.exit(0);
  }

  if (!fs.existsSync(HOMUNCULUS_DIR)) {
    process.exit(0);
  }

  const files = findInstinctFiles(HOMUNCULUS_DIR);
  if (files.length === 0) {
    if (!DRY_RUN) recordLastRun();
    process.exit(0);
  }

  const results = { decayed: 0, flagged: 0, archived: 0, skipped: 0 };
  const report = [];

  for (const filePath of files) {
    let raw;
    try {
      raw = fs.readFileSync(filePath, 'utf8');
    } catch {
      results.skipped++;
      continue;
    }

    const parsed = parseFrontmatter(raw);
    if (!parsed || !parsed.fields.has('id')) {
      results.skipped++;
      continue;
    }

    const fields = parsed.fields;
    const id = fields.get('id') || path.basename(filePath, path.extname(filePath));
    const lastUsed = fields.get('last_used') || fields.get('created') || '';
    const currentConfidence = parseFloat(fields.get('confidence') || '0.60');
    const ageInDays = daysSince(lastUsed);

    // Archive: unused 180+ days and low confidence
    if (ageInDays >= ARCHIVE_THRESHOLD_DAYS && currentConfidence < ARCHIVE_CONFIDENCE_THRESHOLD) {
      const dest = archiveInstinct(filePath);
      results.archived++;
      report.push(`  ARCHIVED  ${id} (conf=${currentConfidence.toFixed(2)}, unused ${Math.round(ageInDays)}d) → ${dest}`);
      continue;
    }

    // Flag: unused 90–179 days
    if (ageInDays >= FLAG_THRESHOLD_DAYS) {
      results.flagged++;
      report.push(`  FLAGGED   ${id} (conf=${currentConfidence.toFixed(2)}, unused ${Math.round(ageInDays)}d — review recommended)`);
    }

    // Decay: unused 30+ days
    if (ageInDays >= DECAY_THRESHOLD_DAYS) {
      const newConfidence = Math.max(0.10, currentConfidence - DECAY_PER_WEEK);
      if (newConfidence !== currentConfidence) {
        results.decayed++;
        report.push(`  DECAYED   ${id} ${currentConfidence.toFixed(2)} → ${newConfidence.toFixed(2)} (unused ${Math.round(ageInDays)}d)`);

        if (!DRY_RUN) {
          fields.set('confidence', String(newConfidence.toFixed(2)));
          const newRaw = serializeFrontmatter(fields) + parsed.content;
          try {
            fs.writeFileSync(filePath, newRaw, 'utf8');
          } catch (err) {
            report.push(`  ERROR writing ${filePath}: ${err.message}`);
          }
        }
      }
    }
  }

  // Output
  if (report.length > 0 || DRY_RUN) {
    const prefix = DRY_RUN ? '[DRY RUN] ' : '';
    console.log(`${prefix}Instinct decay run — ${TODAY}`);
    console.log(`  ${files.length} files scanned`);
    console.log(`  ${results.decayed} decayed | ${results.flagged} flagged | ${results.archived} archived | ${results.skipped} skipped`);
    if (report.length > 0) {
      console.log('\nDetails:');
      for (const line of report) console.log(line);
    }
    if (DRY_RUN) {
      console.log('\nRun without --dry-run to apply changes.');
    }
  }

  if (!DRY_RUN) recordLastRun();
  process.exit(0);
}

main();
