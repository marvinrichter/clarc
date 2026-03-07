---
paths:
  - "**/*.ex"
  - "**/*.exs"
  - "**/mix.exs"
  - "**/mix.lock"
---
> This file extends [common/coding-style.md](../common/coding-style.md) with Elixir-specific content.

# Elixir Coding Style

## Formatting

- **mix format** is mandatory — run after every edit (`mix format <file>`)
- **Credo** for static analysis: `mix credo --strict`
- **Dialyzer** for type checking: `mix dialyzer` (via dialyxir)
- 2-space indentation

## Naming Conventions

- `snake_case` for functions, variables, modules attributes
- `CamelCase` for modules
- `?` suffix for predicate functions: `valid?/1`, `empty?/1`
- `!` suffix for functions that raise: `fetch!/1`, `create!/1`
- `_` prefix for intentionally unused variables: `_unused`

## Pattern Matching First

Pattern matching is the primary control flow tool in Elixir:

```elixir
# WRONG: conditional checks
def process(result) do
  if result == {:ok, value} do
    handle_value(value)
  else
    handle_error(result)
  end
end

# CORRECT: pattern matching
def process({:ok, value}), do: handle_value(value)
def process({:error, reason}), do: handle_error(reason)
```

## Pipe Operator

Use `|>` for data transformation chains:

```elixir
# WRONG: nested function calls
String.downcase(String.trim(String.replace(input, "-", "_")))

# CORRECT: pipe chain
input
|> String.replace("-", "_")
|> String.trim()
|> String.downcase()
```

## Immutability

All Elixir data is immutable. Embrace it:

```elixir
# WRONG: thinking mutably
user = %User{name: "Jane"}
user.name = "John"  # This doesn't work!

# CORRECT: create new struct
updated_user = %{user | name: "John"}
```

## Error Handling

Use tagged tuples `{:ok, result}` / `{:error, reason}` consistently:

```elixir
# WRONG: raising for control flow
def find_user(id) do
  User |> Repo.get!(id)
rescue
  Ecto.NoResultsError -> nil
end

# CORRECT: return tuples
def find_user(id) do
  case Repo.get(User, id) do
    nil -> {:error, :not_found}
    user -> {:ok, user}
  end
end

# Use with for chained operations
def register_user(params) do
  with {:ok, changeset} <- validate_params(params),
       {:ok, user} <- Repo.insert(changeset),
       {:ok, _} <- send_welcome_email(user) do
    {:ok, user}
  end
end
```

## Code Quality Checklist

- [ ] `mix format` passes
- [ ] `mix credo --strict` passes (or justified inline disables)
- [ ] Pattern matching used instead of if/else where appropriate
- [ ] All public functions have `@doc` and `@spec`
- [ ] Proper `{:ok, _}` / `{:error, _}` return conventions
