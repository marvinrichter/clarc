#!/usr/bin/env node
/**
 * Shared helper for artifact tests.
 *
 * Exports:
 *   parseFrontmatter(content)  — { meta, body } or null
 *   findAllAgents()            — array of { file, path, content }
 *   findAllSkills()            — array of { dir, path, content }
 *   findAllCommands()          — array of { file, path, content }
 *   findAllHooks()             — parsed hooks.json object
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(__dirname, '../..');

export const AGENTS_DIR   = path.join(REPO_ROOT, 'agents');
export const SKILLS_DIR   = path.join(REPO_ROOT, 'skills');
export const COMMANDS_DIR = path.join(REPO_ROOT, 'commands');
export const HOOKS_FILE   = path.join(REPO_ROOT, 'hooks', 'hooks.json');
export const SCRIPTS_DIR  = path.join(REPO_ROOT, 'scripts');

/**
 * Parse YAML-style frontmatter from a markdown string.
 * Returns { meta, body } where meta is a plain object of top-level key: value pairs.
 * Returns null if no frontmatter block is found.
 */
export function parseFrontmatter(content) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return null;
  const meta = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([\w][\w-]*):\s*(.*)/);
    if (kv) meta[kv[1].trim()] = kv[2].trim().replace(/^["']|["']$/g, '');
  }
  return { meta, body: m[2] };
}

/** Returns all agent .md files as { file, path, content }. */
export function findAllAgents() {
  return fs.readdirSync(AGENTS_DIR)
    .filter(f => f.endsWith('.md'))
    .sort()
    .map(f => ({
      file: f,
      path: path.join(AGENTS_DIR, f),
      content: fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8')
    }));
}

/** Returns all skill dirs with SKILL.md as { dir, path, content }. */
export function findAllSkills() {
  return fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(e => {
      const skillPath = path.join(SKILLS_DIR, e.name, 'SKILL.md');
      return {
        dir: e.name,
        path: skillPath,
        content: fs.existsSync(skillPath) ? fs.readFileSync(skillPath, 'utf8') : null
      };
    });
}

/** Returns all command .md files as { file, path, content }. */
export function findAllCommands() {
  return fs.readdirSync(COMMANDS_DIR)
    .filter(f => f.endsWith('.md'))
    .sort()
    .map(f => ({
      file: f,
      path: path.join(COMMANDS_DIR, f),
      content: fs.readFileSync(path.join(COMMANDS_DIR, f), 'utf8')
    }));
}

/** Returns parsed hooks.json or null. */
export function findAllHooks() {
  if (!fs.existsSync(HOOKS_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(HOOKS_FILE, 'utf8'));
  } catch {
    return null;
  }
}
