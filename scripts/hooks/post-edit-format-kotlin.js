#!/usr/bin/env node
/**
 * PostToolUse Hook: Auto-format Kotlin files after edits
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs after Edit tool use. If the edited file is a .kt/.kts file,
 * formats it with ktfmt (--kotlinlang-style). Fails silently if ktfmt
 * is not installed.
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

    if (filePath && /\.kts?$/.test(filePath)) {
      try {
        const ktfmt = process.platform === 'win32' ? 'ktfmt.exe' : 'ktfmt';
        execFileSync(ktfmt, ['--kotlinlang-style', filePath], {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 20000
        });
      } catch {
        // ktfmt not installed or file has syntax errors — non-blocking
      }
    }
  } catch {
    // Invalid input — pass through
  }

  process.stdout.write(data);
  process.exit(0);
});
