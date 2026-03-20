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

# R Patterns

> This file extends [common/patterns.md](../common/patterns.md) with R specific content.

## Tidyverse Data Pipeline

Compose transformations with the pipe operator:

```r
library(dplyr)
library(tidyr)

# Clean, transform, and summarise
summary_data <- raw_data |>
  dplyr::filter(!is.na(value)) |>
  dplyr::mutate(
    date    = lubridate::ymd(date_string),
    revenue = price * quantity
  ) |>
  dplyr::group_by(category, lubridate::floor_date(date, "month")) |>
  dplyr::summarise(
    total_revenue = sum(revenue),
    avg_price     = mean(price),
    n             = dplyr::n(),
    .groups       = "drop"
  ) |>
  dplyr::arrange(dplyr::desc(total_revenue))
```

## Functional Programming

Prefer vectorized operations and `purrr` over explicit loops:

```r
library(purrr)

# WRONG — explicit loop
results <- list()
for (i in seq_along(files)) {
  results[[i]] <- read.csv(files[[i]])
}

# CORRECT — purrr::map
results <- purrr::map(files, read.csv)

# With type-safe variants
means   <- purrr::map_dbl(datasets, ~ mean(.x$value, na.rm = TRUE))
names   <- purrr::map_chr(users, "name")

# Parallel apply with error handling
safe_read <- purrr::safely(read.csv)
results   <- purrr::map(files, safe_read)
errors    <- purrr::keep(results, ~ !is.null(.x$error))
```

## R6 Classes — Reference Semantics

Use R6 for objects that need mutable state:

```r
library(R6)

UserService <- R6::R6Class(
  "UserService",
  private = list(
    repository = NULL,
    logger     = NULL
  ),
  public = list(
    initialize = function(repository, logger) {
      private$repository <- repository
      private$logger     <- logger
    },
    find_by_id = function(id) {
      stopifnot(is.integer(id), length(id) == 1L)
      result <- private$repository$find(id)
      if (is.null(result)) {
        private$logger$warn(glue::glue("User {id} not found"))
      }
      result
    }
  )
)

service <- UserService$new(repository = my_repo, logger = my_logger)
```

## Tidy Evaluation (rlang)

For functions that accept column names as arguments:

```r
library(rlang)
library(dplyr)

# Accept column names as unquoted symbols
summarise_by <- function(data, group_col, value_col) {
  data |>
    dplyr::group_by({{ group_col }}) |>
    dplyr::summarise(
      mean_val = mean({{ value_col }}, na.rm = TRUE),
      .groups  = "drop"
    )
}

# Usage
summarise_by(mtcars, cyl, mpg)
```

## Type-Safe Data with vctrs

```r
library(vctrs)

# Define a custom vector type
new_email <- function(x = character()) {
  stopifnot(is.character(x))
  vctrs::new_vctr(x, class = "email")
}

is_email <- function(x) inherits(x, "email")

format.email <- function(x, ...) paste0("<", vctrs::vec_data(x), ">")
```

## Reference

For detailed skill content: `skills/r-patterns`
For testing patterns with testthat and covr: `skills/r-testing`
