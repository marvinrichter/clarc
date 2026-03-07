#!/usr/bin/env node
/**
 * PostToolUse Hook: Auto-format C++ files after edits
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs after Edit tool use. If the edited file is a C++ source or header,
 * formats it with clang-format. Only runs if a .clang-format config exists
 * in the repository root (walks up from the file path). Fails silently if
 * clang-format is not installed or no config is found.
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CPP_EXTS = new Set(['.cpp', '.cc', '.cxx', '.h', '.hpp']);
const MAX_STDIN = 1024 * 1024;
let data = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
  if (data.length < MAX_STDIN) {
    data += chunk.substring(0, MAX_STDIN - data.length);
  }
});

/** Walk up the directory tree looking for a .clang-format config file. */
function findClangFormat(startDir) {
  let dir = startDir;
  while (true) {
    if (fs.existsSync(path.join(dir, '.clang-format'))) return true;
    const parent = path.dirname(dir);
    if (parent === dir) return false;
    dir = parent;
  }
}

process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const filePath = input.tool_input?.file_path;

    if (filePath && CPP_EXTS.has(path.extname(filePath).toLowerCase())) {
      if (findClangFormat(path.dirname(filePath))) {
        try {
          const clangFormat = process.platform === 'win32' ? 'clang-format.exe' : 'clang-format';
          execFileSync(clangFormat, ['-i', filePath], {
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 15000
          });
        } catch {
          // clang-format not installed or file has syntax errors — non-blocking
        }
      }
    }
  } catch {
    // Invalid input — pass through
  }

  process.stdout.write(data);
  process.exit(0);
});
