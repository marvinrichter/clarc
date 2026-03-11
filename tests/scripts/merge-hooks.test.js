#!/usr/bin/env node
/**
 * Tests for scripts/merge-hooks.js
 *
 * Run with: node tests/scripts/merge-hooks.test.js
 */

import { spawnSync } from 'child_process';
import { writeFileSync, mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const SCRIPT = join(REPO_ROOT, 'scripts', 'merge-hooks.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ✗ ${name}`);
    console.log(`    ${err.message}`);
    failed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}

function run(clarcHooks, destHooks, extraArgs = []) {
  const tmp = mkdtempSync(join(tmpdir(), 'merge-hooks-test-'));
  try {
    const clarcDir = join(tmp, 'clarc', 'hooks');
    const claudeDir = join(tmp, 'claude', 'hooks');
    spawnSync('mkdir', ['-p', clarcDir]);
    spawnSync('mkdir', ['-p', claudeDir]);

    writeFileSync(join(clarcDir, 'hooks.json'), JSON.stringify(clarcHooks, null, 2));
    if (destHooks !== null) {
      writeFileSync(join(claudeDir, 'hooks.json'), JSON.stringify(destHooks, null, 2));
    }

    const result = spawnSync('node', [SCRIPT, ...extraArgs], {
      env: {
        ...process.env,
        CLARC_HOOKS_SOURCE: join(clarcDir, 'hooks.json'),
        CLAUDE_HOOKS_DEST: join(claudeDir, 'hooks.json'),
      },
      encoding: 'utf8',
    });

    let dest = null;
    const destPath = join(claudeDir, 'hooks.json');
    if (existsSync(destPath)) {
      dest = JSON.parse(readFileSync(destPath, 'utf8'));
    }

    return { stdout: result.stdout, stderr: result.stderr, status: result.status, dest };
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

function makeClarcHooks(entries) {
  return {
    $schema: 'https://example.com/schema',
    hooks: entries,
  };
}

// --- Tests ---

console.log('\nmerge-hooks.js');

test('adds clarc hooks when destination is empty', () => {
  const clarc = makeClarcHooks({
    PostToolUse: [
      {
        matcher: 'Edit',
        hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/format.js"' }],
        description: 'auto-format',
      },
    ],
  });

  const { dest, status } = run(clarc, null);
  assert(status === 0, `exit code should be 0, got ${status}`);
  assert(dest !== null, 'dest hooks.json should be created');
  assert(dest.hooks.PostToolUse?.length === 1, 'should have 1 PostToolUse hook');
  assert(
    dest.hooks.PostToolUse[0].description === 'auto-format',
    'description should match'
  );
});

test('adds clarc hooks when destination exists but is empty', () => {
  const clarc = makeClarcHooks({
    PreToolUse: [
      {
        matcher: 'Bash',
        hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/guard.js"' }],
        description: 'guard',
      },
    ],
  });
  const dest = { hooks: {} };

  const { dest: result, status } = run(clarc, dest);
  assert(status === 0, `exit code should be 0, got ${status}`);
  assert(result.hooks.PreToolUse?.length === 1, 'should have 1 PreToolUse hook');
});

test('skips clarc hook when same command already present', () => {
  const cmd = 'node "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/format.js"';
  const clarc = makeClarcHooks({
    PostToolUse: [
      {
        matcher: 'Edit',
        hooks: [{ type: 'command', command: cmd }],
        description: 'auto-format',
      },
    ],
  });
  const existing = {
    hooks: {
      PostToolUse: [
        {
          matcher: 'Edit',
          hooks: [{ type: 'command', command: cmd }],
          description: 'auto-format',
        },
      ],
    },
  };

  const { dest: result, status, stdout } = run(clarc, existing);
  assert(status === 0, `exit code should be 0, got ${status}`);
  assert(result.hooks.PostToolUse.length === 1, 'should not duplicate hook');
  assert(stdout.includes('skipped'), 'should print skipped message');
});

test('warns when skipping due to existing user hook with same command', () => {
  const cmd = 'node "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/budget-guard.js"';
  const clarc = makeClarcHooks({
    PreToolUse: [
      {
        matcher: 'Agent',
        hooks: [{ type: 'command', command: cmd }],
        description: 'budget guard',
      },
    ],
  });
  const existing = {
    hooks: {
      PreToolUse: [
        {
          matcher: 'Agent',
          hooks: [{ type: 'command', command: cmd }],
          description: 'budget guard',
        },
      ],
    },
  };

  const { stdout, status } = run(clarc, existing);
  assert(status === 0, `exit code should be 0, got ${status}`);
  assert(stdout.includes('⚠') || stdout.includes('skipped'), 'should warn about skipped hook');
});

test('preserves existing user hooks alongside new clarc hooks', () => {
  const clarcCmd = 'node "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/format.js"';
  const userCmd = '/home/user/my-custom-hook.sh';
  const clarc = makeClarcHooks({
    PostToolUse: [
      {
        matcher: 'Edit',
        hooks: [{ type: 'command', command: clarcCmd }],
        description: 'clarc format',
      },
    ],
  });
  const existing = {
    hooks: {
      PostToolUse: [
        {
          matcher: 'Edit',
          hooks: [{ type: 'command', command: userCmd }],
          description: 'my custom hook',
        },
      ],
    },
  };

  const { dest: result, status } = run(clarc, existing);
  assert(status === 0, `exit code should be 0, got ${status}`);
  assert(result.hooks.PostToolUse.length === 2, 'should have both user and clarc hook');
  const cmds = result.hooks.PostToolUse.flatMap(e => e.hooks.map(h => h.command));
  assert(cmds.includes(userCmd), 'user hook should be preserved');
  assert(cmds.includes(clarcCmd), 'clarc hook should be added');
});

test('handles multiple events and partial overlap', () => {
  const cmd1 = 'node "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/a.js"';
  const cmd2 = 'node "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/b.js"';
  const clarc = makeClarcHooks({
    PostToolUse: [
      { matcher: 'Edit', hooks: [{ type: 'command', command: cmd1 }], description: 'a' },
      { matcher: 'Write', hooks: [{ type: 'command', command: cmd2 }], description: 'b' },
    ],
  });
  const existing = {
    hooks: {
      PostToolUse: [
        { matcher: 'Edit', hooks: [{ type: 'command', command: cmd1 }], description: 'a' },
      ],
    },
  };

  const { dest: result, stdout, status } = run(clarc, existing);
  assert(status === 0, `exit code should be 0, got ${status}`);
  assert(result.hooks.PostToolUse.length === 2, 'should have 2 PostToolUse hooks');
  assert(stdout.includes('skipped'), 'should report 1 skipped');
  assert(stdout.includes('added') || stdout.includes('✔'), 'should report 1 added');
});

test('--dry-run does not write to disk', () => {
  const clarc = makeClarcHooks({
    PostToolUse: [
      {
        matcher: 'Edit',
        hooks: [{ type: 'command', command: 'node "${CLAUDE_PLUGIN_ROOT}/scripts/hooks/x.js"' }],
        description: 'x',
      },
    ],
  });

  const { dest: result, status } = run(clarc, null, ['--dry-run']);
  assert(status === 0, `exit code should be 0, got ${status}`);
  assert(result === null, 'should not write hooks.json in dry-run mode');
});

test('exits with error when clarc hooks source is missing', () => {
  const result = spawnSync('node', [SCRIPT], {
    env: {
      ...process.env,
      CLARC_HOOKS_SOURCE: '/nonexistent/path/hooks.json',
      CLAUDE_HOOKS_DEST: '/tmp/test-hooks.json',
    },
    encoding: 'utf8',
  });
  assert(result.status !== 0, 'should exit non-zero when source missing');
});

// --- Summary ---
console.log(`\n  ${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
