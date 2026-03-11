#!/usr/bin/env node
/**
 * PostToolUse Hook: Dispatch formatting in a single process.
 *
 * Routes to the correct formatter by file extension (no-op for unknown types).
 * console.log detection is handled by the check-console-log.js Stop hook.
 *
 * Logs each invocation to ~/.claude/hooks.log for observability.
 */

import { spawn } from 'child_process';
import os from 'os';
import path from 'path';
import { logHook } from './hook-logger.js';

// Paths that should never be formatted (generated/vendor output)
const EXCLUDED_PATH_SEGMENTS = ['/node_modules/', '/vendor/', '/dist/', '/.git/', '\\node_modules\\', '\\vendor\\', '\\dist\\', '\\.git\\'];

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
  '.c': 'post-edit-format-c.js',
  '.php': 'post-edit-format-php.js',
  '.r': 'post-edit-format-r.js',
  '.rmd': 'post-edit-format-r.js',
  '.qmd': 'post-edit-format-r.js',
  '.cs': 'post-edit-format-csharp.js',
  '.csx': 'post-edit-format-csharp.js',
  '.razor': 'post-edit-format-csharp.js',
  '.dart': 'post-edit-format-dart.js'
};

/** Run a formatter script non-blocking via spawn and return a promise. */
function runFormatter(scriptPath, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(new Error('formatter timeout after 5s'));
    }, 5000);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('close', code => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr || `exit ${code}`));
    });
    child.stdin.write(input);
    child.stdin.end();
  });
}

process.stdin.on('end', async () => {
  const start = Date.now();
  let filePath = null;
  let exitCode = 0;

  try {
    const input = JSON.parse(data);
    filePath = input.tool_input?.file_path;

    if (filePath) {
      // Skip generated/vendor paths — no point formatting them
      const normalized = filePath.replace(/\\/g, '/');
      if (EXCLUDED_PATH_SEGMENTS.some(seg => normalized.includes(seg.replace(/\\/g, '/')))) {
        process.stdout.write(data);
        process.exit(0);
      }

      const ext = path.extname(filePath).toLowerCase();

      // 1. Dispatch to language-specific formatter (non-blocking spawn)
      const script = EXT_MAP[ext];
      if (script) {
        const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT || path.join(os.homedir(), '.claude');
        const scriptPath = path.join(pluginRoot, 'scripts', 'hooks', script);

        try {
          const out = await runFormatter(scriptPath, data);
          logHook('post-edit-format-dispatch', 'Edit', filePath, 0, Date.now() - start);
          process.stdout.write(out);
          process.exit(0);
        } catch (err) {
          // Formatter failed — report clearly so Claude can react
          const reason = (err.message || 'unknown error').toString().trim().split('\n')[0];
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
              '.c': 'clang-format',
              '.php': 'php-cs-fixer',
              '.r': 'styler (R package)',
              '.rmd': 'styler (R package)',
              '.qmd': 'styler (R package)',
              '.cs': 'csharpier (dotnet tool)',
              '.csx': 'csharpier (dotnet tool)',
              '.razor': 'csharpier (dotnet tool)',
              '.dart': 'dart format'
            }[ext] || 'formatter';
          console.error(`[HOOK: post-edit-format] FAILED on ${path.basename(filePath)}: ${reason}`);
          console.error(`[HOOK: post-edit-format] Ensure ${formatterHint} is installed and in PATH`);
          exitCode = 1;
        }
      }
    }
  } catch {
    // Invalid input — pass through
    exitCode = 0;
  }

  logHook('post-edit-format-dispatch', 'Edit', filePath, exitCode, Date.now() - start);
  process.stdout.write(data);
  process.exit(exitCode);
});
