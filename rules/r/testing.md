---
paths:
  - "**/*.R"
  - "**/*.r"
  - "**/*.Rmd"
  - "**/*.qmd"
---

# R Testing

> This file extends [common/testing.md](../common/testing.md) with R specific content.

## Test Framework: testthat

Standard framework for R package testing:

```r
# tests/testthat/test-compute.R
test_that("compute_mean returns correct value", {
  expect_equal(compute_mean(c(1, 2, 3)), 2)
  expect_equal(compute_mean(c(1, NA, 3), na.rm = TRUE), 2)
})

test_that("compute_mean errors on non-numeric input", {
  expect_error(compute_mean("a"), "must be numeric")
})

test_that("compute_mean handles empty vector", {
  expect_true(is.nan(compute_mean(numeric(0))))
})
```

### Running Tests

```r
# Run all tests
devtools::test()

# Run a specific test file
testthat::test_file("tests/testthat/test-compute.R")

# Run with coverage
covr::package_coverage()
```

### testthat Expectation Reference

```r
expect_equal(actual, expected)          # equal with tolerance for floats
expect_identical(actual, expected)      # exact equality (type + value)
expect_true(condition)
expect_false(condition)
expect_null(x)
expect_length(x, n)
expect_s3_class(obj, "data.frame")
expect_s4_class(obj, "Matrix")
expect_error(expr, regexp)              # message matches regexp
expect_warning(expr, regexp)
expect_message(expr, regexp)
expect_snapshot(expr)                   # snapshot testing
expect_snapshot_file(path)              # file snapshot
```

## Test Organization

```
my_package/
  R/
    compute.R
    utils.R
  tests/
    testthat/
      test-compute.R
      test-utils.R
    testthat.R    # test runner
  DESCRIPTION
```

## Mocking with mockery

```r
library(mockery)

test_that("fetch_user calls the API with correct URL", {
  mock_get <- mock(
    list(status_code = 200, content = list(name = "Alice"))
  )

  with_mock(
    httr::GET = mock_get,
    {
      result <- fetch_user(1)
      expect_called(mock_get, 1)
      expect_args(mock_get, 1, "https://api.example.com/users/1")
      expect_equal(result$name, "Alice")
    }
  )
})
```

## Coverage with covr

```r
# Package coverage
covr::package_coverage()

# HTML report
covr::report()

# Fail below threshold (for CI)
covr::package_coverage() |>
  covr::zero_coverage() |>
  (\(x) if (covr::percent_coverage(x) < 80) stop("Coverage below 80%"))()
```

## Reference

For patterns and tidyverse idioms: `skills/r-patterns`
For data science workflows and testing: `skills/r-testing`
