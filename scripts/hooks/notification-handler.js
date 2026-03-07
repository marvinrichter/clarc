#!/usr/bin/env node
/**
 * Notification Hook - Handle Claude Code system notifications.
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Fires on the Notification event. Current uses:
 *  - Long-running session: remind user to /compact if context is large
 *  - Weekly digest (Mondays): surface recently learned instincts and skills
 *
 * Input (stdin JSON):
 *   { notification: { type: string, message?: string, ... } }
 */

import fs from 'fs';
import path from 'path';
import { log } from '../lib/utils.js';

const MAX_STDIN = 256 * 1024;
let data = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
  if (data.length < MAX_STDIN) data += chunk.substring(0, MAX_STDIN - data.length);
});

/** Return YYYY-MM-DD for a Date */
function toDateStr(d) {
  return d.toISOString().slice(0, 10);
}

/**
 * Build a weekly digest of recently learned instincts and skills.
 * Returns null if nothing was learned or digest was already shown today.
 */
function buildWeeklyDigest(claudeDir) {
  const digestFlagPath = path.join(claudeDir, '.weekly-digest-shown');
  const today = toDateStr(new Date());

  // Only run on Mondays (day 1)
  if (new Date().getDay() !== 1) return null;

  // Only show once per day
  try {
    const last = fs.readFileSync(digestFlagPath, 'utf8').trim();
    if (last === today) return null;
  } catch {
    // File doesn't exist — first run
  }

  const lines = [];
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000; // last 7 days

  // Scan instincts from ~/.claude/homunculus/
  const homunculusDir = path.join(claudeDir, 'homunculus');
  if (fs.existsSync(homunculusDir)) {
    const instincts = [];
    for (const entry of fs.readdirSync(homunculusDir)) {
      if (!entry.endsWith('.json')) continue;
      try {
        const fpath = path.join(homunculusDir, entry);
        const stat = fs.statSync(fpath);
        if (stat.mtimeMs < cutoff) continue;
        const obj = JSON.parse(fs.readFileSync(fpath, 'utf8'));
        const desc = obj.description || obj.pattern || obj.instinct || entry.replace('.json', '');
        const conf = obj.confidence !== null && obj.confidence !== undefined ? ` (conf: ${obj.confidence})` : '';
        instincts.push(`  • ${String(desc).slice(0, 100)}${conf}`);
      } catch {
        /* skip malformed */
      }
    }
    if (instincts.length > 0) {
      lines.push(`**Instincts learned this week (${instincts.length}):**`);
      lines.push(...instincts.slice(0, 10));
      if (instincts.length > 10) lines.push(`  …and ${instincts.length - 10} more`);
    }
  }

  // Scan skills from ~/.claude/skills/learned/
  const learnedDir = path.join(claudeDir, 'skills', 'learned');
  if (fs.existsSync(learnedDir)) {
    const skills = [];
    for (const entry of fs.readdirSync(learnedDir)) {
      try {
        const fpath = path.join(learnedDir, entry);
        if (!fs.statSync(fpath).isDirectory()) continue;
        const skillFile = path.join(fpath, 'SKILL.md');
        if (!fs.existsSync(skillFile)) continue;
        const stat = fs.statSync(skillFile);
        if (stat.mtimeMs < cutoff) continue;
        skills.push(`  • ${entry}`);
      } catch {
        /* skip */
      }
    }
    if (skills.length > 0) {
      if (lines.length > 0) lines.push('');
      lines.push(`**Skills extracted this week (${skills.length}):**`);
      lines.push(...skills.slice(0, 8));
      if (skills.length > 8) lines.push(`  …and ${skills.length - 8} more`);
    }
  }

  if (lines.length === 0) return null;

  // Mark as shown today
  try {
    fs.writeFileSync(digestFlagPath, today, 'utf8');
  } catch {
    /* non-fatal */
  }

  return ['📚 **Weekly Learning Digest**', '', ...lines, '', 'Run `/instinct-status` or `/learn-eval` to review in detail.'].join('\n');
}

process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const notification = input.notification || {};
    const type = notification.type || '';

    // Log all notifications for observability
    log(`[Notification] type=${type} ${notification.message ? '| ' + String(notification.message).slice(0, 100) : ''}`);

    // Context pressure warning: suggest /compact
    if (type === 'context_limit_warning' || type === 'context_pressure') {
      process.stdout.write(
        JSON.stringify({
          type: 'assistant',
          content: '⚠ Context is getting large. Consider running `/compact` to preserve working memory before switching tasks.'
        }) + '\n'
      );
    }

    // Weekly digest on Mondays
    const claudeDir = process.env.CLAUDE_PLUGIN_ROOT || path.join(process.env.HOME || process.env.USERPROFILE || '', '.claude');
    const digest = buildWeeklyDigest(claudeDir);
    if (digest) {
      process.stdout.write(JSON.stringify({ type: 'assistant', content: digest }) + '\n');
    }
  } catch {
    // Invalid input — pass through silently
  }

  process.exit(0);
});
