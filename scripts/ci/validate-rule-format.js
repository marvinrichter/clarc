#!/usr/bin/env node
/**
 * validate-rule-format — CI linter for clarc rule files.
 *
 * Enforces the rules-format.md contract:
 *   - File must be ≤ 80 lines
 *   - No code block may exceed 5 lines
 *   - File must contain at least one checklist item (- [ ])
 *
 * Usage:
 *   node scripts/ci/validate-rule-format.js            # check all rules
 *   node scripts/ci/validate-rule-format.js --fix      # print violations only (no auto-fix)
 *   node scripts/ci/validate-rule-format.js --stats    # summary only
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES_DIR = path.join(__dirname, '../../rules');

const args = process.argv.slice(2);
const STATS_ONLY = args.includes('--stats');

// By default only common/ rules are linted — language-specific rules follow different norms.
// Pass --all to lint all rule directories.
const ALL_DIRS = args.includes('--all');
const SCAN_DIR = ALL_DIRS ? RULES_DIR : path.join(RULES_DIR, 'common');

// Exceptions: files allowed to exceed the constraints.
// These are legitimately detailed reference or workflow documents.
const EXCEPTIONS = new Set([
  'agents.md',               // large agent reference table — governance, not how-to
  'accessibility.md',        // detailed WCAG reference with illustrative code examples
  'development-workflow.md', // full multi-phase workflow guide — too broad to trim
  'patterns.md',             // pattern reference with short illustrative pseudocode blocks
]);

const MAX_LINES = 80;
const MAX_CODE_BLOCK_LINES = 5;

// ─────────────────────────────────────────────
// File discovery
// ─────────────────────────────────────────────

function findRuleFiles(dir, rel = '') {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...findRuleFiles(fullPath, relPath));
    } else if (entry.name.endsWith('.md')) {
      results.push({ fullPath, relPath });
    }
  }
  return results;
}

// ─────────────────────────────────────────────
// Validators
// ─────────────────────────────────────────────

function checkLineCount(lines, _relPath) {
  if (lines.length > MAX_LINES) {
    return `exceeds ${MAX_LINES} lines (${lines.length} lines)`;
  }
  return null;
}

function checkCodeBlocks(lines, _relPath) {
  const violations = [];
  let inBlock = false;
  let blockStart = -1;
  let blockLineCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      if (!inBlock) {
        inBlock = true;
        blockStart = i + 1;
        blockLineCount = 0;
      } else {
        if (blockLineCount > MAX_CODE_BLOCK_LINES) {
          violations.push(`code block at line ${blockStart} is ${blockLineCount} lines (max ${MAX_CODE_BLOCK_LINES})`);
        }
        inBlock = false;
      }
    } else if (inBlock) {
      blockLineCount++;
    }
  }
  return violations.length > 0 ? violations.join('; ') : null;
}

function checkHasChecklist(lines, _relPath) {
  const hasChecklist = lines.some(l => /^- \[ \]/.test(l.trim()));
  if (!hasChecklist) {
    return 'missing checklist (no "- [ ]" items found)';
  }
  return null;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

function main() {
  if (!fs.existsSync(SCAN_DIR)) {
    console.log('No rules directory found — skipping validation');
    process.exit(0);
  }

  const files = findRuleFiles(SCAN_DIR);
  if (files.length === 0) {
    console.log('No rule files found');
    process.exit(0);
  }

  const results = { passed: 0, failed: 0, skipped: 0, violations: [] };

  for (const { fullPath, relPath } of files) {
    if (EXCEPTIONS.has(relPath)) {
      results.skipped++;
      continue;
    }

    let content;
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch (err) {
      results.violations.push({ relPath, errors: [`cannot read: ${err.message}`] });
      results.failed++;
      continue;
    }

    // Strip YAML frontmatter before counting lines
    let body = content;
    if (content.startsWith('---')) {
      const closeIdx = content.indexOf('\n---', 3);
      if (closeIdx !== -1) {
        body = content.slice(closeIdx + 4); // skip closing --- and newline
      }
    }

    const lines = body.split('\n');
    const errors = [];

    const lineError = checkLineCount(lines, relPath);
    if (lineError) errors.push(lineError);

    const codeError = checkCodeBlocks(lines, relPath);
    if (codeError) errors.push(codeError);

    const checklistError = checkHasChecklist(lines, relPath);
    if (checklistError) errors.push(checklistError);

    if (errors.length > 0) {
      results.violations.push({ relPath, errors });
      results.failed++;
    } else {
      results.passed++;
    }
  }

  // Output
  if (!STATS_ONLY) {
    for (const { relPath, errors } of results.violations) {
      for (const err of errors) {
        console.error(`FAIL  ${relPath}: ${err}`);
      }
    }
  }

  console.log(
    `validate-rule-format: ${results.passed} passed, ${results.failed} failed, ${results.skipped} skipped (${files.length} total)`
  );

  if (results.failed > 0) {
    console.error('\nFix violations or add to EXCEPTIONS in validate-rule-format.js');
    process.exit(1);
  }

  process.exit(0);
}

main();
