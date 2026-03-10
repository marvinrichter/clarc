---
description: Browse and install curated MCP servers with one-line setup. Shows a table of available servers, what each does, and the exact config to add to ~/.claude.json.
---

# MCP Setup

Browse the curated MCP server registry and get copy-paste-ready installation instructions.

## Usage

```
/mcp-setup                    — list all available servers
/mcp-setup <server-name>      — show install instructions for one server
/mcp-setup --installed        — list currently configured servers
```

## Available Servers

| Server | Auth | Description |
|--------|------|-------------|
| `github` | PAT required | PRs, issues, repos, code search |
| `context7` | None | Live library documentation lookup |
| `exa` | API key required | Semantic web search and research |
| `postgres` | Connection string | Direct DB queries, schema inspection |
| `linear` | API key required | Issues, projects, team workflows |
| `slack` | Bot token required | Channel messages, search |
| `filesystem` | None | Local files outside project directory |
| `supabase` | Project ref required | Tables, storage, edge functions |
| `sequential-thinking` | None | Chain-of-thought reasoning |
| `memory` | None | Persistent key-value memory |

Config files: `mcp-configs/curated/<server>.json`

## Steps Claude Should Follow

### `/mcp-setup` (list all)

1. Read `mcp-configs/curated/README.md` and all `.json` files in that directory
2. Print the server table above with `_description` from each file
3. Show the context warning: "Keep ≤ 10 MCPs enabled to preserve context window"
4. Prompt: "Run `/mcp-setup <name>` to get installation instructions for a specific server"

### `/mcp-setup <server-name>`

1. Find the matching file in `mcp-configs/curated/<server-name>.json`
2. Print the `_description`, `_install`, and `_token_url` fields
3. Show the full `mcpServers` JSON block with syntax highlighting
4. Give step-by-step instructions:
   - Open `~/.claude.json`
   - Add the `mcpServers` entry (merge, don't replace)
   - Replace `YOUR_*_HERE` placeholders
   - Restart Claude Code to activate

### `/mcp-setup --installed`

1. Read `~/.claude.json` (or `~/.claude/settings.json`)
2. List all currently configured `mcpServers` entries
3. Cross-reference with `mcp-configs/curated/` and flag any without a curated config
4. Note any servers that appear in `disabledMcpServers`

## Install Example

For `github`:
```json
// In ~/.claude.json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_your_token_here"
      }
    }
  }
}
```

## Notes

- Config files are in `mcp-configs/curated/` — add your own by creating `curated/<name>.json`
- The `mcp-configs/mcp-servers.json` file contains all servers in one file (alternative format)
- HTTP-type servers (Vercel, Cloudflare) require no `npx` — they connect via URL
- For security: never commit `~/.claude.json` to version control (it contains your tokens)
