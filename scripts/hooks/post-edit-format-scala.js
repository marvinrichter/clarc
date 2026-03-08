#!/usr/bin/env node
/**
 * PostToolUse Hook: Auto-format Scala files after edits
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs after Edit tool use. If the edited file is a .scala or .sc file,
 * formats it with scalafmt. Fails silently if scalafmt is not installed.
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

    if (filePath && /\.(scala|sc)$/.test(filePath)) {
      try {
        const scalafmt = process.platform === 'win32' ? 'scalafmt.bat' : 'scalafmt';
        execFileSync(scalafmt, ['--non-interactive', filePath], {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 20000
        });
      } catch {
        // scalafmt not installed or file has syntax errors — non-blocking
      }
    }
  } catch {
    // Invalid input — pass through
  }

  process.stdout.write(data);
  process.exit(0);
});
