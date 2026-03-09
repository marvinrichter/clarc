#!/usr/bin/env node
/**
 * generate-hub.js — Static site generator for the clarc Hub
 *
 * Reads agents/*.md, skills/*\/SKILL.md, commands/*.md and generates
 * a static, searchable HTML site in docs/hub/.
 *
 * Usage:
 *   node scripts/ci/generate-hub.js
 *   node scripts/ci/generate-hub.js --out /custom/output/dir
 *
 * Output structure:
 *   docs/hub/
 *   ├── index.html          — Homepage with search + featured items
 *   ├── agents.html         — All agents
 *   ├── skills.html         — All skills
 *   ├── commands.html       — All commands
 *   ├── style.css           — Base styles
 *   ├── search.js           — Client-side search (Fuse.js)
 *   └── data/
 *       ├── agents.json
 *       ├── skills.json
 *       └── commands.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const DEFAULT_OUT = path.join(ROOT, 'docs', 'hub');

// ─── Parsers ─────────────────────────────────────────────────────────────────

function parseFrontmatter(content) {
  if (!content.startsWith('---')) return { meta: {}, body: content };
  const end = content.indexOf('\n---', 3);
  if (end === -1) return { meta: {}, body: content };

  const yaml = content.slice(3, end);
  const body = content.slice(end + 4).trim();
  const meta = {};
  let currentArrayKey = null;

  for (const line of yaml.split('\n')) {
    // YAML array item:  "  - value"
    if (/^\s{2}-\s+/.test(line) && currentArrayKey) {
      const val = line.replace(/^\s{2}-\s+/, '').trim();
      if (!Array.isArray(meta[currentArrayKey])) meta[currentArrayKey] = [];
      meta[currentArrayKey].push(val);
      continue;
    }

    const colon = line.indexOf(':');
    if (colon === -1) continue;
    currentArrayKey = null;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    // Strip surrounding quotes
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    // Handle JSON arrays like ["Read", "Write"]
    if (value.startsWith('[')) {
      try { value = JSON.parse(value); } catch { /* keep as string */ }
    }
    // Blank value after key — might be followed by YAML array items
    if (value === '') currentArrayKey = key;
    meta[key] = value || null;
  }

  return { meta, body };
}

function extractWhenToUse(body) {
  // Extract "When to Activate" or "When to Use" section
  const match = body.match(/##\s+When to (?:Activate|Use)\s*\n([\s\S]*?)(?=\n##|\n---|\n$|$)/i);
  if (!match) return '';
  return match[1].trim().split('\n').slice(0, 3).join(' ').replace(/[*_`]/g, '').trim();
}

function extractDescription(meta, body) {
  if (meta.description) return meta.description;
  // First non-empty paragraph from body
  const lines = body.split('\n');
  for (const line of lines) {
    const clean = line.trim().replace(/^#+\s*/, '').replace(/[*_`]/g, '');
    if (clean.length > 30) return clean.slice(0, 200);
  }
  return '';
}

// ─── Data collectors ─────────────────────────────────────────────────────────

function collectAgents() {
  const agentsDir = path.join(ROOT, 'agents');
  if (!fs.existsSync(agentsDir)) return [];

  return fs.readdirSync(agentsDir)
    .filter(f => f.endsWith('.md'))
    .map(filename => {
      const content = fs.readFileSync(path.join(agentsDir, filename), 'utf8');
      const { meta, body } = parseFrontmatter(content);
      const name = meta.name || filename.replace('.md', '');

      // Infer category from name
      const category = inferCategory(name, 'agent');

      const usesSkills = Array.isArray(meta.uses_skills) ? meta.uses_skills : [];
      return {
        name,
        description: extractDescription(meta, body),
        tools: Array.isArray(meta.tools) ? meta.tools : [],
        model: meta.model || 'sonnet',
        usesSkills,
        category,
        whenToUse: extractWhenToUse(body),
        installCmd: `npx github:marvinrichter/clarc --install-agent ${name}`,
        sourceUrl: `https://github.com/marvinrichter/clarc/blob/main/agents/${filename}`,
        filename,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function collectSkills() {
  const skillsDir = path.join(ROOT, 'skills');
  if (!fs.existsSync(skillsDir)) return [];

  const skills = [];
  for (const dir of fs.readdirSync(skillsDir)) {
    const skillFile = path.join(skillsDir, dir, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;

    const content = fs.readFileSync(skillFile, 'utf8');
    const { meta, body } = parseFrontmatter(content);
    const name = meta.name || dir;
    const category = inferCategory(name, 'skill');

    skills.push({
      name,
      description: extractDescription(meta, body),
      category,
      whenToUse: extractWhenToUse(body),
      usedByAgents: [], // populated in main() after agents are collected
      installCmd: `npx github:marvinrichter/clarc --install-skill ${name}`,
      sourceUrl: `https://github.com/marvinrichter/clarc/blob/main/skills/${dir}/SKILL.md`,
      dir,
    });
  }

  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

function collectCommands() {
  const commandsDir = path.join(ROOT, 'commands');
  if (!fs.existsSync(commandsDir)) return [];

  return fs.readdirSync(commandsDir)
    .filter(f => f.endsWith('.md'))
    .map(filename => {
      const content = fs.readFileSync(path.join(commandsDir, filename), 'utf8');
      const { meta, body } = parseFrontmatter(content);
      const name = filename.replace('.md', '');
      const category = inferCategory(name, 'command');

      return {
        name,
        slash: `/${name}`,
        description: extractDescription(meta, body),
        category,
        whenToUse: extractWhenToUse(body),
        sourceUrl: `https://github.com/marvinrichter/clarc/blob/main/commands/${filename}`,
        filename,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ─── Category inference ───────────────────────────────────────────────────────

const CATEGORY_PATTERNS = [
  { pattern: /review|reviewer/, category: 'Code Review' },
  { pattern: /test|tdd|spec/, category: 'Testing' },
  { pattern: /security|auth|zero.?trust/, category: 'Security' },
  { pattern: /typescript|javascript|react|nextjs|frontend/, category: 'TypeScript / Frontend' },
  { pattern: /python|django|fastapi|flask/, category: 'Python' },
  { pattern: /go\b|golang/, category: 'Go' },
  { pattern: /rust/, category: 'Rust' },
  { pattern: /java\b|spring|kotlin|android/, category: 'Java / JVM' },
  { pattern: /swift|ios|swiftui/, category: 'Swift / iOS' },
  { pattern: /ruby|rails/, category: 'Ruby' },
  { pattern: /elixir|phoenix|otp/, category: 'Elixir' },
  { pattern: /cpp|c\+\+/, category: 'C / C++' },
  { pattern: /php/, category: 'PHP' },
  { pattern: /sql|database|postgres|migration/, category: 'Database' },
  { pattern: /docker|kubernetes|k8s|terraform|gitops|infra/, category: 'Infrastructure' },
  { pattern: /ci|cd|deploy|release|build/, category: 'CI / CD' },
  { pattern: /agent|orchestrat|multi.?agent/, category: 'AI / Agents' },
  { pattern: /skill|command|hook|rule/, category: 'clarc System' },
  { pattern: /plan|architect|design|ddd|domain/, category: 'Architecture' },
  { pattern: /doc|readme|changelog|onboard/, category: 'Documentation' },
  { pattern: /perf|profil|optim/, category: 'Performance' },
  { pattern: /api|graphql|rest|grpc|webhook/, category: 'API Design' },
  { pattern: /observ|monitor|log|slo|sli/, category: 'Observability' },
  { pattern: /product|idea|discover|prd|roadmap/, category: 'Product' },
  { pattern: /git|commit|pr\b|branch/, category: 'Git Workflow' },
];

function inferCategory(name, _type) {
  const lower = name.toLowerCase();
  for (const { pattern, category } of CATEGORY_PATTERNS) {
    if (pattern.test(lower)) return category;
  }
  return 'General';
}

// ─── HTML helpers ─────────────────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function categoryBadge(category) {
  return `<span class="badge">${escapeHtml(category)}</span>`;
}

function skillPills(skills) {
  if (!skills || skills.length === 0) return '';
  const pills = skills.map(s => `<span class="skill-pill">${escapeHtml(s)}</span>`).join('');
  return `<div class="skill-pills"><span class="deps-label">uses:</span>${pills}</div>`;
}

function usedBySection(agents) {
  if (!agents || agents.length === 0) return '';
  const pills = agents.map(a => `<span class="agent-pill">${escapeHtml(a)}</span>`).join('');
  return `<div class="skill-pills"><span class="deps-label">used by:</span>${pills}</div>`;
}

function agentCard(agent) {
  return `
<div class="card" data-name="${escapeHtml(agent.name)}" data-category="${escapeHtml(agent.category)}">
  <div class="card-header">
    <h3 class="card-name">${escapeHtml(agent.name)}</h3>
    ${categoryBadge(agent.category)}
  </div>
  <p class="card-desc">${escapeHtml(agent.description)}</p>
  ${agent.whenToUse ? `<p class="card-when"><strong>When:</strong> ${escapeHtml(agent.whenToUse)}</p>` : ''}
  ${skillPills(agent.usesSkills)}
  <div class="card-footer">
    <span class="model-badge">${escapeHtml(agent.model)}</span>
    <a href="${escapeHtml(agent.sourceUrl)}" target="_blank" class="btn-ghost">Source</a>
  </div>
</div>`;
}

function skillCard(skill) {
  return `
<div class="card" data-name="${escapeHtml(skill.name)}" data-category="${escapeHtml(skill.category)}">
  <div class="card-header">
    <h3 class="card-name">${escapeHtml(skill.name)}</h3>
    ${categoryBadge(skill.category)}
  </div>
  <p class="card-desc">${escapeHtml(skill.description)}</p>
  ${skill.whenToUse ? `<p class="card-when"><strong>When:</strong> ${escapeHtml(skill.whenToUse)}</p>` : ''}
  ${usedBySection(skill.usedByAgents)}
  <div class="card-footer">
    <a href="${escapeHtml(skill.sourceUrl)}" target="_blank" class="btn-ghost">Source</a>
  </div>
</div>`;
}

function commandCard(cmd) {
  return `
<div class="card" data-name="${escapeHtml(cmd.name)}" data-category="${escapeHtml(cmd.category)}">
  <div class="card-header">
    <h3 class="card-name"><code>${escapeHtml(cmd.slash)}</code></h3>
    ${categoryBadge(cmd.category)}
  </div>
  <p class="card-desc">${escapeHtml(cmd.description)}</p>
  ${cmd.whenToUse ? `<p class="card-when"><strong>When:</strong> ${escapeHtml(cmd.whenToUse)}</p>` : ''}
  <div class="card-footer">
    <a href="${escapeHtml(cmd.sourceUrl)}" target="_blank" class="btn-ghost">Source</a>
  </div>
</div>`;
}

// ─── Page templates ───────────────────────────────────────────────────────────

const CSS = `/* clarc Hub — base styles */
:root {
  --bg: #0d1117;
  --surface: #161b22;
  --border: #30363d;
  --text: #e6edf3;
  --muted: #8b949e;
  --accent: #58a6ff;
  --green: #3fb950;
  --badge-bg: #1f2937;
  --badge-text: #93c5fd;
  --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: var(--bg); color: var(--text); font-family: var(--font); line-height: 1.6; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }

/* Layout */
.container { max-width: 1200px; margin: 0 auto; padding: 0 1.5rem; }
header { border-bottom: 1px solid var(--border); padding: 1rem 0; }
.nav { display: flex; align-items: center; gap: 2rem; }
.nav-brand { font-weight: 700; font-size: 1.2rem; color: var(--text); }
.nav-links { display: flex; gap: 1.5rem; }
.nav-links a { color: var(--muted); font-size: 0.9rem; }
.nav-links a:hover, .nav-links a.active { color: var(--text); }
.hero { padding: 3rem 0 2rem; text-align: center; }
.hero h1 { font-size: 2.5rem; font-weight: 700; margin-bottom: 0.5rem; }
.hero p { color: var(--muted); font-size: 1.1rem; margin-bottom: 1.5rem; }
.stats { display: flex; gap: 2rem; justify-content: center; margin-bottom: 2rem; }
.stat { text-align: center; }
.stat-num { font-size: 2rem; font-weight: 700; color: var(--accent); }
.stat-label { color: var(--muted); font-size: 0.85rem; }

/* Search */
.search-bar { display: flex; justify-content: center; margin-bottom: 2rem; }
.search-bar input {
  width: 100%; max-width: 600px; padding: 0.75rem 1rem;
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; color: var(--text); font-size: 1rem; outline: none;
}
.search-bar input:focus { border-color: var(--accent); }

/* Filter tabs */
.filter-tabs { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
.filter-btn {
  padding: 0.35rem 0.85rem; border-radius: 20px; border: 1px solid var(--border);
  background: var(--surface); color: var(--muted); font-size: 0.8rem; cursor: pointer;
}
.filter-btn:hover, .filter-btn.active { border-color: var(--accent); color: var(--accent); background: rgba(88,166,255,0.1); }

/* Cards */
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; padding-bottom: 3rem; }
.card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; padding: 1.25rem; transition: border-color 0.15s;
}
.card:hover { border-color: var(--accent); }
.card.hidden { display: none; }
.card-header { display: flex; align-items: flex-start; gap: 0.5rem; margin-bottom: 0.5rem; flex-wrap: wrap; }
.card-name { font-size: 0.95rem; font-weight: 600; color: var(--text); }
.card-desc { color: var(--muted); font-size: 0.85rem; margin-bottom: 0.5rem; }
.card-when { color: var(--muted); font-size: 0.8rem; margin-bottom: 0.75rem; }
.card-footer { display: flex; align-items: center; gap: 0.75rem; margin-top: auto; }

/* Badges */
.badge {
  padding: 0.2rem 0.55rem; border-radius: 12px;
  background: var(--badge-bg); color: var(--badge-text); font-size: 0.7rem;
  white-space: nowrap;
}
.model-badge { color: var(--green); font-size: 0.75rem; }
.btn-ghost { color: var(--muted); font-size: 0.8rem; border: 1px solid var(--border); padding: 0.2rem 0.6rem; border-radius: 6px; }
.btn-ghost:hover { color: var(--text); text-decoration: none; }

/* No results */
.no-results { text-align: center; color: var(--muted); padding: 3rem; }

/* Section links on homepage */
.section-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 3rem; }
.section-card {
  background: var(--surface); border: 1px solid var(--border);
  border-radius: 8px; padding: 1.5rem; text-align: center; transition: border-color 0.15s;
}
.section-card:hover { border-color: var(--accent); text-decoration: none; }
.section-card h2 { font-size: 1.5rem; color: var(--accent); margin-bottom: 0.25rem; }
.section-card p { color: var(--muted); font-size: 0.9rem; }
.section-card .count { font-size: 2rem; font-weight: 700; color: var(--text); }

code { background: var(--badge-bg); padding: 0.15em 0.4em; border-radius: 4px; font-size: 0.9em; }

/* Dependency pills */
.skill-pills { display: flex; flex-wrap: wrap; gap: 0.3rem; align-items: center; margin: 0.4rem 0 0.5rem; }
.deps-label { color: var(--muted); font-size: 0.72rem; margin-right: 0.15rem; white-space: nowrap; }
.skill-pill {
  padding: 0.15rem 0.5rem; border-radius: 10px; font-size: 0.7rem;
  background: rgba(88,166,255,0.1); color: var(--accent); border: 1px solid rgba(88,166,255,0.25);
}
.agent-pill {
  padding: 0.15rem 0.5rem; border-radius: 10px; font-size: 0.7rem;
  background: rgba(63,185,80,0.1); color: var(--green); border: 1px solid rgba(63,185,80,0.25);
}

@media (max-width: 600px) {
  .section-cards { grid-template-columns: 1fr; }
  .hero h1 { font-size: 1.8rem; }
  .stats { gap: 1.5rem; }
}
`;

const SEARCH_JS = `/* clarc Hub — client-side search + filter */
/* eslint-disable no-undef */
(function () {
  const searchInput = document.getElementById('search');
  const filterBtns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.card');
  const noResults = document.getElementById('no-results');

  let activeFilter = 'all';
  let searchQuery = '';

  function applyFilters() {
    let visible = 0;
    cards.forEach(card => {
      const name = (card.dataset.name || '').toLowerCase();
      const category = (card.dataset.category || '').toLowerCase();
      const desc = (card.querySelector('.card-desc')?.textContent || '').toLowerCase();
      const when = (card.querySelector('.card-when')?.textContent || '').toLowerCase();

      const matchesSearch = !searchQuery ||
        name.includes(searchQuery) ||
        desc.includes(searchQuery) ||
        when.includes(searchQuery);

      const matchesFilter = activeFilter === 'all' ||
        category === activeFilter.toLowerCase();

      if (matchesSearch && matchesFilter) {
        card.classList.remove('hidden');
        visible++;
      } else {
        card.classList.add('hidden');
      }
    });

    if (noResults) {
      noResults.style.display = visible === 0 ? 'block' : 'none';
    }
  }

  if (searchInput) {
    searchInput.addEventListener('input', e => {
      searchQuery = e.target.value.toLowerCase().trim();
      applyFilters();
    });
  }

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.dataset.filter || 'all';
      applyFilters();
    });
  });
})();
`;

function navHtml(activePage) {
  const pages = [
    { href: 'index.html', label: 'Home' },
    { href: 'agents.html', label: 'Agents' },
    { href: 'skills.html', label: 'Skills' },
    { href: 'commands.html', label: 'Commands' },
  ];
  const links = pages.map(p =>
    `<a href="${p.href}"${activePage === p.href ? ' class="active"' : ''}>${p.label}</a>`
  ).join('\n        ');

  return `<header>
  <div class="container">
    <nav class="nav">
      <span class="nav-brand">clarc hub</span>
      <div class="nav-links">
        ${links}
      </div>
    </nav>
  </div>
</header>`;
}

function categoryFilters(items) {
  const counts = {};
  for (const item of items) {
    counts[item.category] = (counts[item.category] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const btns = sorted.map(([cat, count]) =>
    `<button class="filter-btn" data-filter="${escapeHtml(cat)}">${escapeHtml(cat)} <small>(${count})</small></button>`
  ).join('\n  ');

  return `<div class="filter-tabs">
  <button class="filter-btn active" data-filter="all">All</button>
  ${btns}
</div>`;
}

function buildPage(title, activePage, bodyContent) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} — clarc hub</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
${navHtml(activePage)}
${bodyContent}
<script src="search.js"></script>
</body>
</html>`;
}

function buildIndexPage(agents, skills, commands) {
  const body = `
<main>
  <div class="container">
    <section class="hero">
      <h1>clarc hub</h1>
      <p>The workflow OS for Claude Code — agents, skills, and commands for production engineering.</p>
      <div class="stats">
        <div class="stat"><div class="stat-num">${agents.length}</div><div class="stat-label">Agents</div></div>
        <div class="stat"><div class="stat-num">${skills.length}</div><div class="stat-label">Skills</div></div>
        <div class="stat"><div class="stat-num">${commands.length}</div><div class="stat-label">Commands</div></div>
      </div>
      <div class="search-bar">
        <input id="search" type="search" placeholder="Search agents, skills, commands..." aria-label="Search">
      </div>
    </section>

    <div class="section-cards">
      <a href="agents.html" class="section-card">
        <div class="count">${agents.length}</div>
        <h2>Agents</h2>
        <p>Specialized subagents for code review, planning, testing, and more.</p>
      </a>
      <a href="skills.html" class="section-card">
        <div class="count">${skills.length}</div>
        <h2>Skills</h2>
        <p>Deep workflow patterns for frameworks, languages, and engineering practices.</p>
      </a>
      <a href="commands.html" class="section-card">
        <div class="count">${commands.length}</div>
        <h2>Commands</h2>
        <p>Slash commands that activate skills and agents in Claude Code.</p>
      </a>
    </div>

    <section>
      <h2 style="margin-bottom:1rem">Featured Agents</h2>
      <div class="grid" id="featured-agents">
        ${agents.slice(0, 6).map(agentCard).join('')}
      </div>
      <div style="text-align:center;margin-bottom:2rem">
        <a href="agents.html">View all ${agents.length} agents →</a>
      </div>
    </section>
  </div>
</main>`;
  return buildPage('Home', 'index.html', body);
}

function buildAgentsPage(agents) {
  const body = `
<main>
  <div class="container">
    <div class="hero" style="padding-bottom:1rem">
      <h1>${agents.length} Agents</h1>
      <p>Specialized subagents delegated by Claude Code for specific engineering tasks.</p>
      <div class="search-bar">
        <input id="search" type="search" placeholder="Search agents..." aria-label="Search agents">
      </div>
    </div>
    ${categoryFilters(agents)}
    <div class="grid">${agents.map(agentCard).join('')}</div>
    <div class="no-results" id="no-results" style="display:none">No agents match your search.</div>
  </div>
</main>`;
  return buildPage(`${agents.length} Agents`, 'agents.html', body);
}

function buildSkillsPage(skills) {
  const body = `
<main>
  <div class="container">
    <div class="hero" style="padding-bottom:1rem">
      <h1>${skills.length} Skills</h1>
      <p>Deep workflow patterns for frameworks, languages, and engineering practices.</p>
      <div class="search-bar">
        <input id="search" type="search" placeholder="Search skills..." aria-label="Search skills">
      </div>
    </div>
    ${categoryFilters(skills)}
    <div class="grid">${skills.map(skillCard).join('')}</div>
    <div class="no-results" id="no-results" style="display:none">No skills match your search.</div>
  </div>
</main>`;
  return buildPage(`${skills.length} Skills`, 'skills.html', body);
}

function buildCommandsPage(commands) {
  const body = `
<main>
  <div class="container">
    <div class="hero" style="padding-bottom:1rem">
      <h1>${commands.length} Commands</h1>
      <p>Slash commands that activate skills and agents directly in Claude Code.</p>
      <div class="search-bar">
        <input id="search" type="search" placeholder="Search commands..." aria-label="Search commands">
      </div>
    </div>
    ${categoryFilters(commands)}
    <div class="grid">${commands.map(commandCard).join('')}</div>
    <div class="no-results" id="no-results" style="display:none">No commands match your search.</div>
  </div>
</main>`;
  return buildPage(`${commands.length} Commands`, 'commands.html', body);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  const outIdx = args.indexOf('--out');
  const outDir = outIdx !== -1 ? args[outIdx + 1] : DEFAULT_OUT;

  console.log('[generate-hub] Collecting data...');
  const agents = collectAgents();
  const skills = collectSkills();
  const commands = collectCommands();

  // Build skill→agents reverse map from uses_skills declarations
  const skillToAgents = new Map();
  for (const agent of agents) {
    for (const skill of agent.usesSkills) {
      if (!skillToAgents.has(skill)) skillToAgents.set(skill, []);
      skillToAgents.get(skill).push(agent.name);
    }
  }
  for (const skill of skills) {
    skill.usedByAgents = (skillToAgents.get(skill.name) || []).sort();
  }

  console.log(`[generate-hub] Found: ${agents.length} agents, ${skills.length} skills, ${commands.length} commands`);

  // Ensure output dirs
  const dataDir = path.join(outDir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  // Write JSON data files
  fs.writeFileSync(path.join(dataDir, 'agents.json'), JSON.stringify(agents, null, 2));
  fs.writeFileSync(path.join(dataDir, 'skills.json'), JSON.stringify(skills, null, 2));
  fs.writeFileSync(path.join(dataDir, 'commands.json'), JSON.stringify(commands, null, 2));

  // Write CSS + JS
  fs.writeFileSync(path.join(outDir, 'style.css'), CSS);
  fs.writeFileSync(path.join(outDir, 'search.js'), SEARCH_JS);

  // Write HTML pages
  fs.writeFileSync(path.join(outDir, 'index.html'), buildIndexPage(agents, skills, commands));
  fs.writeFileSync(path.join(outDir, 'agents.html'), buildAgentsPage(agents));
  fs.writeFileSync(path.join(outDir, 'skills.html'), buildSkillsPage(skills));
  fs.writeFileSync(path.join(outDir, 'commands.html'), buildCommandsPage(commands));

  console.log(`[generate-hub] Done! Output: ${outDir}`);
  console.log(`[generate-hub] Files written: index.html, agents.html, skills.html, commands.html, style.css, search.js + data/*.json`);
}

main();
