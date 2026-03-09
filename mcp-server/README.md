# clarc MCP Server

Exposes clarc state and knowledge as MCP tools — usable by any MCP-compatible AI client.

## Setup

```bash
# Install dependency
npm install

# Configure in ~/.claude/settings.json (or mcp-configs/clarc-self.json)
{
  "mcpServers": {
    "clarc": {
      "command": "node",
      "args": ["~/.clarc/mcp-server/index.js"],
      "env": { "CLAUDE_WORKDIR": "${workspaceFolder}" }
    }
  }
}

# Start manually (for testing)
node mcp-server/index.js
```

## Tools (8)

### `get_instinct_status`

Returns all learned instincts with confidence scores, grouped by domain.

**Input:**
| Field | Type | Description |
|-------|------|-------------|
| `project_id` | string (opt) | Project hash — reads all projects if omitted |
| `domain` | string (opt) | Filter by domain (e.g., "testing", "workflow") |

**Output:** `{ total, instincts: [{ id, scope, domain, action, confidence, trigger }] }`

---

### `get_session_context`

Returns the most recent session snapshot (summary, tasks, files modified).

**Input:**
| Field | Type | Description |
|-------|------|-------------|
| `max_chars` | number (opt) | Max characters to return (default: 3000) |

**Output:** `{ found, file, content }`

---

### `get_skill_index`

Returns the clarc skill catalog, optionally filtered.

**Input:**
| Field | Type | Description |
|-------|------|-------------|
| `language` | string (opt) | Filter by language (e.g., "python", "typescript") |
| `domain` | string (opt) | Filter by domain section (e.g., "testing", "security") |

**Output:** `{ found, content }` (Markdown INDEX.md content)

---

### `get_project_context`

Detects project type, frameworks, and recommends relevant clarc skills.

**Input:**
| Field | Type | Description |
|-------|------|-------------|
| `cwd` | string (opt) | Project directory to analyze (defaults to process.cwd()) |

**Output:** `{ cwd, languages, frameworks, primary, relevant_skills }`

---

### `skill_search`

Search clarc skills by keyword, language, or domain.

**Input:**
| Field | Type | Description |
|-------|------|-------------|
| `query` | string (req) | Keyword, language, or domain to search |
| `limit` | number (opt) | Max results (default: 10) |

**Output:** `{ query, total, results: [{ name, slug, description }] }`

**Example:**
```json
{ "query": "testing python" }
→ { "results": [{ "name": "python-testing", "description": "..." }, ...] }
```

---

### `agent_describe`

Returns full description and instructions for a named clarc agent.

**Input:**
| Field | Type | Description |
|-------|------|-------------|
| `name` | string (req) | Agent name (e.g., "code-reviewer", "orchestrator") |

**Output:** `{ found, name, description, model, tools, instructions }`

**Example:**
```json
{ "name": "orchestrator" }
→ { "found": true, "name": "orchestrator", "model": "opus", "description": "..." }
```

---

### `rule_check`

Returns the content of a specific clarc rule file.

**Input:**
| Field | Type | Description |
|-------|------|-------------|
| `rule` | string (req) | Rule path, e.g., "common/coding-style", "typescript/testing" |

**Output:** `{ found, rule, content }` or `{ found: false, available_rules: [...] }`

**Example:**
```json
{ "rule": "common/security" }
→ { "found": true, "content": "# Security Guidelines\n..." }
```

---

### `workflow_suggest`

Suggests the best clarc workflow (commands + agents) for a task.

**Input:**
| Field | Type | Description |
|-------|------|-------------|
| `task` | string (req) | Task description |

**Output:** `{ task, suggestions: [{ workflow, description }], primary, primary_description }`

**Example:**
```json
{ "task": "implement a new API endpoint with tests" }
→ {
    "primary": ["/plan", "/tdd", "/code-review"],
    "primary_description": "Plan → TDD → Review"
  }
```

---

## Configuration

### Via `mcp-configs/clarc-self.json`

```json
{
  "mcpServers": {
    "clarc": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/mcp-server/index.js"],
      "env": { "CLAUDE_WORKDIR": "${workspaceFolder}" },
      "description": "clarc MCP server — 8 tools for instinct status, session context, skill search, agent descriptions, rule lookup, and workflow suggestions"
    }
  }
}
```

### Manual registration in `~/.claude/settings.json`

```json
{
  "mcpServers": {
    "clarc": {
      "command": "node",
      "args": ["/Users/<you>/.clarc/mcp-server/index.js"]
    }
  }
}
```

## Development

```bash
# Run tests
npm test

# Lint
npx eslint mcp-server/index.js

# Test a specific tool (pipe JSON input)
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"skill_search","arguments":{"query":"testing"}}}' | node mcp-server/index.js
```
