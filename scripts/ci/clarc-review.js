#!/usr/bin/env node
/**
 * clarc-review.js — Headless PR code review for GitHub Actions
 *
 * Called by .github/workflows/clarc-check.yml.
 * Reads changed files from env, calls the Anthropic API with the
 * language-appropriate reviewer persona, and outputs a GitHub PR comment.
 *
 * Environment:
 *   ANTHROPIC_API_KEY   — required
 *   CHANGED_FILES       — comma-separated list of changed file paths
 *   PR_NUMBER           — PR number (for comment header)
 *   PR_TITLE            — PR title (for context)
 *   TOTAL_FILES         — total changed file count (may exceed the capped 20)
 *
 * Outputs (via $GITHUB_OUTPUT):
 *   comment             — Markdown text for the PR comment
 *   has_critical        — 'true' if CRITICAL findings found
 */

import fs from 'fs';

// GitHub Actions output helper
function setOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    // Use delimiter syntax to handle multiline values
    const delimiter = `EOF_${Date.now()}`;
    fs.appendFileSync(outputFile, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
  } else {
    // Local dev fallback
    console.log(`[OUTPUT] ${name}=${value.slice(0, 200)}...`);
  }
}

// Language → reviewer persona mapping (mirrors agents/ reviewer descriptions)
const LANGUAGE_PERSONAS = {
  ts: 'TypeScript/JavaScript expert reviewing for type safety, DDD, hexagonal architecture, and security',
  tsx: 'React/TypeScript expert reviewing for component patterns, hooks, and performance',
  js: 'JavaScript expert reviewing for modern patterns, security, and performance',
  mjs: 'JavaScript ESM expert reviewing for module patterns and security',
  py: 'Python expert reviewing for PEP 8, type hints, Pythonic idioms, and security',
  go: 'Go expert reviewing for idiomatic Go, concurrency, error handling, and performance',
  rs: 'Rust expert reviewing for ownership, borrowing, async patterns, and safety',
  java: 'Java expert reviewing for Spring Boot patterns, JPA, security, and clean code',
  kt: 'Kotlin expert reviewing for idiomatic Kotlin, coroutines, and Android patterns',
  swift: 'Swift expert reviewing for Swift concurrency, protocol architecture, and SwiftUI patterns',
  rb: 'Ruby expert reviewing for Rails patterns, security (Brakeman), and N+1 detection',
  ex: 'Elixir expert reviewing for OTP patterns, Ecto queries, and functional idioms',
  exs: 'Elixir expert reviewing for OTP patterns, Ecto queries, and functional idioms',
  cpp: 'C++ expert reviewing for C++ Core Guidelines, C++20/23, memory safety, and RAII',
  cs: 'C# expert reviewing for C# 12/.NET 8 idioms, nullable types, and async correctness',
  php: 'PHP expert reviewing for PHP 8.2+ idioms, PSR-12, strict types, and security',
  sql: 'PostgreSQL expert reviewing for query optimization, schema design, and security',
  sh: 'Bash expert reviewing for set -euo pipefail, quoting, shellcheck issues, and security',
  bash: 'Bash expert reviewing for safety, idiomatic style, and portability',
  yml: 'YAML/CI expert reviewing for correctness, security, and best practices',
  yaml: 'YAML/CI expert reviewing for correctness, security, and best practices',
};

function getPersona(filePath) {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  return LANGUAGE_PERSONAS[ext] || 'Software engineer reviewing for code quality, security, and best practices';
}

function readFileSafe(filePath) {
  try {
    const stat = fs.statSync(filePath);
    // Skip large files (> 100KB) — too expensive to review
    if (stat.size > 100 * 1024) {
      return `[File too large to review (${Math.round(stat.size / 1024)}KB)]`;
    }
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function reviewFiles(files, prNumber, prTitle, totalFiles) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const reviewedFiles = [];
  for (const file of files) {
    const content = readFileSafe(file);
    if (content === null) continue; // deleted file
    reviewedFiles.push({ path: file, content });
  }

  if (reviewedFiles.length === 0) {
    return { comment: '', hasCritical: false };
  }

  // Build a single review request with all files
  const fileBlocks = reviewedFiles
    .map(f => `### ${f.path}\n\`\`\`\n${f.content.slice(0, 8000)}\n\`\`\``)
    .join('\n\n');

  const persona = reviewedFiles.length === 1
    ? getPersona(reviewedFiles[0].path)
    : 'Senior software engineer reviewing multi-language code for quality, security, and best practices';

  const prompt = `You are a ${persona}.

Review the following changed files from PR #${prNumber}${prTitle ? ` "${prTitle}"` : ''} and provide a structured code review.

${totalFiles > files.length ? `Note: This PR changed ${totalFiles} files total. Reviewing the first ${files.length}.` : ''}

${fileBlocks}

Respond with a JSON object in this exact structure:
{
  "summary": "1-2 sentence overall assessment",
  "findings": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "file": "path/to/file.ts",
      "line": "line number or range if known, else null",
      "issue": "concise description of the issue",
      "suggestion": "concrete fix suggestion"
    }
  ],
  "positives": ["list of good things noticed (max 3)"]
}

Severity guide:
- CRITICAL: Security vulnerabilities, data loss bugs, breaking changes
- HIGH: Logic errors, missing error handling, performance regressions
- MEDIUM: Code quality issues, missing tests, style violations
- LOW: Minor improvements, nitpicks

Only include findings that are real issues. Return empty findings array if the code looks good.`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  const text = data.content?.[0]?.text || '';

  // Parse JSON from response (handle markdown code fences)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, text];
  let review;
  try {
    review = JSON.parse(jsonMatch[1] || text);
  } catch {
    review = { summary: text, findings: [], positives: [] };
  }

  return { review, hasCritical: review.findings?.some(f => f.severity === 'CRITICAL') ?? false };
}

function formatComment(review, prNumber, files, totalFiles) {
  const { summary, findings = [], positives = [] } = review;

  const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
  const highCount = findings.filter(f => f.severity === 'HIGH').length;
  const mediumCount = findings.filter(f => f.severity === 'MEDIUM').length;
  const lowCount = findings.filter(f => f.severity === 'LOW').length;

  const severityIcon = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡', LOW: '🔵' };
  const hasIssues = findings.length > 0;

  let comment = `## clarc Review — PR #${prNumber}\n\n`;

  if (hasIssues) {
    const counts = [];
    if (criticalCount) counts.push(`**${criticalCount} CRITICAL**`);
    if (highCount) counts.push(`**${highCount} HIGH**`);
    if (mediumCount) counts.push(`${mediumCount} MEDIUM`);
    if (lowCount) counts.push(`${lowCount} LOW`);
    comment += `> ${counts.join(' · ')}\n\n`;
  } else {
    comment += `> ✅ No issues found\n\n`;
  }

  comment += `**Summary:** ${summary}\n\n`;

  if (totalFiles > files.length) {
    comment += `> ℹ️ Reviewed ${files.length} of ${totalFiles} changed files (capped at 20 for cost control)\n\n`;
  }

  // Group findings by severity
  for (const severity of ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']) {
    const group = findings.filter(f => f.severity === severity);
    if (group.length === 0) continue;

    comment += `### ${severityIcon[severity]} ${severity}\n\n`;
    for (const f of group) {
      const location = f.line ? `\`${f.file}:${f.line}\`` : `\`${f.file}\``;
      comment += `- ${location} — ${f.issue}\n`;
      if (f.suggestion) {
        comment += `  - 💡 ${f.suggestion}\n`;
      }
    }
    comment += '\n';
  }

  if (positives.length > 0) {
    comment += `### ✅ Looks good\n\n`;
    for (const p of positives) {
      comment += `- ${p}\n`;
    }
    comment += '\n';
  }

  comment += `---\n_Powered by [clarc](https://github.com/marvinrichter/clarc) · ${new Date().toISOString().slice(0, 10)}_`;

  return comment;
}

async function main() {
  const changedFilesEnv = process.env.CHANGED_FILES || '';
  const prNumber = process.env.PR_NUMBER || '?';
  const prTitle = process.env.PR_TITLE || '';
  const totalFiles = parseInt(process.env.TOTAL_FILES || '0', 10);

  const files = changedFilesEnv
    .split(',')
    .map(f => f.trim())
    .filter(f => f.length > 0);

  if (files.length === 0) {
    console.log('[clarc-review] No files to review.');
    setOutput('comment', '');
    setOutput('has_critical', 'false');
    return;
  }

  console.log(`[clarc-review] Reviewing ${files.length} files for PR #${prNumber}...`);

  const { review, hasCritical } = await reviewFiles(files, prNumber, prTitle, totalFiles);

  if (!review) {
    setOutput('comment', '');
    setOutput('has_critical', 'false');
    return;
  }

  const comment = formatComment(review, prNumber, files, totalFiles);
  setOutput('comment', comment);
  setOutput('has_critical', hasCritical ? 'true' : 'false');

  console.log(`[clarc-review] Done. Critical: ${hasCritical}. Findings: ${review.findings?.length ?? 0}.`);
}

main().catch(err => {
  console.error('[clarc-review] Fatal error:', err.message);
  setOutput('comment', '');
  setOutput('has_critical', 'false');
  process.exit(0); // Don't fail the CI run on script errors
});
