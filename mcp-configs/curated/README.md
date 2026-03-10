# Curated MCP Server Configs

Individual, copy-paste-ready MCP server configurations. Each file contains exactly one server entry.

## How to Install

### Option A — One command (recommended)

Use `/mcp-setup` to browse and install servers interactively.

### Option B — Manual

1. Open `~/.claude.json` (create if missing)
2. Add or merge the `mcpServers` key from the file you want
3. Restart Claude Code

Example `~/.claude.json` structure:
```json
{
  "mcpServers": {
    "github": { ... },
    "context7": { ... }
  }
}
```

## Available Servers

| File | Server | Auth | Description |
|------|--------|------|-------------|
| `github.json` | GitHub | PAT required | PRs, issues, repos, code search |
| `context7.json` | Context7 | None | Live library documentation lookup |
| `exa.json` | Exa Search | API key required | Semantic web search and research |
| `postgres.json` | PostgreSQL | Connection string | Direct DB queries and schema inspection |
| `linear.json` | Linear | API key required | Issues, projects, teams |
| `slack.json` | Slack | Bot token required | Channel messages, threads, search |
| `filesystem.json` | Filesystem | None | Local file read/write (set allowed paths) |
| `supabase.json` | Supabase | Project ref required | Tables, storage, edge functions |
| `sequential-thinking.json` | Sequential Thinking | None | Chain-of-thought reasoning |
| `memory.json` | Memory | None | Persistent key-value memory across sessions |

## Tips

- Keep ≤ 10 MCP servers enabled to preserve context window
- Servers with `type: "http"` require no local install
- Replace all `YOUR_*_HERE` placeholders before use
- Use `disabledMcpServers` in project config to disable per-project
