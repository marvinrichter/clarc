---
name: clarc-hooks-authoring
description: Reference guide for writing, testing, and configuring clarc hooks — PreToolUse, PostToolUse, SessionStart, SessionEnd patterns with suppression and cooldown.
---

## When to Use

Use this skill when:
- Adding a new hook to clarc's hook system
- Debugging why a hook fires or doesn't fire
- Configuring per-project hook suppression
- Understanding the difference between blocking and advisory hooks

## Hook System Overview

Hooks are Node.js scripts in `scripts/hooks/` registered in `hooks/hooks.json`.
They intercept Claude Code tool calls at specific lifecycle events.

```
hooks/hooks.json          ← registration (event, matcher, command)
scripts/hooks/*.js        ← implementation scripts
.clarc/hooks-config.json  ← per-project suppression config
~/.clarc/hooks-config.json ← global suppression config
```

## Event Types

| Event | When | Common Uses |
|-------|------|-------------|
| `PreToolUse` | Before tool executes | Validation, blocking, warnings |
| `PostToolUse` | After tool completes | Formatting, nudges, logging |
| `SessionStart` | New session begins | Context loading, project detection |
| `SessionEnd` | Session closes | State saving, weekly tasks |
| `PreCompact` | Before context compaction | Save important state |
| `Stop` | After each response | Final checks |
| `Notification` | Claude needs attention | Log + respond to notifications |

## Hook Registration Format

```json
{
  "matcher": "Edit|Write",
  "hooks": [
    {
      "type": "command",
      "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/hooks/my-hook.js\"",
      "async": true,
      "timeout": 5
    }
  ],
  "description": "What this hook does"
}
```

- `matcher`: Tool name or `*` for all. Pipe-separated for multiple: `"Edit|Write"`
- `async: true`: Hook runs in background — response is not delayed (advisory hooks should be async)
- `timeout`: Seconds before hook is killed (default varies; set explicitly for async hooks)
- `${CLAUDE_PLUGIN_ROOT}`: Resolved to clarc root directory at runtime

## Exit Codes

| Exit Code | Meaning |
|-----------|---------|
| `0` | Success — allow tool execution |
| `2` | Block — tool execution is prevented (PreToolUse only) |
| Other | Error — treated as exit 0 (non-blocking) |

## Script Pattern: PreToolUse

```javascript
#!/usr/bin/env node
import { logHook } from './hook-logger.js';

const MAX_STDIN = 1024 * 1024;
let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { data += chunk; });

process.stdin.on('end', () => {
  const start = Date.now();
  try {
    const input = JSON.parse(data);
    const cmd = input.tool_input?.command || '';      // Bash
    const filePath = input.tool_input?.file_path || ''; // Edit/Write

    if (shouldBlock(cmd)) {
      console.error('[my-hook] BLOCKED: reason');
      logHook('my-hook', 'Bash', cmd.slice(0, 60), 2, Date.now() - start);
      process.exit(2); // ← blocks the tool
    }
  } catch { /* pass through on parse error */ }

  process.stdout.write(data); // pass-through required for PreToolUse
  process.exit(0);
});
```

## Script Pattern: PostToolUse

```javascript
#!/usr/bin/env node
process.stdin.setEncoding('utf8');
let data = '';
process.stdin.on('data', chunk => { data += chunk; });

process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const filePath = input.tool_input?.file_path || '';
    const output = input.tool_response?.output || '';  // tool's return value
    const toolName = input.tool_name || '';            // "Edit" | "Write" | "Bash" etc.

    if (shouldNudge(filePath)) {
      console.error('[my-hook] Advisory: do something');
    }
  } catch { /* ignore */ }

  process.exit(0); // PostToolUse: always exit 0
});
```

## Suppression Config

Users can disable individual hooks per-project or globally:

```json
// .clarc/hooks-config.json  (project-local)
// ~/.clarc/hooks-config.json (global)
{
  "disabled": [
    "code-review-nudge",
    "tdd-sequence-guard"
  ],
  "code_review_cooldown_minutes": 10
}
```

Check suppression in your hook:

```javascript
import fs from 'fs';
import os from 'os';
import path from 'path';

function isDisabled(hookId) {
  for (const p of [
    path.join(process.cwd(), '.clarc', 'hooks-config.json'),
    path.join(os.homedir(), '.clarc', 'hooks-config.json'),
  ]) {
    try {
      const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (cfg.disabled?.includes(hookId)) return true;
    } catch { /* not found */ }
  }
  return false;
}
```

## Performance Constraints

| Hook Type | Max Duration | Rule |
|-----------|-------------|------|
| PreToolUse (blocking) | < 500ms | User waits; must be fast |
| PostToolUse (sync) | < 500ms | Delays Claude response |
| PostToolUse (async) | < 2s recommended | Background; timeout set in hooks.json |
| SessionStart | < 2s | Acceptable startup cost |

- No network calls in hooks (offline-first, no latency)
- No spawning child processes unless absolutely needed (costs ~50ms on macOS)
- Use `async: true` for all advisory (non-blocking) PostToolUse hooks

## Dispatch Pattern

When multiple checks share the same event+matcher, combine them into one dispatch script:

```javascript
// pre-bash-dispatch.js — one process handles N checks
const checks = [devServerCheck, tmuxReminder, gitPushReminder, secretGuard];
for (const check of checks) {
  const result = check(cmd);
  if (result.block) { process.exit(2); }
}
```

This avoids spawning N Node.js processes per tool call.

## Cooldown Pattern

For nudges that would spam on every save:

```javascript
const COOLDOWN_PATH = path.join(os.homedir(), '.clarc', 'nudge-cooldown.json');

function isCoolingDown(hookId, minutes = 5) {
  try {
    const c = JSON.parse(fs.readFileSync(COOLDOWN_PATH, 'utf8'));
    return c[hookId] && (Date.now() - c[hookId]) < minutes * 60 * 1000;
  } catch { return false; }
}

function setCooldown(hookId) {
  let c = {};
  try { c = JSON.parse(fs.readFileSync(COOLDOWN_PATH, 'utf8')); } catch {}
  c[hookId] = Date.now();
  try { fs.writeFileSync(COOLDOWN_PATH, JSON.stringify(c)); } catch {}
}
```

## Anti-patterns

```javascript
// WRONG: network call in hook
const res = await fetch('https://api.example.com/check'); // adds latency

// WRONG: missing pass-through in PreToolUse
process.exit(0); // without process.stdout.write(data) — passes empty input to tool

// WRONG: no error handling
const input = JSON.parse(data); // throws if stdin is empty or malformed

// CORRECT: always wrap in try/catch, always write data for PreToolUse
try {
  const input = JSON.parse(data);
  // ...
} catch { /* pass through */ }
process.stdout.write(data); // required for PreToolUse
process.exit(0);
```

## Testing a Hook

```bash
# Simulate PreToolUse (Bash)
echo '{"tool_name":"Bash","tool_input":{"command":"git commit -m test"}}' | \
  node scripts/hooks/pre-bash-dispatch.js

# Simulate PostToolUse (Edit)
echo '{"tool_name":"Edit","tool_input":{"file_path":"/project/src/auth/service.ts"}}' | \
  node scripts/hooks/post-edit-workflow-nudge.js

# View hook log
tail -20 ~/.claude/hooks.log | node -e "process.stdin.on('data',d=>d.toString().trim().split('\n').forEach(l=>{try{console.log(JSON.parse(l))}catch{}}))"
```
