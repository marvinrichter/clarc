#!/usr/bin/env node
import { readStdin, runExistingHook, transformToClaude } from './adapter.js';
readStdin().then(raw => {
  const claudeInput = JSON.parse(raw || '{}');
  runExistingHook('pre-compact.js', transformToClaude(claudeInput));
  process.stdout.write(raw);
}).catch(() => process.exit(0));
