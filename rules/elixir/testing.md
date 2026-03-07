> This file extends [common/testing.md](../common/testing.md) with Elixir-specific content.

# Elixir Testing

## Framework: ExUnit

ExUnit is built into Elixir — no external dependency needed.

```elixir
defmodule MyApp.UserTest do
  use ExUnit.Case, async: true

  describe "create/1" do
    test "returns {:ok, user} with valid attrs" do
      assert {:ok, user} = Users.create(%{email: "user@example.com"})
      assert user.email == "user@example.com"
    end

    test "returns {:error, changeset} with invalid email" do
      assert {:error, changeset} = Users.create(%{email: "invalid"})
      assert "is invalid" in errors_on(changeset).email
    end
  end
end
```

## async: true

Always use `async: true` for tests that don't share state:

```elixir
# Fast parallel tests (no DB or global state)
use ExUnit.Case, async: true

# Must be synchronous (uses database)
use MyApp.DataCase  # async: false by default for DB tests
```

## DataCase for Database Tests

```elixir
defmodule MyApp.UsersTest do
  use MyApp.DataCase  # wraps each test in transaction, auto-rollback

  test "creates user in database" do
    assert {:ok, user} = Users.create(%{email: "test@example.com"})
    assert Repo.get(User, user.id)
  end
end
```

## ConnCase for Phoenix Controllers

```elixir
defmodule MyAppWeb.UserControllerTest do
  use MyAppWeb.ConnCase

  describe "POST /api/users" do
    test "creates user and returns 201", %{conn: conn} do
      conn = post(conn, ~p"/api/users", %{email: "user@example.com"})
      assert %{"id" => _id} = json_response(conn, 201)
    end

    test "returns 422 with invalid params", %{conn: conn} do
      conn = post(conn, ~p"/api/users", %{email: "bad"})
      assert json_response(conn, 422)["errors"] != %{}
    end
  end
end
```

## Mox for Mocking

Define behaviour modules and use Mox for compile-time safe mocks:

```elixir
# Define the behaviour
defmodule MyApp.EmailAdapter do
  @callback send_email(String.t(), String.t()) :: {:ok, map()} | {:error, term()}
end

# Create mock in test_helper.exs
Mox.defmock(MyApp.MockEmailAdapter, for: MyApp.EmailAdapter)

# Use in tests
defmodule MyApp.NotificationServiceTest do
  use ExUnit.Case, async: true
  import Mox

  setup :verify_on_exit!

  test "sends welcome email" do
    expect(MyApp.MockEmailAdapter, :send_email, fn _to, _body -> {:ok, %{}} end)
    assert {:ok, _} = NotificationService.welcome_email("user@example.com")
  end
end
```

## StreamData for Property Testing

```elixir
defmodule MyApp.StringUtilsTest do
  use ExUnit.Case, async: true
  use ExUnitProperties

  property "reverse/1 is idempotent" do
    check all str <- string(:printable) do
      assert StringUtils.reverse(StringUtils.reverse(str)) == str
    end
  end
end
```

## Test Organization

```
test/
  my_app/           # Unit tests for contexts
    users_test.exs
    orders_test.exs
  my_app_web/       # Controller and LiveView tests
    controllers/
    live/
  support/          # Shared test helpers
    fixtures/
    data_case.ex
    conn_case.ex
```
