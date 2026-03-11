#!/usr/bin/env node
/**
 * Response Dashboard — Stop hook.
 *
 * Displays a compact summary after each Claude response:
 *   - Tools used (Read×3, Edit×2, Agent×1)
 *   - Agents invoked and their model tier
 *   - Estimated token cost for this response
 *
 * Disable: export CLARC_RESPONSE_DASHBOARD=false
 * Or add to .clarc/hooks-config.json: { "response_dashboard": false }
 *
 * Cross-platform (Windows, macOS, Linux)
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const CLARC_DIR = path.join(os.homedir(), '.clarc');
const AGENTS_DIR = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  '..', '..', 'agents'
);

// Per-tool token estimates (same as session-end.js)
const TOOL_TOKEN_WEIGHTS = {
  Agent:     { input: 8000, output: 2000 },
  Bash:      { input:  400, output:  200 },
  Read:      { input: 1500, output:   50 },
  Edit:      { input:  600, output:  150 },
  Write:     { input:  500, output:  100 },
  Grep:      { input:  300, output:  100 },
  Glob:      { input:  200, output:   50 },
  WebFetch:  { input: 2000, output:  100 },
  WebSearch: { input:  800, output:  100 },
  default:   { input:  800, output:  200 },
};

const SONNET_INPUT_USD_PER_M  = 3.0;
const SONNET_OUTPUT_USD_PER_M = 15.0;

const MAX_STDIN = 1024 * 1024;
let stdinData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  if (stdinData.length < MAX_STDIN) {
    stdinData += chunk.substring(0, MAX_STDIN - stdinData.length);
  }
});

process.stdin.on('end', () => {
  try {
    main();
  } catch {
    // Never block on dashboard error
    process.stdout.write(stdinData);
    process.exit(0);
  }
});

function isDisabled() {
  if (process.env.CLARC_RESPONSE_DASHBOARD === 'false') return true;
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(CLARC_DIR, 'hooks-config.json'), 'utf8'));
    if (cfg.response_dashboard === false) return true;
  } catch { /* no config file — enabled by default */ }
  return false;
}

/**
 * Look up the model tier for an agent by reading its frontmatter.
 * Returns 'sonnet' | 'haiku' | 'opus' | null.
 */
function getAgentModel(agentName) {
  if (!agentName) return null;
  try {
    const file = path.join(AGENTS_DIR, `${agentName}.md`);
    if (!fs.existsSync(file)) return null;
    const content = fs.readFileSync(file, 'utf8');
    const match = content.match(/^model:\s*(\S+)/m);
    return match ? match[1].toLowerCase() : 'sonnet';
  } catch { return null; }
}

/**
 * Determine if a user entry is a human message (not a tool_result turn).
 * Returns true if the user turn contains at least one text block.
 */
function isHumanMessage(entry) {
  const content = entry.message?.content ?? entry.content ?? [];
  if (typeof content === 'string') return true;
  if (!Array.isArray(content)) return false;
  return content.some(b => b.type === 'text');
}

/**
 * Parse transcript JSONL and return tool usage stats for the last response.
 * "Last response" = all assistant turns after the last human user message.
 */
function parseLastResponse(transcriptPath) {
  let raw;
  try {
    raw = fs.readFileSync(transcriptPath, 'utf8');
  } catch { return null; }

  const lines = raw.split('\n').filter(Boolean);
  const entries = [];
  for (const line of lines) {
    try { entries.push(JSON.parse(line)); } catch { /* skip */ }
  }

  // Find index of the last human user message
  let lastHumanIdx = -1;
  for (let i = entries.length - 1; i >= 0; i--) {
    const e = entries[i];
    const isUser = e.type === 'user' || e.role === 'user' || e.message?.role === 'user';
    if (isUser && isHumanMessage(e)) {
      lastHumanIdx = i;
      break;
    }
  }

  if (lastHumanIdx === -1) return null; // no user message found

  // Collect all tool uses in assistant turns after the last human message
  const toolCounts = new Map();   // toolName → count
  const agentsUsed = new Map();   // agentName → model
  const filesModified = new Set();

  for (let i = lastHumanIdx + 1; i < entries.length; i++) {
    const e = entries[i];

    // Direct tool_use entries
    if (e.type === 'tool_use' || e.tool_name) {
      const name = e.tool_name || e.name || '';
      if (name) {
        toolCounts.set(name, (toolCounts.get(name) || 0) + 1);
        if (name === 'Agent') {
          const agentType = e.tool_input?.subagent_type || e.input?.subagent_type || 'general-purpose';
          agentsUsed.set(agentType, getAgentModel(agentType) || 'sonnet');
        }
        const fp = e.tool_input?.file_path || e.input?.file_path || '';
        if (fp && (name === 'Edit' || name === 'Write')) filesModified.add(fp);
      }
    }

    // Tool uses in assistant message content blocks
    if (e.type === 'assistant' && Array.isArray(e.message?.content)) {
      for (const block of e.message.content) {
        if (block.type !== 'tool_use') continue;
        const name = block.name || '';
        if (!name) continue;
        toolCounts.set(name, (toolCounts.get(name) || 0) + 1);
        if (name === 'Agent') {
          const agentType = block.input?.subagent_type || 'general-purpose';
          agentsUsed.set(agentType, getAgentModel(agentType) || 'sonnet');
        }
        const fp = block.input?.file_path || '';
        if (fp && (name === 'Edit' || name === 'Write')) filesModified.add(fp);
      }
    }
  }

  if (toolCounts.size === 0) return null;

  // Compute cost estimate
  let estInput = 0;
  let estOutput = 0;
  for (const [tool, count] of toolCounts) {
    const w = TOOL_TOKEN_WEIGHTS[tool] || TOOL_TOKEN_WEIGHTS.default;
    estInput  += w.input  * count;
    estOutput += w.output * count;
  }
  const estUsd = (estInput / 1_000_000) * SONNET_INPUT_USD_PER_M
               + (estOutput / 1_000_000) * SONNET_OUTPUT_USD_PER_M;

  return {
    toolCounts,
    agentsUsed,
    filesModified,
    estInput,
    estOutput,
    estUsd,
    totalTools: Array.from(toolCounts.values()).reduce((a, b) => a + b, 0),
  };
}

function formatToolCounts(toolCounts) {
  // Sort by count descending, skip Glob/Grep if they're minor
  return Array.from(toolCounts.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => count > 1 ? `${name}×${count}` : name)
    .join('  ');
}

function formatAgents(agentsUsed) {
  if (agentsUsed.size === 0) return null;
  return Array.from(agentsUsed.entries())
    .map(([name, model]) => `${name} [${model}]`)
    .join(', ');
}

function formatCost(usd, inputTokens, outputTokens) {
  const totalK = Math.round((inputTokens + outputTokens) / 100) / 10;
  if (usd < 0.001) return `<$0.001  ·  ~${totalK}k tokens`;
  return `~$${usd.toFixed(3)}  ·  ~${totalK}k tokens`;
}

function main() {
  // Always pipe through original data first
  const passthrough = () => { process.stdout.write(stdinData); process.exit(0); };

  if (isDisabled()) return passthrough();

  let transcriptPath = null;
  try {
    const input = JSON.parse(stdinData);
    transcriptPath = input.transcript_path;
  } catch { return passthrough(); }

  if (!transcriptPath || !fs.existsSync(transcriptPath)) return passthrough();

  const stats = parseLastResponse(transcriptPath);
  if (!stats) return passthrough();

  // Build output lines
  const toolLine  = formatToolCounts(stats.toolCounts);
  const agentLine = formatAgents(stats.agentsUsed);
  const costLine  = formatCost(stats.estUsd, stats.estInput, stats.estOutput);

  const parts = [`tools: ${toolLine}`];
  if (agentLine) parts.push(`agents: ${agentLine}`);
  parts.push(`cost:  ${costLine} (est.)`);

  const width = 56;
  const bar = '─'.repeat(width);
  const lines = [bar, ...parts.map(p => ` ${p}`), bar].join('\n');

  // Write to stderr — visible in Claude Code as a notification
  process.stderr.write(`\n${lines}\n`);

  return passthrough();
}
