#!/usr/bin/env node
/**
 * PostToolUse Hook: Auto-format R files after edits
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs after Edit tool use. If the edited file is a .R, .r, .Rmd, or .qmd file,
 * formats it with styler via Rscript. Fails silently if R or styler is not installed.
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

    if (filePath && /\.(R|r|Rmd|qmd)$/.test(filePath)) {
      try {
        const rscript = process.platform === 'win32' ? 'Rscript.exe' : 'Rscript';
        execFileSync(rscript, [
          '-e',
          `styler::style_file(${JSON.stringify(filePath)}, quiet = TRUE)`
        ], {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 30000
        });
      } catch {
        // R or styler not installed, or file has syntax errors — non-blocking
      }
    }
  } catch {
    // Invalid input — pass through
  }

  process.stdout.write(data);
  process.exit(0);
});
