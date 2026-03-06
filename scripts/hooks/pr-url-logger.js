#!/usr/bin/env node
/**
 * PostToolUse Hook: Log PR URL and review command after gh pr create
 *
 * After a successful `gh pr create`, extracts the PR URL from the output
 * and prints the review command for convenience.
 */

const MAX_STDIN = 1024 * 1024;
let data = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
  if (data.length < MAX_STDIN) {
    data += chunk.substring(0, MAX_STDIN - data.length);
  }
});

const PR_URL_RE = /https:\/\/github\.com\/[^/]+\/[^/]+\/pull\/\d+/;

process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const cmd = input.tool_input?.command || '';

    if (/gh pr create/.test(cmd)) {
      const out = input.tool_output?.output || '';
      const match = out.match(PR_URL_RE);
      if (match) {
        const url = match[0];
        const repo = url.replace(/https:\/\/github\.com\/([^/]+\/[^/]+)\/pull\/\d+/, '$1');
        const pr = url.replace(/.+\/pull\/(\d+)/, '$1');
        console.error('[Hook] PR created: ' + url);
        console.error('[Hook] To review: gh pr review ' + pr + ' --repo ' + repo);
      }
    }
  } catch {
    // Invalid input — pass through
  }

  process.stdout.write(data);
  process.exit(0);
});
