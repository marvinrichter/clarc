---
name: r-testing
description: "R testing patterns: testthat 3e with expect_* assertions, snapshot testing, mocking with mockery and httptest2, covr code coverage, lintr static analysis, property-based testing with hedgehog, testing Shiny apps with shinytest2. Use when writing or reviewing R tests."
---

# R Testing

## When to Activate

- Writing tests with testthat in R packages
- Mocking HTTP calls or functions in tests
- Setting up coverage reporting with covr
- Testing Shiny applications with shinytest2

---

## testthat 3e — Modern Syntax

```r
# tests/testthat/test-compute.R
library(testthat)

test_that("compute_mean returns correct trimmed mean", {
  expect_equal(compute_mean(c(1, 2, 3, 4, 5)), 3)
  expect_equal(compute_mean(c(1, 2, 3, 100), trim = 0.25), 2.5)
})

test_that("compute_mean removes NA by default", {
  result <- compute_mean(c(1, NA, 3))
  expect_equal(result, 2)
})

test_that("compute_mean errors on non-numeric input", {
  expect_error(
    compute_mean(c("a", "b")),
    regexp = "must be numeric"
  )
})

test_that("compute_mean returns NaN for empty vector", {
  expect_true(is.nan(compute_mean(numeric(0))))
})
```

### Assertion Reference

```r
# Equality
expect_equal(actual, expected)           # numeric tolerance applied
expect_identical(actual, expected)       # exact, no tolerance
expect_equivalent(actual, expected)      # ignores attributes

# Type checks
expect_type(x, "double")
expect_s3_class(df, "data.frame")
expect_s4_class(m, "Matrix")
expect_inherits(x, "tbl_df")

# Conditions
expect_error(expr, regexp = NULL)        # regexp: optional pattern
expect_warning(expr, regexp = NULL)
expect_message(expr, regexp = NULL)
expect_no_error(expr)
expect_no_warning(expr)

# Logical
expect_true(cond)
expect_false(cond)
expect_null(x)
expect_length(x, n)

# Data frames
expect_equal(nrow(df), 5L)
expect_named(df, c("id", "name", "value"))
expect_contains(names(df), "created_at")

# Snapshots
expect_snapshot(print(my_object))        # console output snapshot
expect_snapshot_file(path, "chart.png")  # file snapshot
```

---

## Snapshot Testing

Snapshot tests capture output and fail if it changes unexpectedly.

```r
test_that("user_summary prints correctly", {
  user <- new_user(id = 1L, name = "Alice", email = "alice@example.com")
  expect_snapshot(print(user))
})

# Update snapshots after intentional change:
# testthat::snapshot_review()
# testthat::snapshot_accept()
```

---

## Mocking with mockery

```r
library(mockery)

test_that("fetch_data calls correct URL", {
  mock_response <- list(
    status_code = 200L,
    content     = list(id = 1L, name = "Alice")
  )

  stub(fetch_user, "httr::GET", mock(mock_response))

  result <- fetch_user(id = 1L)
  expect_equal(result$name, "Alice")
})

test_that("fetch_data handles 404", {
  stub(fetch_user, "httr::GET", mock(list(status_code = 404L)))

  expect_error(fetch_user(id = 999L), "not found")
})
```

---

## Mocking HTTP with httptest2

```r
library(httptest2)

test_that("GET /users/1 returns user data", {
  with_mock_api({
    result <- get_user(1L)
    expect_equal(result$name, "Alice")
  })
})

# Record real API responses for replay:
# httptest2::capture_requests({ get_user(1L) })
# Saves to tests/testthat/api.example.com/users/1.json
```

---

## Code Coverage with covr

```r
# Run package coverage
cov <- covr::package_coverage()

# Print summary
covr::zero_coverage(cov)   # show uncovered lines
print(cov)

# HTML report
covr::report(cov)

# Enforce minimum in CI
min_coverage <- 80
pct <- covr::percent_coverage(cov)
if (pct < min_coverage) {
  stop(sprintf("Coverage %.1f%% below minimum %.0f%%", pct, min_coverage))
}
```

---

## Shiny App Testing with shinytest2

```r
library(shinytest2)

test_that("user input triggers correct output", {
  app <- AppDriver$new(app_dir = ".", name = "my_app")

  app$set_inputs(user_id = 1)
  app$click("btn_fetch")
  app$wait_for_idle()

  output <- app$get_value(output = "user_name")
  expect_equal(output, "Alice")

  app$stop()
})
```

---

## Property-Based Testing with hedgehog

```r
library(hedgehog)

test_that("sum is commutative (property)", {
  forall(
    list(gen.int(100), gen.int(100)),
    function(a, b) expect_equal(a + b, b + a)
  )
})

test_that("sort is idempotent (property)", {
  forall(
    gen.element(list(gen.c(gen.double()), gen.c(gen.int(50)))),
    function(x) expect_equal(sort(sort(x)), sort(x))
  )
})
```

---

## Test File Organization

```
my_package/
  R/
    compute.R
    fetch.R
    shiny_app.R
  tests/
    testthat/
      test-compute.R
      test-fetch.R
      test-shiny.R
      fixtures/
        user_1.json
      _snaps/
        user_summary.md
    testthat.R
  DESCRIPTION
```

---

## Running Tests

```r
# All tests
devtools::test()

# Single file
testthat::test_file("tests/testthat/test-compute.R")

# Specific test by pattern
devtools::test(filter = "compute")

# With coverage
covr::package_coverage()
```
