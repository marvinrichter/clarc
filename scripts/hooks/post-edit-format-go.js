#!/usr/bin/env node
/**
 * PostToolUse Hook: Auto-format Go files after edits
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs after Edit tool use on .go files.
 * Runs gofmt (always available with Go installation).
 * Also runs goimports if available (adds/removes imports).
 * Falls back silently if Go is not installed.
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const MAX_STDIN = 1024 * 1024;
let data = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
  if (data.length < MAX_STDIN) {
    data += chunk.substring(0, MAX_STDIN - data.length);
  }
});

function findModuleRoot(startDir) {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    if (fs.existsSync(path.join(dir, 'go.mod'))) return dir;
    dir = path.dirname(dir);
  }
  return startDir;
}

process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const filePath = input.tool_input?.file_path;

    if (filePath && /\.go$/.test(filePath)) {
      try {
        const absPath = path.resolve(filePath);
        const moduleRoot = findModuleRoot(path.dirname(absPath));

        // Prefer goimports (organizes imports + formats) over gofmt
        let formatted = false;
        if (!formatted) {
          try {
            execFileSync('goimports', ['-w', absPath], {
              cwd: moduleRoot,
              stdio: ['pipe', 'pipe', 'pipe'],
              timeout: 10000
            });
            formatted = true;
          } catch (err) {
            if (err.code === 'ENOENT') {
              // goimports not installed — fall through to gofmt
            }
          }
        }

        if (!formatted) {
          // gofmt is always available with Go installation
          execFileSync('gofmt', ['-w', absPath], {
            cwd: moduleRoot,
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 10000
          });
        }
      } catch {
        // Go not installed or file missing — non-blocking
      }
    }
  } catch {
    // Invalid input — pass through
  }

  process.stdout.write(data);
  process.exit(0);
});
