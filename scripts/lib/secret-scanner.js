/**
 * Shared secret-scanning logic used by both:
 *   - scripts/hooks/pre-bash-dispatch.js (pre-commit guard)
 *   - scripts/hooks/auto-checkpoint.js   (checkpoint guard)
 *
 * Pattern philosophy: high-confidence only, minimal false positives.
 * We prefer missing a rare secret over blocking legitimate commits.
 */

export const SECRET_PATTERNS = [
  { type: 'AWS Access Key',  re: /\bAKIA[0-9A-Z]{16}\b/ },
  { type: 'AWS Secret Key',  re: /\baws_secret_access_key\s*[=:]\s*[A-Za-z0-9+/]{40}\b/i },
  { type: 'GitHub Token',    re: /\b(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36}\b/ },
  { type: 'PEM Private Key', re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { type: 'Slack Token',     re: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/ },
  { type: 'Generic API Key', re: /(?:^|\b)(?:api_key|api_secret|access_token|auth_token)\s*[=:]\s*["']?[A-Za-z0-9_-]{32,}["']?/im },
];

/**
 * Scan a text blob for secret patterns.
 * @param {string} text
 * @returns {{ type: string, snippet: string }[]} array of findings (empty = clean)
 */
export function scanForSecrets(text) {
  const found = [];
  for (const { type, re } of SECRET_PATTERNS) {
    const m = text.match(re);
    if (m) {
      found.push({ type, snippet: m[0].slice(0, 8) + '…' });
    }
  }
  return found;
}
