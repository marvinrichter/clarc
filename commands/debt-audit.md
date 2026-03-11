---
description: Systematic technical debt inventory — complexity analysis, hotspot identification (Churn×Complexity), dependency age, test coverage gaps, and prioritized debt backlog
---

# Debt Audit Command

Run a systematic technical debt audit: $ARGUMENTS

## Your Task

Inventory technical debt in the project using measurable signals: complexity metrics, churn analysis, dependency age, and test coverage gaps. Produce a prioritized debt backlog.

## Step 1 — Detect Language and Run Complexity Analysis

```bash
# Detect language
ls package.json requirements.txt Cargo.toml go.mod pom.xml 2>/dev/null | head -5
```

**Node.js / TypeScript:**
```bash
# Cyclomatic complexity via plato (JS) or ts-complexity
npx plato -r -d complexity-report src/
# or
find src -name "*.ts" | xargs npx tsc --noEmit 2>&1 | grep "error" | wc -l

# Lines per file (proxy for God Classes)
find src -name "*.ts" -o -name "*.js" | grep -v "test\|spec\|node_modules" | \
  xargs wc -l 2>/dev/null | sort -rn | head -20
```

**Python:**
```bash
pip install radon -q
radon cc src/ -a -s -n B   # Show B+ complexity (CC > 5)
radon mi src/ -s           # Maintainability Index
radon hal src/             # Halstead complexity
```

**Go:**
```bash
go install github.com/fzipp/gocyclo@latest
gocyclo -over 10 ./...     # Flag CC > 10
go vet ./...               # Built-in quality checks
```

**Java:**
```bash
# With Maven
mvn checkstyle:check
mvn pmd:check
# Or via SonarQube / SonarLint (recommended for Java)
```

## Step 2 — Churn Analysis (Most Changed Files)

```bash
# Top 20 files by change frequency — last 6 months
echo "=== HIGH CHURN (last 6 months) ==="
git log --after="6 months ago" --name-only --format="" | \
  grep -v "^$" | sort | uniq -c | sort -rn | head -20

# All time
echo "=== HIGH CHURN (all time) ==="
git log --name-only --format="" | \
  grep -v "^$" | sort | uniq -c | sort -rn | head -20

# Hotspot = High Churn × High Complexity (manual crossref)
```

## Step 3 — Test Coverage Gaps

```bash
# Node.js — jest coverage
npx jest --coverage --coverageReporters=text 2>/dev/null | tail -30

# Find files with no test counterpart
echo "=== FILES WITHOUT TESTS ==="
find src -name "*.ts" | grep -v "test\|spec" | while read f; do
  base=$(basename "${f%.*}")
  if ! find . \( -name "${base}.test.ts" -o -name "${base}.spec.ts" \) 2>/dev/null | grep -q .; then
    echo "  UNTESTED: $f"
  fi
done | head -20

# Python
coverage run -m pytest && coverage report --skip-covered | head -20

# Go
go test ./... -coverprofile=coverage.out
go tool cover -func=coverage.out | grep -v "100.0%" | sort -k3 -rn | head -20
```

## Step 4 — Dependency Age Audit

```bash
# npm — outdated packages
echo "=== OUTDATED DEPENDENCIES ==="
npm outdated 2>/dev/null | head -20

# Major version gaps (breaking change risk)
npm outdated --json 2>/dev/null | \
  node -e "
    const data = JSON.parse(require('fs').readFileSync('/dev/stdin'));
    Object.entries(data).forEach(([pkg, v]) => {
      const curMajor = parseInt(v.current.split('.')[0]);
      const latMajor = parseInt(v.latest.split('.')[0]);
      if (latMajor > curMajor) console.log('MAJOR GAP:', pkg, v.current, '->', v.latest);
    });
  " 2>/dev/null | head -15

# Python
pip install pip-review -q
pip-review 2>/dev/null | head -15

# Go — available module updates
go list -m -u all 2>/dev/null | grep "\[" | head -15
```

## Step 5 — Architecture Smell Detection

```bash
# God Classes (files > 400 lines in src)
echo "=== GOD CLASSES (> 400 lines) ==="
find src -name "*.ts" -o -name "*.py" -o -name "*.java" -o -name "*.go" | \
  grep -v "test\|spec\|vendor\|node_modules" | \
  xargs wc -l 2>/dev/null | awk '$1 > 400 {print $0}' | sort -rn | head -15

# Circular dependencies (Node.js)
npx madge --circular --extensions ts src/ 2>/dev/null | head -10

# High coupling (most imported modules)
echo "=== MOST IMPORTED (HIGH COUPLING) ==="
grep -rh "^import.*from\|require(" src/ 2>/dev/null | \
  grep -o "'[./][^']*'" | sed "s/'//g" | sort | uniq -c | sort -rn | head -10
```

## Step 6 — Build the Debt Backlog

Combine findings into a prioritized backlog:

**Priority formula:**
- P0: Hotspot (high churn + high complexity) AND on critical path
- P1: High churn + high complexity OR untested critical path
- P2: High churn + low complexity OR complex but rarely changed
- P3: Outdated dependencies, low risk

## Output — Prioritized Debt Backlog

```markdown
# Technical Debt Audit Report

**Date:** [YYYY-MM-DD]
**Project:** [name]
**Total debt items found:** [N]

---

## Executive Summary

> "The [module] area accumulates ~[N]h/sprint in developer overhead due to [specific issues].
> Addressing the P0 and P1 items is estimated at [X] sprints and would recover [Y]h/sprint."

---

## Hotspot Matrix

| File/Module | Churn (6mo) | Complexity | Tests | Priority |
|-------------|-------------|-----------|-------|----------|
| [path] | [N changes] | [rating] | ❌/✅ | 🔴 P0 |

---

## P0 — Pay Down Immediately (blocking current work)

### [ID]: [Title]
- **Location:** [file:line]
- **Evidence:** [churn count], [complexity], [test gap]
- **Current cost:** ~[N]h/sprint overhead
- **Estimated fix:** [effort]
- **Break-even:** [months]
- **Recommendation:** [specific action]

---

## P1 — This Quarter

[Same format]

---

## P2 — Next Quarter

[Same format]

---

## Outdated Dependencies

| Package | Current | Latest | Type | Risk |
|---------|---------|--------|------|------|
| [name] | [ver] | [ver] | major/minor/patch | high/low |

Recommended action: Add [Renovate/Dependabot] for automated PRs.

---

## Test Coverage Gaps

| File | Coverage | Last Changed | Risk |
|------|----------|-------------|------|
| [path] | 0% | [N months ago] | HIGH |

---

## Metrics to Baseline (before paying down debt)

Track these to demonstrate improvement:
- Average PR cycle time for [module]: [current]
- Deploy frequency: [current]
- Test coverage: [current %]
```

## Reference Skills

- `technical-debt` — debt taxonomy, interest rate calculation, stakeholder communication
- `legacy-modernization` — patterns for implementing the fixes (Strangler Fig, Branch-by-Abstraction)
- `engineering-metrics` — DORA metrics to measure impact of debt reduction

## After This

- `/refactor` — tackle the highest-priority technical debt items
- `/modernize` — create a modernization roadmap for legacy code
