#!/usr/bin/env node
/**
 * Behavior Eval Runner — LLM-as-judge for clarc agent behavior.
 *
 * Sends test prompts to Claude API, evaluates responses against criteria.
 * Uses claude-haiku-4-5-20251001 for cost efficiency.
 *
 * Usage:
 *   node tests/evals/behavior/runner.js [--agent <name>] [--output <dir>]
 *
 * Env:
 *   ANTHROPIC_API_KEY — required
 *
 * Output:
 *   tests/evals/behavior/results/<agent>-results.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CASES_DIR = path.join(__dirname, 'cases');
const RESULTS_DIR = path.join(__dirname, 'results');

const args = process.argv.slice(2);
const agentFilter = args[args.indexOf('--agent') + 1] || null;
const outputDir = args[args.indexOf('--output') + 1] || RESULTS_DIR;

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) {
  console.error('Error: ANTHROPIC_API_KEY environment variable required');
  process.exit(1);
}

/**
 * Send a prompt to Claude and get a response.
 * Uses Haiku 4.5 for cost efficiency in evals.
 */
async function callClaude(systemPrompt, userPrompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || '';
}

/**
 * Evaluate a response against expected/forbidden patterns.
 */
function evaluateResponse(responseText, testCase) {
  const results = {
    passed: true,
    failures: [],
    warnings: []
  };

  const lowerText = responseText.toLowerCase();

  // Check expected patterns
  for (const pattern of (testCase.expected_patterns || [])) {
    const re = new RegExp(pattern, 'i');
    if (!re.test(responseText)) {
      results.passed = false;
      results.failures.push(`Missing expected pattern: "${pattern}"`);
    }
  }

  // Check forbidden patterns
  for (const pattern of (testCase.forbidden_patterns || [])) {
    if (!pattern) continue;
    const re = new RegExp(pattern, 'is');
    if (re.test(responseText)) {
      results.passed = false;
      results.failures.push(`Contains forbidden pattern: "${pattern}"`);
    }
  }

  // Check length bounds
  if (testCase.min_length && responseText.length < testCase.min_length) {
    results.passed = false;
    results.failures.push(`Response too short: ${responseText.length} < ${testCase.min_length}`);
  }
  if (testCase.max_length && responseText.length > testCase.max_length) {
    results.warnings.push(`Response longer than expected: ${responseText.length} > ${testCase.max_length}`);
  }

  return results;
}

/**
 * Load agent system prompt from agents/ directory.
 */
function loadAgentPrompt(agentName) {
  const agentFile = path.join(__dirname, '../../../agents', `${agentName}.md`);
  if (!fs.existsSync(agentFile)) return `You are a ${agentName} agent.`;

  const content = fs.readFileSync(agentFile, 'utf8');
  // Strip YAML frontmatter
  return content.replace(/^---[\s\S]*?---\n/, '').trim();
}

async function runEvals() {
  fs.mkdirSync(outputDir, { recursive: true });

  const caseFiles = fs.readdirSync(CASES_DIR)
    .filter(f => f.endsWith('.json'))
    .filter(f => !agentFilter || f.startsWith(agentFilter));

  if (caseFiles.length === 0) {
    console.log(`No eval cases found${agentFilter ? ` for agent: ${agentFilter}` : ''}`);
    process.exit(0);
  }

  let totalPassed = 0;
  let totalFailed = 0;

  for (const caseFile of caseFiles) {
    const casePath = path.join(CASES_DIR, caseFile);
    const suite = JSON.parse(fs.readFileSync(casePath, 'utf8'));
    const agentName = suite.agent;

    console.log(`\nEvaluating agent: ${agentName} (${suite.cases.length} cases)`);
    console.log(`  ${suite.description}`);

    const systemPrompt = loadAgentPrompt(agentName);
    const suiteResults = {
      agent: agentName,
      description: suite.description,
      run_at: new Date().toISOString(),
      model: 'claude-haiku-4-5-20251001',
      cases: []
    };

    for (const testCase of suite.cases) {
      process.stdout.write(`  [${testCase.id}] ${testCase.description} ... `);

      try {
        const response = await callClaude(systemPrompt, testCase.prompt);
        const evaluation = evaluateResponse(response, testCase);

        if (evaluation.passed) {
          process.stdout.write('PASS\n');
          totalPassed++;
        } else {
          process.stdout.write('FAIL\n');
          for (const failure of evaluation.failures) {
            console.log(`    - ${failure}`);
          }
          totalFailed++;
        }

        suiteResults.cases.push({
          id: testCase.id,
          description: testCase.description,
          passed: evaluation.passed,
          failures: evaluation.failures,
          warnings: evaluation.warnings,
          response_length: response.length,
          response_preview: response.slice(0, 200)
        });

        // Rate limit: small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        process.stdout.write(`ERROR: ${err.message}\n`);
        totalFailed++;
        suiteResults.cases.push({
          id: testCase.id,
          description: testCase.description,
          passed: false,
          failures: [`API error: ${err.message}`],
          warnings: []
        });
      }
    }

    // Write results
    const resultFile = path.join(outputDir, `${agentName}-results.json`);
    fs.writeFileSync(resultFile, JSON.stringify(suiteResults, null, 2), 'utf8');
    console.log(`  Results saved: ${resultFile}`);
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Behavior Evals Complete: ${totalPassed} passed, ${totalFailed} failed`);
  console.log(`Results directory: ${outputDir}`);

  process.exit(totalFailed > 0 ? 1 : 0);
}

runEvals().catch(err => {
  console.error('Runner error:', err.message);
  process.exit(1);
});
