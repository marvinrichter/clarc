#!/usr/bin/env node
/**
 * PostToolUse Hook: Auto-format PHP files after edits
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs after Edit tool use. If the edited file is a .php file,
 * formats it with php-cs-fixer. Prefers local vendor binary over global install.
 * Fails silently if php-cs-fixer is not installed.
 */

import { execFileSync } from 'child_process';
import path from 'path';
import fs from 'fs';

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

    if (filePath && /\.php$/.test(filePath)) {
      try {
        // Prefer local vendor binary; fall back to global install
        const vendorBin = path.join(process.cwd(), 'vendor', 'bin', 'php-cs-fixer');
        const binary = fs.existsSync(vendorBin) ? vendorBin : 'php-cs-fixer';

        execFileSync(binary, ['fix', filePath, '--quiet'], {
          stdio: ['pipe', 'pipe', 'pipe'],
          timeout: 20000
        });
      } catch {
        // php-cs-fixer not installed or file has syntax errors — non-blocking
      }
    }
  } catch {
    // Invalid input — pass through
  }

  process.stdout.write(data);
  process.exit(0);
});
