# clarc MCP Server Guide

## When to Use MCP vs CLI Commands

| Surface | Audience | Output Format | Use When |
|---------|---------|---------------|----------|
| **MCP tools** | Agents, CI/CD, programmatic clients | Structured JSON | Another AI tool or pipeline needs clarc data |
| **CLI commands** | Humans in terminal | Formatted prose + checklists | You are working interactively in Claude Code |

**Rule of thumb:** If you are a human typing in a terminal, use CLI commands (`/find-skill`, `/clarc-way`). If you are an agent or script consuming data, use MCP tools.

---

## Tool Reference

### Shared-library tools (MCP and CLI use the same logic)

| MCP Tool | CLI Equivalent | What they share |
|----------|---------------|-----------------|
| `skill_search` | `/find-skill` | `scripts/lib/skill-search.js` |
| `get_project_context` | session-start.js detection | `scripts/lib/project-detect.js` |

These return the same results. MCP returns JSON; CLI returns formatted terminal output.

### Unique MCP tools (no CLI equivalent)

| Tool | Purpose |
|------|---------|
| `get_component_graph` | Agent→skill dependency graph. Answers "which agents use skill X?" or "what skills does agent Y need?". Reads `uses_skills` from agent frontmatter. |
| `get_health_status` | Installation health check: symlink status, hook registration, INDEX.md freshness. Designed for CI/CD pipelines. |
| `get_instinct_status` | Learned instincts with confidence scores. Useful for meta-agents inspecting clarc's learned patterns. |
| `get_session_context` | Latest session snapshot. Useful for agent-to-agent context passing. |
| `agent_describe` | Full agent instructions. Useful for meta-agents that need to inspect or compose with clarc agents. |
| `rule_check` | Rule file content. Useful for compliance checking in CI. |

---

## Setup

### Claude Desktop / Cursor / other MCP clients

Add to your client's MCP config:

```json
{
  "mcpServers": {
    "clarc": {
      "command": "node",
      "args": ["/path/to/.clarc/mcp-server/index.js"]
    }
  }
}
```

For clarc installed via symlink at `~/.clarc/`:

```json
{
  "mcpServers": {
    "clarc": {
      "command": "node",
      "args": ["${HOME}/.clarc/mcp-server/index.js"]
    }
  }
}
```

### As self-hosted (clarc inspecting itself)

Use `mcp-configs/clarc-self.json`:

```bash
# In ~/.claude/settings.json
{
  "mcpServers": {
    "clarc-self": {
      "command": "node",
      "args": ["${CLAUDE_PLUGIN_ROOT}/mcp-server/index.js"]
    }
  }
}
```

### CI/CD health checks

```yaml
# .github/workflows/clarc-health.yml
- name: Check clarc health
  run: |
    echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_health_status","arguments":{}}}' \
      | node .clarc/mcp-server/index.js | jq '.result.content[0].text | fromjson | .healthy'
```

---

## Examples

### Check which agents use a specific skill

```json
{ "tool": "get_component_graph", "arguments": { "skill": "typescript-patterns" } }
```

Returns:
```json
{
  "skill_to_agents": {
    "typescript-patterns": ["typescript-reviewer", "code-reviewer", "frontend-architect"]
  }
}
```

### Search skills from an agent

```json
{ "tool": "skill_search", "arguments": { "query": "react state management", "limit": 5 } }
```

### Detect project type for a given directory

```json
{ "tool": "get_project_context", "arguments": { "cwd": "/path/to/project" } }
```

### Health check for CI gate

```json
{ "tool": "get_health_status", "arguments": { "check": "symlinks" } }
```
