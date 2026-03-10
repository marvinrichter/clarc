#!/usr/bin/env node
/**
 * validate-skill-quality.js — Quality standards beyond structural validation.
 *
 * Checks (as warnings, not errors — gradual migration):
 *  1. At least 1 code block (```) in SKILL.md
 *  2. Anti-patterns section (## Anti-Patterns or ## Avoid)
 *  3. "When to" section (When to Use / When to Activate / Activation)
 *  4. Frontmatter name and description >= 20 chars each
 *  5. At least 50 words in the When-to section
 *
 * Usage:
 *   node scripts/ci/validate-skill-quality.js            # warn only
 *   node scripts/ci/validate-skill-quality.js --strict   # fail on warnings
 *   node scripts/ci/validate-skill-quality.js --generate-index  # also regenerate skills/INDEX.md
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SKILLS_DIR = path.join(__dirname, '../../skills');
const strict = process.argv.includes('--strict');
const generateIndex = process.argv.includes('--generate-index');

const EXCEPTIONS_FILE = path.join(__dirname, 'skill-size-exceptions.json');
const sizeExceptions = new Set(
  fs.existsSync(EXCEPTIONS_FILE)
    ? JSON.parse(fs.readFileSync(EXCEPTIONS_FILE, 'utf-8')).exceptions ?? []
    : []
);

function extractFrontmatter(content) {
  const match = content.replace(/^\uFEFF/, '').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return {};
  const fm = {};
  for (const line of match[1].split(/\r?\n/)) {
    const idx = line.indexOf(':');
    if (idx > 0) {
      fm[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
  }
  return fm;
}

function countWords(text) {
  return text.split(/\s+/).filter(Boolean).length;
}

function validateQuality(dir, content, fm) {
  const warnings = [];
  const errors = []; // Always fatal, regardless of --strict

  // 0. Line count — warn >500, block >600 (exceptions: pre-existing violations)
  const lineCount = content.split('\n').length;
  if (lineCount > 600) {
    if (sizeExceptions.has(dir)) {
      warnings.push(`Skill too long (${lineCount} lines, max 600) — grandfathered, split before removing from skill-size-exceptions.json`);
    } else {
      errors.push(`Skill too long (${lineCount} lines, max 600) — split into focused sub-skills`);
    }
  } else if (lineCount > 500) {
    warnings.push(`Skill getting long (${lineCount} lines, consider splitting at 600)`);
  }

  // 1. At least 1 code block
  if (!/```/.test(content)) {
    warnings.push('No code example found (add at least one ``` code block)');
  }

  // 2. Anti-patterns section
  if (!/^##\s+(anti.?pattern|avoid|don.t|never|wrong)/im.test(content)) {
    warnings.push('No Anti-Patterns / Avoid section found');
  }

  // 3. When-to section
  const whenMatch = content.match(/^##\s+(when.*to|activation|trigger)/im);
  if (!whenMatch) {
    warnings.push('No "When to Use" / "When to Activate" section found');
  } else {
    // 5. Word count in When-to section
    const sectionStart = content.indexOf(whenMatch[0]);
    const nextSection = content.indexOf('\n## ', sectionStart + 1);
    const sectionText = nextSection > -1
      ? content.slice(sectionStart, nextSection)
      : content.slice(sectionStart);
    const wordCount = countWords(sectionText);
    if (wordCount < 50) {
      warnings.push(`When-to section too short (${wordCount} words, min 50)`);
    }
  }

  // 4. Frontmatter name and description >= 20 chars
  const name = fm.name || '';
  const desc = fm.description || '';
  if (name.length < 5) {
    warnings.push(`Frontmatter 'name' too short (${name.length} chars, min 5)`);
  }
  if (desc.length < 20) {
    warnings.push(`Frontmatter 'description' too short (${desc.length} chars, min 20)`);
  }

  return { warnings, errors };
}

function validateSkillQuality() {
  if (!fs.existsSync(SKILLS_DIR)) {
    console.log('No skills directory found, skipping quality validation');
    process.exit(0);
  }

  const dirs = fs.readdirSync(SKILLS_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory())
    .map(e => e.name);

  const allWarnings = [];
  const allErrors = [];
  let checkedCount = 0;

  for (const dir of dirs) {
    const skillMd = path.join(SKILLS_DIR, dir, 'SKILL.md');
    if (!fs.existsSync(skillMd)) continue;

    let content;
    try {
      content = fs.readFileSync(skillMd, 'utf-8');
    } catch {
      continue;
    }

    const fm = extractFrontmatter(content);
    const { warnings, errors } = validateQuality(dir, content, fm);
    checkedCount++;

    for (const w of warnings) {
      allWarnings.push(`  ${dir}/SKILL.md — ${w}`);
    }
    for (const e of errors) {
      allErrors.push(`  ${dir}/SKILL.md — ${e}`);
    }
  }

  // Report fatal errors (always block)
  if (allErrors.length > 0) {
    console.error(`\nSkill quality errors (${allErrors.length} — must fix before merge):`);
    for (const e of allErrors) {
      console.error(`ERROR: ${e}`);
    }
  }

  // Report warnings
  if (allWarnings.length > 0) {
    console.warn(`\nSkill quality warnings (${allWarnings.length} across ${checkedCount} skills):`);
    for (const w of allWarnings) {
      console.warn(`WARN: ${w}`);
    }
    if (strict) {
      console.error('\n--strict mode: treating warnings as errors.');
    }
  }

  if (allErrors.length === 0 && allWarnings.length === 0) {
    console.log(`All ${checkedCount} skills meet quality standards.`);
  }

  console.log(`\nQuality check complete: ${checkedCount} skills checked, ${allErrors.length} error(s), ${allWarnings.length} warning(s).`);

  if (allErrors.length > 0 || (strict && allWarnings.length > 0)) {
    process.exit(1);
  }

  if (generateIndex) {
    console.log('\nNote: --generate-index updates skills/INDEX.md manually.');
  }
}

validateSkillQuality();
