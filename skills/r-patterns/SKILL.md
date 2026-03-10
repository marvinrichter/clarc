---
name: r-patterns
description: "R patterns: tidyverse data pipelines with dplyr/tidyr/purrr, native pipe |>, R6 classes, tidy evaluation with rlang {{, vctrs custom types, renv dependency management, ggplot2 visualization, functional programming with purrr::map/walk/reduce. Use when writing or reviewing R code."
---

# R Patterns

## When to Activate

- Writing R scripts, packages, or Shiny apps (`.R`, `.Rmd`, `.qmd`)
- Designing data transformation pipelines with tidyverse
- Building R packages with roxygen2 documentation
- Reviewing R code for idiomatic style
- Using tidy evaluation (`{{ }}`) to write reusable functions that accept column names as arguments
- Managing project dependencies reproducibly with `renv` and a committed lockfile
- Choosing between `purrr::map` variants and for loops for iteration over data structures
- Creating publication-ready visualizations with ggplot2 and the scales package

---

## Native Pipe and Tidyverse Pipeline

```r
library(dplyr)
library(tidyr)
library(lubridate)

# Full ETL pipeline using |> (R 4.1+)
monthly_revenue <- transactions |>
  dplyr::filter(
    !is.na(amount),
    status == "completed"
  ) |>
  dplyr::mutate(
    date    = lubridate::ymd(date_str),
    month   = lubridate::floor_date(date, "month"),
    revenue = amount * (1 - discount_rate)
  ) |>
  dplyr::group_by(category, month) |>
  dplyr::summarise(
    total       = sum(revenue),
    n_orders    = dplyr::n(),
    avg_order   = mean(revenue),
    .groups     = "drop"
  ) |>
  dplyr::arrange(month, dplyr::desc(total))
```

---

## Functional Programming with purrr

```r
library(purrr)

# Type-safe map variants
means   <- purrr::map_dbl(datasets, ~ mean(.x$value, na.rm = TRUE))
names   <- purrr::map_chr(users, ~ .x$name)
flags   <- purrr::map_lgl(records, ~ !is.na(.x$email))

# Error-safe mapping
safe_read <- purrr::safely(readRDS)
results   <- purrr::map(file_paths, safe_read)
data_ok   <- purrr::keep(results, ~ is.null(.x$error)) |> purrr::map("result")
data_err  <- purrr::keep(results, ~ !is.null(.x$error))

# Walk for side effects (no return value)
purrr::walk(output_files, ~ message("Written: ", .x))

# Reduce to accumulate
total <- purrr::reduce(c(1, 2, 3, 4), `+`, .init = 0)  # 10

# Map2 — parallel iteration
combined <- purrr::map2_chr(
  first_names, last_names,
  ~ paste(.x, .y)
)
```

---

## R6 Classes — Mutable Objects

```r
library(R6)
library(glue)

# R6 class with private state
DataPipeline <- R6::R6Class(
  "DataPipeline",
  private = list(
    steps    = NULL,
    log_msgs = NULL
  ),
  public = list(
    initialize = function() {
      private$steps    <- list()
      private$log_msgs <- character(0)
    },
    add_step = function(name, fn) {
      stopifnot(is.character(name), is.function(fn))
      private$steps[[name]] <- fn
      invisible(self)  # enable method chaining
    },
    run = function(data) {
      result <- data
      for (step_name in names(private$steps)) {
        result <- private$steps[[step_name]](result)
        private$log_msgs <- c(
          private$log_msgs,
          glue::glue("[{Sys.time()}] Step '{step_name}' complete: {nrow(result)} rows")
        )
      }
      result
    },
    get_log = function() private$log_msgs
  )
)

# Method chaining
pipeline <- DataPipeline$new()$
  add_step("clean", ~ dplyr::filter(.x, !is.na(value)))$
  add_step("transform", ~ dplyr::mutate(.x, value = log1p(value)))

result <- pipeline$run(raw_data)
```

---

## Tidy Evaluation (rlang)

For functions that take column names as arguments:

```r
library(dplyr)
library(rlang)

# Embrace operator {{ }} for column names
group_summary <- function(data, group_col, value_col) {
  data |>
    dplyr::group_by({{ group_col }}) |>
    dplyr::summarise(
      n    = dplyr::n(),
      mean = mean({{ value_col }}, na.rm = TRUE),
      sd   = sd({{ value_col }}, na.rm = TRUE),
      .groups = "drop"
    )
}

# Works with any column names — no quoting needed
group_summary(mtcars, cyl, mpg)
group_summary(flights, carrier, arr_delay)

# .data pronoun — for string column names
filter_by_col <- function(data, col_name, threshold) {
  data |> dplyr::filter(.data[[col_name]] > threshold)
}
```

---

## ggplot2 — Visualization Patterns

```r
library(ggplot2)
library(scales)

# Publication-ready chart
monthly_revenue |>
  ggplot2::ggplot(ggplot2::aes(x = month, y = total, color = category)) +
  ggplot2::geom_line(linewidth = 1) +
  ggplot2::geom_point(size = 2) +
  ggplot2::scale_y_continuous(labels = scales::dollar_format()) +
  ggplot2::scale_x_date(date_breaks = "1 month", date_labels = "%b %Y") +
  ggplot2::labs(
    title    = "Monthly Revenue by Category",
    subtitle = "Jan–Dec 2024",
    x        = NULL,
    y        = "Revenue (USD)",
    color    = "Category"
  ) +
  ggplot2::theme_minimal() +
  ggplot2::theme(legend.position = "bottom")
```

---

## Package Structure (R6 + roxygen2)

```r
#' User Service
#'
#' Manages user retrieval and creation.
#'
#' @export
UserService <- R6::R6Class(
  "UserService",
  public = list(
    #' @description Create a new UserService
    #' @param repo A UserRepository object
    initialize = function(repo) {
      self$repo <- repo
    },

    #' @description Find user by ID
    #' @param id Integer user ID
    #' @return A User object or NULL
    find_by_id = function(id) {
      stopifnot(is.integer(id), length(id) == 1L, id > 0L)
      self$repo$find(id)
    },

    repo = NULL
  )
)
```

---

## renv — Reproducible Dependencies

```r
# Initialize renv in a project
renv::init()

# Snapshot current state
renv::snapshot()

# Restore from lockfile (CI / team members)
renv::restore()

# Update a package
renv::update("dplyr")
renv::snapshot()  # always snapshot after update
```

Always commit `renv.lock` to version control. Add `renv/library/` to `.gitignore`.

---

## Anti-Patterns

| Anti-Pattern | Problem | Better |
|---|---|---|
| `for` loop over data frame rows | Slow, hard to read | `dplyr::mutate` or `purrr::map` |
| `T`/`F` for TRUE/FALSE | Overridable as variables | Use `TRUE`/`FALSE` |
| `attach(data)` | Pollutes global environment | Use `data$col` or `with(data, ...)` |
| `setwd()` in scripts | Breaks portability | Use `here::here()` for paths |
| `1:length(x)` in loops | Fails on empty vectors | `seq_along(x)` or `seq_len(length(x))` |
| `=` for assignment | Style inconsistency | `<-` always |
| Ignoring `NA` values | Silent incorrect results | Explicitly use `na.rm = TRUE` |
