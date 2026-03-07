#!/usr/bin/env node
/**
 * clarc MCP Server — exposes clarc state as MCP tools.
 *
 * Tools:
 *   get_instinct_status   — current instincts + confidence (project + global)
 *   get_session_context   — latest session snapshot
 *   get_skill_index       — skill catalog, optionally filtered by domain/language
 *   get_project_context   — detected project type + relevant skills
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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOMUNCULUS_DIR = path.join(os.homedir(), '.claude', 'homunculus');
const SESSIONS_DIR = path.join(os.homedir(), '.claude', 'projects');
const SKILLS_INDEX = path.join(__dirname, '..', 'skills', 'INDEX.md');

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
    name: 'get_skill_index',
    description: 'Returns the clarc skill catalog. Can be filtered by language or domain.',
    inputSchema: {
      type: 'object',
      properties: {
        language: {
          type: 'string',
          description: 'Filter by language (e.g., "python", "typescript", "ruby", "elixir")'
        },
        domain: {
          type: 'string',
          description: 'Filter by domain section (e.g., "testing", "security", "architecture")'
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

function handleGetSkillIndex({ language, domain } = {}) {
  if (!fs.existsSync(SKILLS_INDEX)) {
    return { found: false, message: 'skills/INDEX.md not found. Run: node scripts/ci/validate-skills.js --generate-index' };
  }

  let content = fs.readFileSync(SKILLS_INDEX, 'utf8');

  // Filter by language if specified
  if (language) {
    const langLower = language.toLowerCase();
    const sections = content.split('\n## ');
    const relevant = sections.filter(s => s.toLowerCase().includes(langLower) || s.startsWith('# '));
    content = relevant.join('\n## ');
  }

  // Filter by domain if specified
  if (domain) {
    const domainLower = domain.toLowerCase();
    const sections = content.split('\n## ');
    const relevant = sections.filter(s => s.toLowerCase().includes(domainLower) || s.startsWith('# '));
    content = relevant.join('\n## ');
  }

  return { found: true, content };
}

function handleGetProjectContext({ cwd } = {}) {
  const projectDir = cwd || process.env.CLAUDE_WORKDIR || process.cwd();

  // Import project detection (dynamic import for ES module compat)
  try {
    const detectModule = path.join(__dirname, '..', 'scripts', 'lib', 'project-detect.js');
    // Use synchronous approach: read project files directly
    const result = detectProjectTypeSync(projectDir);
    return result;
  } catch (err) {
    return { error: err.message, cwd: projectDir };
  }
}

function detectProjectTypeSync(dir) {
  const languages = [];
  const frameworks = [];
  const markers = {
    typescript: ['tsconfig.json'],
    javascript: ['package.json'],
    python: ['pyproject.toml', 'requirements.txt', 'setup.py'],
    golang: ['go.mod'],
    rust: ['Cargo.toml'],
    ruby: ['Gemfile'],
    java: ['pom.xml', 'build.gradle'],
    elixir: ['mix.exs'],
    swift: ['Package.swift']
  };

  for (const [lang, files] of Object.entries(markers)) {
    if (files.some(f => fs.existsSync(path.join(dir, f)))) {
      languages.push(lang);
    }
  }

  const SKILL_MAP = {
    typescript: ['typescript-patterns', 'typescript-coding-standards'],
    python: ['python-patterns', 'python-testing'],
    golang: ['go-patterns', 'go-testing'],
    ruby: ['ruby-patterns', 'ruby-testing'],
    elixir: ['elixir-patterns', 'elixir-testing'],
    rust: ['rust-patterns', 'rust-testing'],
    java: ['springboot-patterns', 'jpa-patterns']
  };

  const skillSet = new Set();
  for (const lang of languages) {
    for (const skill of SKILL_MAP[lang] || []) skillSet.add(skill);
  }

  return {
    cwd: dir,
    languages,
    frameworks,
    primary: languages[0] || 'unknown',
    relevant_skills: Array.from(skillSet)
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
      case 'get_skill_index':
        result = handleGetSkillIndex(args);
        break;
      case 'get_project_context':
        result = handleGetProjectContext(args);
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
