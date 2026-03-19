#!/usr/bin/env node
/**
 * Tests for the clarc MCP server.
 *
 * Since the MCP server uses stdio transport (not directly callable as a function),
 * this test suite validates:
 *   1. Tool manifest — 8 tools are defined with required shape
 *   2. Underlying utility functions used by the tools (searchSkills, detectProjectType)
 *   3. Agent describe logic — reads agents, returns expected shape
 *   4. Health status logic — structure validation
 *   5. Graceful handling of missing / corrupt files
 *
 * Does NOT start the full MCP server (stdio transport is not testable in isolation).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const MCP_SERVER_FILE = path.join(REPO_ROOT, 'mcp-server', 'index.js');
const AGENTS_DIR = path.join(REPO_ROOT, 'agents');
const SKILLS_DIR = path.join(REPO_ROOT, 'skills');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
    failed++;
  }
}

async function asyncTest(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

// ─── 1. Tool manifest shape ───────────────────────────────────────────────────

console.log('\n--- MCP Tool manifest ---\n');

const EXPECTED_TOOLS = [
  'get_instinct_status',
  'get_session_context',
  'get_project_context',
  'skill_search',
  'agent_describe',
  'rule_check',
  'get_component_graph',
  'get_health_status'
];

test('mcp-server/index.js exists', () => {
  assert(fs.existsSync(MCP_SERVER_FILE), `Not found: ${MCP_SERVER_FILE}`);
});

// Extract TOOLS array by reading the file source (regex approach — no import needed)
let toolsFromSource = [];
test('index.js defines all 8 required tools', () => {
  const src = fs.readFileSync(MCP_SERVER_FILE, 'utf8');
  for (const toolName of EXPECTED_TOOLS) {
    assert(src.includes(`name: '${toolName}'`) || src.includes(`name: "${toolName}"`),
      `Tool "${toolName}" not found in mcp-server/index.js`);
  }
  // Count tool definitions
  const nameMatches = [...src.matchAll(/name:\s*['"](\w+)['"]/g)].map(m => m[1]);
  toolsFromSource = nameMatches.filter(n => EXPECTED_TOOLS.includes(n));
  assert(toolsFromSource.length === EXPECTED_TOOLS.length,
    `Expected ${EXPECTED_TOOLS.length} tools, found ${toolsFromSource.length}: ${toolsFromSource.join(', ')}`);
});

test('each tool has description field in source', () => {
  const src = fs.readFileSync(MCP_SERVER_FILE, 'utf8');
  for (const toolName of EXPECTED_TOOLS) {
    // Each tool block should have both name and description nearby
    const toolIdx = src.indexOf(`'${toolName}'`);
    const region = src.slice(Math.max(0, toolIdx - 50), toolIdx + 300);
    assert(region.includes('description:'),
      `Tool "${toolName}" appears to be missing a description field`);
  }
});

test('each tool has inputSchema field in source', () => {
  const src = fs.readFileSync(MCP_SERVER_FILE, 'utf8');
  for (const toolName of EXPECTED_TOOLS) {
    const toolIdx = src.indexOf(`'${toolName}'`);
    const region = src.slice(Math.max(0, toolIdx), toolIdx + 500);
    assert(region.includes('inputSchema:'),
      `Tool "${toolName}" appears to be missing an inputSchema field`);
  }
});

// ─── 2. searchSkills utility ──────────────────────────────────────────────────

console.log('\n--- skill_search underlying utility ---\n');

const { searchSkills } = await import('../../scripts/lib/skill-search.js');

await asyncTest('searchSkills("testing") returns { results } object', async () => {
  const res = searchSkills('testing', { limit: 5, skillsDir: SKILLS_DIR });
  assert(res && typeof res === 'object', `Expected object, got ${typeof res}`);
  assert(Array.isArray(res.results), `Expected res.results to be an array, got ${typeof res.results}`);
});

await asyncTest('searchSkills("testing") returns at least 1 result', async () => {
  const res = searchSkills('testing', { limit: 10, skillsDir: SKILLS_DIR });
  assert(res.results.length >= 1, `Expected at least 1 result for "testing", got ${res.results.length}`);
});

await asyncTest('searchSkills result item has name/slug and description', async () => {
  const res = searchSkills('python', { limit: 3, skillsDir: SKILLS_DIR });
  if (res.results.length === 0) return; // No results = not a failure for shape check
  const first = res.results[0];
  assert(typeof first.name === 'string' || typeof first.slug === 'string',
    `Result missing name/slug: ${JSON.stringify(Object.keys(first))}`);
  assert(typeof first.description === 'string',
    `Result missing description: ${JSON.stringify(Object.keys(first))}`);
});

await asyncTest('searchSkills("zzz-nonexistent-xyz") returns 0 results', async () => {
  const res = searchSkills('zzz-nonexistent-xyz-query-that-matches-nothing', { limit: 10, skillsDir: SKILLS_DIR });
  assert(res && Array.isArray(res.results), 'Should return { results: [] }, not throw');
  assert(res.results.length === 0, `Expected 0 results, got ${res.results.length}`);
});

// ─── 3. detectProjectType utility ────────────────────────────────────────────

console.log('\n--- get_project_context underlying utility ---\n');

const { detectProjectType } = await import('../../scripts/lib/project-detect.js');

await asyncTest('detectProjectType(repoRoot) returns object', async () => {
  const result = detectProjectType(REPO_ROOT);
  assert(result && typeof result === 'object', `Expected object, got ${typeof result}`);
});

await asyncTest('detectProjectType result has projectType or detected field', async () => {
  const result = detectProjectType(REPO_ROOT);
  const hasType = 'projectType' in result || 'type' in result || 'detected' in result
    || 'languages' in result || 'stacks' in result;
  assert(hasType, `Result missing type/detected/languages/stacks: ${JSON.stringify(Object.keys(result))}`);
});

await asyncTest('detectProjectType handles nonexistent dir gracefully', async () => {
  // Should not throw
  const result = detectProjectType('/tmp/clarc-nonexistent-dir-xyz-12345');
  assert(result && typeof result === 'object', 'Should return object even for missing dir');
});

// ─── 4. agent_describe logic ──────────────────────────────────────────────────

console.log('\n--- agent_describe logic ---\n');

test('agents/ directory has at least 50 .md files', () => {
  const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
  assert(files.length >= 50, `Expected >= 50 agent files, got ${files.length}`);
});

test('tdd-guide.md can be read and has frontmatter', () => {
  const agentFile = path.join(AGENTS_DIR, 'tdd-guide.md');
  assert(fs.existsSync(agentFile), 'tdd-guide.md not found');
  const content = fs.readFileSync(agentFile, 'utf8');
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  assert(fmMatch !== null, 'tdd-guide.md has no frontmatter');
});

test('agent_describe for nonexistent agent returns available_agents', () => {
  // Replicate the handler logic
  const name = 'nonexistent-agent-xyz';
  const agentFile = path.join(AGENTS_DIR, `${name}.md`);
  const found = fs.existsSync(agentFile);
  assert(!found, 'nonexistent-agent-xyz should not exist');
  const available = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md')).map(f => f.replace('.md', ''));
  assert(available.length > 0, 'available_agents list should be non-empty');
});

// ─── 5. get_component_graph — agent→skill refs ───────────────────────────────

console.log('\n--- get_component_graph data ---\n');

test('at least one agent has uses_skills in frontmatter', () => {
  const files = fs.readdirSync(AGENTS_DIR).filter(f => f.endsWith('.md'));
  let found = false;
  for (const f of files) {
    const content = fs.readFileSync(path.join(AGENTS_DIR, f), 'utf8');
    if (content.includes('uses_skills:')) { found = true; break; }
  }
  assert(found, 'No agent has uses_skills: field — component graph will be empty');
});

test('skills/SKILL_AGENTS.md reverse index exists', () => {
  const indexPath = path.join(SKILLS_DIR, 'SKILL_AGENTS.md');
  assert(fs.existsSync(indexPath), 'SKILL_AGENTS.md not found — run generate-skill-agents-index.js');
});

// ─── 6. get_health_status — key directories exist ─────────────────────────────

console.log('\n--- get_health_status data prerequisites ---\n');

test('agents/ directory exists', () => {
  assert(fs.existsSync(AGENTS_DIR), `agents/ not found at ${AGENTS_DIR}`);
});

test('skills/ directory exists', () => {
  assert(fs.existsSync(SKILLS_DIR), `skills/ not found at ${SKILLS_DIR}`);
});

test('hooks/hooks.json exists', () => {
  const hooksFile = path.join(REPO_ROOT, 'hooks', 'hooks.json');
  assert(fs.existsSync(hooksFile), 'hooks/hooks.json not found');
  JSON.parse(fs.readFileSync(hooksFile, 'utf8')); // validates JSON
});

test('skills/INDEX.md exists', () => {
  const indexFile = path.join(SKILLS_DIR, 'INDEX.md');
  assert(fs.existsSync(indexFile), 'skills/INDEX.md not found — health check will warn');
});

// ─── Results ──────────────────────────────────────────────────────────────────

console.log(`\nPassed: ${passed}`);
console.log(`Failed: ${failed}`);
process.exit(failed > 0 ? 1 : 0);
