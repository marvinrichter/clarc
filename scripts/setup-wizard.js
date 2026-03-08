#!/usr/bin/env node
/**
 * clarc setup wizard — entry point for `npx github:marvinrichter/clarc`
 *
 * No args  → interactive wizard (detect languages, prompt for target + learning)
 * With args → delegate directly to install.sh (non-interactive, backward compat)
 *
 * When running from the npx cache (ephemeral), clones clarc to ~/.clarc/ first
 * so that symlinks created by install.sh point to a persistent location.
 */

import { createInterface } from 'readline';
import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CLARC_HOME = join(homedir(), '.clarc');
const CLARC_REPO = 'https://github.com/marvinrichter/clarc.git';

// Running from npx cache? Symlinks to the cache would break on cache eviction.
function isEphemeral() {
  return __dirname.includes('_npx') || __dirname.includes('.npm/_npx');
}

// Ensure clarc is cloned to ~/.clarc/ (clone or pull).
function ensureLocalClone() {
  if (existsSync(join(CLARC_HOME, '.git'))) {
    console.log(`Updating ~/.clarc …`);
    const r = spawnSync('git', ['-C', CLARC_HOME, 'pull', '--ff-only', '--quiet'], { stdio: 'inherit' });
    if (r.status !== 0) console.warn('  Warning: git pull failed — using existing clone.');
  } else {
    console.log(`Cloning clarc to ~/.clarc …`);
    const r = spawnSync('git', ['clone', '--depth', '1', CLARC_REPO, CLARC_HOME], { stdio: 'inherit' });
    if (r.status !== 0) {
      console.error('Clone failed.');
      process.exit(1);
    }
  }
  console.log();
  return join(CLARC_HOME, 'install.sh');
}

// Resolve which install.sh to use.
function resolveInstallSh() {
  if (isEphemeral()) return ensureLocalClone();
  return resolve(__dirname, '../install.sh');
}

// --- Pass-through mode: args provided → skip wizard ---
const args = process.argv.slice(2);
if (args.length > 0) {
  const installSh = resolveInstallSh();
  const result = spawnSync('bash', [installSh, ...args], { stdio: 'inherit' });
  process.exit(result.status ?? 0);
}

// --- Wizard mode ---
const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = q => new Promise(res => rl.question(q, res));

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

const KNOWN_LANGS = ['typescript', 'python', 'go', 'java', 'rust', 'swift', 'ruby', 'elixir', 'cpp', 'php', 'scala', 'r', 'csharp'];

function detectLanguages() {
  const cwd = process.cwd();
  const check = (...files) => files.some(f => existsSync(join(cwd, f)));
  const detected = [];

  if (check('tsconfig.json', 'package.json')) detected.push('typescript');
  if (check('pyproject.toml', 'requirements.txt', 'setup.py', 'Pipfile')) detected.push('python');
  if (check('go.mod')) detected.push('go');
  if (check('pom.xml', 'build.gradle', 'build.gradle.kts')) detected.push('java');
  if (check('Cargo.toml')) detected.push('rust');
  if (check('Package.swift')) detected.push('swift');
  if (check('Gemfile')) detected.push('ruby');
  if (check('mix.exs')) detected.push('elixir');
  if (check('CMakeLists.txt')) detected.push('cpp');
  if (check('composer.json')) detected.push('php');
  if (check('build.sbt')) detected.push('scala');
  if (check('DESCRIPTION', 'renv.lock')) detected.push('r');
  if (check('global.json')) detected.push('csharp');

  return detected;
}

async function promptLanguages() {
  console.log(`  Available: ${KNOWN_LANGS.join(', ')}`);
  const input = (await ask('  Enter languages (comma-separated): ')).trim();
  if (!input) return [];
  return input
    .split(',')
    .map(l => l.trim().toLowerCase())
    .filter(l => KNOWN_LANGS.includes(l));
}

async function runWizard() {
  // Resolve install.sh early (may trigger clone) before showing wizard UI
  const installSh = resolveInstallSh();

  console.log(`\n${BOLD}clarc setup wizard${RESET}\n`);

  // --- Target ---
  console.log(`${BOLD}Target editor${RESET}`);
  console.log(`  1) Claude Code ${DIM}(default)${RESET}`);
  console.log('  2) Cursor');
  console.log('  3) OpenCode');
  console.log('  4) Codex CLI');
  const targetInput = (await ask('\nChoice [1]: ')).trim() || '1';
  const targetMap = { 1: 'claude', 2: 'cursor', 3: 'opencode', 4: 'codex' };
  const target = targetMap[targetInput] ?? 'claude';
  console.log(`  ${GREEN}✔${RESET} ${target}\n`);

  // --- Languages ---
  const detected = detectLanguages();
  let languages = [];

  if (detected.length > 0) {
    console.log(`${BOLD}Languages${RESET}`);
    console.log(`  Detected: ${CYAN}${detected.join(', ')}${RESET}`);
    const useDetected = (await ask('  Use detected? [Y/n]: ')).trim().toLowerCase();
    if (useDetected === '' || useDetected === 'y' || useDetected === 'yes') {
      languages = [...detected];
      const remaining = KNOWN_LANGS.filter(l => !detected.includes(l));
      console.log(`  Also available: ${DIM}${remaining.join(', ')}${RESET}`);
      const more = (await ask('  Add more? (comma-separated, or Enter to skip): ')).trim();
      if (more) {
        const extras = more
          .split(',')
          .map(l => l.trim().toLowerCase())
          .filter(l => KNOWN_LANGS.includes(l));
        languages = [...new Set([...languages, ...extras])];
      }
    } else {
      languages = await promptLanguages();
    }
  } else {
    console.log(`${BOLD}Languages${RESET} ${DIM}(none detected)${RESET}`);
    languages = await promptLanguages();
  }

  if (languages.length > 0) {
    console.log(`  ${GREEN}✔${RESET} ${languages.join(', ')}\n`);
  } else {
    console.log(`  ${GREEN}✔${RESET} Common rules only\n`);
  }

  // --- Continuous learning (claude target only) ---
  let enableLearning = false;
  if (target === 'claude') {
    console.log(`${BOLD}Continuous learning${RESET} ${DIM}(captures patterns to build instincts)${RESET}`);
    const learningInput = (await ask('  Enable? [Y/n]: ')).trim().toLowerCase();
    enableLearning = learningInput === '' || learningInput === 'y' || learningInput === 'yes';
    console.log(`  ${GREEN}✔${RESET} ${enableLearning ? 'enabled' : 'skipped'}\n`);
  }

  rl.close();

  // --- Build install.sh args ---
  const installArgs = [];
  if (target !== 'claude') installArgs.push('--target', target);
  if (enableLearning) installArgs.push('--enable-learning');
  else installArgs.push('--no-learning');
  installArgs.push(...languages);

  console.log(`${BOLD}Installing…${RESET}\n`);

  const result = spawnSync('bash', [installSh, ...installArgs], { stdio: 'inherit' });
  process.exit(result.status ?? 0);
}

runWizard().catch(err => {
  rl.close();
  console.error(err);
  process.exit(1);
});
