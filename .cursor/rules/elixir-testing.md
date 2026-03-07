---
description: "Elixir testing with ExUnit, Mox, StreamData"
globs: ["test/**/*.ex", "test/**/*.exs"]
alwaysApply: false
---
# Elixir Testing

> See `elixir-testing` skill for full ExUnit and Mox patterns.

## Standards

- `async: true` for all unit tests without shared state
- Use `DataCase` for database tests (Ecto sandbox)
- Use `ConnCase` for Phoenix controller/LiveView tests
- Use Mox for mocking external services (never monkey-patch)
- Coverage target: 80%+ via excoveralls

```elixir
# CORRECT: Mox-based test
import Mox
setup :verify_on_exit!

test "processes payment" do
  expect(MockGateway, :charge, fn _, _ -> {:ok, %{id: "ch_1"}} end)
  assert {:ok, _order} = Orders.create(params)
end
```
