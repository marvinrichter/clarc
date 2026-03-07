---
description: "Elixir/Phoenix architecture patterns — OTP, GenServer, Phoenix contexts"
globs: ["lib/**/*.ex", "lib/**/*.exs"]
alwaysApply: false
---
# Elixir Patterns

> See `elixir-patterns` skill for full OTP and Phoenix pattern catalog.

## Phoenix Contexts

Controllers call context functions, never Repo directly:

```elixir
# CORRECT: through context
def create(conn, params) do
  case Accounts.create_user(params) do
    {:ok, user} -> render(conn, :created, user: user)
    {:error, changeset} -> render(conn, :error, changeset: changeset)
  end
end
```

## Ecto Changesets

Always validate through changesets:

```elixir
def changeset(schema, params) do
  schema
  |> cast(params, [:email, :name])  # whitelist fields
  |> validate_required([:email])
  |> unique_constraint(:email)
end
```

## Avoid

- `Repo` calls in controllers (bypass context)
- `spawn/1` without supervision (use Task.Supervisor)
- Blocking GenServer handle_call with long operations
- `String.to_atom(user_input)` (atom exhaustion)
