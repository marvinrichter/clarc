#!/usr/bin/env node
import { readStdin, runExistingHook, transformToClaude } from './adapter.js';
readStdin().then(raw => {
  const input = JSON.parse(raw);
  const claudeInput = transformToClaude(input);
  runExistingHook('session-end.js', claudeInput);
  runExistingHook('evaluate-session.js', claudeInput);
  process.stdout.write(raw);
}).catch(() => process.exit(0));
