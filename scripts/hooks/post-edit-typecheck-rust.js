#!/usr/bin/env node
/**
 * PostToolUse Hook: cargo check after editing .rs files
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs after Edit tool use on Rust files. Walks up from the file's
 * directory to find the nearest Cargo.toml, then runs cargo check
 * and reports only errors related to the edited file.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_STDIN = 1024 * 1024;
let data = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', (chunk) => {
  if (data.length < MAX_STDIN) {
    data += chunk.substring(0, MAX_STDIN - data.length);
  }
});

process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const filePath = input.tool_input?.file_path;

    if (filePath && /\.rs$/.test(filePath)) {
      const resolvedPath = path.resolve(filePath);
      if (!fs.existsSync(resolvedPath)) {
        process.stdout.write(data);
        process.exit(0);
      }

      // Walk up to find nearest Cargo.toml (max 20 levels)
      let dir = path.dirname(resolvedPath);
      const root = path.parse(dir).root;
      let depth = 0;

      while (dir !== root && depth < 20) {
        if (fs.existsSync(path.join(dir, 'Cargo.toml'))) {
          break;
        }
        dir = path.dirname(dir);
        depth++;
      }

      if (fs.existsSync(path.join(dir, 'Cargo.toml'))) {
        try {
          execFileSync('cargo', ['check', '--message-format=short'], {
            cwd: dir,
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 60000,
          });
        } catch (err) {
          // cargo check exits non-zero when there are errors — filter to edited file
          const output = (err.stdout || '') + (err.stderr || '');
          const relPath = path.relative(dir, resolvedPath);
          const candidates = new Set([filePath, resolvedPath, relPath, path.basename(filePath)]);
          const relevantLines = output
            .split('\n')
            .filter((line) => {
              for (const candidate of candidates) {
                if (line.includes(candidate)) return true;
              }
              return false;
            })
            .slice(0, 10);

          if (relevantLines.length > 0) {
            console.error('[Hook] Rust errors in ' + path.basename(filePath) + ':');
            relevantLines.forEach((line) => console.error(line));
          }
        }
      }
    }
  } catch {
    // Invalid input — pass through
  }

  process.stdout.write(data);
  process.exit(0);
});
