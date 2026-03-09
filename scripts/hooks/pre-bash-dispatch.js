#!/usr/bin/env node
/**
 * PreToolUse Hook: Dispatch all Bash pre-checks in a single process.
 *
 * Replaces individual Bash hooks with one router, reducing Node.js
 * startup overhead to 1 process per Bash tool call.
 *
 * Checks (in order):
 *  1. Block dev servers outside tmux (exit 2 = blocked)
 *  2. Remind to use tmux for long-running commands (non-blocking)
 *  3. Remind to review before git push (non-blocking)
 *  4. Secret guard: scan staged diff before git commit (exit 2 = blocked)
 *
 * Logs each invocation to ~/.claude/hooks.log for observability.
 */

import { logHook } from './hook-logger.js';
import { execFileSync } from 'child_process';

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

// ─── Secret guard patterns (high-confidence only, minimal false positives) ──

const SECRET_PATTERNS = [
  { type: 'AWS Access Key',   re: /\bAKIA[0-9A-Z]{16}\b/ },
  { type: 'AWS Secret Key',   re: /\baws_secret_access_key\s*[=:]\s*[A-Za-z0-9+/]{40}\b/i },
  { type: 'GitHub Token',     re: /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b/ },
  { type: 'PEM Private Key',  re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { type: 'Slack Token',      re: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/ },
  { type: 'Generic API Key',  re: /(?:^|\b)(?:api_key|api_secret|access_token|auth_token)\s*[=:]\s*["']?[A-Za-z0-9_\-]{32,}["']?/im },
];

function scanForSecrets(text) {
  const found = [];
  for (const { type, re } of SECRET_PATTERNS) {
    const m = text.match(re);
    if (m) {
      // Redact: show only first 8 chars of the match
      const snippet = m[0].slice(0, 8) + '…';
      found.push({ type, snippet });
    }
  }
  return found;
}

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

    // 4. Secret guard: scan staged diff before git commit
    if (/\bgit\s+commit\b/.test(cmd) && !cmd.includes('--no-verify')) {
      try {
        const diff = execFileSync('git', ['diff', '--staged', '--unified=0'], {
          encoding: 'utf8',
          timeout: 5000,
          stdio: ['ignore', 'pipe', 'ignore'],
        });
        const secrets = scanForSecrets(diff);
        if (secrets.length > 0) {
          console.error('[Hook] SECRET GUARD — Potential secrets detected in staged changes:');
          for (const { type, snippet } of secrets) {
            console.error(`[Hook]   ${type}: ${snippet}`);
          }
          console.error('[Hook] Remove secrets and use environment variables instead.');
          console.error('[Hook] To bypass (only if this is a false positive): git commit --no-verify');
          logHook('pre-bash-dispatch', 'Bash', 'secret-guard-blocked', 2, Date.now() - start);
          process.exit(2);
        }
      } catch {
        // git not available, not a git repo, or timeout — pass through
      }
    }
  } catch {
    // Invalid input — pass through
  }

  logHook('pre-bash-dispatch', 'Bash', cmd.slice(0, 60), 0, Date.now() - start);
  process.stdout.write(data);
  process.exit(0);
});
