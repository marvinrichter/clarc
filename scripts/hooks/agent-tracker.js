#!/usr/bin/env node
/**
 * agent-tracker — PostToolUse hook that logs agent invocations.
 *
 * Fires after every Agent tool call and appends a JSONL entry to
 * ~/.clarc/agent-log.jsonl. Entries are later analyzed by:
 *   node scripts/agent-analytics.js
 *
 * Log format (one JSON object per line):
 * {
 *   "ts":        "2026-03-09T14:30:00.000Z",
 *   "agent":     "code-reviewer",
 *   "project":   "my-app",
 *   "duration":  1234,          // ms (from hook input, 0 if unavailable)
 *   "exit_code": 0,             // 0 = success
 *   "description": "..."        // first 80 chars of agent description arg
 * }
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

const CLARC_DIR = path.join(os.homedir(), '.clarc');
const LOG_FILE = path.join(CLARC_DIR, 'agent-log.jsonl');

// Read hook input from stdin
const MAX_STDIN = 256 * 1024;
let stdinData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  if (stdinData.length < MAX_STDIN) {
    stdinData += chunk.substring(0, MAX_STDIN - stdinData.length);
  }
});

process.stdin.on('end', () => {
  try {
    run();
  } catch {
    // Never block the agent
    process.exit(0);
  }
});

function run() {
  let input = {};
  try {
    input = JSON.parse(stdinData);
  } catch {
    process.exit(0);
  }

  // Only track Agent tool calls
  const toolName = input.tool_name || input.tool || '';
  if (toolName !== 'Agent' && toolName !== 'agent') {
    process.exit(0);
  }

  const toolInput = input.tool_input || input.input || {};
  const toolResponse = input.tool_response || input.response || {};

  // Extract agent type from input
  const agentType = toolInput.subagent_type || toolInput.agent_type || 'general-purpose';

  // Extract description (first 80 chars)
  const desc = (toolInput.description || toolInput.prompt || '').slice(0, 80).replace(/\n/g, ' ');

  // Extract duration and exit code from response
  const duration = toolResponse.duration_ms || 0;
  const exitCode = toolResponse.exit_code ?? (toolResponse.error ? 1 : 0);

  const entry = {
    ts: new Date().toISOString(),
    agent: agentType,
    project: path.basename(process.cwd()),
    duration,
    exit_code: exitCode,
    description: desc
  };

  try {
    if (!fs.existsSync(CLARC_DIR)) {
      fs.mkdirSync(CLARC_DIR, { recursive: true });
    }
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + '\n', 'utf8');
  } catch {
    // Never block on write failure
  }

  process.exit(0);
}
