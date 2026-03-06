#!/usr/bin/env node
/**
 * PostToolUse Hook: Auto-format Java files after edits
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs after Edit tool use on .java files.
 * Formatter priority:
 *   1. google-java-format binary (if on PATH)
 *   2. Spotless via Maven wrapper (./mvnw spotless:apply)
 *   3. Spotless via Gradle wrapper (./gradlew spotlessJavaApply)
 * Falls back silently if neither is available.
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
      fs.existsSync(path.join(dir, 'pom.xml')) ||
      fs.existsSync(path.join(dir, 'build.gradle')) ||
      fs.existsSync(path.join(dir, 'build.gradle.kts'))
    ) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return startDir;
}

function isCommandAvailable(cmd) {
  try {
    execFileSync(cmd, ['--version'], { stdio: ['pipe', 'pipe', 'pipe'], timeout: 2000 });
    return true;
  } catch (err) {
    return err.code !== 'ENOENT';
  }
}

process.stdin.on('end', () => {
  try {
    const input = JSON.parse(data);
    const filePath = input.tool_input?.file_path;

    if (filePath && /\.java$/.test(filePath)) {
      try {
        const absPath = path.resolve(filePath);
        const projectRoot = findProjectRoot(path.dirname(absPath));
        const isWin = process.platform === 'win32';

        // 1. google-java-format — fastest, per-file, no project context needed
        if (isCommandAvailable('google-java-format')) {
          execFileSync('google-java-format', ['--replace', absPath], {
            cwd: projectRoot,
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 15000
          });
        } else if (fs.existsSync(path.join(projectRoot, 'pom.xml'))) {
          // 2. Spotless via Maven wrapper
          const mvnw = path.join(projectRoot, isWin ? 'mvnw.cmd' : 'mvnw');
          if (fs.existsSync(mvnw)) {
            const rel = path.relative(projectRoot, absPath).replace(/\\/g, '/');
            execFileSync(mvnw, ['spotless:apply', `-Dincludes=${rel}`, '-q'], {
              cwd: projectRoot,
              stdio: ['pipe', 'pipe', 'pipe'],
              timeout: 30000
            });
          }
        } else {
          // 3. Spotless via Gradle wrapper
          const gradlew = path.join(projectRoot, isWin ? 'gradlew.bat' : 'gradlew');
          if (fs.existsSync(gradlew)) {
            execFileSync(gradlew, ['spotlessJavaApply', '-q'], {
              cwd: projectRoot,
              stdio: ['pipe', 'pipe', 'pipe'],
              timeout: 30000
            });
          }
        }
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
