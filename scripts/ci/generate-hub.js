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

// ─── Category badge helpers ───────────────────────────────────────────────────

const CAT_CLASS = {
  'Code Review': 'cat-b',
  'Testing': 'cat-teal',
  'Security': 'cat-amber',
  'Architecture': 'cat-g',
  'CI / CD': 'cat-v',
  'AI / Agents': 'cat-r',
  'Infrastructure': 'cat-o',
  'Documentation': 'cat-n',
  'Performance': 'cat-y',
  'Product': 'cat-p',
  'General': 'cat-n',
  'TypeScript / Frontend': 'cat-b',
  'Python': 'cat-y',
  'Go': 'cat-teal',
  'Rust': 'cat-o',
  'Java / JVM': 'cat-o',
  'Swift / iOS': 'cat-b',
  'Ruby': 'cat-r',
  'Elixir': 'cat-v',
  'C / C++': 'cat-n',
  'PHP': 'cat-v',
  'Database': 'cat-teal',
  'API Design': 'cat-b',
  'Observability': 'cat-teal',
  'clarc System': 'cat-b',
  'Git Workflow': 'cat-n',
};

function categoryBadgeClass(cat) {
  return CAT_CLASS[cat] || 'cat-n';
}

function categoryBadge(cat) {
  return `<span class="badge ${categoryBadgeClass(cat)}">${escapeHtml(cat)}</span>`;
}

// ─── Card component helpers ───────────────────────────────────────────────────

function skillPills(skills) {
  if (!skills || skills.length === 0) return '';
  const show = skills.slice(0, 3).map(s => `<span class="skill-pill">${escapeHtml(s)}</span>`).join('');
  const more = skills.length > 3 ? `<span class="pill-more">+${skills.length - 3}</span>` : '';
  return `<div class="card-pills"><span class="deps-label">uses:</span>${show}${more}</div>`;
}

function usedBySection(agents) {
  if (!agents || agents.length === 0) return '';
  const show = agents.slice(0, 3).map(a => `<span class="agent-pill">${escapeHtml(a)}</span>`).join('');
  const more = agents.length > 3 ? `<span class="pill-more">+${agents.length - 3}</span>` : '';
  return `<div class="card-pills"><span class="deps-label">used by:</span>${show}${more}</div>`;
}

function modelBadge(model) {
  const raw = (model || 'sonnet').toLowerCase();
  const cls = raw.includes('opus') ? 'opus' : raw.includes('haiku') ? 'haiku' : 'sonnet';
  const label = raw.includes('opus') ? 'opus' : raw.includes('haiku') ? 'haiku' : 'sonnet';
  return `<span class="model-badge ${cls}"><span class="dot"></span>${escapeHtml(label)}</span>`;
}

function agentCard(agent) {
  return `
<div class="card" data-name="${escapeHtml(agent.name)}" data-category="${escapeHtml(agent.category)}">
  <div class="card-header">
    <span class="card-name">${escapeHtml(agent.name)}</span>
    ${categoryBadge(agent.category)}
  </div>
  <p class="card-desc">${escapeHtml(agent.description)}</p>
  ${skillPills(agent.usesSkills)}
  <div class="card-footer">
    ${modelBadge(agent.model)}
    <a href="${escapeHtml(agent.sourceUrl)}" target="_blank" rel="noopener" class="source-btn">Source ↗</a>
  </div>
</div>`;
}

function skillCard(skill) {
  return `
<div class="card" data-name="${escapeHtml(skill.name)}" data-category="${escapeHtml(skill.category)}">
  <div class="card-header">
    <span class="card-name">${escapeHtml(skill.name)}</span>
    ${categoryBadge(skill.category)}
  </div>
  <p class="card-desc">${escapeHtml(skill.description)}</p>
  ${usedBySection(skill.usedByAgents)}
  <div class="card-footer">
    <span class="skill-tag">on-demand skill</span>
    <a href="${escapeHtml(skill.sourceUrl)}" target="_blank" rel="noopener" class="source-btn">Source ↗</a>
  </div>
</div>`;
}

function commandCard(cmd) {
  return `
<div class="card" data-name="${escapeHtml(cmd.name)}" data-category="${escapeHtml(cmd.category)}">
  <div class="card-header">
    <span class="card-slash">${escapeHtml(cmd.slash)}</span>
    ${categoryBadge(cmd.category)}
  </div>
  <p class="card-desc">${escapeHtml(cmd.description)}</p>
  <div class="card-footer">
    <span class="skill-tag">slash command</span>
    <a href="${escapeHtml(cmd.sourceUrl)}" target="_blank" rel="noopener" class="source-btn">Source ↗</a>
  </div>
</div>`;
}

// ─── Navigation & Footer ──────────────────────────────────────────────────────

function navHtml(activePage) {
  const pages = [
    { href: 'agents.html', label: 'Agents' },
    { href: 'skills.html', label: 'Skills' },
    { href: 'commands.html', label: 'Commands' },
  ];
  const links = pages.map(p =>
    `<a href="${p.href}"${activePage === p.href ? ' class="active"' : ''}>${p.label}</a>`
  ).join('');
  return `<header>
  <div class="container">
    <nav class="nav" aria-label="Main navigation">
      <a href="index.html" class="nav-brand">clarc</a>
      <div class="nav-links">${links}</div>
      <a href="https://github.com/marvinrichter/clarc" target="_blank" rel="noopener" class="nav-github">GitHub ↗</a>
    </nav>
  </div>
</header>`;
}

function footerHtml() {
  return `<footer>
  <div class="container">
    <div class="footer-inner">
      <div class="footer-brand">
        <a href="index.html" class="footer-logo">clarc</a>
        <span class="footer-version">v0.9.0</span>
      </div>
      <div class="footer-links">
        <a href="agents.html">Agents</a>
        <a href="skills.html">Skills</a>
        <a href="commands.html">Commands</a>
        <a href="https://github.com/marvinrichter/clarc" target="_blank" rel="noopener">GitHub ↗</a>
      </div>
    </div>
  </div>
</footer>`;
}

// ─── Filter helpers ───────────────────────────────────────────────────────────

function categoryFilters(items) {
  const counts = {};
  for (const item of items) counts[item.category] = (counts[item.category] || 0) + 1;
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const btns = sorted.map(([cat, count]) =>
    `<button class="filter-btn" data-filter="${escapeHtml(cat)}">${escapeHtml(cat)} <span class="count-badge">(${count})</span></button>`
  ).join('');
  return `<div class="filter-scroll"><div class="filter-tabs">
  <button class="filter-btn active" data-filter="all">All <span class="count-badge">(${items.length})</span></button>
  ${btns}
</div></div>`;
}

// ─── Featured agents ──────────────────────────────────────────────────────────

function featuredAgents(agents) {
  const preferred = ['code-reviewer', 'tdd-guide', 'planner', 'security-reviewer', 'architect', 'build-error-resolver'];
  const byName = Object.fromEntries(agents.map(a => [a.name, a]));
  const found = preferred.map(n => byName[n]).filter(Boolean);
  const used = new Set(found.map(a => a.name));
  for (const a of agents) {
    if (found.length >= 6) break;
    if (!used.has(a.name)) { found.push(a); used.add(a.name); }
  }
  return found.slice(0, 6);
}

// ─── Page builder ─────────────────────────────────────────────────────────────

function buildPage(title, activePage, bodyContent, isHome = false) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}${isHome ? '' : ' \u2014 clarc hub'}</title>
  <meta name="description" content="${isHome ? "clarc \u2014 the workflow OS for Claude Code. Install once. Works everywhere." : "clarc \u2014 the workflow OS for Claude Code. " + escapeHtml(title) + "."}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="style.css">
</head>
<body>
${navHtml(activePage)}
<main>${bodyContent}</main>
${footerHtml()}
<script src="search.js"></script>
</body>
</html>`;
}

// ─── Homepage ─────────────────────────────────────────────────────────────────

function buildIndexPage(agents, skills, commands) {
  const featured = featuredAgents(agents);
  const featuredCards = featured.map(agentCard).join('');

  const body = `
<section class="hero-section">
  <div class="container">
    <p class="hero-eyebrow">Workflow OS for Claude Code</p>
    <h1 class="hero-title">Ship better code.<br><span class="accent">Every session.</span></h1>
    <p class="hero-sub">Agents, skills, and commands that make Claude Code production-grade. Install once. Works everywhere.</p>
    <div class="install-cmd">
      <span class="install-prompt">$</span>
      <span>npx github:marvinrichter/clarc typescript</span>
      <button class="copy-btn" onclick="navigator.clipboard.writeText('npx github:marvinrichter/clarc typescript')">copy</button>
    </div>
    <div class="hero-cta">
      <a href="agents.html" class="btn-primary">Browse Agents</a>
      <a href="https://github.com/marvinrichter/clarc" target="_blank" rel="noopener" class="btn-ghost-hero">View on GitHub ↗</a>
    </div>
    <div class="stats-row">
      <div class="stat-block">
        <div class="stat-num">${agents.length}</div>
        <div class="stat-label">Agents</div>
      </div>
      <div class="stat-block">
        <div class="stat-num">${skills.length}</div>
        <div class="stat-label">Skills</div>
      </div>
      <div class="stat-block">
        <div class="stat-num">${commands.length}</div>
        <div class="stat-label">Commands</div>
      </div>
    </div>
  </div>
</section>

<section class="concept-section">
  <div class="container">
    <div class="concept-grid">
      <div class="concept-text">
        <p class="section-eyebrow">How it works</p>
        <h2>Structured intelligence,<br>always in context.</h2>
        <ul class="feature-list">
          <li>
            <span class="feature-arrow">\u2192</span>
            <div>
              <div class="feature-title">Agents route automatically</div>
              <div class="feature-desc">Write Go code \u2192 go-reviewer invoked. Build fails \u2192 build-error-resolver. No config required.</div>
            </div>
          </li>
          <li>
            <span class="feature-arrow">\u2192</span>
            <div>
              <div class="feature-title">Skills load on demand</div>
              <div class="feature-desc">${skills.length} deep workflow patterns. Only active when relevant. Zero context overhead otherwise.</div>
            </div>
          </li>
          <li>
            <span class="feature-arrow">\u2192</span>
            <div>
              <div class="feature-title">Gets better with use</div>
              <div class="feature-desc">Continuous learning flywheel extracts reusable patterns from every session.</div>
            </div>
          </li>
        </ul>
      </div>
      <div class="concept-terminal">
        <div class="terminal">
          <div class="t-bar">
            <span class="t-dot"></span><span class="t-dot"></span><span class="t-dot"></span>
            <span class="t-title">clarc \u2014 zsh</span>
          </div>
          <div class="t-line"><span class="t-prompt">$</span> <span class="t-cmd">npx github:marvinrichter/clarc typescript</span></div>
          <div class="t-out"><span class="t-ok">\u2713</span> clarc v0.9.0 installed</div>
          <div class="t-out"><span class="t-ok">\u2713</span> ${agents.length} agents \u2192 ~/.claude/agents/</div>
          <div class="t-out"><span class="t-ok">\u2713</span> ${skills.length} skills \u2192 ~/.claude/skills/</div>
          <div class="t-out"><span class="t-ok">\u2713</span> TypeScript rules active</div>
          <div class="t-out"><span class="t-ok">\u2713</span> Hooks wired</div>
          <div class="t-line" style="margin-top:12px"><span class="t-prompt">$</span> <span class="t-cmd">/tdd UserService</span></div>
          <div class="t-out"><span class="t-blue">tdd-guide</span> invoked \u2192 writing tests first\u2026</div>
          <div class="t-out"><span class="t-ok">RED</span> \u2192 <span class="t-ok">GREEN</span> \u2192 <span class="t-ok">REFACTOR</span> \u2713</div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="catalog-section">
  <div class="container">
    <div class="catalog-grid">
      <a href="agents.html" class="catalog-card">
        <div class="catalog-count">${agents.length}</div>
        <div class="catalog-name">Agents</div>
        <div class="catalog-desc">Specialized subagents for code review, planning, testing, security, and more. Invoked automatically.</div>
        <div class="catalog-link">Browse agents \u2192</div>
      </a>
      <a href="skills.html" class="catalog-card">
        <div class="catalog-count">${skills.length}</div>
        <div class="catalog-name">Skills</div>
        <div class="catalog-desc">Deep workflow patterns for frameworks, languages, and engineering practices. Loaded on demand.</div>
        <div class="catalog-link">Browse skills \u2192</div>
      </a>
      <a href="commands.html" class="catalog-card">
        <div class="catalog-count">${commands.length}</div>
        <div class="catalog-name">Commands</div>
        <div class="catalog-desc">Slash commands that activate agents and skills directly in Claude Code. Use in any conversation.</div>
        <div class="catalog-link">Browse commands \u2192</div>
      </a>
    </div>
  </div>
</section>

<section class="featured-section">
  <div class="container">
    <div class="section-header">
      <h2 class="section-title">Featured Agents</h2>
      <a href="agents.html" class="section-link">View all ${agents.length} \u2192</a>
    </div>
    <div class="grid">${featuredCards}</div>
  </div>
</section>

<section class="cta-section">
  <div class="container">
    <h2>Start in 30 seconds.</h2>
    <p class="cta-sub">Pick your stack and install. Updates via git pull.</p>
    <div class="install-cmd">
      <span class="install-prompt">$</span>
      <span>npx github:marvinrichter/clarc typescript</span>
      <button class="copy-btn" onclick="navigator.clipboard.writeText('npx github:marvinrichter/clarc typescript')">copy</button>
    </div>
    <div class="variants-row">
      <code>typescript</code>
      <code>python</code>
      <code>golang</code>
      <code>swift</code>
      <code>java</code>
    </div>
  </div>
</section>`;

  return buildPage('clarc — Workflow OS for Claude Code', 'index.html', body, true);
}

// ─── Catalog pages ────────────────────────────────────────────────────────────

function buildAgentsPage(agents) {
  const body = `
<section class="page-header">
  <div class="container">
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="index.html">clarc</a> / <span aria-current="page">Agents</span></nav>
    <h1 class="page-title">Agents <span class="page-count">${agents.length} total</span></h1>
    <p class="page-desc">Specialized subagents delegated by Claude Code for code review, architecture, testing, security, and more.</p>
  </div>
</section>
<section class="search-section">
  <div class="container">
    <div class="search-wrap">
      <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <input id="search" type="search" class="search-input" placeholder="Search ${agents.length} agents\u2026" autocomplete="off">
      <kbd class="search-kbd">\u2318K</kbd>
    </div>
  </div>
</section>
<section class="filter-section">
  <div class="container">
    ${categoryFilters(agents)}
  </div>
</section>
<section class="grid-section">
  <div class="container">
    <p class="grid-meta" id="grid-meta" aria-live="polite" aria-atomic="true">${agents.length} total \u00b7 A\u2013Z</p>
    <div class="grid">${agents.map(agentCard).join('')}</div>
    <div class="no-results" id="no-results" style="display:none">
      <div class="no-results-icon" aria-hidden="true">\u2298</div>
      <h3>No results</h3>
      <p>Try a different search term or <button class="clear-search" onclick="document.getElementById('search').value='';document.getElementById('search').dispatchEvent(new Event('input'))">clear search</button></p>
    </div>
  </div>
</section>`;
  return buildPage(`${agents.length} Agents`, 'agents.html', body);
}

function buildSkillsPage(skills) {
  const body = `
<section class="page-header">
  <div class="container">
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="index.html">clarc</a> / <span aria-current="page">Skills</span></nav>
    <h1 class="page-title">Skills <span class="page-count">${skills.length} total</span></h1>
    <p class="page-desc">Deep workflow patterns for frameworks, languages, and engineering practices. Loaded on demand \u2014 zero context overhead when inactive.</p>
  </div>
</section>
<section class="search-section">
  <div class="container">
    <div class="search-wrap">
      <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <input id="search" type="search" class="search-input" placeholder="Search ${skills.length} skills\u2026" autocomplete="off">
      <kbd class="search-kbd">\u2318K</kbd>
    </div>
  </div>
</section>
<section class="filter-section">
  <div class="container">
    ${categoryFilters(skills)}
  </div>
</section>
<section class="grid-section">
  <div class="container">
    <p class="grid-meta" id="grid-meta" aria-live="polite" aria-atomic="true">${skills.length} total \u00b7 A\u2013Z</p>
    <div class="grid">${skills.map(skillCard).join('')}</div>
    <div class="no-results" id="no-results" style="display:none">
      <div class="no-results-icon" aria-hidden="true">\u2298</div>
      <h3>No results</h3>
      <p>Try a different search term or <button class="clear-search" onclick="document.getElementById('search').value='';document.getElementById('search').dispatchEvent(new Event('input'))">clear search</button></p>
    </div>
  </div>
</section>`;
  return buildPage(`${skills.length} Skills`, 'skills.html', body);
}

function buildCommandsPage(commands) {
  const body = `
<section class="page-header">
  <div class="container">
    <nav class="breadcrumb" aria-label="Breadcrumb"><a href="index.html">clarc</a> / <span aria-current="page">Commands</span></nav>
    <h1 class="page-title">Commands <span class="page-count">${commands.length} total</span></h1>
    <p class="page-desc">Slash commands that activate agents and skills directly in Claude Code. Use in any conversation.</p>
  </div>
</section>
<section class="search-section">
  <div class="container">
    <div class="search-wrap">
      <svg class="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M10.5 10.5L14 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
      <input id="search" type="search" class="search-input" placeholder="Search ${commands.length} commands\u2026" autocomplete="off">
      <kbd class="search-kbd">\u2318K</kbd>
    </div>
  </div>
</section>
<section class="filter-section">
  <div class="container">
    ${categoryFilters(commands)}
  </div>
</section>
<section class="grid-section">
  <div class="container">
    <p class="grid-meta" id="grid-meta" aria-live="polite" aria-atomic="true">${commands.length} total \u00b7 A\u2013Z</p>
    <div class="grid">${commands.map(commandCard).join('')}</div>
    <div class="no-results" id="no-results" style="display:none">
      <div class="no-results-icon" aria-hidden="true">\u2298</div>
      <h3>No results</h3>
      <p>Try a different search term or <button class="clear-search" onclick="document.getElementById('search').value='';document.getElementById('search').dispatchEvent(new Event('input'))">clear search</button></p>
    </div>
  </div>
</section>`;
  return buildPage(`${commands.length} Commands`, 'commands.html', body);
}

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');

/* ─────────────────────────────────────────────────────────
   clarc Design Tokens — Blueprint System
   Primary: hsl(216°) · Accent: hsl(162°) · Neutral: 216°-tinted
   Mirrors docs/brand/tokens.css (canonical source)
───────────────────────────────────────────────────────── */
:root {
  /* ── Blueprint Primary (216°) ── */
  --color-primary-50:  hsl(216, 80%, 96%);
  --color-primary-100: hsl(216, 80%, 91%);
  --color-primary-200: hsl(216, 80%, 80%);
  --color-primary-300: hsl(216, 80%, 66%);
  --color-primary-400: hsl(216, 80%, 54%);
  --color-primary-500: hsl(216, 80%, 40%);
  --color-primary-600: hsl(216, 80%, 30%);
  --color-primary-700: hsl(216, 80%, 22%);
  --color-primary-900: hsl(216, 80%,  8%);

  /* ── Phosphor Accent (162°) ── */
  --color-accent-300: hsl(162, 60%, 58%);
  --color-accent-400: hsl(162, 60%, 46%);
  --color-accent-500: hsl(162, 60%, 38%);
  --color-accent-600: hsl(162, 65%, 28%);

  /* ── Blueprint Neutral ── */
  --color-neutral-0:   hsl(0, 0%, 100%);
  --color-neutral-50:  hsl(216, 20%, 97%);
  --color-neutral-100: hsl(216, 16%, 93%);
  --color-neutral-200: hsl(216, 14%, 85%);
  --color-neutral-300: hsl(216, 12%, 72%);
  --color-neutral-400: hsl(216, 10%, 56%);
  --color-neutral-500: hsl(216,  9%, 42%);
  --color-neutral-600: hsl(216,  9%, 30%);
  --color-neutral-700: hsl(216, 10%, 20%);
  --color-neutral-800: hsl(216, 12%, 13%);
  --color-neutral-900: hsl(216, 14%,  8%);
  --color-neutral-950: hsl(216, 16%,  5%);

  /* ── Typography ── */
  --font-display: 'Space Grotesk', system-ui, sans-serif;
  --font-body:    'Inter', system-ui, -apple-system, sans-serif;
  --font-mono:    'Geist Mono', 'JetBrains Mono', 'Fira Code', ui-monospace, monospace;

  /* ── Type scale — Major Third (x1.25), root 16px ── */
  --text-xs:   0.64rem;
  --text-sm:   0.8rem;
  --text-base: 1rem;
  --text-lg:   1.25rem;
  --text-xl:   1.563rem;
  --text-2xl:  1.953rem;
  --text-3xl:  2.441rem;
  --text-4xl:  3.052rem;
  --text-5xl:  3.815rem;

  /* ── Border radius ── */
  --radius-sm:   0.125rem;
  --radius-md:   0.25rem;
  --radius-lg:   0.5rem;
  --radius-full: 9999px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: var(--color-neutral-950); color: var(--color-neutral-200); font-family: var(--font-body); line-height: 1.6; }
a { text-decoration: none; }
a:hover { text-decoration: none; }

/* ── Focus ── */
a:focus-visible,
button:focus-visible {
  outline: 2px solid var(--color-primary-500);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

/* ── Layout ── */
.container { max-width: 1200px; margin: 0 auto; padding: 0 32px; }

/* ── Nav ── */
header {
  position: sticky; top: 0; z-index: 100;
  background: var(--color-neutral-950); border-bottom: 1px solid var(--color-neutral-800);
  height: 52px; display: flex; align-items: center;
}
header .container { width: 100%; }
.nav { display: flex; align-items: center; height: 52px; }
.nav-brand {
  font-family: var(--font-display); font-size: 18px; font-weight: 600;
  letter-spacing: -0.02em; color: var(--color-neutral-50);
  margin-right: auto;
}
.nav-links { display: flex; gap: 4px; align-items: center; }
.nav-links a {
  font-family: var(--font-body); font-size: 13px; color: var(--color-neutral-400);
  padding: 12px 10px; border-radius: var(--radius-sm); transition: color 100ms;
}
.nav-links a:hover { color: var(--color-neutral-100); }
.nav-links a.active { color: var(--color-primary-300); border-bottom: 2px solid var(--color-primary-500); }
.nav-github {
  font-family: var(--font-body); font-size: 13px; color: var(--color-primary-300);
  margin-left: 16px; padding-left: 16px; border-left: 1px solid var(--color-neutral-800);
}
.nav-github:hover { color: var(--color-primary-200); }

/* ── Hero ── */
.hero-section { background: var(--color-neutral-950); padding: 80px 0 64px; text-align: center; }
.hero-eyebrow {
  font-family: var(--font-body); font-size: var(--text-sm); text-transform: uppercase;
  letter-spacing: 0.1em; color: var(--color-neutral-400); margin-bottom: 20px;
}
.hero-title {
  font-family: var(--font-display); font-size: var(--text-4xl); font-weight: 700;
  letter-spacing: -0.03em; color: var(--color-neutral-50);
  max-width: 680px; margin: 0 auto 16px; line-height: 1.1;
}
.hero-title .accent { color: var(--color-primary-300); }
.hero-sub {
  font-family: var(--font-body); font-size: var(--text-lg); color: var(--color-neutral-400);
  max-width: 520px; margin: 0 auto 32px; line-height: 1.6;
}
.install-cmd {
  background: var(--color-neutral-900); border: 1px solid var(--color-neutral-700); border-radius: var(--radius-sm);
  padding: 14px 20px; font-family: var(--font-mono); font-size: 14px; color: var(--color-neutral-100);
  display: flex; align-items: center; gap: 12px;
  max-width: 460px; margin: 0 auto;
}
.install-prompt { color: var(--color-accent-400); user-select: none; }
.copy-btn {
  font-family: var(--font-body); font-size: var(--text-sm); color: var(--color-neutral-500);
  background: none; border: none; cursor: pointer; margin-left: auto;
  padding: 8px 12px; min-height: 44px; border-radius: var(--radius-sm); transition: color 100ms;
}
.copy-btn:hover { color: var(--color-neutral-300); }
.stats-row {
  display: flex; justify-content: center; gap: 0; margin-top: 32px;
}
.stat-block {
  text-align: center; padding: 0 40px;
  border-right: 1px solid var(--color-neutral-800);
}
.stat-block:last-child { border-right: none; }
.stat-num {
  font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 700;
  color: var(--color-primary-300); line-height: 1; letter-spacing: -0.02em;
}
.stat-label {
  font-family: var(--font-body); font-size: var(--text-sm); text-transform: uppercase;
  letter-spacing: 0.08em; color: var(--color-neutral-400); margin-top: 4px;
}
.hero-cta { display: flex; gap: 12px; justify-content: center; margin-top: 28px; }
.btn-primary {
  background: var(--color-primary-500); color: var(--color-neutral-0); padding: 10px 24px;
  border-radius: var(--radius-sm); font-family: var(--font-body); font-size: 13px; font-weight: 500;
  transition: background 100ms;
}
.btn-primary:hover { background: var(--color-primary-600); }
.btn-ghost-hero {
  border: 1px solid var(--color-neutral-700); color: var(--color-neutral-400); padding: 10px 24px;
  border-radius: var(--radius-sm); font-family: var(--font-body); font-size: 13px;
  transition: border-color 100ms, color 100ms;
}
.btn-ghost-hero:hover { border-color: var(--color-neutral-500); color: var(--color-neutral-200); }

/* ── Concept section ── */
.concept-section { background: var(--color-neutral-900); padding: 80px 0; }
.concept-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: start;
}
.section-eyebrow {
  font-family: var(--font-body); font-size: var(--text-sm); text-transform: uppercase;
  letter-spacing: 0.1em; color: var(--color-neutral-400); margin-bottom: 12px;
}
.concept-text h2 {
  font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 600;
  color: var(--color-neutral-50); line-height: 1.2; margin-bottom: 32px;
}
.feature-list { list-style: none; display: flex; flex-direction: column; gap: 20px; }
.feature-list li { display: flex; gap: 12px; }
.feature-arrow { color: var(--color-primary-300); font-size: 14px; line-height: 1.6; flex-shrink: 0; }
.feature-title { font-family: var(--font-body); font-size: 14px; font-weight: 600; color: var(--color-neutral-100); }
.feature-desc { font-family: var(--font-body); font-size: 13px; color: var(--color-neutral-300); line-height: 1.6; }

/* ── Terminal ── */
.terminal {
  background: var(--color-neutral-950); border: 1px solid var(--color-neutral-800); border-radius: var(--radius-lg);
  padding: 20px; font-family: var(--font-mono); font-size: 12.5px; color: var(--color-neutral-200); line-height: 1.7;
}
.t-bar {
  display: flex; gap: 6px; align-items: center;
  margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--color-neutral-800);
}
.t-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--color-neutral-700); display: inline-block; }
.t-dot:nth-child(1) { background: #ff5f57; }
.t-dot:nth-child(2) { background: #febc2e; }
.t-dot:nth-child(3) { background: #28c840; }
.t-title { color: var(--color-neutral-400); font-size: 11px; margin-left: 8px; }
.t-line { margin: 2px 0; }
.t-prompt { color: var(--color-accent-400); margin-right: 6px; }
.t-cmd { color: var(--color-neutral-100); }
.t-out { color: var(--color-neutral-400); margin: 1px 0; }
.t-ok { color: var(--color-accent-300); }
.t-blue { color: var(--color-primary-300); }

/* ── Catalog section ── */
.catalog-section { background: var(--color-neutral-50); padding: 80px 0; }
.catalog-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
.catalog-card {
  background: var(--color-neutral-0); border: 1px solid var(--color-neutral-200); border-radius: var(--radius-lg);
  padding: 32px 28px; display: flex; flex-direction: column; gap: 8px;
  transition: border-color 150ms, box-shadow 150ms;
}
.catalog-card:hover {
  border-color: var(--color-primary-500);
  box-shadow: 0 1px 3px hsla(216, 20%, 10%, 0.06);
}
.catalog-count {
  font-family: var(--font-display); font-size: var(--text-2xl); font-weight: 700;
  color: var(--color-primary-500); line-height: 1; letter-spacing: -0.02em;
}
.catalog-name { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 600; color: var(--color-neutral-900); }
.catalog-desc { font-family: var(--font-body); font-size: 13px; color: var(--color-neutral-600); line-height: 1.6; flex: 1; }
.catalog-link { font-family: var(--font-body); font-size: 13px; font-weight: 500; color: var(--color-primary-500); margin-top: 8px; }

/* ── Featured agents ── */
.featured-section { background: var(--color-neutral-50); padding: 64px 0; border-top: 1px solid var(--color-neutral-200); }
.section-header { display: flex; align-items: baseline; margin-bottom: 32px; }
.section-title { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 600; color: var(--color-neutral-900); }
.section-link { font-family: var(--font-body); font-size: 13px; color: var(--color-primary-500); margin-left: auto; }
.section-link:hover { text-decoration: underline; }

/* ── CTA section ── */
.cta-section {
  background: var(--color-neutral-900); padding: 64px 0; text-align: center;
}
.cta-section h2 {
  font-family: var(--font-display); font-size: var(--text-xl); font-weight: 600;
  color: var(--color-neutral-100); max-width: 400px; margin: 0 auto 12px;
}
.cta-sub { font-family: var(--font-body); font-size: 14px; color: var(--color-neutral-300); margin-bottom: 24px; }
.variants-row {
  display: flex; gap: 16px; justify-content: center; margin-top: 16px;
  font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-neutral-300);
}

/* ── Footer ── */
footer {
  background: var(--color-neutral-950); border-top: 1px solid var(--color-neutral-800); padding: 24px 0;
}
.footer-inner {
  display: flex; justify-content: space-between; align-items: center;
}
.footer-brand { display: flex; align-items: center; }
.footer-logo {
  font-family: var(--font-display); font-size: 14px; font-weight: 600; color: var(--color-neutral-300);
}
.footer-version {
  font-family: var(--font-mono); font-size: var(--text-sm); color: var(--color-neutral-500); margin-left: 8px;
}
.footer-links { display: flex; gap: 20px; }
.footer-links a {
  font-family: var(--font-body); font-size: 12px; color: var(--color-neutral-400); transition: color 100ms;
}
.footer-links a:hover { color: var(--color-neutral-200); }

/* ── Page header (catalog pages) ── */
.page-header { background: var(--color-neutral-950); padding: 40px 0 32px; }
.breadcrumb {
  font-family: var(--font-body); font-size: 11px; color: var(--color-neutral-600); margin-bottom: 12px;
}
.breadcrumb a { color: var(--color-neutral-600); }
.breadcrumb a:hover { color: var(--color-neutral-400); }
.page-title {
  font-family: var(--font-display); font-size: var(--text-3xl); font-weight: 700; color: var(--color-neutral-50); display: inline;
}
.page-count {
  font-family: var(--font-body); font-size: 14px; color: var(--color-neutral-500); margin-left: 12px;
}
.page-desc {
  font-family: var(--font-body); font-size: 14px; color: var(--color-neutral-400);
  margin-top: 8px; max-width: 480px; line-height: 1.6;
}

/* ── Search ── */
.search-section {
  background: var(--color-neutral-0); border-bottom: 1px solid var(--color-neutral-100); padding: 12px 0;
}
.search-wrap { position: relative; }
.search-input {
  width: 100%; padding: 12px 16px 12px 40px;
  background: var(--color-neutral-50); border: 1px solid var(--color-neutral-200);
  border-radius: var(--radius-sm); font-family: var(--font-body); font-size: 14px; color: var(--color-neutral-800);
  outline: none; transition: border-color 100ms, background 100ms, box-shadow 100ms;
}
.search-input:focus-visible {
  border-color: var(--color-primary-500); background: var(--color-neutral-0);
  box-shadow: 0 0 0 2px var(--color-primary-500);
  outline: none;
}
.search-icon {
  position: absolute; left: 14px; top: 50%; transform: translateY(-50%);
  color: var(--color-neutral-400); pointer-events: none;
}
.search-kbd {
  position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
  font-family: var(--font-mono); font-size: var(--text-xs); color: var(--color-neutral-500);
  border: 1px solid var(--color-neutral-200); padding: 1px 5px; border-radius: var(--radius-sm);
}

/* ── Filter tabs ── */
.filter-section {
  background: var(--color-neutral-0); border-bottom: 1px solid var(--color-neutral-100); padding: 0;
}
.filter-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.filter-tabs {
  display: flex; gap: 4px; padding: 10px 0; min-width: max-content;
}
.filter-btn {
  border: 1px solid var(--color-neutral-200); background: transparent; color: var(--color-neutral-500);
  font-family: var(--font-body); font-size: 12px; padding: 10px 14px; min-height: 44px; border-radius: var(--radius-sm);
  cursor: pointer; transition: border-color 100ms, color 100ms;
  white-space: nowrap;
}
.filter-btn:hover { border-color: var(--color-neutral-400); color: var(--color-neutral-700); }
.filter-btn.active {
  border-color: var(--color-primary-500); color: var(--color-primary-500); background: var(--color-primary-50);
}
.count-badge { color: var(--color-neutral-400); }

/* ── Grid ── */
.grid-section { background: var(--color-neutral-50); padding: 24px 0 64px; }
.grid-meta {
  font-family: var(--font-body); font-size: 12px; color: var(--color-neutral-400);
  margin-bottom: 16px; display: flex; align-items: center;
}
.grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
}

/* ── Cards ── */
.card {
  background: var(--color-neutral-0); border: 1px solid var(--color-neutral-200); border-radius: var(--radius-lg);
  padding: 20px; display: flex; flex-direction: column; gap: 8px;
  transition: border-color 150ms;
}
.card:hover { border-color: var(--color-primary-500); }
.card.hidden { display: none; }
.card-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;
}
.card-name {
  font-family: var(--font-mono); font-size: 15px; font-weight: 600; color: var(--color-neutral-900);
  word-break: break-all;
}
.card-slash {
  font-family: var(--font-mono); font-size: 15px; font-weight: 700;
  color: var(--color-primary-500); letter-spacing: -0.02em;
}
.card-desc {
  font-family: var(--font-body); font-size: 13px; color: var(--color-neutral-600); line-height: 1.6; flex: 1;
  display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;
  overflow-wrap: break-word; word-break: break-word;
}
.card-pills {
  display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin-top: 2px;
}
.deps-label { font-family: var(--font-body); font-size: 12px; color: var(--color-neutral-400); margin-right: 2px; }
.skill-pill {
  background: var(--color-primary-50); border: 1px solid var(--color-primary-200); color: var(--color-primary-600);
  font-family: var(--font-body); font-size: 12px; padding: 2px 7px; border-radius: var(--radius-sm);
}
.agent-pill {
  background: hsl(162, 60%, 95%); border: 1px solid hsl(162, 60%, 74%); color: var(--color-accent-600);
  font-family: var(--font-body); font-size: 12px; padding: 2px 7px; border-radius: var(--radius-sm);
}
.pill-more {
  background: var(--color-neutral-100); border: 1px solid var(--color-neutral-200); color: var(--color-neutral-500);
  font-family: var(--font-body); font-size: 12px; padding: 2px 7px; border-radius: var(--radius-sm);
}
.card-footer {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: auto; padding-top: 12px; border-top: 1px solid var(--color-neutral-100);
}
.model-badge {
  font-family: var(--font-mono); font-size: 12px; font-weight: 500;
  display: flex; align-items: center; gap: 4px;
}
.model-badge.sonnet { color: var(--color-accent-500); }
.model-badge.opus   { color: hsl(38, 90%, 44%); }
.model-badge.haiku  { color: hsl(260, 60%, 55%); }
.model-badge .dot {
  width: 6px; height: 6px; border-radius: 50%;
  display: inline-block; background: currentColor;
}
.source-btn {
  font-family: var(--font-body); font-size: 12px; color: var(--color-neutral-400);
  border: 1px solid var(--color-neutral-200); padding: 3px 10px; border-radius: var(--radius-sm);
  min-height: 44px; display: inline-flex; align-items: center;
  transition: color 100ms, border-color 100ms;
}
.source-btn:hover { color: var(--color-neutral-700); border-color: var(--color-neutral-400); }
.skill-tag { font-family: var(--font-body); font-size: 12px; color: var(--color-neutral-400); }
.cmd-chip {
  font-family: var(--font-mono); font-size: 12px; color: var(--color-neutral-400);
  background: var(--color-neutral-100); padding: 2px 6px; border-radius: var(--radius-sm);
}

/* ── Category badges ── */
.badge {
  font-family: var(--font-body); font-size: 12px; font-weight: 600;
  padding: 2px 8px; border-radius: var(--radius-sm); letter-spacing: 0.04em;
  white-space: nowrap; flex-shrink: 0;
}
.cat-b     { background: hsl(216, 80%, 91%); color: hsl(216, 80%, 30%); }
.cat-g     { background: hsl(142, 55%, 90%); color: hsl(142, 58%, 28%); }
.cat-amber { background: hsl(38,  90%, 92%); color: hsl(38,  75%, 30%); }
.cat-teal  { background: hsl(175, 55%, 88%); color: hsl(175, 60%, 26%); }
.cat-v     { background: hsl(262, 60%, 92%); color: hsl(262, 55%, 38%); }
.cat-r     { background: hsl(4,   80%, 92%); color: hsl(4,   78%, 35%); }
.cat-o     { background: hsl(16,  85%, 92%); color: hsl(16,  80%, 32%); }
.cat-y     { background: hsl(45,  90%, 88%); color: hsl(45,  70%, 28%); }
.cat-p     { background: hsl(318, 55%, 90%); color: hsl(318, 52%, 35%); }
.cat-n     { background: hsl(216, 16%, 93%); color: hsl(216,  9%, 30%); }

/* ── No results ── */
.no-results { padding: 64px 0; text-align: center; }
.no-results-icon { font-size: 40px; color: var(--color-neutral-300); }
.no-results h3 {
  font-family: var(--font-display); font-size: 16px; font-weight: 600;
  color: var(--color-neutral-600); margin-top: 12px; margin-bottom: 6px;
}
.no-results p { font-family: var(--font-body); font-size: 13px; color: var(--color-neutral-400); }
.clear-search {
  font-family: var(--font-body); font-size: 12px; color: var(--color-primary-500);
  background: none; border: none; cursor: pointer; margin-top: 8px; padding: 0;
}
.clear-search:hover { text-decoration: underline; }

/* ── Responsive ── */
@media (max-width: 1024px) {
  .grid { grid-template-columns: repeat(2, 1fr); }
  .catalog-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 640px) {
  .grid { grid-template-columns: 1fr; }
  .catalog-grid { grid-template-columns: 1fr; }
  .hero-title { font-size: 2.2rem; }
  .concept-grid { grid-template-columns: 1fr; }
  .concept-terminal { order: -1; }
  .nav-links { overflow-x: auto; -webkit-overflow-scrolling: touch; gap: 2px; }
  .stats-row { flex-wrap: wrap; }
  .stat-block { min-width: 33%; }
}
`;

// ─── Search JS ────────────────────────────────────────────────────────────────

const SEARCH_JS = `(function () {
  var search = document.getElementById('search');
  var filterBtns = document.querySelectorAll('.filter-btn');
  var cards = document.querySelectorAll('.card');
  var noResults = document.getElementById('no-results');
  var gridMeta = document.getElementById('grid-meta');
  var total = cards.length;

  var activeFilter = 'all';
  var query = '';

  function applyFilters() {
    var visible = 0;
    cards.forEach(function(card) {
      var name = (card.dataset.name || '').toLowerCase();
      var cat  = (card.dataset.category || '').toLowerCase();
      var descEl = card.querySelector('.card-desc');
      var desc = descEl ? descEl.textContent.toLowerCase() : '';
      var matchSearch = !query || name.indexOf(query) !== -1 || desc.indexOf(query) !== -1 || cat.indexOf(query) !== -1;
      var matchFilter = activeFilter === 'all' || cat === activeFilter.toLowerCase();
      var show = matchSearch && matchFilter;
      card.classList.toggle('hidden', !show);
      if (show) visible++;
    });
    if (noResults) noResults.style.display = visible === 0 ? 'block' : 'none';
    if (gridMeta) {
      gridMeta.textContent = (query || activeFilter !== 'all')
        ? visible + ' of ' + total + ' results'
        : total + ' total \u00b7 A\u2013Z';
    }
  }

  if (search) {
    search.addEventListener('input', function(e) {
      query = e.target.value.toLowerCase().trim();
      applyFilters();
    });
    document.addEventListener('keydown', function(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        search.focus();
        search.select();
      }
    });
  }

  filterBtns.forEach(function(btn) {
    btn.addEventListener('click', function() {
      filterBtns.forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      activeFilter = btn.dataset.filter || 'all';
      applyFilters();
    });
  });

  if (gridMeta) gridMeta.textContent = total + ' total \u00b7 A\u2013Z';
})();
`;

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
