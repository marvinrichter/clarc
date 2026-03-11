---
description: Initialize a new project from a workflow starter-pack (rest-api, react-spa, python-pipeline, go-service, flutter-app, spring-boot)
---

# Project Init

Bootstrap a new project from a battle-tested starter-pack.

## Usage

`/project-init <pack-name> [project-name]`

## Available Packs

| Pack | Stack |
|------|-------|
| `rest-api` | Node.js + TypeScript + PostgreSQL |
| `react-spa` | React 19 + TypeScript + Vite |
| `python-pipeline` | Python 3.13 + FastAPI/Click + pytest |
| `go-service` | Go 1.26 + Chi + sqlx |
| `flutter-app` | Flutter 3 + Riverpod + go_router |
| `spring-boot` | Java 25 + Spring Boot 4 + JPA |

## Arguments

$ARGUMENTS: `<pack-name> [project-name]`

- `pack-name` — one of the packs listed above (required)
- `project-name` — directory name to create (optional, prompted if omitted)

## Behavior

Load the `starter-packs` skill and follow the Bootstrap Protocol:

1. Validate the requested pack (list available packs if unknown)
2. Prompt for project name if not provided
3. Confirm the target directory with the user
4. Generate project structure (directories + baseline files)
5. Install clarc rules for the pack's language
6. Run the baseline test to verify setup
7. Enable Memory Bank (`.clarc/`)
8. Print next steps

## Examples

```
/project-init rest-api my-backend
/project-init react-spa
/project-init go-service order-service
/project-init python-pipeline data-etl
```

## Notes

- `/init` is a reserved Claude Code command — this is `/project-init`
- For team setups with shared rules, combine with `install.sh --team-mode`
- See skill `starter-packs` for full pack specifications

## After This

- `/tdd` — start building with test-driven development
- `/setup-ci` — configure CI/CD pipeline
