#!/usr/bin/env node
/**
 * PostToolUse Hook: Dispatch formatting + console.log check in a single process.
 *
 * Replaces 6 individual Edit hooks (5 formatters + console-warn) with one router:
 *  - Routes to the correct formatter by file extension (no-op for unknown types)
 *  - Inline console.log warning for JS/TS files (no child process needed)
 *
 * Logs each invocation to ~/.claude/hooks.log for observability.
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { logHook } from './hook-logger.js';

const MAX_STDIN = 1024 * 1024;
let data = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
  if (data.length < MAX_STDIN) {
    data += chunk.substring(0, MAX_STDIN - data.length);
  }
});

const EXT_MAP = {
  '.js': 'post-edit-format.js',
  '.jsx': 'post-edit-format.js',
  '.ts': 'post-edit-format.js',
  '.tsx': 'post-edit-format.js',
  '.mjs': 'post-edit-format.js',
  '.cjs': 'post-edit-format.js',
  '.py': 'post-edit-format-python.js',
  '.go': 'post-edit-format-go.js',
  '.java': 'post-edit-format-java.js',
  '.swift': 'post-edit-format-swift.js',
  '.rs': 'post-edit-format-rust.js',
  '.cpp': 'post-edit-format-cpp.js',
  '.cc': 'post-edit-format-cpp.js',
  '.cxx': 'post-edit-format-cpp.js',
  '.h': 'post-edit-format-cpp.js',
  '.hpp': 'post-edit-format-cpp.js',
  '.sh': 'post-edit-format-bash.js',
  '.bash': 'post-edit-format-bash.js',
  '.zsh': 'post-edit-format-bash.js',
  '.kt': 'post-edit-format-kotlin.js',
  '.kts': 'post-edit-format-kotlin.js',
  '.sql': 'post-edit-format-sql.js',
  '.scala': 'post-edit-format-scala.js',
  '.sc': 'post-edit-format-scala.js',
  '.c': 'post-edit-format-c.js'
};

const JS_TS_EXTS = new Set(['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs']);

/** Warn about console.log occurrences inline (no child process). */
function warnConsoleLogs(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const matches = [];
    content.split('\n').forEach((line, idx) => {
      if (/console\.log/.test(line)) matches.push(`${idx + 1}: ${line.trim()}`);
    });
    if (matches.length > 0) {
      console.error(`[Hook] WARNING: console.log found in ${filePath}`);
      matches.slice(0, 5).forEach(m => console.error(m));
      console.error('[Hook] Remove console.log before committing');
    }
  } catch {
    // File unreadable — pass through
  }
}

process.stdin.on('end', () => {
  const start = Date.now();
  let filePath = null;
  let exitCode = 0;

  try {
    const input = JSON.parse(data);
    filePath = input.tool_input?.file_path;

    if (filePath) {
      const ext = path.extname(filePath).toLowerCase();

      // 1. Inline console.log check for JS/TS (no subprocess)
      if (JS_TS_EXTS.has(ext)) {
        warnConsoleLogs(filePath);
      }

      // 2. Dispatch to language-specific formatter
      const script = EXT_MAP[ext];
      if (script) {
        const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || path.join(process.env.HOME || process.env.USERPROFILE || '', '.claude');
        const scriptPath = path.join(pluginRoot, 'scripts', 'hooks', script);

        try {
          const out = execFileSync(process.execPath, [scriptPath], {
            input: data,
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 20000
          });
          logHook('post-edit-format-dispatch', 'Edit', filePath, 0, Date.now() - start);
          process.stdout.write(out);
          process.exit(0);
        } catch (err) {
          // Formatter failed — report clearly so Claude can react
          const reason = (err.stderr || err.message || 'unknown error').toString().trim().split('\n')[0];
          const ext = path.extname(filePath).toLowerCase();
          const formatterHint =
            {
              '.js': 'biome / prettier',
              '.jsx': 'biome / prettier',
              '.ts': 'biome / prettier',
              '.tsx': 'biome / prettier',
              '.mjs': 'biome / prettier',
              '.cjs': 'biome / prettier',
              '.py': 'ruff',
              '.go': 'goimports / gofmt',
              '.java': 'google-java-format / spotless',
              '.swift': 'swift-format / swiftformat',
              '.rs': 'rustfmt',
              '.cpp': 'clang-format',
              '.cc': 'clang-format',
              '.cxx': 'clang-format',
              '.h': 'clang-format',
              '.hpp': 'clang-format',
              '.sh': 'shfmt',
              '.bash': 'shfmt',
              '.zsh': 'shfmt',
              '.kt': 'ktfmt',
              '.kts': 'ktfmt',
              '.sql': 'sqlfluff',
              '.scala': 'scalafmt',
              '.sc': 'scalafmt',
              '.c': 'clang-format'
            }[ext] || 'formatter';
          console.error(`[HOOK: post-edit-format] FAILED on ${path.basename(filePath)}: ${reason}`);
          console.error(`[HOOK: post-edit-format] Ensure ${formatterHint} is installed and in PATH`);
          exitCode = 1;
        }
      }
    }
  } catch {
    // Invalid input — pass through
    exitCode = 1;
  }

  logHook('post-edit-format-dispatch', 'Edit', filePath, exitCode, Date.now() - start);
  process.stdout.write(data);
  process.exit(0);
});
