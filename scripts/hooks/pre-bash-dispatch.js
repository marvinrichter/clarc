#!/usr/bin/env node
/**
 * PreToolUse Hook: Dispatch all Bash pre-checks in a single process.
 *
 * Replaces 3 individual Bash hooks with one router, reducing Node.js
 * startup overhead from 3 processes to 1 per Bash tool call.
 *
 * Checks (in order):
 *  1. Block dev servers outside tmux (exit 2 = blocked)
 *  2. Remind to use tmux for long-running commands (non-blocking)
 *  3. Remind to review before git push (non-blocking)
 *
 * Logs each invocation to ~/.claude/hooks.log for observability.
 */

import { logHook } from './hook-logger.js';

const MAX_STDIN = 1024 * 1024;
let data = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
  if (data.length < MAX_STDIN) {
    data += chunk.substring(0, MAX_STDIN - data.length);
  }
});

const DEV_SERVER = /(npm run dev\b|pnpm( run)? dev\b|yarn dev\b|bun run dev\b)/;
const LONG_RUNNING = /(npm (install|test)|pnpm (install|test)|yarn (install|test)?|bun (install|test)|cargo build|make\b|docker\b|pytest|vitest|playwright)/;

process.stdin.on('end', () => {
  const start = Date.now();
  let cmd = '';

  try {
    const input = JSON.parse(data);
    cmd = input.tool_input?.command || '';

    // 1. Block dev servers outside tmux
    if (process.platform !== 'win32' && !process.env.TMUX && DEV_SERVER.test(cmd)) {
      console.error('[Hook] BLOCKED: Dev server must run in tmux for log access');
      console.error('[Hook] Use: tmux new-session -d -s dev "npm run dev"');
      console.error('[Hook] Then: tmux attach -t dev');
      logHook('pre-bash-dispatch', 'Bash', cmd.slice(0, 60), 2, Date.now() - start);
      process.exit(2);
    }

    // 2. Remind about tmux for long-running commands
    if (process.platform !== 'win32' && !process.env.TMUX && LONG_RUNNING.test(cmd)) {
      console.error('[Hook] Consider running in tmux for session persistence');
    }

    // 3. Remind to review before git push
    if (/git push/.test(cmd)) {
      console.error('[Hook] Review changes before push...');
      console.error('[Hook] Continuing with push (remove this hook to add interactive review)');
    }
  } catch {
    // Invalid input — pass through
  }

  logHook('pre-bash-dispatch', 'Bash', cmd.slice(0, 60), 0, Date.now() - start);
  process.stdout.write(data);
  process.exit(0);
});
