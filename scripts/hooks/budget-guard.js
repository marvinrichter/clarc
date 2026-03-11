#!/usr/bin/env node
/**
 * Budget Guard — PreToolUse hook for Agent calls.
 *
 * Reads today's accumulated cost from ~/.clarc/cost-log.jsonl and warns or
 * blocks when spend crosses configurable thresholds.
 *
 * Environment variables (set in shell profile or .env):
 *   CLAUDE_COST_WARN=5       Warn if daily estimated spend > $5 (default: 5)
 *   CLAUDE_BUDGET_LIMIT=20   Block if daily estimated spend > $20 (default: 20)
 *                            Set to 0 to disable blocking.
 *
 * Exit codes:
 *   0  — OK (or warn-only, prints to stderr)
 *   2  — Budget exceeded — Claude Code will block the tool call and show the message
 *
 * Cross-platform (Windows, macOS, Linux via Node.js)
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const CLARC_DIR = path.join(os.homedir(), '.clarc');
const COST_LOG_FILE = path.join(CLARC_DIR, 'cost-log.jsonl');

const WARN_THRESHOLD = parseFloat(process.env.CLAUDE_COST_WARN ?? '5');
const LIMIT_THRESHOLD = parseFloat(process.env.CLAUDE_BUDGET_LIMIT ?? '20');

function getTodayString() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Sum estimated_usd from all cost-log entries for today.
 * Returns 0 if the log does not exist or has no entries for today.
 */
function getDailySpend(today) {
  if (!fs.existsSync(COST_LOG_FILE)) return 0;

  let total = 0;
  try {
    const lines = fs.readFileSync(COST_LOG_FILE, 'utf8').split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const entry = JSON.parse(line);
        if (entry.date === today && typeof entry.estimated_usd === 'number') {
          total += entry.estimated_usd;
        }
      } catch {
        // Skip malformed lines
      }
    }
  } catch {
    // Log unreadable — treat as zero spend
  }
  return total;
}

function main() {
  const today = getTodayString();
  const dailySpend = getDailySpend(today);

  if (dailySpend === 0) {
    // No spend data yet — let through silently
    process.exit(0);
  }

  // Hard block
  if (LIMIT_THRESHOLD > 0 && dailySpend >= LIMIT_THRESHOLD) {
    const msg = [
      `[clarc budget-guard] BLOCKED: Daily spend estimate $${dailySpend.toFixed(2)} exceeds limit $${LIMIT_THRESHOLD.toFixed(2)}.`,
      `Set CLAUDE_BUDGET_LIMIT=0 to disable, or increase the limit: export CLAUDE_BUDGET_LIMIT=50`,
      `Exact costs: console.anthropic.com`
    ].join('\n');
    // Claude Code reads stdout for the block message when exit code is 2
    process.stdout.write(msg + '\n');
    process.exit(2);
  }

  // Soft warn
  if (WARN_THRESHOLD > 0 && dailySpend >= WARN_THRESHOLD) {
    const pct = Math.round((dailySpend / (LIMIT_THRESHOLD || WARN_THRESHOLD * 4)) * 100);
    const msg = [
      `[clarc budget-guard] Daily spend estimate: ~$${dailySpend.toFixed(2)} (${pct}% of $${LIMIT_THRESHOLD} limit).`,
      `Agent calls are expensive. Consider /compact or lower-cost alternatives.`,
      `Suppress: export CLAUDE_COST_WARN=0`
    ].join('\n');
    process.stderr.write(msg + '\n');
    process.exit(0);
  }

  process.exit(0);
}

main();
