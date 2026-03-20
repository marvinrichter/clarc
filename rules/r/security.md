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

# R Security

> This file extends [common/security.md](../common/security.md) with R specific content.

## Shell Execution

Never pass user-controlled data to R's shell-execution functions (`system`, `system2`, `shell`). These functions execute commands in the OS shell.

```r
# WRONG — command injection if user_input is untrusted
system(paste("echo", user_input))

# CORRECT — avoid shell entirely; use R file/string APIs
cat(user_input, "\n")

# If shell is unavoidable, use system2 with separate args
# and validate input strictly before passing
system2("echo", args = shQuote(validated_input))
```

## SQL Injection

Use parameterized queries — never build SQL strings from user input:

```r
# WRONG
query <- paste0("SELECT * FROM users WHERE id = ", user_id)
DBI::dbGetQuery(con, query)

# CORRECT — parameterized
DBI::dbGetQuery(
  con,
  "SELECT * FROM users WHERE id = ?",
  params = list(as.integer(user_id))
)

# With glue — ONLY safe for trusted, internal values
DBI::dbGetQuery(con, glue::glue_sql(
  "SELECT * FROM users WHERE id = {id}",
  id = as.integer(user_id),
  .con = con
))
```

## Secret Management

Never hardcode API keys, tokens, or credentials:

```r
# WRONG
api_key <- "sk-prod-abc123"

# CORRECT — environment variable
api_key <- Sys.getenv("OPENAI_API_KEY")
if (nchar(api_key) == 0) stop("OPENAI_API_KEY is not set")
```

Use `usethis::edit_r_environ()` to manage `.Renviron` for local development.
Never commit `.Renviron` files to version control.

## Deserialization Safety

The `readRDS` and `load` functions execute arbitrary R code embedded in RDS/RData files.
Only load files from trusted sources — never from user-supplied URLs or uploads.

```r
# RISKY — RDS from unknown origin
model <- readRDS(url(user_supplied_url))

# SAFE — local, trusted file only
model <- readRDS("models/trained_model.rds")
```

## Shiny App Security

- Validate all `input$*` values before use — treat them as untrusted user input
- Use `shiny::validate` + `shiny::need` to enforce constraints
- Never include sensitive data in `output$*` without authentication checks
- Sanitize any user text rendered as HTML with `htmltools::htmlEscape`

```r
# Validate numeric range in Shiny
output$result <- renderText({
  shiny::validate(
    shiny::need(is.numeric(input$n), "n must be numeric"),
    shiny::need(input$n > 0 && input$n <= 1000, "n must be between 1 and 1000")
  )
  paste("Result:", compute(input$n))
})
```

## Dependency Auditing

```r
# Check for known vulnerabilities
pak::pkg_deps_tree(".")

# Update dependencies safely
renv::update()
renv::snapshot()
```

Commit `renv.lock` to ensure reproducible dependency versions across environments.
