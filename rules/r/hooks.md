---
paths:
  - "**/*.R"
  - "**/*.r"
  - "**/*.Rmd"
  - "**/*.qmd"
---

# R Hooks

> This file extends [common/hooks.md](../common/hooks.md) with R specific content.

## Auto-Format on Edit

After editing any `.R`, `.r`, `.Rmd`, or `.qmd` file, `styler` runs automatically via `Rscript`:

```bash
Rscript -e "styler::style_file('$FILE')"
```

Falls back silently if R or styler is not installed.

## Recommended `.lintr`

```
linters: linters_with_defaults(
  line_length_linter(80),
  object_name_linter("snake_case"),
  assignment_linter(),
  spaces_inside_linter()
)
```

Run lintr:

```r
lintr::lint_package()
lintr::lint("R/my_file.R")
```

## Static Analysis

```r
# Lint entire package
lintr::lint_package()

# Type checking with r-lib/air (if available)
# air check src/
```

## Pre-commit Checks

```bash
Rscript -e "styler::style_pkg(dry = 'fail')"   # format check
Rscript -e "lintr::lint_package()"              # lint check
Rscript -e "devtools::test()"                   # run tests
Rscript -e "covr::package_coverage()"           # coverage
```
