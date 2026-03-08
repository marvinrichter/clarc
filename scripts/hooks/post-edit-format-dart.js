#!/usr/bin/env node
/**
 * PostToolUse Hook: Auto-format Dart/Flutter files after edits
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs after Edit tool use on .dart files.
 * Formatter: dart format (official Dart formatter — bundled with Dart SDK)
 * Falls back silently if dart is not installed.
 */

import { execFileSync } from 'child_process';
import path from 'path';

const MAX_STDIN = 1024 * 1024;
let data = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
  if (data.length < MAX_STDIN) {
    data += chunk.substring(0, MAX_STDIN - data.length);
  }
});

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

    if (filePath && /\.dart$/.test(filePath)) {
      try {
        const absPath = path.resolve(filePath);

        // dart format — official formatter bundled with Dart SDK
        if (isCommandAvailable('dart')) {
          execFileSync('dart', ['format', '--fix', absPath], {
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
