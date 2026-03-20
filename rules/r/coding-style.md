---
paths:
  - "**/*.R"
  - "**/*.r"
  - "**/*.Rmd"
  - "**/*.qmd"
globs:
  - "**/*.{R,r,Rmd,qmd}"
  - "**/DESCRIPTION"
  - "**/renv.lock"
alwaysApply: false
---

# R Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with R specific content.

## Tidyverse Style

Follow the [Tidyverse Style Guide](https://style.tidyverse.org/). Enforced by `styler`:

```r
# Format a file
styler::style_file("R/my_analysis.R")

# Format an entire package
styler::style_pkg()

# Check without modifying (CI)
styler::style_file("R/my_analysis.R", dry = "fail")
```

## Naming Conventions

- Functions and variables: `snake_case` — `compute_mean`, `user_data`
- Constants: `UPPER_SNAKE_CASE` — `MAX_ITERATIONS`
- Filenames: `snake_case.R` — `data_cleaning.R`
- S3 class names: `PascalCase` — `UserRecord`
- Private helpers (package-internal): prefix with `.` — `.validate_input`

```r
# WRONG
computeMean <- function(x) { ... }
my.data <- data.frame()

# CORRECT
compute_mean <- function(x) { ... }
my_data <- data.frame()
```

## Assignment

Always use `<-` for assignment, not `=` (except in function arguments):

```r
# WRONG
x = 42

# CORRECT
x <- 42

# OK — = in function argument
f(x = 42)
```

## Pipe Operator

Use the native pipe `|>` (R 4.1+) or `%>%` (magrittr). Be consistent within a project:

```r
# Native pipe (preferred for R 4.1+)
result <- mtcars |>
  dplyr::filter(cyl == 6) |>
  dplyr::group_by(gear) |>
  dplyr::summarise(mean_mpg = mean(mpg))
```

## Function Design

- Keep functions under 40 lines
- One function, one purpose
- Document with `roxygen2` for package functions:

```r
#' Compute the trimmed mean
#'
#' @param x A numeric vector
#' @param trim Fraction to trim from each end (default 0.1)
#' @return A single numeric value
#' @export
compute_trimmed_mean <- function(x, trim = 0.1) {
  if (!is.numeric(x)) stop("`x` must be numeric")
  mean(x, trim = trim, na.rm = TRUE)
}
```

## Error Handling

Use `stop()` for errors, `warning()` for warnings, `message()` for informational output:

```r
safe_divide <- function(x, y) {
  if (y == 0) stop("Division by zero")
  x / y
}

# Catch with tryCatch
result <- tryCatch(
  safe_divide(10, 0),
  error = function(e) {
    message("Error: ", conditionMessage(e))
    NA_real_
  }
)
```

## Formatting

- 2-space indentation
- Max line length: 80 characters
- Spaces around operators: `x + y`, not `x+y`
- Space after comma: `f(x, y)`, not `f(x,y)`
- Enforced by `styler` + `.lintr` lint rules
