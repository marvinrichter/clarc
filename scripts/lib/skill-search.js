/**
 * Shared skill search library.
 *
 * Used by:
 *  - MCP server tool `skill_search`
 *  - CLI command `/find-skill` (via node invocation)
 *
 * Both surfaces call searchSkills() to ensure identical results.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_SKILLS_DIR = path.join(__dirname, '..', '..', 'skills');

/**
 * Search skills by keyword, language, or domain.
 *
 * @param {string} query - Search term
 * @param {{ limit?: number, skillsDir?: string }} [options]
 * @returns {{ query: string, total: number, results: Array<{name: string, slug: string, description: string}> }}
 */
export function searchSkills(query, { limit = 10, skillsDir = DEFAULT_SKILLS_DIR } = {}) {
  if (!query) {
    return { query: '', total: 0, results: [], error: 'query is required' };
  }

  if (!fs.existsSync(skillsDir)) {
    return { query, total: 0, results: [], error: `skills directory not found: ${skillsDir}` };
  }

  const queryLower = query.toLowerCase();
  const results = [];

  let entries;
  try {
    entries = fs.readdirSync(skillsDir);
  } catch {
    return { query, total: 0, results: [], error: `cannot read skills directory: ${skillsDir}` };
  }

  for (const skillName of entries) {
    if (skillName === 'INDEX.md' || skillName === 'SKILL_AGENTS.md') continue;
    const skillFile = path.join(skillsDir, skillName, 'SKILL.md');
    if (!fs.existsSync(skillFile)) continue;

    try {
      const content = fs.readFileSync(skillFile, 'utf8');
      const descMatch = content.match(/^description:\s*(.+)$/m);
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const description = descMatch ? descMatch[1].trim().replace(/^["']|["']$/g, '') : '';
      const name = nameMatch ? nameMatch[1].trim().replace(/^["']|["']$/g, '') : skillName;

      if (
        skillName.toLowerCase().includes(queryLower) ||
        name.toLowerCase().includes(queryLower) ||
        description.toLowerCase().includes(queryLower) ||
        content.toLowerCase().includes(queryLower)
      ) {
        results.push({ name, slug: skillName, description: description.slice(0, 120) });
      }
    } catch {
      // Skip unreadable skill files
    }

    if (results.length >= limit) break;
  }

  return { query, total: results.length, results };
}
