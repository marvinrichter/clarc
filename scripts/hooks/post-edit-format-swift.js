#!/usr/bin/env node
/**
 * PostToolUse Hook: Auto-format Swift files after edits
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs after Edit tool use on .swift files.
 * Formatter priority:
 *   1. swift-format (Apple's official formatter, available via Xcode or `brew install swift-format`)
 *   2. swiftformat (community formatter, `brew install swiftformat`)
 * Falls back silently if neither is installed.
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
      fs.existsSync(path.join(dir, 'Package.swift')) ||
      fs.existsSync(path.join(dir, '.swiftformat')) ||
      fs.existsSync(path.join(dir, '.swift-format'))
    ) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return startDir;
}

function isCommandAvailable(cmd) {
  try {
    execFileSync(cmd, ['--version'], { stdio: ['pipe', 'pipe', 'pipe'], timeout: 2000 });
    return true;
  } catch (err) {
    return err.code !== 'ENOENT';
  }
}

process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const filePath = input.tool_input?.file_path;

    if (filePath && /\.swift$/.test(filePath)) {
      try {
        const absPath = path.resolve(filePath);
        const projectRoot = findProjectRoot(path.dirname(absPath));

        // 1. swift-format (Apple official — respects .swift-format config)
        if (isCommandAvailable('swift-format')) {
          execFileSync('swift-format', ['format', '--in-place', absPath], {
            cwd: projectRoot,
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 15000
          });
        } else if (isCommandAvailable('swiftformat')) {
          // 2. swiftformat (community — respects .swiftformat config)
          execFileSync('swiftformat', [absPath], {
            cwd: projectRoot,
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 15000
          });
        }
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
