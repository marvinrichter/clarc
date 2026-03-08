# clarc check — CI/CD Setup

AI-powered PR review using clarc's language-specialist agents, running as GitHub Status Checks.

## What you get

- **clarc / code-review** — Language-aware code review (TypeScript, Go, Python, Rust, Java, Swift, Ruby, Elixir, C++, C#, PHP, and more). Posts findings as a PR comment with CRITICAL / HIGH / MEDIUM / LOW severity.
- **clarc / security** — Security-focused scan for OWASP Top 10, hardcoded secrets, SQL injection, XSS, SSRF, and more. Blocks PRs on CRITICAL findings.

Both checks update their comment on each new push — no duplicate comments.

## Quickstart (5 minutes)

### 1. Add your Anthropic API key as a GitHub Secret

Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**:

```
Name:  ANTHROPIC_API_KEY
Value: sk-ant-...
```

### 2. Copy the workflow file

```bash
cp .github/workflows/clarc-check.yml your-project/.github/workflows/clarc-check.yml
cp scripts/ci/clarc-review.js your-project/scripts/ci/clarc-review.js
cp scripts/ci/clarc-security.js your-project/scripts/ci/clarc-security.js
```

### 3. Open a PR

clarc reviews automatically on every push to the PR branch.

## Configuration

The workflow supports these environment variables (set in the workflow `env:` block):

| Variable | Default | Description |
|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | — | **Required.** Your Anthropic API key. |
| `CHANGED_FILES` | (auto) | Comma-separated changed files. Set by the workflow automatically. |
| `PR_NUMBER` | (auto) | PR number. Set by the workflow automatically. |
| `PR_TITLE` | (auto) | PR title for context. Set by the workflow automatically. |
| `TOTAL_FILES` | (auto) | Total changed file count (before 20-file cap). |

### Controlling which checks run

Edit `.github/workflows/clarc-check.yml` and remove the job you don't need:

```yaml
# To disable security check, remove the security-check job entirely
jobs:
  code-review:
    # ... keep this
  # security-check:   ← delete this job
```

### Controlling when the check fails

By default, both jobs fail only on **CRITICAL** findings. To change this, edit the final step in each job:

```yaml
# Fail on CRITICAL + HIGH
- name: Fail on severe findings
  if: steps.review.outputs.has_critical == 'true'  # ← change condition
  run: exit 1
```

To never fail (review only, advisory): remove the `Fail on CRITICAL` step entirely.

### Limiting file scope

The workflow reviews up to **20 files** per PR to control API costs. To change this:

```bash
# In clarc-check.yml, update the head command:
head -20 changed-files.txt > changed-files-capped.txt
# Change 20 to your desired limit
```

## Cost estimation

| PR size | Estimated cost |
|---------|---------------|
| Small (1–5 files) | ~$0.02–0.08 per review |
| Medium (5–10 files) | ~$0.08–0.20 per review |
| Large (10–20 files) | ~$0.20–0.50 per review |

At 10 PRs/day with an average of 5 files each: **~$0.40–1.00/day**.

> Exact costs depend on file sizes and language complexity. Monitor your usage at [console.anthropic.com](https://console.anthropic.com).

## Skipping clarc on a PR

Add `[skip clarc]` to the PR title to skip all clarc checks:

```bash
# The workflow checks for this string in the PR title
# (Add this condition to the workflow if needed — not included by default)
```

Or use GitHub's built-in skip: add `[skip ci]` to skip all CI checks.

## Self-hosting considerations

The scripts (`clarc-review.js`, `clarc-security.js`) call the Anthropic API directly — no clarc server involved. Your code is sent to Anthropic's API but not stored.

Review Anthropic's [data privacy policy](https://www.anthropic.com/privacy) before enabling on private repositories with sensitive IP.

## Troubleshooting

**`ANTHROPIC_API_KEY is not set`**
→ Add the secret in GitHub repo settings. See step 1 above.

**Comment not appearing on PR**
→ Check the `permissions: pull-requests: write` block in the workflow. Required for the `actions/github-script` step to post comments.

**Review is empty / "No files to review"**
→ The `git diff` command couldn't find changed files. Ensure `fetch-depth: 0` is set in `actions/checkout`.

**Rate limit errors from Anthropic API**
→ The reviews run in parallel (code-review + security). On high-volume repos, add a small delay or run them sequentially.
