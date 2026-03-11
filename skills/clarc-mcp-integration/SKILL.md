---
name: clarc-mcp-integration
description: "Patterns for using clarc MCP server in multi-agent workflows, CI pipelines, and external tools"
---

# clarc MCP Integration

## When to Activate

- Building a multi-agent workflow where one agent needs to inspect clarc state
- Setting up a CI/CD pipeline that checks clarc installation health
- Integrating clarc into Claude Desktop, Cursor, or another MCP-compatible client
- An agent needs to discover available skills or agents programmatically

## MCP vs CLI: The Core Decision

**Use MCP when:** another tool or agent is the consumer (structured JSON input/output required)
**Use CLI commands when:** a human is working interactively in a terminal

Both surfaces share the same underlying logic via shared library modules:
- `scripts/lib/skill-search.js` — powers both `skill_search` MCP tool and `/find-skill` CLI
- `scripts/lib/project-detect.js` — powers both `get_project_context` MCP tool and `session-start.js`

## Unique MCP Tools (no CLI equivalent)

### `get_component_graph`

Returns the agent→skill dependency graph built from `uses_skills` frontmatter in agent files.

```json
// Request
{ "name": "get_component_graph", "arguments": { "skill": "go-patterns" } }

// Response
{
  "agents": 61,
  "skills_referenced": 42,
  "skill_to_agents": {
    "go-patterns": ["go-reviewer", "go-build-resolver"]
  }
}
```

**Use cases:**
- Determine which agents to invoke for a Go project
- Validate that a new skill is referenced by at least one agent
- CI check: ensure `uses_skills` references are not dangling

### `get_health_status`

Checks clarc installation integrity. Returns `healthy: true/false` and an `issues` array.

```json
// Request
{ "name": "get_health_status", "arguments": {} }

// Response
{
  "healthy": true,
  "issues": [],
  "checks": {
    "symlinks": { "agents": "symlink", "skills": "symlink", "hooks": "symlink" },
    "hooks": { "claude_hooks_file": "present" },
    "index": { "present": true, "age_hours": 2, "stale": false }
  }
}
```

**CI gate pattern (one-liner):**
```bash
node mcp-server/index.js <<< '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_health_status","arguments":{}}}' \
  | jq -e '.result.content[0].text | fromjson | .healthy'
```

**CI gate script (full — save as `scripts/ci/check-clarc-health.js`):**
```javascript
#!/usr/bin/env node
// check-clarc-health.js — exits 0 if clarc is healthy, 1 otherwise
// Usage: node scripts/ci/check-clarc-health.js
// Add to CI as a pre-step gate before running agents.

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const mcpServer = resolve(__dirname, '../../mcp-server/index.js');
const request = JSON.stringify({
  jsonrpc: '2.0', id: 1, method: 'tools/call',
  params: { name: 'get_health_status', arguments: {} }
});

const proc = spawn('node', [mcpServer], { stdio: ['pipe', 'pipe', 'inherit'] });
let output = '';
proc.stdout.on('data', chunk => { output += chunk; });
proc.stdin.write(request + '\n');
proc.stdin.end();

proc.on('close', () => {
  try {
    const parsed = JSON.parse(output);
    const status = JSON.parse(parsed.result.content[0].text);
    if (status.healthy) {
      console.log('clarc health: OK');
      process.exit(0);
    } else {
      console.error('clarc health: FAILED');
      console.error('Issues:', status.issues.join(', '));
      process.exit(1);
    }
  } catch (err) {
    console.error('clarc health: could not parse response', err.message);
    process.exit(1);
  }
});
```

## Multi-Agent Pattern: clarc-aware orchestrator

An orchestrator agent can use `get_component_graph` to dynamically route work to the right specialist:

```
1. Detect project type → get_project_context({ cwd })
2. Find relevant agents → get_component_graph({ skill: detected_primary_skill })
3. Invoke matching reviewer agent → agent_describe({ name: reviewer })
4. Run review with full agent instructions
```

## CI Integration Checklist

- [ ] MCP server path configured in CI environment
- [ ] `get_health_status` runs as a pre-step gate
- [ ] `healthy: false` fails the build (exit code 1)
- [ ] INDEX.md freshness check: `stale: false`

## Setup Reference

See [docs/mcp-guide.md](../../docs/mcp-guide.md) for full setup instructions, config examples, and all tool reference documentation.
