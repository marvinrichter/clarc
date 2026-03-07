---
description: "Elixir development hooks — mix format, credo, sobelow"
globs: ["**/*.ex", "**/*.exs"]
alwaysApply: false
---
# Elixir Hooks

After editing Elixir files:

```bash
mix format <file>
```

Before PR:

```bash
mix credo --strict
mix sobelow --exit --skip
mix deps.audit
```
