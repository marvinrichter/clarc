#!/usr/bin/env node
/**
 * instinct-outcome-tracker — Record an outcome for a specific instinct.
 *
 * Updates confidence based on the outcome signal:
 *   good    → confidence += 0.05 (max 0.95)
 *   bad     → confidence -= 0.10 (min 0.10)
 *   neutral → no change
 *
 * Also increments the appropriate outcome counter and updates last_used.
 *
 * Usage:
 *   node scripts/instinct-outcome-tracker.js <instinct-id> <good|bad|neutral>
 *   node scripts/instinct-outcome-tracker.js <instinct-id> good "reason text"
 *   node scripts/instinct-outcome-tracker.js --list      (show all instincts for the current project)
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawnSync } from 'child_process';
import crypto from 'crypto';

const HOMUNCULUS_DIR = path.join(os.homedir(), '.claude', 'homunculus');
const TODAY = new Date().toISOString().slice(0, 10);

const CONFIDENCE_DELTA = { good: 0.05, bad: -0.10, neutral: 0.0 };
const CONFIDENCE_MAX = 0.95;
const CONFIDENCE_MIN = 0.10;

// ─────────────────────────────────────────────
// Project detection
// ─────────────────────────────────────────────

function detectProjectId() {
  const r = spawnSync('git', ['remote', 'get-url', 'origin'], {
    stdio: 'pipe', encoding: 'utf8', cwd: process.cwd()
  });
  const remoteUrl = r.stdout?.trim();
  if (!remoteUrl) return null;
  return crypto.createHash('sha256').update(remoteUrl).digest('hex').slice(0, 12);
}

// ─────────────────────────────────────────────
// File discovery: find instinct file by ID
// ─────────────────────────────────────────────

function findInstinctFile(searchDirs, targetId) {
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (!['.yaml', '.yml'].includes(path.extname(entry.name))) continue;
      const filePath = path.join(dir, entry.name);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const fm = parseFrontmatter(content);
        if (fm && fm.fields.get('id') === targetId) {
          return filePath;
        }
      } catch {
        continue;
      }
    }
  }
  return null;
}

// ─────────────────────────────────────────────
// Frontmatter parser/serializer
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
// List command
// ─────────────────────────────────────────────

function listInstincts(searchDirs) {
  const instincts = [];
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      if (!['.yaml', '.yml'].includes(path.extname(entry.name))) continue;
      const filePath = path.join(dir, entry.name);
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const fm = parseFrontmatter(content);
        if (fm && fm.fields.has('id')) {
          instincts.push({
            id: fm.fields.get('id'),
            confidence: parseFloat(fm.fields.get('confidence') || '0.60'),
            domain: fm.fields.get('domain') || 'general',
            positive: parseInt(fm.fields.get('positive_outcomes') || '0'),
            negative: parseInt(fm.fields.get('negative_outcomes') || '0'),
            neutral: parseInt(fm.fields.get('neutral_outcomes') || '0'),
            lastUsed: fm.fields.get('last_used') || '',
          });
        }
      } catch {
        continue;
      }
    }
  }
  return instincts;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--list') || args[0] === 'list') {
    const projectId = detectProjectId();
    const searchDirs = projectId
      ? [
          path.join(HOMUNCULUS_DIR, 'projects', projectId, 'instincts', 'personal'),
          path.join(HOMUNCULUS_DIR, 'instincts', 'personal'),
        ]
      : [path.join(HOMUNCULUS_DIR, 'instincts', 'personal')];

    const instincts = listInstincts(searchDirs);
    if (instincts.length === 0) {
      console.log('No instincts found. Run /learn or enable continuous-learning-v2.');
      process.exit(0);
    }

    console.log(`\nInstincts (${instincts.length}):\n`);
    console.log('  ID'.padEnd(36) + 'CONF  DOMAIN       +/-/0');
    console.log('  ' + '─'.repeat(60));
    for (const inst of instincts.sort((a, b) => b.confidence - a.confidence)) {
      const conf = `${Math.round(inst.confidence * 100)}%`.padEnd(6);
      const domain = inst.domain.slice(0, 12).padEnd(13);
      const outcomes = `${inst.positive}/${inst.negative}/${inst.neutral}`;
      console.log(`  ${inst.id.slice(0, 34).padEnd(36)}${conf}${domain}${outcomes}`);
    }
    console.log('');
    process.exit(0);
  }

  const [instinctId, outcomeRaw, ...reasonParts] = args;
  const reason = reasonParts.join(' ').trim();

  if (!instinctId || !outcomeRaw) {
    console.error('Usage: instinct-outcome-tracker.js <instinct-id> <good|bad|neutral> [reason]');
    console.error('       instinct-outcome-tracker.js --list');
    process.exit(1);
  }

  const outcome = outcomeRaw.toLowerCase();
  if (!['good', 'bad', 'neutral'].includes(outcome)) {
    console.error(`Invalid outcome: "${outcome}". Must be good, bad, or neutral.`);
    process.exit(1);
  }

  const projectId = detectProjectId();
  const searchDirs = projectId
    ? [
        path.join(HOMUNCULUS_DIR, 'projects', projectId, 'instincts', 'personal'),
        path.join(HOMUNCULUS_DIR, 'instincts', 'personal'),
      ]
    : [path.join(HOMUNCULUS_DIR, 'instincts', 'personal')];

  const filePath = findInstinctFile(searchDirs, instinctId);
  if (!filePath) {
    console.error(`Instinct not found: "${instinctId}"`);
    console.error('Run with --list to see available instinct IDs.');
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const parsed = parseFrontmatter(raw);
  if (!parsed) {
    console.error(`Cannot parse frontmatter in ${filePath}`);
    process.exit(1);
  }

  const fields = parsed.fields;
  const oldConfidence = parseFloat(fields.get('confidence') || '0.60');
  const delta = CONFIDENCE_DELTA[outcome];
  const newConfidence = Math.min(CONFIDENCE_MAX, Math.max(CONFIDENCE_MIN, oldConfidence + delta));

  // Update counters
  const counterKey = `${outcome}_outcomes`;
  const currentCount = parseInt(fields.get(counterKey) || '0');
  fields.set(counterKey, String(currentCount + 1));

  // Update confidence (only for good/bad)
  if (delta !== 0) {
    fields.set('confidence', String(newConfidence.toFixed(2)));
  }

  // Update last_used and usage_count
  fields.set('last_used', TODAY);
  const usageCount = parseInt(fields.get('usage_count') || '0');
  fields.set('usage_count', String(usageCount + 1));

  const newRaw = serializeFrontmatter(fields) + parsed.content;
  fs.writeFileSync(filePath, newRaw, 'utf8');

  // Log outcome to outcomes.jsonl in homunculus dir
  const outcomeEntry = {
    instinct_id: instinctId,
    outcome,
    reason: reason || null,
    confidence_before: oldConfidence,
    confidence_after: newConfidence,
    date: TODAY,
    file: filePath,
  };
  const outcomesLog = path.join(HOMUNCULUS_DIR, 'outcomes.jsonl');
  fs.mkdirSync(HOMUNCULUS_DIR, { recursive: true });
  fs.appendFileSync(outcomesLog, JSON.stringify(outcomeEntry) + '\n', 'utf8');

  const arrow = delta > 0 ? `↑` : delta < 0 ? `↓` : `→`;
  const confStr = delta !== 0
    ? `  Confidence: ${oldConfidence.toFixed(2)} ${arrow} ${newConfidence.toFixed(2)}`
    : `  Confidence: ${oldConfidence.toFixed(2)} (unchanged)`;

  console.log(`Recorded ${outcome} outcome for "${instinctId}"`);
  console.log(confStr);
  if (reason) console.log(`  Reason: ${reason}`);

  process.exit(0);
}

main();
