#!/usr/bin/env node
/**
 * agent-analytics — Analyze ~/.clarc/agent-log.jsonl
 *
 * Usage:
 *   node scripts/agent-analytics.js                  # top agents (last 30 days)
 *   node scripts/agent-analytics.js --days 7         # last 7 days
 *   node scripts/agent-analytics.js --heatmap        # usage heatmap by hour
 *   node scripts/agent-analytics.js --outcome        # outcome ratio per agent
 *   node scripts/agent-analytics.js --export <file>  # export filtered log as JSON
 *   node scripts/agent-analytics.js --recent         # last 20 invocations
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const LOG_FILE = path.join(os.homedir(), '.clarc', 'agent-log.jsonl');

// --- CLI args ---
const args = process.argv.slice(2);
const daysIdx = args.indexOf('--days');
const days = daysIdx !== -1 ? Number(args[daysIdx + 1]) || 30 : 30;
const showHeatmap = args.includes('--heatmap');
const showOutcome = args.includes('--outcome');
const showRecent = args.includes('--recent');
const exportIdx = args.indexOf('--export');
const exportFile = exportIdx !== -1 ? args[exportIdx + 1] : null;

// --- Load log ---
if (!fs.existsSync(LOG_FILE)) {
  console.log(`No agent log found at ${LOG_FILE}`);
  console.log('Agent tracking starts automatically once you invoke the Agent tool.');
  process.exit(0);
}

const raw = fs.readFileSync(LOG_FILE, 'utf8');
const cutoff = Date.now() - days * 86_400_000;

const entries = raw
  .split('\n')
  .filter(Boolean)
  .map(line => {
    try {
      return JSON.parse(line);
    } catch {
      return null;
    }
  })
  .filter(e => e && e.ts && e.agent);

const filtered = entries.filter(e => new Date(e.ts).getTime() >= cutoff);

if (filtered.length === 0) {
  console.log(`No agent log entries in the last ${days} day(s).`);
  process.exit(0);
}

// --- Export mode ---
if (exportFile) {
  fs.writeFileSync(exportFile, JSON.stringify(filtered, null, 2), 'utf8');
  console.log(`Exported ${filtered.length} entries → ${exportFile}`);
  process.exit(0);
}

// --- Recent mode ---
if (showRecent) {
  const recent = filtered.slice(-20).reverse();
  console.log(`\nLast ${recent.length} agent invocations:\n`);
  const colW = Math.max(...recent.map(e => e.agent.length), 10);
  for (const e of recent) {
    const ts = new Date(e.ts).toISOString().replace('T', ' ').slice(0, 19);
    const status = e.exit_code === 0 ? '✓' : `✗(${e.exit_code})`;
    const dur = e.duration ? `${e.duration}ms` : '  -';
    console.log(`  ${ts}  ${e.agent.padEnd(colW)}  ${dur.padStart(8)}  ${status}  ${e.project || ''}`);
  }
  process.exit(0);
}

// --- Aggregate by agent ---
const byAgent = new Map();
for (const e of filtered) {
  if (!byAgent.has(e.agent)) {
    byAgent.set(e.agent, { count: 0, success: 0, durations: [] });
  }
  const s = byAgent.get(e.agent);
  s.count++;
  if (e.exit_code === 0) s.success++;
  if (e.duration > 0) s.durations.push(e.duration);
}

// --- Top agents ---
if (!showHeatmap && !showOutcome) {
  const sorted = [...byAgent.entries()].sort((a, b) => b[1].count - a[1].count);
  const total = filtered.length;
  const colW = Math.max(...sorted.map(([n]) => n.length), 10);

  console.log(`\nAgent usage — last ${days} day(s) — ${total} invocations\n`);
  console.log(`  ${'Agent'.padEnd(colW)}  Count   Success    Avg(ms)  Bar`);
  console.log(`  ${'─'.repeat(colW)}  ─────   ───────    ───────  ─────────────`);

  for (const [name, s] of sorted) {
    const pct = ((s.count / total) * 100).toFixed(1);
    const successRate = s.count > 0 ? ((s.success / s.count) * 100).toFixed(0) : '0';
    const avg = s.durations.length > 0 ? Math.round(s.durations.reduce((a, b) => a + b, 0) / s.durations.length) : '-';
    const bar = '█'.repeat(Math.round(s.count / total * 20));
    console.log(`  ${name.padEnd(colW)}  ${String(s.count).padStart(5)}   ${String(successRate + '%').padStart(7)}  ${String(avg).padStart(7)}  ${bar}`);
  }
  console.log(`\n  Coverage: ${total} calls across ${byAgent.size} agents in ${days}d`);
  process.exit(0);
}

// --- Outcome ratio ---
if (showOutcome) {
  const sorted = [...byAgent.entries()].sort((a, b) => {
    const ra = a[1].count > 0 ? a[1].success / a[1].count : 0;
    const rb = b[1].count > 0 ? b[1].success / b[1].count : 0;
    return ra - rb; // worst first
  });
  const colW = Math.max(...sorted.map(([n]) => n.length), 10);

  console.log(`\nOutcome ratio — last ${days} day(s)\n`);
  console.log(`  ${'Agent'.padEnd(colW)}  Total  Success  Fail  Rate`);
  console.log(`  ${'─'.repeat(colW)}  ─────  ───────  ────  ────`);
  for (const [name, s] of sorted) {
    const fail = s.count - s.success;
    const rate = s.count > 0 ? ((s.success / s.count) * 100).toFixed(0) + '%' : 'n/a';
    console.log(`  ${name.padEnd(colW)}  ${String(s.count).padStart(5)}  ${String(s.success).padStart(7)}  ${String(fail).padStart(4)}  ${rate}`);
  }
  process.exit(0);
}

// --- Heatmap by hour ---
if (showHeatmap) {
  const hourCounts = Array(24).fill(0);
  for (const e of filtered) {
    const h = new Date(e.ts).getHours();
    hourCounts[h]++;
  }
  const max = Math.max(...hourCounts, 1);

  console.log(`\nAgent usage heatmap — last ${days} day(s)\n`);
  for (let h = 0; h < 24; h++) {
    const c = hourCounts[h];
    const bar = '█'.repeat(Math.round((c / max) * 30));
    const label = `${String(h).padStart(2)}:00`;
    console.log(`  ${label}  ${bar.padEnd(30)}  ${c}`);
  }
  process.exit(0);
}
