#!/usr/bin/env node
/**
 * PostToolUse Hook: Auto-format Python files after edits
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs after Edit tool use on .py files.
 * Uses ruff format (modern standard). Falls back silently if ruff is not installed.
 *
 * Formatter: ruff format (always — ruff supersedes black as the Python formatting standard)
 * Note: black is intentionally not used. If your project still uses [tool.black], migrate:
 *   replace [tool.black] with [tool.ruff.format] in pyproject.toml, then run:
 *   ruff format . && ruff check --fix .
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

function findProjectRoot(startDir) {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    if (
      fs.existsSync(path.join(dir, 'pyproject.toml')) ||
      fs.existsSync(path.join(dir, 'setup.py')) ||
      fs.existsSync(path.join(dir, 'setup.cfg'))
    ) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return startDir;
}

function tryFormat(filePath, cwd) {
  execFileSync('ruff', ['format', filePath], {
    cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 10000
  });
}

process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const filePath = input.tool_input?.file_path;

    if (filePath && /\.py$/.test(filePath)) {
      try {
        const absPath = path.resolve(filePath);
        const projectRoot = findProjectRoot(path.dirname(absPath));
        tryFormat(absPath, projectRoot);
      } catch {
        // Formatter not installed or failed — non-blocking
      }
    }
  } catch {
    // Invalid input — pass through
  }

  process.stdout.write(data);
  process.exit(0);
});
