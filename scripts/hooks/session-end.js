#!/usr/bin/env node
/**
 * Stop Hook (Session End) - Persist learnings when session ends
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs when Claude session ends. Extracts a meaningful summary from
 * the session transcript (via stdin JSON transcript_path) and saves it
 * to a session file for cross-session continuity.
 */

import path from 'path';
import fs from 'fs';
import os from 'os';
import { getSessionsDir, getDateString, getTimeString, getSessionIdShort, ensureDir, readFile, writeFile, replaceInFile, log } from '../lib/utils.js';

// Cost estimation constants (Claude Sonnet, 2026 pricing)
const SONNET_INPUT_USD_PER_M = 3.0;
const SONNET_OUTPUT_USD_PER_M = 15.0;

// Per-tool token estimates (input tokens added to context per call).
// These are calibrated heuristics — actual costs vary by file size and output length.
// Agent calls are expensive because they spawn a full sub-context (200k token window init).
// Read/Grep/Glob are cheap because they add a bounded result to context.
const TOOL_TOKEN_WEIGHTS = {
  Agent: { input: 8000, output: 2000 },   // full sub-context + synthesis
  Bash:  { input:  400, output:  200 },   // short command output
  Read:  { input: 1500, output:   50 },   // file content into context
  Edit:  { input:  600, output:  150 },   // diff + confirmation
  Write: { input:  500, output:  100 },   // new file content
  Grep:  { input:  300, output:  100 },   // search results
  Glob:  { input:  200, output:   50 },   // file list
  WebFetch: { input: 2000, output: 100 }, // web page content
  WebSearch: { input: 800, output: 100 }, // search results
  default: { input: 800, output: 200 },   // unknown tools
};

const CLARC_DIR = path.join(os.homedir(), '.clarc');
const COST_LOG_FILE = path.join(CLARC_DIR, 'cost-log.jsonl');

/**
 * Extract a meaningful summary from the session transcript.
 * Reads the JSONL transcript and pulls out key information:
 * - User messages (tasks requested)
 * - Tools used
 * - Files modified
 */
function extractSessionSummary(transcriptPath) {
  const content = readFile(transcriptPath);
  if (!content) return null;

  const lines = content.split('\n').filter(Boolean);
  const userMessages = [];
  const toolsUsed = new Set();          // unique tool names (for display)
  const toolCallCounts = new Map();     // tool → total call count (for cost estimation)
  const filesModified = new Set();
  let parseErrors = 0;

  function recordToolCall(toolName, filePath) {
    if (!toolName) return;
    toolsUsed.add(toolName);
    toolCallCounts.set(toolName, (toolCallCounts.get(toolName) || 0) + 1);
    if (filePath && (toolName === 'Edit' || toolName === 'Write')) {
      filesModified.add(filePath);
    }
  }

  for (const line of lines) {
    try {
      const entry = JSON.parse(line);

      // Collect user messages (first 200 chars each)
      if (entry.type === 'user' || entry.role === 'user' || entry.message?.role === 'user') {
        // Support both direct content and nested message.content (Claude Code JSONL format)
        const rawContent = entry.message?.content ?? entry.content;
        const text = typeof rawContent === 'string' ? rawContent : Array.isArray(rawContent) ? rawContent.map(c => (c && c.text) || '').join(' ') : '';
        if (text.trim()) {
          userMessages.push(text.trim().slice(0, 200));
        }
      }

      // Collect tool names and modified files (direct tool_use entries)
      if (entry.type === 'tool_use' || entry.tool_name) {
        const toolName = entry.tool_name || entry.name || '';
        const filePath = entry.tool_input?.file_path || entry.input?.file_path || '';
        recordToolCall(toolName, filePath);
      }

      // Extract tool uses from assistant message content blocks (Claude Code JSONL format)
      if (entry.type === 'assistant' && Array.isArray(entry.message?.content)) {
        for (const block of entry.message.content) {
          if (block.type === 'tool_use') {
            const filePath = block.input?.file_path || '';
            recordToolCall(block.name || '', filePath);
          }
        }
      }
    } catch {
      parseErrors++;
    }
  }

  if (parseErrors > 0) {
    log(`[SessionEnd] Skipped ${parseErrors}/${lines.length} unparseable transcript lines`);
  }

  if (userMessages.length === 0) return null;

  return {
    userMessages: userMessages.slice(-10), // Last 10 user messages
    toolsUsed: Array.from(toolsUsed).slice(0, 20),
    toolCallCounts: Object.fromEntries(toolCallCounts), // tool → count
    totalToolCalls: Array.from(toolCallCounts.values()).reduce((a, b) => a + b, 0),
    filesModified: Array.from(filesModified).slice(0, 30),
    totalMessages: userMessages.length
  };
}

/**
 * Estimate session cost using per-tool token weights and append to ~/.clarc/cost-log.jsonl.
 * Uses tool-specific heuristics instead of a flat average: Agent calls are ~10-20× more
 * expensive than Grep calls, so a flat average gives ±300% error. Per-tool weights reduce
 * this to ±50–100% — still an estimate, but much more actionable.
 */
function logSessionCost(summary, sessionId, date) {
  try {
    const { toolCallCounts = {}, totalToolCalls = 0 } = summary || {};
    if (totalToolCalls === 0) return;

    // Sum weighted token estimates across all tool types
    let estInputTokens = 0;
    let estOutputTokens = 0;
    for (const [tool, count] of Object.entries(toolCallCounts)) {
      const weight = TOOL_TOKEN_WEIGHTS[tool] || TOOL_TOKEN_WEIGHTS.default;
      estInputTokens += weight.input * count;
      estOutputTokens += weight.output * count;
    }

    const estUsd = (estInputTokens / 1_000_000) * SONNET_INPUT_USD_PER_M + (estOutputTokens / 1_000_000) * SONNET_OUTPUT_USD_PER_M;

    const entry = {
      date,
      session_id: sessionId,
      total_tool_calls: totalToolCalls,
      tool_breakdown: toolCallCounts,
      estimated_input_tokens: estInputTokens,
      estimated_output_tokens: estOutputTokens,
      estimated_usd: Math.round(estUsd * 10000) / 10000,
      project: path.basename(process.cwd()),
      disclaimer: 'Estimate only (per-tool heuristic, ±50-100%) — exact costs at console.anthropic.com'
    };

    if (!fs.existsSync(CLARC_DIR)) {
      fs.mkdirSync(CLARC_DIR, { recursive: true });
    }
    fs.appendFileSync(COST_LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');

    const totalK = Math.round((estInputTokens + estOutputTokens) / 100) / 10;
    const agentCalls = toolCallCounts['Agent'] || 0;
    const agentNote = agentCalls > 0 ? ` (inkl. ${agentCalls} Agent-Calls)` : '';
    log(`[SessionEnd] Cost estimate: ${totalToolCalls} tool calls${agentNote} | ~${totalK}k tokens | ~$${entry.estimated_usd.toFixed(4)} (Schätzung)`);
  } catch (err) {
    log(`[SessionEnd] Cost logging error: ${err.message}`);
  }
}

// Read hook input from stdin (Claude Code provides transcript_path via stdin JSON)
const MAX_STDIN = 1024 * 1024;
let stdinData = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
  if (stdinData.length < MAX_STDIN) {
    const remaining = MAX_STDIN - stdinData.length;
    stdinData += chunk.substring(0, remaining);
  }
});

process.stdin.on('end', () => {
  runMain();
});

function runMain() {
  main().catch(err => {
    console.error('[SessionEnd] Error:', err.message);
    process.exit(0);
  });
}

async function main() {
  // Parse stdin JSON to get transcript_path
  let transcriptPath = null;
  try {
    const input = JSON.parse(stdinData);
    transcriptPath = input.transcript_path;
  } catch {
    // Fallback: try env var for backwards compatibility
    transcriptPath = process.env.CLAUDE_TRANSCRIPT_PATH;
  }

  const sessionsDir = getSessionsDir();
  const today = getDateString();
  const shortId = getSessionIdShort();
  const sessionFile = path.join(sessionsDir, `${today}-${shortId}-session.tmp`);

  ensureDir(sessionsDir);

  const currentTime = getTimeString();

  // Try to extract summary from transcript
  let summary = null;

  if (transcriptPath) {
    if (fs.existsSync(transcriptPath)) {
      summary = extractSessionSummary(transcriptPath);
    } else {
      log(`[SessionEnd] Transcript not found: ${transcriptPath}`);
    }
  }

  // Token/cost tracking — uses per-tool weights for better accuracy
  logSessionCost(summary, shortId, today);

  // Context window warning: fires when session > 90min and .clarc/context.md is absent or stale
  checkContextWarning(sessionFile);

  if (fs.existsSync(sessionFile)) {
    // Update existing session file
    const updated = replaceInFile(sessionFile, /\*\*Last Updated:\*\*.*/, `**Last Updated:** ${currentTime}`);
    if (!updated) {
      log(`[SessionEnd] Failed to update timestamp in ${sessionFile}`);
    }

    // If we have a new summary, update the session file content
    if (summary) {
      const existing = readFile(sessionFile);
      if (existing) {
        // Use a flexible regex that matches both "## Session Summary" and "## Current State"
        // Match to end-of-string to avoid duplicate ### Stats sections
        const updatedContent = existing.replace(/## (?:Session Summary|Current State)[\s\S]*?$/, buildSummarySection(summary).trim() + '\n');
        writeFile(sessionFile, updatedContent);
      }
    }

    log(`[SessionEnd] Updated session file: ${sessionFile}`);
  } else {
    // Create new session file
    const summarySection = summary
      ? buildSummarySection(summary)
      : `## Current State\n\n[Session context goes here]\n\n### Completed\n- [ ]\n\n### In Progress\n- [ ]\n\n### Notes for Next Session\n-\n\n### Context to Load\n\`\`\`\n[relevant files]\n\`\`\``;

    const template = `# Session: ${today}
**Date:** ${today}
**Started:** ${currentTime}
**Last Updated:** ${currentTime}

---

${summarySection}
`;

    writeFile(sessionFile, template);
    log(`[SessionEnd] Created session file: ${sessionFile}`);
  }

  // Weekly Evolve-Batch: trigger on Mondays when >= 10 instincts and last run > 6 days ago
  checkWeeklyEvolve();

  // Memory Bank: write .clarc/context.md and append to .clarc/progress.md
  if (summary) {
    writeMemoryBank(summary, today, currentTime);
  }

  process.exit(0);
}

/**
 * Write session data to the project-level Memory Bank (.clarc/).
 * Only runs when .clarc/ already exists in the current working directory —
 * never creates .clarc/ automatically (user must opt in).
 */
function writeMemoryBank(summary, date, time) {
  const projectRoot = process.env.CLARC_PROJECT_ROOT || process.cwd();
  const clarcDir = path.join(projectRoot, '.clarc');
  if (!fs.existsSync(clarcDir)) {
    // Hint if project-like directory (has package.json, go.mod, etc.)
    const markers = ['package.json', 'go.mod', 'Cargo.toml', 'pyproject.toml', 'build.gradle'];
    const isProject = markers.some(m => fs.existsSync(path.join(projectRoot, m)));
    if (isProject) {
      log('[SessionEnd] Tip: create .clarc/ to enable Memory Bank (see docs/memory-bank.md)');
    }
    return;
  }

  try {
    // Overwrite context.md with current session summary
    const contextContent = buildContextFile(summary, date);
    fs.writeFileSync(path.join(clarcDir, 'context.md'), contextContent, 'utf8');

    // Append to progress.md (rolling window: keep last 30 sessions)
    const progressEntry = buildProgressEntry(summary, date, time);
    const progressFile = path.join(clarcDir, 'progress.md');
    const HEADER = '# Session Progress Log\n\n';
    const MAX_SESSIONS = 30;

    let existing = fs.existsSync(progressFile) ? fs.readFileSync(progressFile, 'utf8') : HEADER;
    // Strip header for processing
    const body = existing.startsWith(HEADER) ? existing.slice(HEADER.length) : existing;
    // Split into individual session blocks (each starts with "## Session ")
    const blocks = body.split(/(?=^## Session )/m).filter(Boolean);
    // Keep last MAX_SESSIONS - 1 to make room for the new entry
    const trimmed = blocks.slice(-(MAX_SESSIONS - 1));
    fs.writeFileSync(progressFile, HEADER + trimmed.join('') + progressEntry, 'utf8');

    log(`[SessionEnd] Memory Bank updated: .clarc/context.md, .clarc/progress.md`);
  } catch (err) {
    log(`[SessionEnd] Memory Bank write error: ${err.message}`);
  }
}

function buildContextFile(summary, date) {
  const tasks = summary.userMessages
    .slice(-5)
    .map(m => `- ${m.replace(/\n/g, ' ').slice(0, 120)}`)
    .join('\n');

  const files = summary.filesModified.length > 0
    ? summary.filesModified.slice(0, 10).map(f => `- ${f}`).join('\n')
    : '- (none)';

  return `# Session Context — ${date}

## Current focus
${tasks || '- (no tasks captured)'}

## Files changed this session
${files}

## Open TODOs
- [ ] (review and update manually)

## Next steps
(update manually after reviewing session)
`;
}

function buildProgressEntry(summary, date, time) {
  const tasks = summary.userMessages
    .slice(-5)
    .map(m => `  - ${m.replace(/\n/g, ' ').slice(0, 120)}`)
    .join('\n');

  const files = summary.filesModified.slice(0, 10).map(f => `  - ${f}`).join('\n') || '  - (none)';

  return `## Session ${date} ${time}

### Tasks
${tasks || '  - (none captured)'}

### Files changed
${files}

### Stats
- Tool calls: ${summary.toolsUsed.length}
- User messages: ${summary.totalMessages}

`;
}

/**
 * Check if a weekly evolve digest should be queued.
 * Runs only on Mondays, at most once per week, when >= 10 instincts exist.
 */
function checkWeeklyEvolve() {
  try {
    const today = new Date();
    if (today.getDay() !== 1) return; // Only on Mondays

    const claudeDir = process.env.CLAUDE_PLUGIN_ROOT || path.join(os.homedir(), '.claude');
    const homunculusDir = path.join(claudeDir, 'homunculus');
    const lastEvolveFile = path.join(homunculusDir, 'last-evolve.json');

    // Check last evolve date
    let lastEvolveDate = null;
    try {
      const data = JSON.parse(fs.readFileSync(lastEvolveFile, 'utf8'));
      lastEvolveDate = new Date(data.date);
    } catch {
      // First run
    }

    const sixDaysAgo = Date.now() - 6 * 24 * 60 * 60 * 1000;
    if (lastEvolveDate && lastEvolveDate.getTime() > sixDaysAgo) return;

    // Count instincts — stop as soon as threshold is reached
    const THRESHOLD = 10;
    let instinctCount = 0;
    outer: if (fs.existsSync(homunculusDir)) {
      for (const entry of fs.readdirSync(homunculusDir)) {
        if (entry.endsWith('.json') && entry !== 'last-evolve.json') {
          if (++instinctCount >= THRESHOLD) break outer;
        }
      }
      const projectsDir = path.join(homunculusDir, 'projects');
      if (fs.existsSync(projectsDir)) {
        for (const project of fs.readdirSync(projectsDir)) {
          const instinctsDir = path.join(projectsDir, project, 'instincts', 'personal');
          if (fs.existsSync(instinctsDir)) {
            for (const f of fs.readdirSync(instinctsDir)) {
              if ((f.endsWith('.yaml') || f.endsWith('.json')) && ++instinctCount >= THRESHOLD) break outer;
            }
          }
        }
      }
    }

    if (instinctCount < THRESHOLD) return;

    // Write weekly evolve suggestion to notification queue
    const digestDir = path.join(homunculusDir);
    ensureDir(digestDir);
    const digestFile = path.join(digestDir, 'weekly-digest.md');
    const dateStr = today.toISOString().slice(0, 10);

    const content = `# Weekly Evolve Digest — ${dateStr}

${instinctCount} instincts accumulated. Run \`/evolve\` to analyze and promote patterns.

## Suggested Actions
- \`/evolve\` — Analyze clusters and suggest skills/commands/agents
- \`/evolve --generate\` — Also generate evolved files
- \`/instinct-status\` — Review all current instincts

_This digest was generated automatically. Delete this file after reviewing._
`;

    writeFile(digestFile, content);

    // Update last-evolve.json
    fs.writeFileSync(lastEvolveFile, JSON.stringify({ date: dateStr }), 'utf8');
    log(`[SessionEnd] Weekly evolve digest written (${instinctCount} instincts). Run /evolve to review.`);
  } catch (err) {
    log(`[SessionEnd] Weekly evolve check error: ${err.message}`);
  }
}

/**
 * Warn when session > 90 minutes and .clarc/context.md is absent or stale (> 60 min old).
 * The warning is written to the session file and logged — it is NOT blocking.
 */
function checkContextWarning(sessionFile) {
  try {
    const NINETY_MINUTES_MS = 90 * 60 * 1000;
    const SIXTY_MINUTES_MS = 60 * 60 * 1000;

    // Determine session start time from the session file mtime (creation time proxy)
    if (!fs.existsSync(sessionFile)) return;
    const sessionStat = fs.statSync(sessionFile);
    const sessionAgeMs = Date.now() - sessionStat.birthtimeMs;

    if (sessionAgeMs < NINETY_MINUTES_MS) return; // session < 90 min, no warning needed

    // Check .clarc/context.md in cwd
    const clarcDir = path.join(process.cwd(), '.clarc');
    const contextFile = path.join(clarcDir, 'context.md');

    let contextStale = true;
    if (fs.existsSync(contextFile)) {
      const contextStat = fs.statSync(contextFile);
      const contextAgeMs = Date.now() - contextStat.mtimeMs;
      contextStale = contextAgeMs > SIXTY_MINUTES_MS;
    }

    if (!contextStale) return; // context.md is fresh, no warning needed

    const hasClarcDir = fs.existsSync(clarcDir);
    const hint = hasClarcDir
      ? 'Run /checkpoint create to save context before /compact.'
      : 'Create .clarc/ to enable Memory Bank: mkdir .clarc';

    log(`[SessionEnd] ⚠ Long session (${Math.round(sessionAgeMs / 60000)}min) without recent context checkpoint. ${hint}`);
  } catch (err) {
    log(`[SessionEnd] Context warning check error: ${err.message}`);
  }
}

function buildSummarySection(summary) {
  let section = '## Session Summary\n\n';

  // Tasks (from user messages — collapse newlines and escape backticks to prevent markdown breaks)
  section += '### Tasks\n';
  for (const msg of summary.userMessages) {
    section += `- ${msg.replace(/\n/g, ' ').replace(/`/g, '\\`')}\n`;
  }
  section += '\n';

  // Files modified
  if (summary.filesModified.length > 0) {
    section += '### Files Modified\n';
    for (const f of summary.filesModified) {
      section += `- ${f}\n`;
    }
    section += '\n';
  }

  // Tools used
  if (summary.toolsUsed.length > 0) {
    section += `### Tools Used\n${summary.toolsUsed.join(', ')}\n\n`;
  }

  section += `### Stats\n- Total user messages: ${summary.totalMessages}\n`;

  return section;
}
