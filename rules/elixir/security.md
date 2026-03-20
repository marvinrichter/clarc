---
paths:
  - "**/*.ex"
  - "**/*.exs"
  - "**/mix.exs"
  - "**/mix.lock"
globs:
  - "**/*.{ex,exs}"
  - "**/mix.{exs,lock}"
alwaysApply: false
---
> This file extends [common/security.md](../common/security.md) with Elixir-specific content.

# Elixir Security

## Security Scanning

**Sobelow** — static analysis for Phoenix security vulnerabilities:

```bash
mix sobelow --config
```

Run before every PR. Configure `.sobelow-conf` to adjust findings.

## Ecto — SQL Safety

Ecto parameterizes queries by default. Never bypass this:

```elixir
# WRONG: raw SQL with interpolation
Repo.query("SELECT * FROM users WHERE email = '#{email}'")

# CORRECT: Ecto query with parameters
from(u in User, where: u.email == ^email) |> Repo.all()

# CORRECT: raw query with params
Repo.query("SELECT * FROM users WHERE email = $1", [email])
```

## Changesets for Validation

Always validate through changesets, never trust raw params:

```elixir
# WRONG: direct attribute assignment
user = %User{} |> Map.merge(params)

# CORRECT: changeset with explicit permitted fields
def changeset(user, params) do
  user
  |> cast(params, [:email, :name])          # whitelist fields
  |> validate_required([:email])
  |> validate_format(:email, ~r/@/)
  |> unique_constraint(:email)
end
```

## Secrets Management

- Never hardcode secrets in code or config files committed to git
- Use `config/runtime.exs` with `System.fetch_env!("SECRET_KEY")`
- Phoenix secrets via `mix phx.gen.secret`

```elixir
# config/runtime.exs
config :my_app, MyApp.Repo,
  url: System.fetch_env!("DATABASE_URL")

config :my_app, MyAppWeb.Endpoint,
  secret_key_base: System.fetch_env!("SECRET_KEY_BASE")
```

## Phoenix CSRF

Phoenix includes CSRF protection for HTML forms by default.
For APIs with `pipeline :api`, CSRF is not included (correct for token auth).

```elixir
# Never disable CSRF for HTML pipelines
pipeline :browser do
  plug :accepts, ["html"]
  plug :fetch_session
  plug :protect_from_forgery  # Keep this!
  plug :put_secure_browser_headers
end
```

## Authentication

- Use **Phx.Gen.Auth** (built-in) for session-based auth
- Use **Joken** or **Guardian** for JWT-based API auth
- Hash passwords with **Bcrypt** or **Argon2** (via Comeonin)

```elixir
# Never store plaintext passwords
Bcrypt.hash_pwd_salt(password)
Bcrypt.verify_pass(password, hash)
```

## Security Checklist

- [ ] Sobelow passes (`mix sobelow`)
- [ ] All DB queries use Ecto (no raw SQL with interpolation)
- [ ] Changesets whitelist permitted fields
- [ ] Secrets in `runtime.exs` with `System.fetch_env!`
- [ ] CSRF protection enabled for HTML pipeline
- [ ] Dependencies audited: `mix deps.audit` (via mix_audit)
