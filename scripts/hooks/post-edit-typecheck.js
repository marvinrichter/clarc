#!/usr/bin/env node
/**
 * PostToolUse Hook: TypeScript check after editing .ts/.tsx files
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs after Edit tool use on TypeScript files. Walks up from the file's
 * directory to find the nearest tsconfig.json, then runs tsc --noEmit
 * and reports only errors related to the edited file.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

function runWithTimeout(cmd, args, options, timeoutMs) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      resolve({ timedOut: true, stdout, stderr });
    }, timeoutMs);

    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut: false });
    });
  });
}

const MAX_STDIN = 1024 * 1024; // 1MB limit
let data = "";
process.stdin.setEncoding("utf8");

process.stdin.on("data", (chunk) => {
  if (data.length < MAX_STDIN) {
    const remaining = MAX_STDIN - data.length;
    data += chunk.substring(0, remaining);
  }
});

process.stdin.on("end", async () => {
  try {
    const input = JSON.parse(data);
    const filePath = input.tool_input?.file_path;

    if (!filePath || !filePath.match(/\.(ts|tsx)$/)) { process.stdout.write(data); process.exit(0); }

    if (filePath && /\.(ts|tsx)$/.test(filePath)) {
      const resolvedPath = path.resolve(filePath);
      if (!fs.existsSync(resolvedPath)) {
        process.stdout.write(data);
        process.exit(0);
      }
      // Find nearest tsconfig.json by walking up (max 20 levels to prevent infinite loop)
      let dir = path.dirname(resolvedPath);
      const root = path.parse(dir).root;
      let depth = 0;

      while (dir !== root && depth < 20) {
        if (fs.existsSync(path.join(dir, "tsconfig.json"))) {
          break;
        }
        dir = path.dirname(dir);
        depth++;
      }

      if (fs.existsSync(path.join(dir, "tsconfig.json"))) {
        // Use npx.cmd on Windows to avoid shell: true which enables command injection
        const npxBin = process.platform === "win32" ? "npx.cmd" : "npx";
        const result = await runWithTimeout(
          npxBin,
          ["tsc", "--noEmit", "--pretty", "false"],
          { cwd: dir },
          20000,
        );

        if (result.timedOut) {
          console.error("[Hook] TypeScript check timed out after 20s");
        } else if (result.code !== 0) {
          // tsc exits non-zero when there are errors — filter to edited file
          const output = result.stdout + result.stderr;
          // Compute paths that uniquely identify the edited file.
          // tsc output uses paths relative to its cwd (the tsconfig dir),
          // so check for the relative path, absolute path, and original path.
          // Avoid bare basename matching — it causes false positives when
          // multiple files share the same name (e.g., src/utils.ts vs tests/utils.ts).
          const relPath = path.relative(dir, resolvedPath);
          const candidates = new Set([filePath, resolvedPath, relPath]);
          const relevantLines = output
            .split("\n")
            .filter((line) => {
              for (const candidate of candidates) {
                if (line.includes(candidate)) return true;
              }
              return false;
            })
            .slice(0, 10);

          if (relevantLines.length > 0) {
            console.error(
              "[Hook] TypeScript errors in " + path.basename(filePath) + ":",
            );
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
