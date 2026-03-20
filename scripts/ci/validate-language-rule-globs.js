#!/usr/bin/env node
/**
 * validate-language-rule-globs — CI linter for language rule files.
 *
 * Ensures every language-specific rule file (any rules/ subdirectory except common/)
 * has both `globs:` and `alwaysApply: false` in its YAML frontmatter.
 *
 * These fields enable Claude Code's native conditional rule loading — rules activate
 * only when files matching the glob patterns are open, saving context tokens for
 * projects that don't use that language.
 *
 * common/ is excluded intentionally — those rules are universal and always active.
 *
 * Usage:
 *   node scripts/ci/validate-language-rule-globs.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RULES_DIR = path.join(__dirname, '../../rules');

const SKIP_DIRS = new Set(['common']);
const SKIP_FILES = new Set(['README.md', 'CHANGELOG.md', 'RULES_VERSION']);

// ─────────────────────────────────────────────
// Frontmatter parsing
// ─────────────────────────────────────────────

/**
 * Parse YAML frontmatter from a rule file.
 * Returns { hasGlobs, hasAlwaysApplyFalse } booleans.
 */
function parseRuleFrontmatter(content) {
  if (!content.startsWith('---')) return { hasGlobs: false, hasAlwaysApplyFalse: false };
  const end = content.indexOf('\n---', 3);
  if (end === -1) return { hasGlobs: false, hasAlwaysApplyFalse: false };
  const yaml = content.slice(3, end);

  const hasGlobs = /^globs\s*:/m.test(yaml) &&
    yaml.split('\n').some(l => /^\s+-\s+".+"/.test(l));
  const hasAlwaysApplyFalse = /^alwaysApply\s*:\s*false\s*$/m.test(yaml);

  return { hasGlobs, hasAlwaysApplyFalse };
}

// ─────────────────────────────────────────────
// File discovery
// ─────────────────────────────────────────────

function findLanguageRuleFiles(rulesDir) {
  const results = [];
  if (!fs.existsSync(rulesDir)) return results;

  for (const entry of fs.readdirSync(rulesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (SKIP_DIRS.has(entry.name)) continue;

    const langDir = path.join(rulesDir, entry.name);
    for (const file of fs.readdirSync(langDir)) {
      if (!file.endsWith('.md')) continue;
      if (SKIP_FILES.has(file)) continue;
      results.push({
        fullPath: path.join(langDir, file),
        relPath: `${entry.name}/${file}`,
      });
    }
  }

  return results;
}

// ─────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────

function main() {
  if (!fs.existsSync(RULES_DIR)) {
    console.log('No rules directory found — skipping validation');
    process.exit(0);
  }

  const files = findLanguageRuleFiles(RULES_DIR);
  if (files.length === 0) {
    console.log('No language rule files found — skipping validation');
    process.exit(0);
  }

  let passed = 0;
  let failed = 0;
  const violations = [];

  for (const { fullPath, relPath } of files) {
    let content;
    try {
      content = fs.readFileSync(fullPath, 'utf8');
    } catch (err) {
      violations.push(`FAIL  ${relPath}: cannot read file — ${err.message}`);
      failed++;
      continue;
    }

    const { hasGlobs, hasAlwaysApplyFalse } = parseRuleFrontmatter(content);
    const errors = [];

    if (!hasGlobs) errors.push('missing globs: list in frontmatter');
    if (!hasAlwaysApplyFalse) errors.push('missing alwaysApply: false in frontmatter');

    if (errors.length > 0) {
      for (const err of errors) {
        violations.push(`FAIL  ${relPath}: ${err}`);
      }
      failed++;
    } else {
      passed++;
    }
  }

  for (const v of violations) {
    console.error(v);
  }

  console.log(
    `validate-language-rule-globs: ${passed} passed, ${failed} failed (${files.length} total)`
  );

  if (failed > 0) {
    console.error(
      '\nRun: node scripts/ci/add-globs-frontmatter.js --dry-run   to preview fixes'
    );
    console.error(
      '     node scripts/ci/add-globs-frontmatter.js            to apply fixes'
    );
    process.exit(1);
  }

  process.exit(0);
}

main();
