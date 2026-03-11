#!/usr/bin/env node
/**
 * Doc file warning hook (PreToolUse - Write)
 * Warns about non-standard documentation files.
 * Exit code 0 always (warns only, never blocks).
 */

import path from 'path';

let data = '';
process.stdin.on('data', c => (data += c));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const filePath = input.tool_input?.file_path || '';

    // Extended allowlist: common project-level .md files that are valid
    const ALLOWED_NAMES = /^(README|CLAUDE|AGENTS|CONTRIBUTING|CHANGELOG|LICENSE|SKILL|API|NOTES|SETUP|ARCHITECTURE|SECURITY|SUPPORT|CODE_OF_CONDUCT|CODEOWNERS|MAINTAINERS|OWNERS|NOTICE|AUTHORS|HISTORY|TODO|ROADMAP|MIGRATION|HACKING|INSTALL|USAGE|CONFIGURATION|DEVELOPMENT|DEPLOYING|TESTING)\.md$/i;
    if (
      /\.(md|txt)$/.test(filePath) &&
      !ALLOWED_NAMES.test(path.basename(filePath)) &&
      !/\.claude[/\\]plans[/\\]/.test(filePath) &&
      !/(^|[/\\])(docs|skills|\.history|\.clarc)[/\\]/.test(filePath)
    ) {
      console.error('[Hook] WARNING: Non-standard documentation file detected');
      console.error('[Hook] File: ' + filePath);
      console.error('[Hook] Consider consolidating into README.md or docs/ directory');
    }
  } catch {
    /* ignore parse errors */
  }
  process.stdout.write(data);
  process.exit(0);
});
