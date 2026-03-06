#!/usr/bin/env node
/**
 * Hook Logger - Lightweight observability for Claude Code hooks.
 *
 * Usage (wrap any hook call in hooks.json):
 *   node hook-logger.js <hook-name> <hook-script.js>
 *
 * Or import logHook() from other hook scripts:
 *   const { logHook } = require('./hook-logger');
 *   logHook('post-edit-format', 'Edit', filePath, exitCode, durationMs);
 *
 * Log location: ~/.claude/hooks.log
 * Format (NDJSON): { ts, hook, tool, target, exit, ms }
 *
 * View logs:
 *   tail -f ~/.claude/hooks.log | node -e "process.stdin.on('data',d=>console.log(JSON.parse(d)))"
 *
 * Rotate logs (keeps last 5000 lines):
 *   The logger auto-rotates when the file exceeds 500KB.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const LOG_PATH = path.join(process.env.HOME || process.env.USERPROFILE || '', '.claude', 'hooks.log');
const MAX_LOG_BYTES = 500 * 1024; // 500KB
const KEEP_LINES = 5000;
const SLOW_HOOK_THRESHOLD_MS = 3000; // warn if a single hook invocation exceeds this

/**
 * Append a single log entry (NDJSON).
 * Silently swallows errors — logging must never break a hook.
 */
function logHook(hookName, tool, target, exitCode, durationMs) {
  try {
    const entry = JSON.stringify({
      ts: new Date().toISOString(),
      hook: hookName,
      tool,
      target: target ? path.basename(target) : null,
      exit: exitCode,
      ms: Math.round(durationMs)
    });

    // Rotate if over size limit
    try {
      const stat = fs.statSync(LOG_PATH);
      if (stat.size > MAX_LOG_BYTES) {
        const lines = fs.readFileSync(LOG_PATH, 'utf8').split('\n').filter(Boolean);
        const trimmed = lines.slice(-KEEP_LINES).join('\n') + '\n';
        fs.writeFileSync(LOG_PATH, trimmed, 'utf8');
      }
    } catch {
      // File doesn't exist yet — first write
    }

    fs.appendFileSync(LOG_PATH, entry + '\n', 'utf8');

    if (durationMs > SLOW_HOOK_THRESHOLD_MS) {
      process.stderr.write(`[Hook] ⚠ Slow hook: ${hookName} took ${Math.round(durationMs)}ms (threshold: ${SLOW_HOOK_THRESHOLD_MS}ms)\n`);
    }
  } catch {
    // Logging must never break hook execution
  }
}

/**
 * CLI mode: wrap another hook script and log its result.
 * Usage: node hook-logger.js <hook-name> <path-to-script.js>
 */
if (require.main === module) {
  const [, , hookName, scriptPath] = process.argv;

  if (!hookName || !scriptPath) {
    process.stderr.write('Usage: node hook-logger.js <hook-name> <script.js>\n');
    process.exit(1);
  }

  const MAX_STDIN = 1024 * 1024;
  let data = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => {
    if (data.length < MAX_STDIN) data += chunk.substring(0, MAX_STDIN - data.length);
  });

  process.stdin.on('end', () => {
    let tool = 'unknown';
    let target = null;
    try {
      const parsed = JSON.parse(data);
      tool = parsed.tool_name || parsed.tool || 'unknown';
      target = parsed.tool_input?.file_path || parsed.tool_input?.command?.slice(0, 60) || null;
    } catch {
      /* pass */
    }

    const start = Date.now();
    let exitCode = 0;
    let stdout = data;

    try {
      const result = execFileSync(process.execPath, [scriptPath], {
        input: data,
        stdio: ['pipe', 'pipe', 'inherit'],
        timeout: 30000
      });
      stdout = result.toString();
    } catch (err) {
      exitCode = err.status ?? 1;
      if (err.stdout) stdout = err.stdout.toString();
    }

    const ms = Date.now() - start;
    logHook(hookName, tool, target, exitCode, ms);

    process.stdout.write(stdout);
    process.exit(exitCode);
  });
}

module.exports = { logHook };
