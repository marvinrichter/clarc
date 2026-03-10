#!/usr/bin/env node
/**
 * Generate a coverage map: Developer Scenario → {Command, Agent, Skill} coverage.
 *
 * Outputs: docs/system-review/coverage-map.md
 * Each scenario is marked:
 *   ✅ — Command + Agent + Skill all present
 *   🟡 — Partial coverage (some components missing)
 *   ❌ — No coverage
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '../..');

const AGENTS_DIR = path.join(ROOT, 'agents');
const SKILLS_DIR = path.join(ROOT, 'skills');
const COMMANDS_DIR = path.join(ROOT, 'commands');
const OUTPUT_DIR = path.join(ROOT, 'docs/system-review');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'coverage-map.md');

// ─── Scenario Definitions ──────────────────────────────────────────────────

const SCENARIOS = [
  // Coding Workflow
  { category: 'Coding Workflow', name: 'Implement new feature', commands: ['plan', 'tdd'], agents: ['planner', 'tdd-guide'], skills: ['tdd-workflow'] },
  { category: 'Coding Workflow', name: 'Fix a bug', commands: ['tdd', 'build-fix'], agents: ['tdd-guide', 'build-error-resolver'], skills: ['debugging-workflow'] },
  { category: 'Coding Workflow', name: 'Refactor code', commands: ['refactor'], agents: ['refactor-cleaner'], skills: [] },
  { category: 'Coding Workflow', name: 'Code review', commands: ['code-review'], agents: ['code-reviewer'], skills: [] },
  { category: 'Coding Workflow', name: 'Fix build errors', commands: ['build-fix'], agents: ['build-error-resolver'], skills: [] },
  { category: 'Coding Workflow', name: 'Security review', commands: ['security'], agents: ['security-reviewer'], skills: ['security-review'] },

  // Testing
  { category: 'Testing', name: 'Write tests (TDD)', commands: ['tdd'], agents: ['tdd-guide'], skills: ['tdd-workflow'] },
  { category: 'Testing', name: 'E2E testing', commands: ['e2e'], agents: ['e2e-runner'], skills: ['e2e-testing'] },
  { category: 'Testing', name: 'Test coverage audit', commands: ['test-coverage'], agents: [], skills: [] },
  { category: 'Testing', name: 'Load testing', commands: [], agents: [], skills: ['load-testing'] },

  // Architecture
  { category: 'Architecture', name: 'Architecture decision (ADR)', commands: ['explore'], agents: ['solution-designer'], skills: ['adr-writing'] },
  { category: 'Architecture', name: 'API contract design', commands: [], agents: [], skills: ['api-contract', 'api-design'] },
  { category: 'Architecture', name: 'Database schema design', commands: ['database-review'], agents: ['database-reviewer'], skills: ['postgres-patterns'] },
  { category: 'Architecture', name: 'arc42 documentation', commands: ['arc42'], agents: [], skills: ['arc42-c4'] },

  // DevOps
  { category: 'DevOps', name: 'CI/CD setup', commands: ['setup-ci'], agents: [], skills: ['ci-cd-patterns'] },
  { category: 'DevOps', name: 'Deployment planning', commands: [], agents: [], skills: ['deployment-patterns'] },
  { category: 'DevOps', name: 'Incident management', commands: ['incident'], agents: [], skills: ['incident-response'] },
  { category: 'DevOps', name: 'SLO definition', commands: ['slo'], agents: [], skills: ['slo-workflow'] },
  { category: 'DevOps', name: 'Observability setup', commands: [], agents: [], skills: ['observability'] },

  // Product
  { category: 'Product', name: 'Idea evaluation', commands: ['evaluate'], agents: ['product-evaluator'], skills: ['product-lifecycle'] },
  { category: 'Product', name: 'PRD writing', commands: ['prd'], agents: [], skills: ['product-lifecycle'] },
  { category: 'Product', name: 'User feedback analysis', commands: ['analyze-feedback'], agents: ['feedback-analyst'], skills: [] },
  { category: 'Product', name: 'Competitive analysis', commands: ['competitive-review'], agents: ['workflow-os-competitor-analyst'], skills: [] },

  // AI/LLM
  { category: 'AI/LLM', name: 'Prompt engineering', commands: [], agents: ['prompt-quality-scorer'], skills: [] },
  { category: 'AI/LLM', name: 'RAG implementation', commands: [], agents: [], skills: ['rag-patterns'] },
  { category: 'AI/LLM', name: 'Agent system design', commands: [], agents: [], skills: ['autonomous-loops'] },
  { category: 'AI/LLM', name: 'Eval harness', commands: ['learn-eval'], agents: [], skills: ['eval-harness'] },
  { category: 'AI/LLM', name: 'LLM cost optimization', commands: [], agents: [], skills: ['cost-aware-llm-pipeline'] },

  // clarc System Review
  { category: 'Self-Review', name: 'Agent quality review', commands: ['agent-audit'], agents: ['agent-quality-reviewer'], skills: [] },
  { category: 'Self-Review', name: 'Skill depth analysis', commands: ['skill-depth'], agents: ['skill-depth-analyzer'], skills: [] },
  { category: 'Self-Review', name: 'Command audit', commands: ['command-audit'], agents: ['command-auditor'], skills: [] },
  { category: 'Self-Review', name: 'Hook audit', commands: ['hook-audit'], agents: ['hook-auditor'], skills: [] },
  { category: 'Self-Review', name: 'Full system review', commands: ['system-review'], agents: ['agent-system-reviewer'], skills: [] },
];

// ─── Inventory ──────────────────────────────────────────────────────────────

function listCommands() {
  try {
    return fs.readdirSync(COMMANDS_DIR)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace(/\.md$/, ''));
  } catch {
    return [];
  }
}

function listAgents() {
  try {
    return fs.readdirSync(AGENTS_DIR)
      .filter(f => f.endsWith('.md'))
      .map(f => f.replace(/\.md$/, ''));
  } catch {
    return [];
  }
}

function listSkills() {
  try {
    return fs.readdirSync(SKILLS_DIR)
      .filter(d => fs.existsSync(path.join(SKILLS_DIR, d, 'SKILL.md')));
  } catch {
    return [];
  }
}

// ─── Coverage Computation ───────────────────────────────────────────────────

function computeCoverage(scenario, commands, agents, skills) {
  const foundCommands = scenario.commands.filter(c => commands.includes(c));
  const foundAgents = scenario.agents.filter(a => agents.includes(a));
  const foundSkills = scenario.skills.filter(s => skills.includes(s));

  const hasCommand = scenario.commands.length === 0 || foundCommands.length > 0;
  const hasAgent = scenario.agents.length === 0 || foundAgents.length > 0;
  const hasSkill = scenario.skills.length === 0 || foundSkills.length > 0;

  const missingCommands = scenario.commands.filter(c => !commands.includes(c));
  const missingAgents = scenario.agents.filter(a => !agents.includes(a));
  const missingSkills = scenario.skills.filter(s => !skills.includes(s));

  const allPresent = hasCommand && hasAgent && hasSkill;
  const nonePresent = !hasCommand && !hasAgent && !hasSkill &&
    (scenario.commands.length + scenario.agents.length + scenario.skills.length) > 0;

  const status = allPresent ? '✅' : nonePresent ? '❌' : '🟡';

  const missing = [
    ...missingCommands.map(c => `/${c}`),
    ...missingAgents.map(a => `agent:${a}`),
    ...missingSkills.map(s => `skill:${s}`),
  ];

  return {
    status,
    foundCommands,
    foundAgents,
    foundSkills,
    missingCommands,
    missingAgents,
    missingSkills,
    missing,
  };
}

// ─── Report Generation ──────────────────────────────────────────────────────

function generateReport(results) {
  const date = new Date().toISOString().split('T')[0];
  const total = results.length;
  const full = results.filter(r => r.coverage.status === '✅').length;
  const partial = results.filter(r => r.coverage.status === '🟡').length;
  const none = results.filter(r => r.coverage.status === '❌').length;

  const lines = [
    `# clarc Developer Scenario Coverage Map`,
    `**Generated:** ${date}`,
    `**Total scenarios:** ${total} | ✅ Full: ${full} | 🟡 Partial: ${partial} | ❌ None: ${none}`,
    '',
    '---',
    '',
  ];

  let currentCategory = '';
  for (const { scenario, coverage } of results) {
    if (scenario.category !== currentCategory) {
      currentCategory = scenario.category;
      lines.push(`## ${currentCategory}`, '');
      lines.push('| Scenario | Status | Command | Agent | Skill | Missing |');
      lines.push('|----------|--------|---------|-------|-------|---------|');
    }

    const cmdCell = coverage.foundCommands.map(c => `/${c}`).join(', ') || '—';
    const agentCell = coverage.foundAgents.join(', ') || '—';
    const skillCell = coverage.foundSkills.join(', ') || '—';
    const missingCell = coverage.missing.join(', ') || '—';

    lines.push(`| ${scenario.name} | ${coverage.status} | ${cmdCell} | ${agentCell} | ${skillCell} | ${missingCell} |`);

    // Add blank line after last item in a category
    const nextIdx = results.findIndex(r => r.scenario === scenario) + 1;
    if (nextIdx >= results.length || results[nextIdx].scenario.category !== currentCategory) {
      lines.push('');
    }
  }

  // Priority gaps
  const gaps = results
    .filter(r => r.coverage.status !== '✅')
    .sort((a, b) => {
      // Sort: none first, then partial; within those sort by missing count
      if (a.coverage.status === '❌' && b.coverage.status !== '❌') return -1;
      if (b.coverage.status === '❌' && a.coverage.status !== '❌') return 1;
      return b.coverage.missing.length - a.coverage.missing.length;
    });

  if (gaps.length > 0) {
    lines.push('---', '', '## Prioritized Gaps', '');
    lines.push('| Priority | Scenario | Category | Missing Components |');
    lines.push('|----------|----------|----------|-------------------|');
    gaps.forEach(({ scenario, coverage }, i) => {
      lines.push(`| P${i + 1} | ${scenario.name} | ${scenario.category} | ${coverage.missing.join(', ')} |`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

// ─── Main ──────────────────────────────────────────────────────────────────

const commands = listCommands();
const agents = listAgents();
const skills = listSkills();

const results = SCENARIOS.map(scenario => ({
  scenario,
  coverage: computeCoverage(scenario, commands, agents, skills),
}));

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const report = generateReport(results);
fs.writeFileSync(OUTPUT_FILE, report, 'utf8');

const full = results.filter(r => r.coverage.status === '✅').length;
const partial = results.filter(r => r.coverage.status === '🟡').length;
const none = results.filter(r => r.coverage.status === '❌').length;

console.log(`Coverage map generated: docs/system-review/coverage-map.md`);
console.log(`Scenarios: ${results.length} total | ✅ ${full} full | 🟡 ${partial} partial | ❌ ${none} none`);

process.exit(0);
