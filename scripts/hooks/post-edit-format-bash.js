#!/usr/bin/env node
/**
 * PostToolUse Hook: Auto-format Bash/shell files after edits
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs after Edit tool use. If the edited file is a .sh/.bash/.zsh file,
 * formats it with shfmt. Fails silently if shfmt is not installed.
 */

import { execFileSync } from 'child_process';

const MAX_STDIN = 1024 * 1024;
let data = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
  if (data.length < MAX_STDIN) {
    data += chunk.substring(0, MAX_STDIN - data.length);
  }
});

process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const filePath = input.tool_input?.file_path;

    if (filePath && /\.(sh|bash|zsh)$/.test(filePath)) {
      try {
        const shfmt = process.platform === 'win32' ? 'shfmt.exe' : 'shfmt';
        execFileSync(shfmt, ['-i', '2', '-ci', filePath], {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 15000
        });
      } catch {
        // shfmt not installed or file has syntax errors — non-blocking
      }
    }
  } catch {
    // Invalid input — pass through
  }

  process.stdout.write(data);
  process.exit(0);
});
