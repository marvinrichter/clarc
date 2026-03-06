#!/usr/bin/env node
/**
 * PostToolUse Hook: Dispatch to the correct formatter based on file extension.
 *
 * Replaces 5 individual format hooks with a single router, eliminating
 * unnecessary Node.js process starts for non-matching file types.
 * Only one child process starts per Edit — the right one for the file type.
 */

const { execFileSync } = require('child_process');
const path = require('path');

const MAX_STDIN = 1024 * 1024;
let data = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
  if (data.length < MAX_STDIN) {
    data += chunk.substring(0, MAX_STDIN - data.length);
  }
});

const EXT_MAP = {
  '.js':    'post-edit-format.js',
  '.jsx':   'post-edit-format.js',
  '.ts':    'post-edit-format.js',
  '.tsx':   'post-edit-format.js',
  '.mjs':   'post-edit-format.js',
  '.cjs':   'post-edit-format.js',
  '.py':    'post-edit-format-python.js',
  '.go':    'post-edit-format-go.js',
  '.java':  'post-edit-format-java.js',
  '.swift': 'post-edit-format-swift.js',
};

process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const filePath = input.tool_input?.file_path;

    if (filePath) {
      const ext = path.extname(filePath).toLowerCase();
      const script = EXT_MAP[ext];

      if (script) {
        const pluginRoot =
          process.env.CLAUDE_PLUGIN_ROOT ||
          path.join(process.env.HOME || process.env.USERPROFILE || '', '.claude');
        const scriptPath = path.join(pluginRoot, 'scripts', 'hooks', script);

        try {
          const out = execFileSync(process.execPath, [scriptPath], {
            input: data,
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 20000,
          });
          process.stdout.write(out);
          process.exit(0);
        } catch {
          // Formatter failed or not installed — pass through
        }
      }
    }
  } catch {
    // Invalid input — pass through
  }

  process.stdout.write(data);
  process.exit(0);
});
