#!/usr/bin/env node
import { readStdin } from './adapter.js';
readStdin().then(raw => {
  try {
    const input = JSON.parse(raw);
    const server = input.server || input.mcp_server || 'unknown';
    const tool = input.tool || input.mcp_tool || 'unknown';
    console.error(`[clarc] MCP invocation: ${server}/${tool}`);
  } catch {}
  process.stdout.write(raw);
}).catch(() => process.exit(0));
