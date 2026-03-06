#!/usr/bin/env node
/**
 * hooks-summary — Analyse ~/.claude/hooks.log and print statistics.
 *
 * Usage:
 *   node scripts/hooks-summary.js           # summary (last 7 days)
 *   node scripts/hooks-summary.js --days 30 # last 30 days
 *   node scripts/hooks-summary.js --recent  # last 20 entries
 *   node scripts/hooks-summary.js --errors  # only errored invocations
 *
 * Output:
 *   - Invocation count per hook
 *   - Average / p95 duration per hook
 *   - Error rate per hook
 *   - Total hooks fired and wall time spent
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const LOG_PATH = path.join(os.homedir(), '.claude', 'hooks.log');

// --- CLI args ---
const args = process.argv.slice(2);
const daysFlag = args.indexOf('--days');
const days = daysFlag !== -1 ? Number(args[daysFlag + 1]) || 7 : 7;
const showRecent = args.includes('--recent');
const errorsOnly = args.includes('--errors');

// --- Read log ---
if (!fs.existsSync(LOG_PATH)) {
  console.log(`No hook log found at ${LOG_PATH}`);
  console.log('Hook logging starts automatically once you edit a file.');
  process.exit(0);
}

const raw = fs.readFileSync(LOG_PATH, 'utf8');
const cutoff = Date.now() - days * 86_400_000;

const entries = raw
  .split('\n')
  .filter(Boolean)
  .map(line => { try { return JSON.parse(line); } catch { return null; } })
  .filter(e => e && e.ts && e.hook);

const filtered = entries.filter(e => {
  const ts = new Date(e.ts).getTime();
  if (isNaN(ts) || ts < cutoff) return false;
  if (errorsOnly && e.exit === 0) return false;
  return true;
});

if (filtered.length === 0) {
  console.log(`No hook log entries in the last ${days} day(s).`);
  process.exit(0);
}

// --- Recent mode ---
if (showRecent) {
  const recent = filtered.slice(-20).reverse();
  console.log(`\nLast ${recent.length} hook invocations:\n`);
  const colW = Math.max(...recent.map(e => e.hook.length), 10);
  for (const e of recent) {
    const status = e.exit === 0 ? '✓' : `✗(${e.exit})`;
    const target = e.target ? ` ${e.target}` : '';
    const ts = new Date(e.ts).toISOString().replace('T', ' ').slice(0, 19);
    console.log(`  ${ts}  ${e.hook.padEnd(colW)}  ${String(e.ms).padStart(5)}ms  ${status}${target}`);
  }
  process.exit(0);
}

// --- Aggregate per hook ---
const stats = {};
for (const e of filtered) {
  if (!stats[e.hook]) stats[e.hook] = { count: 0, errors: 0, durations: [] };
  const s = stats[e.hook];
  s.count++;
  if (e.exit !== 0) s.errors++;
  if (typeof e.ms === 'number') s.durations.push(e.ms);
}

// --- Compute p95 ---
function p95(arr) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1];
}

// --- Render ---
const rows = Object.entries(stats)
  .map(([hook, s]) => {
    const avg = s.durations.length ? Math.round(s.durations.reduce((a, b) => a + b, 0) / s.durations.length) : 0;
    const p = p95(s.durations);
    const errRate = s.count > 0 ? ((s.errors / s.count) * 100).toFixed(0) + '%' : '0%';
    return { hook, count: s.count, avg, p95: p, errors: s.errors, errRate };
  })
  .sort((a, b) => b.count - a.count);

const totalInvocations = filtered.length;
const totalMs = filtered.reduce((a, e) => a + (e.ms ?? 0), 0);
const totalErrors = filtered.filter(e => e.exit !== 0).length;

const hookW = Math.max(...rows.map(r => r.hook.length), 10);
const header = `${'Hook'.padEnd(hookW)}  ${'Calls'.padStart(6)}  ${'Avg ms'.padStart(6)}  ${'p95 ms'.padStart(6)}  ${'Errors'.padStart(6)}  ${'Err%'.padStart(5)}`;
const sep = '-'.repeat(header.length);

console.log(`\nHook statistics — last ${days} day(s) — ${totalInvocations} invocations\n`);
console.log(header);
console.log(sep);
for (const r of rows) {
  const errFlag = r.errors > 0 ? ' ⚠' : '';
  console.log(
    `${r.hook.padEnd(hookW)}  ${String(r.count).padStart(6)}  ${String(r.avg).padStart(6)}  ${String(r.p95).padStart(6)}  ${String(r.errors).padStart(6)}  ${r.errRate.padStart(5)}${errFlag}`
  );
}
console.log(sep);
console.log(`${'TOTAL'.padEnd(hookW)}  ${String(totalInvocations).padStart(6)}  ${String(Math.round(totalMs / totalInvocations)).padStart(6)}  ${''.padStart(6)}  ${String(totalErrors).padStart(6)}  ${((totalErrors / totalInvocations) * 100).toFixed(0).padStart(4)}%`);
console.log(`\nTotal time spent in hooks: ${(totalMs / 1000).toFixed(1)}s`);
console.log(`Log: ${LOG_PATH}\n`);
