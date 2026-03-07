---
name: elixir-patterns
description: GenServer, Supervisors, OTP patterns, Phoenix contexts, LiveView lifecycle, and Broadway for Elixir/Phoenix applications.
---

# Elixir Patterns

## When to Activate

Use this skill when:
- Building Elixir/Phoenix applications or OTP services
- Designing supervision trees and fault-tolerant systems
- Implementing GenServer-based stateful processes
- Working with Phoenix contexts and bounded module design
- Building real-time features with Phoenix LiveView
- Setting up data pipelines with Broadway
- Implementing the with-monad pattern for chained operations
- Designing concurrent Elixir systems with process isolation

## OTP: GenServer

The core pattern for stateful, concurrent processes:

```elixir
defmodule MyApp.RateLimiter do
  use GenServer

  @window_ms 60_000  # 1 minute
  @max_requests 100

  # Client API
  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, %{}, Keyword.merge([name: __MODULE__], opts))
  end

  def allow?(key) do
    GenServer.call(__MODULE__, {:allow?, key})
  end

  # Server callbacks
  @impl true
  def init(_), do: {:ok, %{}}

  @impl true
  def handle_call({:allow?, key}, _from, state) do
    now = System.monotonic_time(:millisecond)
    {count, window_start} = Map.get(state, key, {0, now})

    {new_count, new_start} =
      if now - window_start > @window_ms, do: {1, now}, else: {count + 1, window_start}

    allowed = new_count <= @max_requests
    new_state = Map.put(state, key, {new_count, new_start})
    {:reply, allowed, new_state}
  end
end
```

## Supervisor Trees

```elixir
defmodule MyApp.WorkerSupervisor do
  use Supervisor

  def start_link(init_arg) do
    Supervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  @impl true
  def init(_init_arg) do
    children = [
      # Restart individual workers independently
      {MyApp.DataIngester, []},
      {MyApp.Processor, concurrency: 5},
      # Dynamic supervisor for per-request workers
      {DynamicSupervisor, name: MyApp.RequestSupervisor, strategy: :one_for_one}
    ]

    Supervisor.init(children, strategy: :one_for_one)
  end
end
```

## Phoenix Contexts

Contexts are the DDD building blocks of Phoenix:

```elixir
# lib/my_app/billing.ex
defmodule MyApp.Billing do
  @moduledoc "Billing context — subscriptions, payments, invoices"

  alias MyApp.Billing.{Subscription, Invoice}
  alias MyApp.Repo

  @doc "Creates a subscription for a user with the given plan."
  @spec create_subscription(User.t(), Plan.t()) :: {:ok, Subscription.t()} | {:error, Ecto.Changeset.t()}
  def create_subscription(%User{} = user, %Plan{} = plan) do
    %Subscription{}
    |> Subscription.changeset(%{user_id: user.id, plan_id: plan.id, status: :active})
    |> Repo.insert()
  end

  @doc "Cancels an active subscription."
  def cancel_subscription(%Subscription{status: :active} = subscription) do
    subscription
    |> Subscription.changeset(%{status: :cancelled, cancelled_at: DateTime.utc_now()})
    |> Repo.update()
  end

  def cancel_subscription(_), do: {:error, :already_cancelled}
end
```

## Phoenix LiveView

```elixir
defmodule MyAppWeb.SearchLive do
  use MyAppWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign(socket, query: "", results: [], loading: false)}
  end

  @impl true
  def handle_event("search", %{"query" => query}, socket) do
    socket = assign(socket, loading: true, query: query)
    send(self(), {:perform_search, query})
    {:noreply, socket}
  end

  @impl true
  def handle_info({:perform_search, query}, socket) do
    results = MyApp.Search.query(query)
    {:noreply, assign(socket, results: results, loading: false)}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <form phx-submit="search">
        <input type="text" name="query" value={@query} phx-debounce="300" />
        <button type="submit">Search</button>
      </form>
      <div :if={@loading}>Searching...</div>
      <ul>
        <li :for={result <- @results}>{result.title}</li>
      </ul>
    </div>
    """
  end
end
```

## Ecto Patterns

```elixir
defmodule MyApp.Accounts.User do
  use Ecto.Schema
  import Ecto.Changeset

  schema "users" do
    field :email, :string
    field :password, :string, virtual: true
    field :password_hash, :string
    field :role, Ecto.Enum, values: [:user, :admin], default: :user
    belongs_to :organization, MyApp.Accounts.Organization
    timestamps()
  end

  def changeset(user, params) do
    user
    |> cast(params, [:email, :password])
    |> validate_required([:email, :password])
    |> validate_format(:email, ~r/@/)
    |> validate_length(:password, min: 8)
    |> unique_constraint(:email)
    |> hash_password()
  end

  defp hash_password(%{valid?: true, changes: %{password: pw}} = changeset) do
    change(changeset, password_hash: Bcrypt.hash_pwd_salt(pw), password: nil)
  end
  defp hash_password(changeset), do: changeset
end
```

## Anti-Patterns

```elixir
# WRONG: Spawning unsupervised processes
spawn(fn -> do_work() end)

# CORRECT: Use Task.Supervisor
Task.Supervisor.start_child(MyApp.TaskSupervisor, fn -> do_work() end)

# WRONG: Large GenServer state (memory leak risk)
def handle_cast({:add, item}, state) do
  {:noreply, [item | state]}  # Grows forever
end

# CORRECT: Use ETS or external storage for large datasets
:ets.insert(:cache_table, {key, value})

# WRONG: Blocking GenServer with long operations
def handle_call(:run_report, _from, state) do
  result = generate_big_report()  # Blocks all callers!
  {:reply, result, state}
end

# CORRECT: Return immediately, process async
def handle_call(:run_report, from, state) do
  Task.start(fn ->
    result = generate_big_report()
    GenServer.reply(from, result)
  end)
  {:noreply, state}
end
```

## Reference

- See `elixir-testing` skill for ExUnit, Mox, and StreamData patterns
- See `rules/elixir/` for Credo, Dialyzer, and Sobelow setup
