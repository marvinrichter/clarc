#!/usr/bin/env node
/**
 * Validate skill directories have SKILL.md with required structure and content.
 *
 * Checks:
 *  Structure: SKILL.md exists and is non-empty
 *  Frontmatter: name and description fields present and non-placeholder
 *  Name match: frontmatter name matches directory name
 *  Sections: at least one ## section header
 *  Length: file does not exceed 800 lines
 */

const fs = require('fs');
const path = require('path');

const SKILLS_DIR = path.join(__dirname, '../../skills');
const MAX_LINES = 800;

// Placeholder values that indicate a template was not filled in
const PLACEHOLDER_PATTERNS = [
  /^(your|my|example|todo|tbd|placeholder|description here|brief description)/i,
  /^\.\.\./,
];

function extractFrontmatter(content) {
  const clean = content.replace(/^\uFEFF/, '');
  const match = clean.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const fm = {};
  for (const line of match[1].split(/\r?\n/)) {
    const colonIdx = line.indexOf(':');
    if (colonIdx > 0) {
      fm[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1).trim();
    }
  }
  return fm;
}

function isPlaceholder(value) {
  return PLACEHOLDER_PATTERNS.some(re => re.test(value.trim()));
}

function validateSkills() {
  if (!fs.existsSync(SKILLS_DIR)) {
    console.log('No skills directory found, skipping validation');
    process.exit(0);
  }

  const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
  const dirs = entries.filter(e => e.isDirectory()).map(e => e.name);
  const errors = [];
  const warnings = [];
  let validCount = 0;

  for (const dir of dirs) {
    const skillMd = path.join(SKILLS_DIR, dir, 'SKILL.md');
    const label = `${dir}/SKILL.md`;

    // 1. File must exist
    if (!fs.existsSync(skillMd)) {
      errors.push(`${label} - Missing SKILL.md`);
      continue;
    }

    let content;
    try {
      content = fs.readFileSync(skillMd, 'utf-8');
    } catch (err) {
      errors.push(`${label} - Cannot read: ${err.message}`);
      continue;
    }

    // 2. Must not be empty
    if (content.trim().length === 0) {
      errors.push(`${label} - Empty file`);
      continue;
    }

    // 3. Line count
    const lines = content.split('\n');
    if (lines.length > MAX_LINES) {
      warnings.push(`${label} - ${lines.length} lines exceeds recommended ${MAX_LINES}-line limit`);
    }

    // 4. Frontmatter
    const fm = extractFrontmatter(content);
    if (!fm) {
      errors.push(`${label} - Missing YAML frontmatter (expected --- block at top)`);
      continue;
    }

    // 5. Required fields: name and description
    for (const field of ['name', 'description']) {
      if (!fm[field] || !fm[field].trim()) {
        errors.push(`${label} - Missing frontmatter field: ${field}`);
      } else if (isPlaceholder(fm[field])) {
        errors.push(`${label} - Frontmatter '${field}' looks like an unfilled placeholder: "${fm[field]}"`);
      }
    }

    // 6. name must match directory name
    if (fm.name && fm.name.trim() !== dir) {
      warnings.push(`${label} - frontmatter name "${fm.name}" does not match directory name "${dir}"`);
    }

    // 7. At least one ## section header
    if (!content.includes('\n## ') && !content.startsWith('## ')) {
      warnings.push(`${label} - No ## section headers found`);
    }

    validCount++;
  }

  if (warnings.length > 0) {
    for (const w of warnings) console.warn(`WARN: ${w}`);
  }

  if (errors.length > 0) {
    for (const e of errors) console.error(`ERROR: ${e}`);
    process.exit(1);
  }

  console.log(`Validated ${validCount} skill directories${warnings.length > 0 ? ` (${warnings.length} warning(s))` : ''}`);
}

validateSkills();
