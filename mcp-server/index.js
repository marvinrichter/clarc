#!/usr/bin/env node
/**
 * clarc MCP Server — exposes clarc state as MCP tools.
 *
 * Tools:
 *   get_instinct_status   — current instincts + confidence (project + global)
 *   get_session_context   — latest session snapshot
 *   get_project_context   — detected project type + relevant skills
 *   skill_search          — search skills by keyword/language/domain
 *   agent_describe        — full description + instructions for a named agent
 *   rule_check            — content of a specific clarc rule file
 *   get_component_graph   — agent→skill dependency graph (unique MCP value)
 *   get_health_status     — clarc installation health check (unique MCP value)
 *
 * Usage:
 *   node mcp-server/index.js
 *
 * Configure in mcp-configs/clarc-self.json or ~/.claude/settings.json:
 *   { "mcpServers": { "clarc": { "command": "node", "args": ["<path>/mcp-server/index.js"] } } }
 *
 * Requires @modelcontextprotocol/sdk:
 *   npm install @modelcontextprotocol/sdk
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { detectProjectType } from '../scripts/lib/project-detect.js';
import { searchSkills } from '../scripts/lib/skill-search.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOMUNCULUS_DIR = path.join(os.homedir(), '.claude', 'homunculus');
const SESSIONS_DIR = path.join(os.homedir(), '.claude', 'projects');
const AGENTS_DIR = path.join(__dirname, '..', 'agents');
const RULES_DIR = path.join(__dirname, '..', 'rules');
const SKILLS_DIR = path.join(__dirname, '..', 'skills');

// In-memory cache for the component graph (expensive: scans all agent files).
// Invalidated when agents dir mtime changes. TTL: 1 hour max.
const _graphCache = {
  data: null,
  mtime: 0,
  builtAt: 0,
  MAX_AGE_MS: 60 * 60 * 1000, // 1 hour
};

function getAgentsDirMtime() {
  try {
    return fs.statSync(AGENTS_DIR).mtimeMs;
  } catch {
    return 0;
  }
}

// ─── Tool definitions ──────────────────────────────────────────────────────

const TOOLS = [
  {
    name: 'get_instinct_status',
    description: 'Returns all learned instincts with confidence scores, grouped by domain. Includes project-scoped and global instincts.',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'string',
          description: 'Project hash ID (optional — reads from HOMUNCULUS_DIR if omitted)'
        },
        domain: {
          type: 'string',
          description: 'Filter by domain (optional, e.g., "testing", "workflow")'
        }
      }
    }
  },
  {
    name: 'get_session_context',
    description: 'Returns the most recent session snapshot (summary, tasks, files modified).',
    inputSchema: {
      type: 'object',
      properties: {
        max_chars: {
          type: 'number',
          description: 'Maximum characters to return (default: 3000)'
        }
      }
    }
  },
  {
    name: 'get_project_context',
    description: 'Returns detected project type, frameworks, and relevant clarc skills for the current working directory.',
    inputSchema: {
      type: 'object',
      properties: {
        cwd: {
          type: 'string',
          description: 'Project directory to analyze (defaults to process.cwd())'
        }
      }
    }
  },
  {
    name: 'skill_search',
    description: 'Search clarc skills by keyword, language, or domain. Returns matching skill names with descriptions.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query — keyword, language name, or domain (e.g., "testing", "python", "architecture")'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results (default: 10)'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'agent_describe',
    description: 'Returns the full description, tools, model, and instructions for a named clarc agent.',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Agent name (e.g., "code-reviewer", "planner", "orchestrator")'
        }
      },
      required: ['name']
    }
  },
  {
    name: 'rule_check',
    description: 'Returns the content of a specific clarc rule file (common or language-specific). Use to look up coding standards, security requirements, or workflow rules.',
    inputSchema: {
      type: 'object',
      properties: {
        rule: {
          type: 'string',
          description: 'Rule file to retrieve, e.g., "common/coding-style", "common/security", "typescript/coding-style"'
        }
      },
      required: ['rule']
    }
  },
  {
    name: 'get_component_graph',
    description: 'Returns the agent→skill dependency graph. Shows which agents use which skills, and which skills are used by multiple agents. Unique MCP value — not available in CLI.',
    inputSchema: {
      type: 'object',
      properties: {
        agent: {
          type: 'string',
          description: 'Filter by agent name (optional — returns full graph if omitted)'
        },
        skill: {
          type: 'string',
          description: 'Filter by skill slug (optional — returns all agents using this skill)'
        }
      }
    }
  },
  {
    name: 'get_health_status',
    description: 'Returns clarc installation health: symlink status, hook registration, INDEX.md freshness, missing agents/skills. Designed for CI/CD integration.',
    inputSchema: {
      type: 'object',
      properties: {
        check: {
          type: 'string',
          description: 'Specific check to run: "symlinks", "hooks", "index", or "all" (default: "all")'
        }
      }
    }
  }
];

// ─── Tool handlers ─────────────────────────────────────────────────────────

function handleGetInstinctStatus({ project_id, domain } = {}) {
  const instincts = [];

  // Global instincts
  const globalDir = path.join(HOMUNCULUS_DIR, 'instincts');
  loadInstinctsFromDir(globalDir, 'global', instincts);

  // Project instincts
  if (project_id) {
    const projectDir = path.join(HOMUNCULUS_DIR, 'projects', project_id, 'instincts', 'personal');
    loadInstinctsFromDir(projectDir, 'project', instincts);
  } else {
    // Try all project directories
    const projectsBase = path.join(HOMUNCULUS_DIR, 'projects');
    if (fs.existsSync(projectsBase)) {
      for (const proj of fs.readdirSync(projectsBase)) {
        const pd = path.join(projectsBase, proj, 'instincts', 'personal');
        loadInstinctsFromDir(pd, `project:${proj}`, instincts);
      }
    }
  }

  const filtered = domain ? instincts.filter(i => (i.domain || '').toLowerCase().includes(domain.toLowerCase())) : instincts;

  return {
    total: filtered.length,
    instincts: filtered.slice(0, 50), // cap at 50 for context safety
    conflicts_file: path.join(HOMUNCULUS_DIR, 'conflicts.json')
  };
}

function loadInstinctsFromDir(dir, scope, result) {
  if (!fs.existsSync(dir)) return;
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.yaml') && !f.endsWith('.yml') && !f.endsWith('.json')) continue;
    try {
      const content = fs.readFileSync(path.join(dir, f), 'utf8');
      let obj = {};
      if (f.endsWith('.json')) {
        obj = JSON.parse(content);
      } else {
        for (const line of content.split('\n')) {
          if (line.startsWith('#') || !line.includes(':')) continue;
          const [k, ...vs] = line.split(':');
          obj[k.trim()] = vs
            .join(':')
            .trim()
            .replace(/^["']|["']$/g, '');
        }
      }
      result.push({
        id: obj.id || f.replace(/\.(yaml|yml|json)$/, ''),
        scope,
        domain: obj.domain || obj.category || 'general',
        action: obj.action || obj.description || obj.pattern || '',
        confidence: parseFloat(obj.confidence) || 0.5,
        trigger: obj.trigger || ''
      });
    } catch {
      // Skip malformed files
    }
  }
}

function handleGetSessionContext({ max_chars = 3000 } = {}) {
  // Find most recent session file across all project dirs
  let latestFile = null;
  let latestMtime = 0;

  if (fs.existsSync(SESSIONS_DIR)) {
    for (const proj of fs.readdirSync(SESSIONS_DIR)) {
      const sessDir = path.join(SESSIONS_DIR, proj, 'sessions');
      if (!fs.existsSync(sessDir)) continue;
      for (const f of fs.readdirSync(sessDir)) {
        if (!f.endsWith('-session.tmp')) continue;
        const fpath = path.join(sessDir, f);
        const mtime = fs.statSync(fpath).mtimeMs;
        if (mtime > latestMtime) {
          latestMtime = mtime;
          latestFile = fpath;
        }
      }
    }
  }

  if (!latestFile) {
    return { found: false, message: 'No session files found.' };
  }

  let content = fs.readFileSync(latestFile, 'utf8');
  if (content.length > max_chars) {
    content = '...(truncated)\n' + content.slice(content.length - max_chars);
  }

  return { found: true, file: latestFile, content };
}

function handleGetProjectContext({ cwd } = {}) {
  const projectDir = cwd || process.env.CLAUDE_WORKDIR || process.cwd();
  try {
    return detectProjectType(projectDir);
  } catch (err) {
    return { error: err.message, cwd: projectDir };
  }
}

function handleSkillSearch({ query, limit = 10 } = {}) {
  return searchSkills(query, { limit, skillsDir: SKILLS_DIR });
}

function handleAgentDescribe({ name } = {}) {
  if (!name) return { error: 'name is required' };

  const agentFile = path.join(AGENTS_DIR, `${name}.md`);
  if (!fs.existsSync(agentFile)) {
    // Try listing available agents
    const available = fs.existsSync(AGENTS_DIR)
      ? fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''))
      : [];
    return { found: false, name, available_agents: available.slice(0, 20) };
  }

  const content = fs.readFileSync(agentFile, 'utf8');

  // Parse frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  const frontmatter = {};
  if (fmMatch) {
    for (const line of fmMatch[1].split('\n')) {
      const idx = line.indexOf(':');
      if (idx === -1) continue;
      const k = line.slice(0, idx).trim();
      const v = line.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      frontmatter[k] = v;
    }
  }

  const instructions = content.replace(/^---\n[\s\S]*?\n---\n/, '').trim();

  return {
    found: true,
    name,
    description: frontmatter.description || '',
    model: frontmatter.model || 'sonnet',
    tools: frontmatter.tools || '',
    instructions: instructions.slice(0, 2000)
  };
}

function handleRuleCheck({ rule } = {}) {
  if (!rule) return { error: 'rule is required' };

  // Sanitize: only allow alphanumeric, slash, hyphen, underscore
  if (!/^[a-zA-Z0-9/_-]+$/.test(rule)) {
    return { error: 'Invalid rule name. Use format: "common/coding-style" or "typescript/testing"' };
  }

  // Try with .md extension
  let rulePath = path.join(RULES_DIR, `${rule}.md`);
  if (!fs.existsSync(rulePath)) {
    // Try without extension (if rule already ends in .md)
    rulePath = path.join(RULES_DIR, rule);
  }

  if (!fs.existsSync(rulePath)) {
    // List available rules
    const available = [];
    if (fs.existsSync(RULES_DIR)) {
      for (const dir of fs.readdirSync(RULES_DIR)) {
        const dirPath = path.join(RULES_DIR, dir);
        if (fs.statSync(dirPath).isDirectory()) {
          for (const f of fs.readdirSync(dirPath)) {
            if (f.endsWith('.md')) available.push(`${dir}/${f.replace('.md', '')}`);
          }
        }
      }
    }
    return { found: false, rule, available_rules: available };
  }

  const content = fs.readFileSync(rulePath, 'utf8');
  return { found: true, rule, content };
}

function buildFullGraph() {
  const graph = {}; // agent → [skills]
  const reverseGraph = {}; // skill → [agents]

  if (!fs.existsSync(AGENTS_DIR)) return { graph, reverseGraph };

  for (const file of fs.readdirSync(AGENTS_DIR)) {
    if (!file.endsWith('.md')) continue;
    const agentName = file.replace('.md', '');
    try {
      const content = fs.readFileSync(path.join(AGENTS_DIR, file), 'utf8');
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      if (!fmMatch) continue;
      const usesMatch = fmMatch[1].match(/^uses_skills:\s*(.+)$/m);
      if (!usesMatch) continue;
      let skills = [];
      const raw = usesMatch[1].trim();
      if (raw.startsWith('[')) {
        skills = raw.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
      } else {
        const listMatch = fmMatch[1].match(/^uses_skills:\s*\n((?:\s+-\s+\S+\n?)+)/m);
        if (listMatch) {
          skills = listMatch[1].split('\n').map(l => l.trim().replace(/^-\s+/, '').replace(/^["']|["']$/g, '')).filter(Boolean);
        }
      }
      if (skills.length === 0) continue;
      graph[agentName] = skills;
      for (const s of skills) {
        if (!reverseGraph[s]) reverseGraph[s] = [];
        reverseGraph[s].push(agentName);
      }
    } catch {
      // Skip unreadable agent files
    }
  }
  return { graph, reverseGraph };
}

function getCachedGraph() {
  const now = Date.now();
  const currentMtime = getAgentsDirMtime();
  const age = now - _graphCache.builtAt;
  if (_graphCache.data && _graphCache.mtime === currentMtime && age < _graphCache.MAX_AGE_MS) {
    return _graphCache.data;
  }
  const built = buildFullGraph();
  _graphCache.data = built;
  _graphCache.mtime = currentMtime;
  _graphCache.builtAt = now;
  return built;
}

function handleGetComponentGraph({ agent, skill } = {}) {
  if (!fs.existsSync(AGENTS_DIR)) {
    return { error: 'agents/ directory not found', agents_dir: AGENTS_DIR };
  }

  const { graph, reverseGraph } = getCachedGraph();

  // Apply filters if requested
  const filteredGraph = agent ? (graph[agent] ? { [agent]: graph[agent] } : {}) : graph;

  // Filter reverse graph by skill if requested
  const filteredReverse = skill ? { [skill]: reverseGraph[skill] || [] } : reverseGraph;

  return {
    agents: Object.keys(filteredGraph).length,
    skills_referenced: Object.keys(reverseGraph).length,
    agent_to_skills: filteredGraph,
    skill_to_agents: filteredReverse,
    cached: true,
  };
}


function handleGetHealthStatus({ check = 'all' } = {}) {
  const claudeDir = path.join(os.homedir(), '.claude');
  const clarcDir = path.join(os.homedir(), '.clarc');
  const results = {};

  // Symlink checks
  if (check === 'all' || check === 'symlinks') {
    const targets = ['agents', 'skills', 'commands', 'hooks', 'rules'];
    const symlinks = {};
    for (const t of targets) {
      const p = path.join(claudeDir, t);
      try {
        const stat = fs.lstatSync(p);
        symlinks[t] = stat.isSymbolicLink() ? 'symlink' : stat.isDirectory() ? 'directory' : 'other';
      } catch {
        symlinks[t] = 'missing';
      }
    }
    results.symlinks = symlinks;
  }

  // Hook registration check
  if (check === 'all' || check === 'hooks') {
    const hooksFile = path.join(claudeDir, 'hooks', 'hooks.json');
    const clarcHooks = path.join(clarcDir, 'hooks', 'hooks.json');
    results.hooks = {
      claude_hooks_file: fs.existsSync(hooksFile) ? 'present' : 'missing',
      clarc_hooks_file: fs.existsSync(clarcHooks) ? 'present' : 'missing'
    };
  }

  // INDEX.md freshness check
  if (check === 'all' || check === 'index') {
    const indexFile = path.join(SKILLS_DIR, 'INDEX.md');
    if (fs.existsSync(indexFile)) {
      const stat = fs.statSync(indexFile);
      const ageHours = (Date.now() - stat.mtimeMs) / 3600000;
      results.index = {
        present: true,
        age_hours: Math.round(ageHours),
        stale: ageHours > 168 // stale if > 1 week
      };
    } else {
      results.index = { present: false };
    }
  }

  // Overall health
  const issues = [];
  if (results.symlinks) {
    for (const [k, v] of Object.entries(results.symlinks)) {
      if (v === 'missing') issues.push(`${k} symlink missing`);
    }
  }
  if (results.hooks?.claude_hooks_file === 'missing') issues.push('hooks.json not registered in ~/.claude/');
  if (results.index?.stale) issues.push('skills/INDEX.md is stale (> 7 days)');
  if (!results.index?.present) issues.push('skills/INDEX.md missing');

  return {
    healthy: issues.length === 0,
    issues,
    checks: results
  };
}

// ─── MCP Server setup ──────────────────────────────────────────────────────

const server = new Server({ name: 'clarc', version: '1.0.0' }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async request => {
  const { name, arguments: args } = request.params;

  try {
    let result;
    switch (name) {
      case 'get_instinct_status':
        result = handleGetInstinctStatus(args);
        break;
      case 'get_session_context':
        result = handleGetSessionContext(args);
        break;
      case 'get_project_context':
        result = handleGetProjectContext(args);
        break;
      case 'skill_search':
        result = handleSkillSearch(args);
        break;
      case 'get_component_graph':
        result = handleGetComponentGraph(args);
        break;
      case 'get_health_status':
        result = handleGetHealthStatus(args);
        break;
      case 'agent_describe':
        result = handleAgentDescribe(args);
        break;
      case 'rule_check':
        result = handleRuleCheck(args);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    };
  } catch (err) {
    return {
      content: [{ type: 'text', text: `Error: ${err.message}` }],
      isError: true
    };
  }
});

// ─── Start server ──────────────────────────────────────────────────────────

const transport = new StdioServerTransport();
await server.connect(transport);
