#!/usr/bin/env node
/**
 * PostToolUse Hook: Auto-format Python files after edits
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs after Edit tool use on .py files.
 * Auto-detects ruff (preferred) or black. Falls back silently if neither is installed.
 *
 * Formatter priority:
 *   1. ruff (via pyproject.toml [tool.ruff] or ruff.toml)
 *   2. black (via pyproject.toml [tool.black] or .black)
 *   3. ruff if installed regardless of config (most projects use it)
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_STDIN = 1024 * 1024;
let data = '';
process.stdin.setEncoding('utf8');

process.stdin.on('data', chunk => {
  if (data.length < MAX_STDIN) {
    data += chunk.substring(0, MAX_STDIN - data.length);
  }
});

function findProjectRoot(startDir) {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    if (
      fs.existsSync(path.join(dir, 'pyproject.toml')) ||
      fs.existsSync(path.join(dir, 'setup.py')) ||
      fs.existsSync(path.join(dir, 'setup.cfg'))
    ) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return startDir;
}

function detectFormatter(projectRoot) {
  // Check pyproject.toml for explicit formatter config
  const pyprojectPath = path.join(projectRoot, 'pyproject.toml');
  if (fs.existsSync(pyprojectPath)) {
    const content = fs.readFileSync(pyprojectPath, 'utf8');
    if (content.includes('[tool.ruff') || content.includes('[tool.ruff.format]')) return 'ruff';
    if (content.includes('[tool.black]')) return 'black';
  }

  // Check for standalone config files
  if (fs.existsSync(path.join(projectRoot, 'ruff.toml'))) return 'ruff';
  if (fs.existsSync(path.join(projectRoot, '.black'))) return 'black';

  // Default: ruff (modern standard)
  return 'ruff';
}

function tryFormat(formatter, filePath, cwd) {
  if (formatter === 'ruff') {
    execFileSync('ruff', ['format', filePath], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000
    });
    return true;
  }
  if (formatter === 'black') {
    execFileSync('black', ['--quiet', filePath], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 10000
    });
    return true;
  }
  return false;
}

process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const filePath = input.tool_input?.file_path;

    if (filePath && /\.py$/.test(filePath)) {
      try {
        const absPath = path.resolve(filePath);
        const projectRoot = findProjectRoot(path.dirname(absPath));
        const formatter = detectFormatter(projectRoot);
        tryFormat(formatter, absPath, projectRoot);
      } catch {
        // Formatter not installed or failed — non-blocking
      }
    }
  } catch {
    // Invalid input — pass through
  }

  process.stdout.write(data);
  process.exit(0);
});
