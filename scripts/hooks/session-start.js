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
    .replace(/\*\*/g, '\x00') // placeholder
    .replace(/\*/g, '[^/]*')
    .replace(/\x00/g, '.*')
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

  process.exit(0);
}

main().catch(err => {
  console.error('[SessionStart] Error:', err.message);
  process.exit(0); // Don't block on errors
});
