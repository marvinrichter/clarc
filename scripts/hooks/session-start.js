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

const {
  getSessionsDir,
  getLearnedSkillsDir,
  findFiles,
  ensureDir,
  readFile,
  log,
  output,
  getProjectName,
} = require('../lib/utils');
const { getPackageManager, getSelectionPrompt } = require('../lib/package-manager');
const { listAliases } = require('../lib/session-aliases');
const { detectProjectType } = require('../lib/project-detect');

const MAX_INJECT_CHARS = 3000;

/**
 * Filter session content to lines relevant to the current project.
 *
 * Strategy (in priority order):
 *  1. Lines that contain the project name (most specific signal)
 *  2. If fewer than 10 matching lines, fall back to the last N lines
 *     (most recent context is most likely to be relevant)
 *  3. Cap total output at MAX_INJECT_CHARS
 */
function filterSessionContent(content, projectName) {
  if (!content || content.includes('[Session context goes here]')) return null;

  const lines = content.split('\n');

  // Always cap regardless of strategy
  const cap = (text) => text.length > MAX_INJECT_CHARS
    ? '...(truncated)\n' + text.slice(text.length - MAX_INJECT_CHARS)
    : text;

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

  // Strategy 2: keep the most recent lines (tail of the file)
  const tail = lines.slice(-150).join('\n');
  return cap(tail);
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
    const filtered = filterSessionContent(raw, projectName);
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
  } else {
    log('[SessionStart] No specific project type detected');
  }

  process.exit(0);
}

main().catch(err => {
  console.error('[SessionStart] Error:', err.message);
  process.exit(0); // Don't block on errors
});
