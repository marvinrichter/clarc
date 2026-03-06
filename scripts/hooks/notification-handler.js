#!/usr/bin/env node
/**
 * Notification Hook - Handle Claude Code system notifications.
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Fires on the Notification event. Current uses:
 *  - Long-running session: remind user to /compact if context is large
 *
 * Input (stdin JSON):
 *   { notification: { type: string, message?: string, ... } }
 */

const { log } = require('../lib/utils');

const MAX_STDIN = 256 * 1024;
let data = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
  if (data.length < MAX_STDIN) data += chunk.substring(0, MAX_STDIN - data.length);
});

process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const notification = input.notification || {};
    const type = notification.type || '';

    // Log all notifications for observability
    log(`[Notification] type=${type} ${notification.message ? '| ' + String(notification.message).slice(0, 100) : ''}`);

    // Context pressure warning: suggest /compact
    if (type === 'context_limit_warning' || type === 'context_pressure') {
      process.stdout.write(JSON.stringify({
        type: 'assistant',
        content: '⚠ Context is getting large. Consider running `/compact` to preserve working memory before switching tasks.',
      }) + '\n');
    }
  } catch {
    // Invalid input — pass through silently
  }

  process.exit(0);
});
