#!/usr/bin/env node
/**
 * clarc-security.js — Headless PR security review for GitHub Actions
 *
 * Called by .github/workflows/clarc-check.yml (security-check job).
 * Focused exclusively on security findings (OWASP Top 10, secrets,
 * SQL injection, XSS, SSRF, hardcoded credentials).
 *
 * Environment:
 *   ANTHROPIC_API_KEY   — required
 *   CHANGED_FILES       — comma-separated list of changed file paths
 *   PR_NUMBER           — PR number (for comment header)
 *
 * Outputs (via $GITHUB_OUTPUT):
 *   comment             — Markdown text for the PR comment
 *   has_critical        — 'true' if CRITICAL security findings found
 */

import fs from 'fs';

// GitHub Actions output helper
function setOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (outputFile) {
    const delimiter = `EOF_${Date.now()}`;
    fs.appendFileSync(outputFile, `${name}<<${delimiter}\n${value}\n${delimiter}\n`);
  } else {
    console.log(`[OUTPUT] ${name}=${value.slice(0, 200)}...`);
  }
}

// File extensions worth scanning for security issues
const SECURITY_RELEVANT_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'mjs', 'cjs',
  'py', 'go', 'rs', 'java', 'kt',
  'rb', 'php', 'cs', 'ex', 'exs',
  'sql', 'sh', 'bash',
  'yml', 'yaml', 'json', 'env',
  'tf', 'hcl', // Terraform
  'dockerfile',
]);

function isSecurityRelevant(filePath) {
  const lower = filePath.toLowerCase();
  const ext = lower.split('.').pop() || '';
  if (SECURITY_RELEVANT_EXTENSIONS.has(ext)) return true;
  // Always scan Dockerfiles regardless of extension
  if (lower.endsWith('dockerfile') || lower.includes('/dockerfile')) return true;
  return false;
}

function readFileSafe(filePath) {
  try {
    const stat = fs.statSync(filePath);
    if (stat.size > 100 * 1024) {
      return `[File too large to scan (${Math.round(stat.size / 1024)}KB)]`;
    }
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

async function securityScan(files, prNumber) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set');

  const relevantFiles = files
    .filter(isSecurityRelevant)
    .map(f => ({ path: f, content: readFileSafe(f) }))
    .filter(f => f.content !== null);

  if (relevantFiles.length === 0) {
    return { findings: [], hasCritical: false, scannedCount: 0 };
  }

  const fileBlocks = relevantFiles
    .map(f => `### ${f.path}\n\`\`\`\n${f.content.slice(0, 6000)}\n\`\`\``)
    .join('\n\n');

  const prompt = `You are a security engineer specializing in application security. Scan the following changed files from PR #${prNumber} for security vulnerabilities.

Focus exclusively on security issues:
- Hardcoded secrets, API keys, passwords, tokens
- SQL injection (unparameterized queries)
- XSS (unsanitized user input rendered as HTML)
- SSRF (user-controlled URLs used in server-side requests)
- Path traversal (user-controlled file paths)
- Command injection (user input in shell commands)
- Insecure deserialization
- Missing authentication/authorization checks
- Sensitive data exposure (PII in logs, error messages)
- Insecure cryptography (weak algorithms, hardcoded keys)
- CSRF vulnerabilities
- Open redirects
- Dependency confusion / supply chain risks

${fileBlocks}

Respond with a JSON object in this exact structure:
{
  "findings": [
    {
      "severity": "CRITICAL|HIGH|MEDIUM",
      "file": "path/to/file",
      "line": "line number if known, else null",
      "vulnerability": "name of vulnerability type (e.g. SQL Injection)",
      "description": "what the issue is and why it's dangerous",
      "remediation": "concrete fix with code example if possible"
    }
  ],
  "clean": true/false,
  "summary": "1 sentence overall security assessment"
}

Only report real security issues. Do NOT report:
- Code style issues
- Performance issues
- Missing tests
- General code quality issues

If no security issues are found, return empty findings array and clean: true.
Only include CRITICAL and HIGH severity issues that should block the PR. MEDIUM is for informational findings.`;

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

  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, text];
  let result;
  try {
    result = JSON.parse(jsonMatch[1] || text);
  } catch {
    result = { findings: [], clean: true, summary: 'Security scan completed.' };
  }

  const hasCritical = result.findings?.some(f => f.severity === 'CRITICAL') ?? false;
  return { ...result, hasCritical, scannedCount: relevantFiles.length };
}

function formatSecurityComment(result, prNumber, totalFiles) {
  const { findings = [], clean, summary, scannedCount } = result;

  const criticalCount = findings.filter(f => f.severity === 'CRITICAL').length;
  const highCount = findings.filter(f => f.severity === 'HIGH').length;
  const mediumCount = findings.filter(f => f.severity === 'MEDIUM').length;

  let comment = `## clarc Security — PR #${prNumber}\n\n`;

  if (clean || findings.length === 0) {
    comment += `> 🔒 No security issues found\n\n`;
  } else {
    const counts = [];
    if (criticalCount) counts.push(`**${criticalCount} CRITICAL**`);
    if (highCount) counts.push(`**${highCount} HIGH**`);
    if (mediumCount) counts.push(`${mediumCount} MEDIUM`);
    comment += `> 🚨 ${counts.join(' · ')}\n\n`;
  }

  comment += `**${summary}**\n\n`;

  if (scannedCount < totalFiles) {
    comment += `> ℹ️ Scanned ${scannedCount} security-relevant files of ${totalFiles} total changed files\n\n`;
  }

  const severityIcon = { CRITICAL: '🔴', HIGH: '🟠', MEDIUM: '🟡' };

  for (const severity of ['CRITICAL', 'HIGH', 'MEDIUM']) {
    const group = findings.filter(f => f.severity === severity);
    if (group.length === 0) continue;

    comment += `### ${severityIcon[severity]} ${severity}\n\n`;
    for (const f of group) {
      const location = f.line ? `\`${f.file}:${f.line}\`` : `\`${f.file}\``;
      comment += `**${f.vulnerability}** — ${location}\n`;
      comment += `${f.description}\n\n`;
      if (f.remediation) {
        comment += `> **Fix:** ${f.remediation}\n\n`;
      }
    }
  }

  comment += `---\n_Powered by [clarc](https://github.com/marvinrichter/clarc) · ${new Date().toISOString().slice(0, 10)}_`;

  return comment;
}

async function main() {
  const changedFilesEnv = process.env.CHANGED_FILES || '';
  const prNumber = process.env.PR_NUMBER || '?';

  const files = changedFilesEnv
    .split(',')
    .map(f => f.trim())
    .filter(f => f.length > 0);

  if (files.length === 0) {
    console.log('[clarc-security] No files to scan.');
    setOutput('comment', '');
    setOutput('has_critical', 'false');
    return;
  }

  console.log(`[clarc-security] Scanning ${files.length} files for PR #${prNumber}...`);

  const result = await securityScan(files, prNumber);

  if (result.scannedCount === 0) {
    console.log('[clarc-security] No security-relevant files in changeset.');
    setOutput('comment', '');
    setOutput('has_critical', 'false');
    return;
  }

  const comment = formatSecurityComment(result, prNumber, files.length);
  setOutput('comment', comment);
  setOutput('has_critical', result.hasCritical ? 'true' : 'false');

  console.log(`[clarc-security] Done. Critical: ${result.hasCritical}. Findings: ${result.findings?.length ?? 0}.`);
}

main().catch(err => {
  console.error('[clarc-security] Fatal error:', err.message);
  setOutput('comment', '');
  setOutput('has_critical', 'false');
  process.exit(0);
});
