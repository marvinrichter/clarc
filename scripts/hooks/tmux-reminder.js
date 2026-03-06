#!/usr/bin/env node
/**
 * PreToolUse Hook: Remind to use tmux for long-running commands
 *
 * Prints a reminder (stderr, non-blocking) when Claude runs commands
 * that benefit from tmux session persistence (install, test, build, etc.)
 * and tmux is not already active.
 *
 * Only active on non-Windows platforms.
 */

const MAX_STDIN = 1024 * 1024;
let data = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
  if (data.length < MAX_STDIN) {
    data += chunk.substring(0, MAX_STDIN - data.length);
  }
});

const LONG_RUNNING = /(npm (install|test)|pnpm (install|test)|yarn (install|test)?|bun (install|test)|cargo build|make\b|docker\b|pytest|vitest|playwright)/;

process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const cmd = input.tool_input?.command || '';

    if (process.platform !== 'win32' && !process.env.TMUX && LONG_RUNNING.test(cmd)) {
      console.error('[Hook] Consider running in tmux for session persistence');
      console.error('[Hook] tmux new -s dev  |  tmux attach -t dev');
    }
  } catch {
    // Invalid input — pass through
  }

  process.stdout.write(data);
  process.exit(0);
});
