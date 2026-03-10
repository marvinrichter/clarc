---
name: repomap
description: Compact codebase map injected at session start — file tree, key symbols, and hot files from git history. Closes the Aider-style context-awareness gap without tree-sitter dependencies.
skill_family: developer-experience
related_agents: []
---

# Repomap

## When to Activate

- Claude Code session starts on an unfamiliar or large codebase
- User runs `/repomap` to refresh the injected context map
- Context window is clean and a codebase overview would orient Claude faster
- Working in a multi-service monorepo where key entry points aren't obvious

## What It Does

Generates a **compact codebase snapshot** and injects it into the session context:

1. **Hot files** — files most recently modified (from `git log`) are shown first
2. **Key symbols** — exported functions, classes, and interfaces extracted via language-specific regex (no tree-sitter required)
3. **File tree summary** — grouped by top-level directory with file counts
4. **Cache** — result stored in `.clarc/repomap.txt`, refreshed every 24h automatically

This mirrors Aider's repomap concept but uses zero-dependency Node.js (git + regex) instead of tree-sitter.

## Format

The injected context block looks like this:

```
--- Codebase Map (2026-03-10) ---
Hot files (recently modified):
  src/api/routes.ts           Route, handleRequest, validateAuth [145 lines]
  src/services/auth.ts        AuthService, generateToken, verifyToken [98 lines]
  src/models/user.ts          User, UserRepository, createUser [76 lines]

Structure (8 directories, 42 files):
  src/api/       4 files
  src/models/    3 files
  src/services/  5 files
  tests/         12 files
  scripts/       3 files

Run /repomap --refresh to regenerate.
---
```

## Implementation

The `generateCompactRepomap(cwd)` function in `session-start.js`:

```js
function generateCompactRepomap(cwd) {
  const cacheFile = path.join(cwd, '.clarc', 'repomap.txt');
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

  // Return cached version if fresh
  try {
    if (fs.existsSync(cacheFile)) {
      const stat = fs.statSync(cacheFile);
      if (Date.now() - stat.mtimeMs < CACHE_TTL_MS) {
        return fs.readFileSync(cacheFile, 'utf8');
      }
    }
  } catch { /* ignore */ }

  // 1. Get recently modified files (hot files)
  const hotFilesResult = spawnSync('git', [
    'log', '--name-only', '--pretty=format:', '-50'
  ], { cwd, encoding: 'utf8', stdio: 'pipe', timeout: 5000 });

  const hotFiles = hotFilesResult.status === 0
    ? [...new Set(
        hotFilesResult.stdout.split('\n')
          .map(f => f.trim())
          .filter(f => f && !f.startsWith('.'))
      )].slice(0, 20)
    : [];

  // 2. Get all tracked files for directory summary
  const lsResult = spawnSync('git', ['ls-files'], {
    cwd, encoding: 'utf8', stdio: 'pipe', timeout: 5000
  });
  const allFiles = lsResult.status === 0
    ? lsResult.stdout.trim().split('\n').filter(Boolean)
    : [];

  // 3. Build directory summary
  const dirCounts = {};
  for (const f of allFiles) {
    const parts = f.split('/');
    const dir = parts.length > 1 ? parts[0] : '.';
    dirCounts[dir] = (dirCounts[dir] || 0) + 1;
  }

  // 4. Extract key symbols from hot files (regex, no tree-sitter)
  const SYMBOL_PATTERNS = [
    /^export\s+(?:default\s+)?(?:class|function|const|type|interface|enum)\s+(\w+)/m,
    /^(?:pub\s+)?(?:fn|struct|trait|impl)\s+(\w+)/m,
    /^(?:def|class)\s+(\w+)/m,
    /^(?:func|type)\s+(\w+)/m,
  ];

  const hotFileLines = hotFiles.map(f => {
    const fullPath = path.join(cwd, f);
    let symbols = '';
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lineCount = content.split('\n').length;
      const found = [];
      for (const pat of SYMBOL_PATTERNS) {
        const matches = content.match(new RegExp(pat.source, 'gm')) || [];
        for (const m of matches.slice(0, 4)) {
          const name = m.match(pat)?.[1];
          if (name) found.push(name);
        }
      }
      symbols = found.length > 0
        ? `  ${f.padEnd(40)} ${found.slice(0, 5).join(', ')} [${lineCount} lines]`
        : `  ${f} [${lineCount} lines]`;
    } catch {
      symbols = `  ${f}`;
    }
    return symbols;
  });

  // 5. Assemble map
  const date = new Date().toISOString().slice(0, 10);
  const dirSummary = Object.entries(dirCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([d, n]) => `  ${(d + '/').padEnd(20)} ${n} file${n !== 1 ? 's' : ''}`)
    .join('\n');

  const map = [
    `--- Codebase Map (${date}) ---`,
    hotFileLines.length > 0 ? `Hot files (recently modified):\n${hotFileLines.join('\n')}` : '',
    dirSummary ? `\nStructure (${Object.keys(dirCounts).length} directories, ${allFiles.length} files):\n${dirSummary}` : '',
    '\nRun /repomap --refresh to regenerate.',
    '---'
  ].filter(Boolean).join('\n');

  // 6. Cache and return (cap at 3000 chars)
  const capped = map.length > 3000 ? map.slice(0, 3000) + '\n...(truncated)\n---' : map;
  try {
    fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
    fs.writeFileSync(cacheFile, capped, 'utf8');
  } catch { /* ignore */ }

  return capped;
}
```

## Session-Start Injection

In `session-start.js`, the repomap is injected after the Memory Bank:

```js
// Repomap: inject compact codebase context
const repomap = generateCompactRepomap(process.cwd());
if (repomap) {
  output(repomap);
  log('[SessionStart] Repomap injected');
}
```

The `--refresh` flag bypasses the cache by deleting `.clarc/repomap.txt` before generation.

## Command Usage

```
/repomap                — inject current repomap into context
/repomap --refresh      — force regenerate (ignore 24h cache)
/repomap --show         — print the raw map to terminal (no injection)
```

## Anti-Patterns

**Don't** inject the full repomap on every tool call — only at session start and on explicit `/repomap` invocation. Injecting on every edit would burn context fast.

**Don't** include `node_modules`, `dist`, `build`, or `.git` paths — the `git ls-files` approach naturally excludes untracked files.

**Don't** attempt tree-sitter or AST parsing in this skill — the regex approach is intentionally simpler and more portable. For deep symbol analysis, use language-specific review agents.

**Don't** cache forever — the 24h TTL ensures the map stays fresh as the codebase evolves.

## See Also

- `skills/continuous-learning-v2` — session context enrichment
- `skills/subagent-context-retrieval` — progressive context loading for large codebases
- `commands/context.md` — broader project context command
