---
description: "Elixir coding style — mix format, pattern matching, pipe operator"
globs: ["**/*.ex", "**/*.exs", "**/mix.exs"]
alwaysApply: false
---
# Elixir Coding Style

> See `rules/elixir/coding-style.md` for full standards.

## Standards

- Run `mix format` after every edit — non-negotiable
- Use `mix credo --strict` for style analysis
- Pattern matching over if/else/case where possible
- Use `with` for chained {:ok, _}/{:error, _} operations

```elixir
# CORRECT: Pattern match function heads
def process({:ok, value}), do: handle(value)
def process({:error, reason}), do: {:error, reason}

# CORRECT: with for chains
with {:ok, user} <- find_user(id),
     {:ok, _} <- authorize(user, :read) do
  {:ok, user}
end

# CORRECT: pipe operator
input |> parse() |> validate() |> transform()
```

## Naming

- `snake_case` for functions/variables
- `CamelCase` for modules
- `?` suffix for predicates, `!` suffix for raising functions
