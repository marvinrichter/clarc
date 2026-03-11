#!/usr/bin/env node
/**
 * PreToolUse Hook: Write-time secret scan.
 *
 * Scans tool_input.content before the Write tool saves a file.
 * Exits 2 to block the write if secrets are detected.
 *
 * This closes the defense-in-depth gap where secrets written via the
 * Write tool would sit unguarded on disk until the next git commit
 * triggered the pre-bash secret guard.
 *
 * Reuses secret patterns from scripts/lib/secret-scanner.js.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import { scanForSecrets } from '../lib/secret-scanner.js';

const MAX_STDIN = 512 * 1024;
let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  if (data.length < MAX_STDIN) data += chunk.substring(0, MAX_STDIN - data.length);
});

process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const content = input.tool_input?.content || '';
    const filePath = input.tool_input?.file_path || '';

    if (!content) process.exit(0);

    const secrets = scanForSecrets(content);
    if (secrets.length > 0) {
      process.stderr.write(`[SECRET GUARD] Potential secret detected in Write to ${filePath || 'unknown file'}.\n`);
      process.stderr.write('[SECRET GUARD] Write blocked to prevent secret from reaching the filesystem.\n');
      for (const { type, snippet } of secrets) {
        process.stderr.write(`[SECRET GUARD]   ${type}: ${snippet}\n`);
      }
      process.stderr.write('[SECRET GUARD] Use an environment variable or secret manager instead.\n');
      process.exit(2); // Block the Write tool
    }
  } catch {
    // Invalid JSON or unexpected input — pass through
  }
  process.exit(0);
});
