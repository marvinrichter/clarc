#!/usr/bin/env node
/**
 * PostToolUse Hook: Auto-format C# files after edits
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs after Edit tool use. If the edited file is a .cs, .csx, or .razor file,
 * formats it with csharpier. Fails silently if csharpier is not installed.
 *
 * Install: dotnet tool install -g csharpier
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

    if (filePath && /\.(cs|csx|razor)$/.test(filePath)) {
      try {
        execFileSync('dotnet', ['csharpier', filePath], {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 30000
        });
      } catch {
        // csharpier not installed or file has syntax errors — non-blocking
      }
    }
  } catch {
    // Invalid input — pass through
  }

  process.stdout.write(data);
  process.exit(0);
});
