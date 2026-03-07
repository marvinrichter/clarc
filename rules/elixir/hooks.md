> This file extends [common/hooks.md](../common/hooks.md) with Elixir-specific content.

# Elixir Hooks

## PostToolUse: Auto-Format

After editing `.ex`/`.exs` files, run `mix format`:

```bash
mix format <file>
```

The existing `post-edit-format-dispatch.js` hook detects `.ex`/`.exs` files and runs `mix format` if available.

## Recommended Mix Aliases

Add to `mix.exs`:

```elixir
defp aliases do
  [
    "ci.check": [
      "format --check-formatted",
      "credo --strict",
      "dialyzer",
      "test --cover"
    ],
    "ci.fix": [
      "format",
      "deps.unlock --check-unused"
    ]
  ]
end
```

## Tools in mix.exs

```elixir
defp deps do
  [
    # Development
    {:credo, "~> 1.7", only: [:dev, :test], runtime: false},
    {:dialyxir, "~> 1.4", only: [:dev], runtime: false},
    {:sobelow, "~> 0.13", only: [:dev, :test], runtime: false},
    {:mix_audit, "~> 2.1", only: [:dev, :test], runtime: false},

    # Testing
    {:mox, "~> 1.1", only: :test},
    {:stream_data, "~> 0.6", only: [:dev, :test]},
    {:ex_machina, "~> 2.7", only: :test}
  ]
end
```

## PreToolUse: Security Check

Before pushing, Sobelow should pass:

```bash
mix sobelow --exit --skip
```

## .credo.exs Baseline

```elixir
%{
  configs: [
    %{
      name: "default",
      checks: [
        {Credo.Check.Design.AliasUsage, priority: :low},
        {Credo.Check.Readability.MaxLineLength, max_length: 120},
        {Credo.Check.Refactor.Nesting, max_nesting: 3}
      ]
    }
  ]
}
```
