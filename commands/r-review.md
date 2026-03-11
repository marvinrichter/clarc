---
description: R code review for tidyverse idioms, tidy evaluation, Shiny security, and renv lockfile management. Invokes the r-reviewer agent.
---

# R Code Review

This command invokes the **r-reviewer** agent for R-specific code review.

## What This Command Does

1. **Identify R Changes**: Find modified `.r` and `.R` files via `git diff`
2. **Tidyverse Idioms**: Native pipe `|>`, purrr functional patterns, tidy eval correctness
3. **Security Review**: Shiny input validation, SQL injection via DBI, credential exposure
4. **Package Management**: renv lockfile consistency, unpinned dependencies
5. **Test Coverage**: testthat patterns, covr integration
6. **Generate Report**: Categorize issues by severity

## When to Use

- After writing or modifying R code
- Before committing data analysis scripts or Shiny apps
- Reviewing R packages for CRAN submission
- Checking production R pipelines

## Review Categories

### CRITICAL (Must Fix)
- Shiny: missing `validate(need(...))` on user inputs
- SQL injection via `paste()` in DBI queries (use `glue_sql()` or parameterized queries)
- Hardcoded credentials or API tokens in R scripts
- `eval(parse(text = user_input))` (code injection)

### HIGH (Should Fix)
- `%>%` instead of native `|>` in new code (R 4.1+)
- Missing renv lockfile update after adding packages
- `library()` calls inside functions (use `requireNamespace`)
- T/F instead of TRUE/FALSE (masked by variables)

### MEDIUM (Consider)
- Base R loops where purrr `map_*` is clearer
- Missing `tryCatch` for network or file I/O operations
- Untyped function arguments where type-checking would help

## Related

- Agent: `agents/r-reviewer.md`
- Skills: `skills/r-patterns/`, `skills/r-testing/`

## After This

- `/tdd` — add tests for R code that failed review
- `/build-fix` — fix dependency or package issues
