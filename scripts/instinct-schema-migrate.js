#!/usr/bin/env node
/**
 * instinct-schema-migrate — Migrate existing instinct YAML files to v2 schema.
 *
 * Adds the following fields (with defaults) to every instinct frontmatter
 * that is missing them:
 *
 *   created           YYYY-MM-DD (file mtime as fallback)
 *   last_used         "" (empty — not yet recorded)
 *   usage_count       0
 *   positive_outcomes 0
 *   negative_outcomes 0
 *   neutral_outcomes  0
 *   decay_rate        standard
 *   conflicts_with    ""
 *
 * Safe to re-run — only adds missing fields, never overwrites existing values.
 *
 * Usage:
 *   node scripts/instinct-schema-migrate.js            # dry-run (preview)
 *   node scripts/instinct-schema-migrate.js --apply    # write changes
 *   node scripts/instinct-schema-migrate.js --stats    # summary only
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const HOMUNCULUS_DIR = path.join(os.homedir(), '.claude', 'homunculus');
const TODAY = new Date().toISOString().slice(0, 10);

const NEW_FIELDS = [
  ['created', null],          // null = use file mtime
  ['last_used', ''],
  ['usage_count', '0'],
  ['positive_outcomes', '0'],
  ['negative_outcomes', '0'],
  ['neutral_outcomes', '0'],
  ['decay_rate', 'standard'],
  ['conflicts_with', ''],
];

const args = process.argv.slice(2);
const DRY_RUN = !args.includes('--apply');
const STATS_ONLY = args.includes('--stats');

// ─────────────────────────────────────────────
// File discovery
// ─────────────────────────────────────────────

function findInstinctFiles(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...findInstinctFiles(full));
    } else if (['.yaml', '.yml', '.md'].includes(path.extname(entry.name))) {
      results.push(full);
    }
  }
  return results;
}

// ─────────────────────────────────────────────
// Frontmatter parser/serializer
// ─────────────────────────────────────────────

/**
 * Parse the first YAML-like frontmatter block.
 * Returns { fields: Map<string,string>, content: string, raw: string }
 * or null if no frontmatter found.
 */
function parseFrontmatter(fileContent) {
  const lines = fileContent.split('\n');
  if (lines[0].trim() !== '---') return null;

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
  const raw = lines.slice(0, closeIdx + 1).join('\n');

  return { fields, content, raw };
}

/**
 * Rebuild the frontmatter block from a Map of fields.
 * Preserves original order; appends new fields at the end.
 */
function serializeFrontmatter(fields) {
  const lines = ['---'];
  for (const [key, value] of fields.entries()) {
    // Quote values containing colons or starting with special chars
    const needsQuote = /[:#\[\]{},|>&!%@`]/.test(String(value)) || String(value).startsWith(' ');
    lines.push(needsQuote ? `${key}: "${value}"` : `${key}: ${value}`);
  }
  lines.push('---');
  return lines.join('\n');
}

// ─────────────────────────────────────────────
// Migration logic
// ─────────────────────────────────────────────

function migrateFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = parseFrontmatter(raw);

  if (!parsed) return { status: 'skip', reason: 'no frontmatter' };
  if (!parsed.fields.has('id')) return { status: 'skip', reason: 'no id field' };

  const fileStat = fs.statSync(filePath);
  const fileDateStr = fileStat.mtime.toISOString().slice(0, 10);

  let changed = false;
  for (const [field, defaultValue] of NEW_FIELDS) {
    if (!parsed.fields.has(field)) {
      const value = defaultValue === null ? fileDateStr : defaultValue;
      parsed.fields.set(field, value);
      changed = true;
    }
  }

  if (!changed) return { status: 'ok', reason: 'already up to date' };

  const newContent = serializeFrontmatter(parsed.fields) + parsed.content;
  return { status: 'migrate', newContent };
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

function main() {
  if (!fs.existsSync(HOMUNCULUS_DIR)) {
    console.log(`No instinct store found at ${HOMUNCULUS_DIR}`);
    console.log('Run /learn or enable continuous-learning-v2 first.');
    process.exit(0);
  }

  const files = findInstinctFiles(HOMUNCULUS_DIR);
  if (files.length === 0) {
    console.log('No instinct files found.');
    process.exit(0);
  }

  let migrated = 0, alreadyOk = 0, skipped = 0;
  const toMigrate = [];

  for (const filePath of files) {
    const result = migrateFile(filePath);
    if (result.status === 'migrate') {
      toMigrate.push({ filePath, newContent: result.newContent });
      migrated++;
    } else if (result.status === 'ok') {
      alreadyOk++;
    } else {
      skipped++;
    }
  }

  if (STATS_ONLY) {
    console.log(`Instinct files: ${files.length}`);
    console.log(`  Already up to date: ${alreadyOk}`);
    console.log(`  Need migration:     ${migrated}`);
    console.log(`  Skipped (no id):   ${skipped}`);
    process.exit(0);
  }

  if (DRY_RUN) {
    console.log(`[DRY RUN] ${migrated} file(s) would be migrated, ${alreadyOk} already up to date, ${skipped} skipped.`);
    if (toMigrate.length > 0 && !STATS_ONLY) {
      console.log('\nFiles to migrate:');
      for (const { filePath } of toMigrate) {
        console.log(`  ${filePath}`);
      }
    }
    console.log('\nRun with --apply to write changes.');
    process.exit(0);
  }

  // Apply migrations
  let written = 0;
  for (const { filePath, newContent } of toMigrate) {
    try {
      fs.writeFileSync(filePath, newContent, 'utf8');
      written++;
    } catch (err) {
      console.error(`  ERROR writing ${filePath}: ${err.message}`);
    }
  }

  console.log(`Migration complete: ${written} file(s) updated, ${alreadyOk} already up to date, ${skipped} skipped.`);
  process.exit(0);
}

main();
