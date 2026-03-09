#!/usr/bin/env node
/**
 * SessionStart Hook - Load previous context on new session
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs when a new Claude session starts. Loads the most recent session
 * summary into Claude's context via stdout, filtered to content relevant
 * to the current project. Injects at most 3000 characters to avoid
 * burning context on stale information from other projects.
 */

import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { getSessionsDir, getLearnedSkillsDir, findFiles, ensureDir, readFile, log, output, getProjectName } from '../lib/utils.js';
import { getPackageManager, getSelectionPrompt } from '../lib/package-manager.js';
import { listAliases } from '../lib/session-aliases.js';
import { detectProjectType } from '../lib/project-detect.js';

/**
 * Maps detected languages and frameworks to relevant clarc skills.
 * Used to surface skill recommendations at session start.
 */
const SKILL_MAP = {
  // Languages
  typescript: ['typescript-patterns', 'typescript-patterns-advanced', 'typescript-coding-standards'],
  javascript: ['typescript-coding-standards', 'async-patterns'],
  python: ['python-patterns', 'python-patterns-advanced', 'python-testing'],
  golang: ['go-patterns', 'go-patterns-advanced', 'go-testing'],
  rust: ['rust-patterns', 'rust-testing'],
  ruby: ['ruby-patterns', 'ruby-testing'],
  java: ['springboot-patterns', 'jpa-patterns', 'java-patterns'],
  swift: ['swift-patterns', 'swift-patterns-advanced', 'swiftui-patterns'],
  elixir: ['elixir-patterns', 'elixir-testing'],
  cpp: ['cpp-patterns', 'cpp-patterns-advanced', 'cpp-testing'],
  // Frameworks
  react: ['state-management', 'frontend-patterns', 'e2e-testing'],
  nextjs: ['state-management', 'frontend-patterns', 'e2e-testing'],
  vue: ['state-management', 'frontend-patterns'],
  angular: ['state-management', 'frontend-patterns'],
  django: ['django-patterns', 'django-security', 'django-tdd'],
  fastapi: ['fastapi-patterns', 'python-patterns', 'python-testing-advanced'],
  flask: ['python-patterns', 'python-testing'],
  spring: ['springboot-patterns', 'springboot-security', 'springboot-tdd'],
  rails: ['ruby-patterns', 'ruby-testing'],
  gin: ['go-patterns', 'go-testing'],
  echo: ['go-patterns', 'go-testing'],
  phoenix: ['elixir-patterns', 'elixir-testing'],
  nestjs: ['typescript-patterns', 'nodejs-backend-patterns'],
  express: ['nodejs-backend-patterns', 'api-design'],
  actix: ['rust-patterns', 'rust-testing'],
  axum: ['rust-patterns', 'rust-testing']
};

const MAX_INJECT_CHARS = 3000;

// Stop words to ignore when extracting git-log keywords
const STOP_WORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'up',
  'as',
  'is',
  'it',
  'its',
  'be',
  'are',
  'was',
  'were',
  'been',
  'has',
  'have',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'shall',
  'can',
  'not',
  'no',
  'fix',
  'add',
  'update',
  'remove',
  'change',
  'use',
  'move',
  'make',
  'get',
  'set',
  'run',
  'feat',
  'chore',
  'docs',
  'test',
  'refactor',
  'perf',
  'ci'
]);

/**
 * Extract meaningful keywords from recent git commit messages.
 * Returns a Set of lowercase tokens weighted by frequency (TF-style).
 * Falls back gracefully if git is unavailable.
 */
function extractGitKeywords(cwd, limit = 15) {
  try {
    const result = spawnSync('git', ['log', '--oneline', `-${limit}`], {
      cwd,
      stdio: 'pipe',
      encoding: 'utf8',
      timeout: 3000
    });
    if (result.status !== 0 || !result.stdout) return new Map();

    const freq = new Map();
    for (const line of result.stdout.split('\n')) {
      // Strip commit hash prefix
      const message = line.replace(/^[0-9a-f]+ /, '').toLowerCase();
      for (const token of message.split(/[\s:/()\-_,.[\]{}'"!?]+/)) {
        if (token.length < 3 || STOP_WORDS.has(token)) continue;
        freq.set(token, (freq.get(token) || 0) + 1);
      }
    }
    return freq;
  } catch {
    return new Map();
  }
}

/**
 * Score a line by how many git-derived keywords it contains.
 * Weights higher-frequency keywords more (TF-style).
 */
function scoreLine(line, keywordFreq) {
  const lower = line.toLowerCase();
  let score = 0;
  for (const [token, freq] of keywordFreq) {
    if (lower.includes(token)) score += Math.log(1 + freq);
  }
  return score;
}

/**
 * Filter session content to lines relevant to the current project.
 *
 * Strategy (in priority order):
 *  1. Lines that contain the project name (most specific signal)
 *  2. TF-IDF-style scoring using keywords from recent git commits
 *     (top-scored lines are more likely to be relevant to current work)
 *  3. Fall back to the last N lines (most recent context)
 *  4. Cap total output at MAX_INJECT_CHARS
 */
function filterSessionContent(content, projectName, cwd) {
  if (!content || content.includes('[Session context goes here]')) return null;

  const lines = content.split('\n');

  // Always cap regardless of strategy
  const cap = text => (text.length > MAX_INJECT_CHARS ? '...(truncated)\n' + text.slice(text.length - MAX_INJECT_CHARS) : text);

  // Fast path: content is short enough to inject as-is
  if (content.length <= MAX_INJECT_CHARS) return content;

  // Strategy 1: project-specific lines
  if (projectName) {
    const keyword = projectName.toLowerCase();
    const relevant = lines.filter(l => l.toLowerCase().includes(keyword));
    if (relevant.length >= 10) {
      return cap(relevant.join('\n'));
    }
  }

  // Strategy 2: TF-IDF scoring from recent git commit keywords
  const keywordFreq = extractGitKeywords(cwd || process.cwd());
  if (keywordFreq.size > 0) {
    const scored = lines
      .map((line, idx) => ({ line, idx, score: scoreLine(line, keywordFreq) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length >= 5) {
      // Re-sort by original index to preserve narrative order
      const top = scored.slice(0, 60).sort((a, b) => a.idx - b.idx);
      return cap(top.map(({ line }) => line).join('\n'));
    }
  }

  // Strategy 3: keep the most recent lines (tail of the file)
  const tail = lines.slice(-150).join('\n');
  return cap(tail);
}

/**
 * Parse YAML frontmatter from a Rule markdown file.
 * Returns { globs, alwaysApply } or null if no frontmatter found.
 * Pure Node.js — no external dependencies.
 */
function parseRuleFrontmatter(content) {
  if (!content.startsWith('---')) return null;
  const end = content.indexOf('\n---', 3);
  if (end === -1) return null;
  const yaml = content.slice(3, end);
  const globs = [];
  let alwaysApply = null;

  for (const line of yaml.split('\n')) {
    const trimmed = line.trim();
    // Parse "globs:" list items (- "pattern")
    const globMatch = trimmed.match(/^-\s+"?([^"]+)"?$/);
    if (globMatch) {
      globs.push(globMatch[1]);
    }
    if (trimmed.startsWith('alwaysApply:')) {
      alwaysApply = trimmed.includes('true');
    }
  }

  return { globs, alwaysApply };
}

/**
 * Simple glob matcher without external deps.
 * Converts glob patterns to regex and tests against file paths.
 * Supports * (any char except /), ** (any char incl /), ? (single char).
 */
function globMatches(pattern, filePath) {
  // Normalize slashes
  const p = filePath.replace(/\\/g, '/');
  // Convert glob to regex
  const regexStr = pattern
    .replace(/\\/g, '/')
    .replace(/\./g, '\\.')
    .replace(/\{([^}]+)\}/g, (_, group) => `(${group.split(',').join('|')})`)
    .replace(/\*\*/g, '__GLOBSTAR__') // placeholder for ** before replacing *
    .replace(/\*/g, '[^/]*')
    .replace(/__GLOBSTAR__/g, '.*')
    .replace(/\?/g, '[^/]');
  try {
    return new RegExp(`(^|/)${regexStr}$`).test(p);
  } catch {
    return false;
  }
}

/**
 * Scan installed Rules directories (~/.claude/rules/) for files with
 * globs frontmatter and check if any project files match.
 * Returns list of matched rule file paths (relative to rules dir).
 */
function detectGlobRules(cwd) {
  const claudeDir = path.join(os.homedir(), '.claude');
  const rulesDir = path.join(claudeDir, 'rules');
  if (!fs.existsSync(rulesDir)) return [];

  // Collect project files via git ls-files (fast, respects .gitignore)
  let projectFiles = [];
  try {
    const r = spawnSync('git', ['ls-files'], { cwd, encoding: 'utf8', stdio: 'pipe', timeout: 5000 });
    if (r.status === 0 && r.stdout) {
      projectFiles = r.stdout.trim().split('\n').filter(Boolean);
    }
  } catch {
    // Fallback: skip glob matching if git unavailable
    return [];
  }

  if (projectFiles.length === 0) return [];

  const matched = [];

  // Walk all rule .md files
  function walkDir(dir, rel) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        walkDir(path.join(dir, entry.name), rel ? `${rel}/${entry.name}` : entry.name);
      } else if (entry.name.endsWith('.md')) {
        const filePath = path.join(dir, entry.name);
        const relPath = rel ? `${rel}/${entry.name}` : entry.name;
        const content = (() => {
          try {
            return fs.readFileSync(filePath, 'utf8');
          } catch {
            return '';
          }
        })();
        const meta = parseRuleFrontmatter(content);
        if (!meta) return;

        // alwaysApply: true → skip (already loaded by Claude Code natively)
        if (meta.alwaysApply === true) return;

        // No globs → skip
        if (meta.globs.length === 0) return;

        // Check if any project file matches any glob
        const hit = meta.globs.some(glob => projectFiles.some(pf => globMatches(glob, pf)));
        if (hit) {
          matched.push(relPath);
        }
      }
    }
  }

  walkDir(rulesDir, '');
  return matched;
}

async function main() {
  const sessionsDir = getSessionsDir();
  const learnedDir = getLearnedSkillsDir();

  // Ensure directories exist
  ensureDir(sessionsDir);
  ensureDir(learnedDir);

  // Detect current project for relevance filtering
  const projectName = getProjectName ? getProjectName() : null;

  // Check for recent session files (last 7 days)
  const recentSessions = findFiles(sessionsDir, '*-session.tmp', { maxAge: 7 });

  if (recentSessions.length > 0) {
    const latest = recentSessions[0];
    log(`[SessionStart] Found ${recentSessions.length} recent session(s)`);
    log(`[SessionStart] Latest: ${latest.path}`);

    const raw = readFile(latest.path);
    const filtered = filterSessionContent(raw, projectName, process.cwd());
    if (filtered) {
      const charCount = filtered.length;
      log(`[SessionStart] Injecting ${charCount} chars of session context (project: ${projectName || 'unknown'})`);
      output(`Previous session summary:\n${filtered}`);
    }
  }

  // Check for learned skills
  const learnedSkills = findFiles(learnedDir, '*.md');

  if (learnedSkills.length > 0) {
    log(`[SessionStart] ${learnedSkills.length} learned skill(s) available in ${learnedDir}`);
  }

  // Check for available session aliases
  const aliases = listAliases({ limit: 5 });

  if (aliases.length > 0) {
    const aliasNames = aliases.map(a => a.name).join(', ');
    log(`[SessionStart] ${aliases.length} session alias(es) available: ${aliasNames}`);
    log(`[SessionStart] Use /sessions load <alias> to continue a previous session`);
  }

  // Detect and report package manager
  const pm = getPackageManager();
  log(`[SessionStart] Package manager: ${pm.name} (${pm.source})`);

  // If no explicit package manager config was found, show selection prompt
  if (pm.source === 'default') {
    log('[SessionStart] No package manager preference found.');
    log(getSelectionPrompt());
  }

  // Detect project type and frameworks (#293)
  const projectInfo = detectProjectType();
  if (projectInfo.languages.length > 0 || projectInfo.frameworks.length > 0) {
    const parts = [];
    if (projectInfo.languages.length > 0) {
      parts.push(`languages: ${projectInfo.languages.join(', ')}`);
    }
    if (projectInfo.frameworks.length > 0) {
      parts.push(`frameworks: ${projectInfo.frameworks.join(', ')}`);
    }
    log(`[SessionStart] Project detected — ${parts.join('; ')}`);
    output(`Project type: ${JSON.stringify(projectInfo)}`);

    // Suggest relevant skills based on detected stack
    const detected = [...projectInfo.frameworks, ...projectInfo.languages];
    const skillSet = new Set();
    for (const key of detected) {
      const skills = SKILL_MAP[key] || [];
      for (const s of skills) skillSet.add(s);
    }
    if (skillSet.size > 0) {
      const skillList = Array.from(skillSet).slice(0, 6).join(', ');
      log(`[SessionStart] Relevant skills: ${skillList}`);
      output(`Relevant skills for this project: ${skillList}`);
    }
  } else {
    log('[SessionStart] No specific project type detected');
  }

  // Glob-based Rule activation: detect which installed rules match current project files
  const matchedRules = detectGlobRules(process.cwd());
  if (matchedRules.length > 0) {
    log(`[SessionStart] Glob-matched rules: ${matchedRules.join(', ')}`);
    output(`Active glob-rules (auto-detected for this project): ${matchedRules.join(', ')}`);
  }

  // Memory Bank: load .clarc/ project context (higher priority than MEMORY.md)
  loadMemoryBank(process.cwd());

  // Project-local skills: scan .clarc/skills/ and surface to Claude
  loadLocalSkills(process.cwd());

  // Agent instinct overlays: inject learned instincts for known agents
  loadAgentInstinctOverlays();

  // Rules staleness banner: notify once per 7 days if rules > 30 days old
  checkRulesStaleness();

  process.exit(0);
}

/**
 * Load project-level Memory Bank from .clarc/ directory.
 * Reads brief.md + context.md + progress.md and injects as session context.
 * Falls back silently if .clarc/ does not exist.
 *
 * Priority: .clarc/ > session files (already loaded above)
 */
function loadMemoryBank(cwd) {
  const clarcDir = path.join(cwd, '.clarc');
  if (!fs.existsSync(clarcDir)) return;

  const files = [
    { name: 'brief.md', label: 'Project Brief' },
    { name: 'context.md', label: 'Last Session Context' },
    { name: 'progress.md', label: 'Progress' },
  ];

  const loaded = [];
  let combined = '';

  for (const { name, label } of files) {
    const filePath = path.join(clarcDir, name);
    if (!fs.existsSync(filePath)) continue;
    try {
      const content = fs.readFileSync(filePath, 'utf8').trim();
      if (!content) continue;
      // Cap each file at 2000 chars to avoid flooding context
      const capped = content.length > 2000 ? content.slice(0, 2000) + '\n...(truncated)' : content;
      combined += `### ${label}\n${capped}\n\n`;
      loaded.push(name);
    } catch {
      // Skip unreadable files
    }
  }

  if (loaded.length > 0) {
    log(`[SessionStart] Memory Bank loaded: ${loaded.join(', ')}`);
    output(`--- Project Memory Bank ---\n${combined.trim()}\n---`);
  }
}

/**
 * Parse simple YAML frontmatter (key: value pairs only) from a skill file.
 * Returns an object with any found keys; falls back to empty object.
 */
function parseSkillFrontmatter(content) {
  if (!content.startsWith('---')) return {};
  const end = content.indexOf('\n---', 3);
  if (end === -1) return {};
  const yaml = content.slice(3, end);
  const result = {};
  for (const line of yaml.split('\n')) {
    const m = line.match(/^(\w[\w-]*):\s*(.+)$/);
    if (m) result[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return result;
}

/**
 * Scan .clarc/skills/ for project-local skill directories.
 * Each skill must have a SKILL.md file with a frontmatter title/description.
 * - Local skills are surfaced to Claude via output()
 * - If a local skill name matches a key in SKILL_MAP, it is flagged as an override
 * Falls back silently if .clarc/skills/ does not exist.
 */
function loadLocalSkills(cwd) {
  const skillsDir = path.join(cwd, '.clarc', 'skills');
  if (!fs.existsSync(skillsDir)) return;

  let entries;
  try {
    entries = fs.readdirSync(skillsDir, { withFileTypes: true });
  } catch {
    return;
  }

  const found = [];
  const overrides = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const skillFile = path.join(skillsDir, entry.name, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;

    let content = '';
    try {
      content = fs.readFileSync(skillFile, 'utf8');
    } catch {
      continue;
    }

    const meta = parseSkillFrontmatter(content);
    const title = meta.title || entry.name;
    const description = meta.description || '';
    const isOverride = Object.values(SKILL_MAP).flat().includes(entry.name);

    if (isOverride) {
      overrides.push(entry.name);
      log(`[SessionStart] Local skill '${entry.name}' overrides global version`);
    }

    found.push({ name: entry.name, title, description, isOverride });
  }

  if (found.length === 0) return;

  const names = found.map(s => `[local] ${s.name}${s.isOverride ? ' (overrides global)' : ''}`).join(', ');
  log(`[SessionStart] Project-local skills loaded: ${found.map(s => s.name).join(', ')}`);
  output(`Loaded ${found.length} project-local skill${found.length !== 1 ? 's' : ''}: ${names}`);
}

/**
 * Load agent instinct overlays from ~/.clarc/agent-instincts/.
 *
 * Each overlay file extends a specific agent with learned behaviors accumulated
 * via continuous-learning-v2. Overlays are injected into the session context so
 * Claude applies them when invoking the corresponding agents.
 *
 * Falls back silently if ~/.clarc/agent-instincts/ does not exist.
 */
function loadAgentInstinctOverlays() {
  const overlaysDir = path.join(os.homedir(), '.clarc', 'agent-instincts');
  if (!fs.existsSync(overlaysDir)) return;

  let entries;
  try {
    entries = fs.readdirSync(overlaysDir, { withFileTypes: true });
  } catch {
    return;
  }

  const overlays = [];
  for (const entry of entries) {
    if (!entry.name.endsWith('.md')) continue;
    const agentName = entry.name.replace(/\.md$/, '');
    const filePath = path.join(overlaysDir, entry.name);
    try {
      const content = fs.readFileSync(filePath, 'utf8').trim();
      if (!content) continue;
      // Count bullet-point instincts
      const instinctCount = (content.match(/^- /gm) || []).length;
      if (instinctCount === 0) continue;
      overlays.push({ agentName, content, instinctCount });
    } catch {
      continue;
    }
  }

  if (overlays.length === 0) return;

  const summary = overlays
    .map(o => `${o.agentName} (${o.instinctCount} instinct${o.instinctCount !== 1 ? 's' : ''})`)
    .join(', ');
  log(`[SessionStart] Agent instinct overlays loaded: ${summary}`);

  let combined = '--- Agent Learned Instincts ---\n';
  combined += 'When invoking these agents, apply the following learned instincts:\n';
  for (const { agentName, content } of overlays) {
    combined += `\n### ${agentName}\n${content}\n`;
  }
  combined += '\n---';
  output(combined);
}

/**
 * Rules staleness banner.
 *
 * Shows a one-line notice when installed rules are > 30 days old or a newer
 * upstream version is available. Suppressed for 7 days after each notice.
 *
 * Suppressible via ~/.clarc/config.json: { "suppress_rules_banner": true }
 */
function checkRulesStaleness() {
  const clarcHome = path.join(os.homedir(), '.clarc');
  const installedVersionFile = path.join(clarcHome, 'installed-rules-version');
  const upstreamVersionFile = path.join(clarcHome, 'rules', 'RULES_VERSION');
  const cooldownFile = path.join(clarcHome, 'rules-banner-cooldown.json');
  const configFile = path.join(clarcHome, 'config.json');

  // Respect suppress flag
  try {
    if (fs.existsSync(configFile)) {
      const cfg = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      if (cfg.suppress_rules_banner === true) return;
    }
  } catch { /* ignore */ }

  // Cooldown: show at most once per 7 days
  const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
  try {
    if (fs.existsSync(cooldownFile)) {
      const { last_shown } = JSON.parse(fs.readFileSync(cooldownFile, 'utf8'));
      if (Date.now() - last_shown < COOLDOWN_MS) return;
    }
  } catch { /* ignore */ }

  // Determine install date and versions
  if (!fs.existsSync(installedVersionFile)) return;
  let installedVersion, installMtime;
  try {
    installedVersion = fs.readFileSync(installedVersionFile, 'utf8').trim();
    installMtime = fs.statSync(installedVersionFile).mtimeMs;
  } catch { return; }

  const daysSinceInstall = Math.floor((Date.now() - installMtime) / 86_400_000);

  let upstreamVersion = null;
  try {
    if (fs.existsSync(upstreamVersionFile)) {
      upstreamVersion = fs.readFileSync(upstreamVersionFile, 'utf8').trim();
    }
  } catch { /* ignore */ }

  const hasNewerVersion = upstreamVersion && upstreamVersion !== installedVersion;
  const isStale = daysSinceInstall > 30;

  if (!hasNewerVersion && !isStale) return;

  // Emit banner
  if (hasNewerVersion) {
    output(`Rules update available: v${installedVersion} → v${upstreamVersion}. Run /update-rules to get latest.`);
    log(`[SessionStart] Rules banner: update available ${installedVersion} → ${upstreamVersion}`);
  } else {
    output(`Rules last updated ${daysSinceInstall} days ago (v${installedVersion}). Run /update-rules to check for updates.`);
    log(`[SessionStart] Rules banner: stale (${daysSinceInstall} days)`);
  }

  // Record cooldown
  try {
    fs.mkdirSync(clarcHome, { recursive: true });
    fs.writeFileSync(cooldownFile, JSON.stringify({ last_shown: Date.now() }), 'utf8');
  } catch { /* ignore */ }
}

main().catch(err => {
  console.error('[SessionStart] Error:', err.message);
  process.exit(0); // Don't block on errors
});
