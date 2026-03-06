#!/usr/bin/env node
/**
 * PreCompact Hook - Save state before context compaction
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Reads the PreCompact hook input (session_id + transcript_path) and
 * extracts a meaningful snapshot of the current session state before
 * Claude summarizes the context. The snapshot is appended to the active
 * session .tmp file so it survives compaction and is available to the
 * next SessionStart hook.
 *
 * Input (stdin JSON):
 *   { session_id, transcript_path, hook_event_name }
 */

import fs from 'fs';
import path from 'path';
import { getSessionsDir, getDateTimeString, getTimeString, findFiles, ensureDir, appendFile, log } from '../lib/utils.js';

const MAX_STDIN = 256 * 1024;
let data = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  if (data.length < MAX_STDIN) data += chunk.substring(0, MAX_STDIN - data.length);
});

/**
 * Extract a compact state snapshot from the JSONL transcript.
 * Returns an object with { taskLines, recentExchanges, filesMentioned }.
 */
function extractSnapshot(transcriptPath) {
  const snapshot = { taskLines: [], recentExchanges: [], filesMentioned: new Set() };

  let raw;
  try {
    raw = fs.readFileSync(transcriptPath, 'utf8');
  } catch {
    return snapshot;
  }

  const lines = raw.trim().split('\n').filter(Boolean);
  const messages = [];
  for (const line of lines) {
    try { messages.push(JSON.parse(line)); } catch { /* skip */ }
  }

  // Scan all messages for todo-like patterns and file paths
  const todoRe = /\[([ xX])\]\s+(.+)/g;
  const fileRe = /(?:^|\s)((?:\/[\w.-]+){2,}\.[\w]+)/g;

  for (const msg of messages) {
    const text = typeof msg.content === 'string'
      ? msg.content
      : Array.isArray(msg.content)
        ? msg.content.filter(b => b.type === 'text').map(b => b.text).join(' ')
        : '';

    for (const m of text.matchAll(todoRe)) {
      snapshot.taskLines.push(`[${m[1]}] ${m[2].slice(0, 120)}`);
    }
    for (const m of text.matchAll(fileRe)) {
      if (m[1].length < 200) snapshot.filesMentioned.add(m[1]);
    }
  }

  // Grab last 6 user/assistant turns for recency context
  const turns = messages.filter(m => m.role === 'user' || m.role === 'assistant');
  const recent = turns.slice(-6);
  for (const t of recent) {
    const text = typeof t.content === 'string'
      ? t.content
      : Array.isArray(t.content)
        ? t.content.filter(b => b.type === 'text').map(b => b.text).join(' ')
        : '';
    if (text.trim()) {
      snapshot.recentExchanges.push(`[${t.role}] ${text.trim().slice(0, 200)}`);
    }
  }

  return snapshot;
}

process.stdin.on('end', () => {
  const sessionsDir = getSessionsDir();
  ensureDir(sessionsDir);

  let sessionId = null;
  let transcriptPath = null;

  try {
    const input = JSON.parse(data);
    sessionId = input.session_id || null;
    transcriptPath = input.transcript_path || null;
  } catch {
    // No valid input — proceed with minimal logging
  }

  const timestamp = getDateTimeString();
  const timeStr = getTimeString();
  const compactionLog = path.join(sessionsDir, 'compaction-log.txt');
  appendFile(compactionLog, `[${timestamp}] Compaction triggered (session: ${sessionId || 'unknown'})\n`);

  // Find or create active session file
  let activeSession = null;
  const sessions = findFiles(sessionsDir, '*-session.tmp');
  if (sessions.length > 0) {
    activeSession = sessions[0].path;
  } else if (sessionId) {
    activeSession = path.join(sessionsDir, `${sessionId}-session.tmp`);
  }

  // Build snapshot lines
  const snapshotLines = [`\n---\n**[Compaction occurred at ${timeStr}]** - Context was summarized`];

  if (transcriptPath && fs.existsSync(transcriptPath)) {
    const snap = extractSnapshot(transcriptPath);

    const dedupedTasks = [...new Set(snap.taskLines)].slice(0, 15);
    if (dedupedTasks.length > 0) {
      snapshotLines.push('\n**Tasks at compaction time:**');
      snapshotLines.push(...dedupedTasks.map(t => `  ${t}`));
    }

    const files = [...snap.filesMentioned].slice(0, 10);
    if (files.length > 0) {
      snapshotLines.push('\n**Files mentioned:**');
      snapshotLines.push(...files.map(f => `  ${f}`));
    }

    if (snap.recentExchanges.length > 0) {
      snapshotLines.push('\n**Recent context (pre-compaction):**');
      snapshotLines.push(...snap.recentExchanges.map(e => `  ${e}`));
    }
  } else {
    snapshotLines.push('(transcript unavailable — minimal state saved)');
  }

  if (activeSession) {
    appendFile(activeSession, snapshotLines.join('\n') + '\n');
    log(`[PreCompact] Snapshot saved to ${path.basename(activeSession)}`);
  } else {
    log('[PreCompact] No active session file found — compaction logged only');
  }

  process.exit(0);
});
