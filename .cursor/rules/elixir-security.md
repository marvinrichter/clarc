---
description: "Elixir security — Sobelow, Ecto parameterization, secrets management"
globs: ["lib/**/*.ex", "config/**/*.exs"]
alwaysApply: false
---
# Elixir Security

> See `rules/elixir/security.md` for full security guidelines.

## Critical Rules

- Run `mix sobelow` before every PR
- Never interpolate user input in SQL — use Ecto query DSL
- Always use `cast/3` with explicit field whitelist in changesets
- Secrets in `config/runtime.exs` with `System.fetch_env!/1`, never hardcoded

```elixir
# WRONG
Repo.query("SELECT * FROM users WHERE email = '#{email}'")
config :my_app, secret: "hardcoded_value"

# CORRECT
from(u in User, where: u.email == ^email) |> Repo.all()
config :my_app, secret: System.fetch_env!("MY_SECRET")
```
