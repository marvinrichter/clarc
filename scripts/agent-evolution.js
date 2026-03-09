#!/usr/bin/env node
/**
 * agent-evolution.js — Agent Instinct Overlay Manager
 *
 * Reads high-confidence instincts from the continuous-learning-v2 store,
 * maps them to target agents by domain, and writes approved instincts to
 * ~/.clarc/agent-instincts/<agent>.md overlay files.
 *
 * Usage:
 *   node scripts/agent-evolution.js list [--threshold 0.75]
 *   node scripts/agent-evolution.js apply <agent-name> "<instinct-text>" [--confidence 0.80] [--learned YYYY-MM-DD]
 *   node scripts/agent-evolution.js show [<agent-name>]
 *   node scripts/agent-evolution.js remove <agent-name> "<instinct-text-prefix>"
 *
 * Called by: /agent-evolution command (interactive), /agent-instincts command (read-only)
 */

import fs from 'fs';
import path from 'path';
import os from 'os';

// ─────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────

const CLARC_HOME = path.join(os.homedir(), '.clarc');
const OVERLAYS_DIR = path.join(CLARC_HOME, 'agent-instincts');
const HOMUNCULUS_DIR = path.join(os.homedir(), '.claude', 'homunculus');
const GLOBAL_INSTINCTS_DIR = path.join(HOMUNCULUS_DIR, 'instincts', 'personal');
const PROJECTS_DIR = path.join(HOMUNCULUS_DIR, 'projects');

const DEFAULT_THRESHOLD = 0.75;
const MIN_USAGE_COUNT = 5; // Minimum times instinct must be used before promotion

/**
 * Domain → target agents mapping.
 * Instincts are routed to these agents when promoted via /agent-evolution.
 */
const DOMAIN_TO_AGENTS = {
  typescript: ['typescript-reviewer', 'code-reviewer'],
  javascript: ['typescript-reviewer', 'code-reviewer'],
  python: ['python-reviewer', 'code-reviewer'],
  golang: ['go-reviewer', 'code-reviewer'],
  rust: ['rust-reviewer', 'code-reviewer'],
  java: ['java-reviewer', 'code-reviewer'],
  ruby: ['ruby-reviewer', 'code-reviewer'],
  swift: ['swift-reviewer', 'code-reviewer'],
  elixir: ['elixir-reviewer', 'code-reviewer'],
  cpp: ['cpp-reviewer', 'code-reviewer'],
  testing: ['tdd-guide', 'e2e-runner'],
  security: ['security-reviewer', 'devsecops-reviewer'],
  architecture: ['architect', 'planner'],
  documentation: ['doc-updater'],
  performance: ['performance-analyst'],
  git: [], // Applied globally via MEMORY.md, not per-agent
  _default: ['code-reviewer'],
};

// ─────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

/**
 * Parse simple YAML frontmatter (key: value lines only).
 * Returns object with found keys; empty object on failure.
 */
function parseFrontmatter(content) {
  if (!content.startsWith('---')) return {};
  const end = content.indexOf('\n---', 3);
  if (end === -1) return {};
  const yaml = content.slice(3, end);
  const result = {};
  for (const line of yaml.split('\n')) {
    const m = line.match(/^([\w-]+):\s*(.+)$/);
    if (m) result[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
  return result;
}

/**
 * Extract the "Action" section from an instinct markdown body.
 * Falls back to the first non-empty, non-heading line.
 */
function extractAction(content) {
  const lines = content.split('\n');
  let inAction = false;
  for (const line of lines) {
    if (/^## Action/i.test(line)) {
      inAction = true;
      continue;
    }
    if (inAction) {
      if (line.startsWith('## ')) break; // next section
      const trimmed = line.trim();
      if (trimmed) return trimmed;
    }
  }
  // Fallback: first non-empty non-heading line after frontmatter close
  let pastFrontmatter = false;
  for (const line of lines) {
    if (!pastFrontmatter) {
      if (line === '---') { pastFrontmatter = true; }
      continue;
    }
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) return trimmed;
  }
  return null;
}

/**
 * Map an instinct domain to target agent names.
 */
function domainToAgents(domain) {
  const key = (domain || '').toLowerCase().replace(/[^a-z_]/g, '');
  return DOMAIN_TO_AGENTS[key] || DOMAIN_TO_AGENTS._default;
}

// ─────────────────────────────────────────────
// Read instinct files
// ─────────────────────────────────────────────

/**
 * Walk a directory and return all .md / .yaml / .yml files.
 */
function collectInstinctFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        files.push(...collectInstinctFiles(path.join(dir, entry.name)));
      } else if (/\.(md|yaml|yml)$/.test(entry.name)) {
        files.push(path.join(dir, entry.name));
      }
    }
  } catch { /* skip unreadable */ }
  return files;
}

/**
 * Read and parse all instinct files from global personal dir + all project dirs.
 * Returns array of parsed instinct objects.
 */
function readAllInstincts() {
  const filePaths = [
    ...collectInstinctFiles(GLOBAL_INSTINCTS_DIR),
  ];

  // Include project-scoped instincts
  if (fs.existsSync(PROJECTS_DIR)) {
    try {
      for (const entry of fs.readdirSync(PROJECTS_DIR, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          filePaths.push(...collectInstinctFiles(path.join(PROJECTS_DIR, entry.name, 'instincts')));
        }
      }
    } catch { /* skip */ }
  }

  const instincts = [];
  for (const filePath of filePaths) {
    let content;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch { continue; }

    const meta = parseFrontmatter(content);
    if (!meta.id) continue; // Not a valid instinct file

    const confidence = parseFloat(meta.confidence) || 0;
    const action = extractAction(content);
    if (!action) continue;

    // Parse used count from Evidence section (heuristic)
    const usedMatch = content.match(/Observed (\d+) instance/i) || content.match(/Used (\d+) time/i);
    const usedCount = usedMatch ? parseInt(usedMatch[1]) : 0;

    instincts.push({
      id: meta.id,
      trigger: meta.trigger || '',
      confidence,
      domain: meta.domain || 'unknown',
      scope: meta.scope || 'project',
      action,
      usedCount,
      learned: meta.learned || new Date().toISOString().slice(0, 10),
      filePath,
    });
  }

  return instincts;
}

// ─────────────────────────────────────────────
// Overlay file management
// ─────────────────────────────────────────────

/**
 * Read current overlay for an agent. Returns { lines, header } or null.
 */
function readOverlay(agentName) {
  const filePath = path.join(OVERLAYS_DIR, `${agentName}.md`);
  if (!fs.existsSync(filePath)) return null;
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch { return null; }
}

/**
 * Parse bullet lines from an overlay file. Returns array of strings.
 */
function parseOverlayBullets(content) {
  if (!content) return [];
  return content
    .split('\n')
    .filter(l => l.startsWith('- '))
    .map(l => l.slice(2).trim());
}

/**
 * Write (or update) an overlay file with the given bullets.
 * Preserves existing bullets, appending new ones.
 */
function writeOverlay(agentName, bullets) {
  ensureDir(OVERLAYS_DIR);
  const date = new Date().toISOString().slice(0, 10);
  const header = `## Learned Instincts (auto-generated — do not edit manually)\n<!-- Last updated: ${date} by /agent-evolution -->\n`;
  const body = bullets.map(b => `- ${b}`).join('\n');
  const content = `${header}\n${body}\n`;
  fs.writeFileSync(path.join(OVERLAYS_DIR, `${agentName}.md`), content, 'utf8');
}

/**
 * Append a single instinct bullet to an agent's overlay.
 * Creates the file if it doesn't exist.
 */
function appendToOverlay(agentName, instinctText) {
  const existing = readOverlay(agentName);
  const bullets = parseOverlayBullets(existing);

  // Deduplicate: skip if a bullet with the same prefix already exists
  const prefix = instinctText.slice(0, 40).toLowerCase();
  if (bullets.some(b => b.toLowerCase().startsWith(prefix))) {
    return false; // Already present
  }

  bullets.push(instinctText);
  writeOverlay(agentName, bullets);
  return true;
}

/**
 * Remove bullet(s) matching a prefix from an agent's overlay.
 * Returns number of bullets removed.
 */
function removeFromOverlay(agentName, prefix) {
  const existing = readOverlay(agentName);
  if (!existing) return 0;
  const bullets = parseOverlayBullets(existing);
  const lower = prefix.toLowerCase();
  const filtered = bullets.filter(b => !b.toLowerCase().startsWith(lower));
  const removed = bullets.length - filtered.length;
  if (removed > 0) writeOverlay(agentName, filtered);
  return removed;
}

// ─────────────────────────────────────────────
// CLI Commands
// ─────────────────────────────────────────────

/**
 * list: Show instincts above the confidence threshold, grouped by proposed agent.
 */
function cmdList(args) {
  const thresholdArg = args.indexOf('--threshold');
  const threshold = thresholdArg !== -1 ? parseFloat(args[thresholdArg + 1]) : DEFAULT_THRESHOLD;

  const instincts = readAllInstincts();
  const candidates = instincts.filter(
    i => i.confidence >= threshold && i.usedCount >= MIN_USAGE_COUNT
  );

  if (candidates.length === 0) {
    console.log(`No instincts found above confidence ${threshold} with ${MIN_USAGE_COUNT}+ usages.`);
    console.log('\nTip: Lower the threshold with --threshold 0.5 to see more candidates.');
    return;
  }

  console.log(`Found ${candidates.length} instinct(s) ready for agent promotion (threshold: ${threshold}):\n`);

  let index = 1;
  for (const inst of candidates) {
    const agents = domainToAgents(inst.domain);
    const agentStr = agents.length > 0 ? agents.join(', ') : '(none — domain: git, applied globally)';
    console.log(`${index}. "${inst.action}"`);
    console.log(`   ID: ${inst.id} | Confidence: ${inst.confidence.toFixed(2)} | Domain: ${inst.domain}`);
    console.log(`   → Proposed for: ${agentStr}`);
    console.log();
    index++;
  }

  console.log('To apply all candidates:');
  console.log('  node scripts/agent-evolution.js apply <agent-name> "<instinct text>" --confidence <score>');
}

/**
 * apply: Add an instinct bullet to one or more agent overlays.
 */
function cmdApply(args) {
  const agentName = args[0];
  const instinctText = args[1];
  if (!agentName || !instinctText) {
    console.error('Usage: agent-evolution apply <agent-name> "<instinct-text>" [--confidence 0.80] [--learned YYYY-MM-DD]');
    process.exit(1);
  }

  const confArg = args.indexOf('--confidence');
  const confidence = confArg !== -1 ? parseFloat(args[confArg + 1]) : DEFAULT_THRESHOLD;

  const learnedArg = args.indexOf('--learned');
  const learned = learnedArg !== -1 ? args[learnedArg + 1] : new Date().toISOString().slice(0, 10);

  const bullet = `${instinctText} (confidence: ${confidence.toFixed(2)}, learned: ${learned})`;
  const added = appendToOverlay(agentName, bullet);

  if (added) {
    console.log(`✓ Added instinct to ${agentName} overlay: ${path.join(OVERLAYS_DIR, agentName + '.md')}`);
  } else {
    console.log(`✓ Instinct already present in ${agentName} overlay (skipped duplicate).`);
  }
}

/**
 * show: Print current overlay(s) to stdout.
 */
function cmdShow(args) {
  const agentName = args[0];

  if (agentName) {
    const content = readOverlay(agentName);
    if (!content) {
      console.log(`No overlay found for agent: ${agentName}`);
      console.log(`  Expected: ${path.join(OVERLAYS_DIR, agentName + '.md')}`);
      return;
    }
    console.log(`Overlay for ${agentName}:\n`);
    console.log(content);
    return;
  }

  // No agent name: show all overlays
  if (!fs.existsSync(OVERLAYS_DIR)) {
    console.log('No agent instinct overlays found.');
    console.log(`  Expected directory: ${OVERLAYS_DIR}`);
    return;
  }

  let entries;
  try {
    entries = fs.readdirSync(OVERLAYS_DIR).filter(f => f.endsWith('.md'));
  } catch {
    console.error('Could not read overlays directory:', OVERLAYS_DIR);
    return;
  }

  if (entries.length === 0) {
    console.log('No agent instinct overlays found. Run /agent-evolution to add instincts.');
    return;
  }

  console.log(`Agent instinct overlays (${entries.length}):\n`);
  for (const file of entries) {
    const agentN = file.replace(/\.md$/, '');
    const content = readOverlay(agentN);
    const count = (content?.match(/^- /gm) || []).length;
    console.log(`  ${agentN.padEnd(30)} ${count} instinct${count !== 1 ? 's' : ''}`);
  }
  console.log(`\nDirectory: ${OVERLAYS_DIR}`);
  console.log('Use: agent-evolution show <agent-name> for details.');
}

/**
 * remove: Remove instinct(s) matching a prefix from an agent overlay.
 */
function cmdRemove(args) {
  const agentName = args[0];
  const prefix = args[1];
  if (!agentName || !prefix) {
    console.error('Usage: agent-evolution remove <agent-name> "<instinct-text-prefix>"');
    process.exit(1);
  }

  const removed = removeFromOverlay(agentName, prefix);
  if (removed > 0) {
    console.log(`✓ Removed ${removed} instinct(s) from ${agentName} overlay.`);
  } else {
    console.log(`No matching instincts found in ${agentName} overlay for prefix: "${prefix}"`);
  }
}

// ─────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────

const [,, cmd, ...rest] = process.argv;

switch (cmd) {
  case 'list':
    cmdList(rest);
    break;
  case 'apply':
    cmdApply(rest);
    break;
  case 'show':
    cmdShow(rest);
    break;
  case 'remove':
    cmdRemove(rest);
    break;
  default:
    console.log('agent-evolution — Agent Instinct Overlay Manager\n');
    console.log('Commands:');
    console.log('  list [--threshold 0.75]                                    List promotion candidates');
    console.log('  apply <agent> "<text>" [--confidence 0.80] [--learned date] Add instinct to overlay');
    console.log('  show [<agent>]                                              Show overlay content');
    console.log('  remove <agent> "<prefix>"                                   Remove matching instinct');
    console.log('\nExample:');
    console.log('  node scripts/agent-evolution.js list');
    console.log('  node scripts/agent-evolution.js apply typescript-reviewer "Always flag direct DOM manipulation" --confidence 0.85');
    process.exit(cmd ? 1 : 0);
}
