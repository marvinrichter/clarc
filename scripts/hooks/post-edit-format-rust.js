#!/usr/bin/env node
/**
 * PostToolUse Hook: Auto-format Rust files after edits
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs after Edit tool use. If the edited file is a .rs file,
 * formats it with rustfmt. Fails silently if rustfmt is not installed.
 */

const { execFileSync } = require('child_process');
const path = require('path');

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

    if (filePath && /\.rs$/.test(filePath)) {
      try {
        const rustfmt = process.platform === 'win32' ? 'rustfmt.exe' : 'rustfmt';
        execFileSync(rustfmt, [filePath], {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 15000,
        });
      } catch {
        // rustfmt not installed or file has syntax errors — non-blocking
      }
    }
  } catch {
    // Invalid input — pass through
  }

  process.stdout.write(data);
  process.exit(0);
});
