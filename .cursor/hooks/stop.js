#!/usr/bin/env node
import { readStdin, runExistingHook, transformToClaude } from './adapter.js';
readStdin().then(raw => {
  const claudeInput = JSON.parse(raw || '{}');
  runExistingHook('check-console-log.js', transformToClaude(claudeInput));
  process.stdout.write(raw);
}).catch(() => process.exit(0));
