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
> This file extends [common/patterns.md](../common/patterns.md) with Elixir-specific content.

# Elixir Patterns

## GenServer

The core building block for stateful processes:

```elixir
defmodule MyApp.Cache do
  use GenServer

  # Client API
  def start_link(opts \\ []) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  def get(key), do: GenServer.call(__MODULE__, {:get, key})
  def put(key, value), do: GenServer.cast(__MODULE__, {:put, key, value})

  # Server callbacks
  @impl true
  def init(state), do: {:ok, state}

  @impl true
  def handle_call({:get, key}, _from, state) do
    {:reply, Map.get(state, key), state}
  end

  @impl true
  def handle_cast({:put, key, value}, state) do
    {:noreply, Map.put(state, key, value)}
  end
end
```

## Supervisor Trees

Structure fault-tolerant systems with supervision:

```elixir
defmodule MyApp.Application do
  use Application

  @impl true
  def start(_type, _args) do
    children = [
      MyApp.Repo,
      {Phoenix.PubSub, name: MyApp.PubSub},
      MyAppWeb.Endpoint,
      {MyApp.Cache, []},
      {Task.Supervisor, name: MyApp.TaskSupervisor}
    ]

    opts = [strategy: :one_for_one, name: MyApp.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
```

## OTP: Registry Pattern

```elixir
defmodule MyApp.RoomRegistry do
  def start_link(_), do: Registry.start_link(keys: :unique, name: __MODULE__)

  def lookup(room_id), do: Registry.lookup(__MODULE__, room_id)

  def register(room_id) do
    Registry.register(__MODULE__, room_id, %{})
  end
end
```

## Phoenix Contexts

Phoenix contexts are bounded modules grouping related functionality:

```elixir
# lib/my_app/accounts.ex — the Accounts context
defmodule MyApp.Accounts do
  alias MyApp.Accounts.User
  alias MyApp.Repo

  def get_user(id), do: Repo.get(User, id)

  def create_user(attrs) do
    %User{}
    |> User.changeset(attrs)
    |> Repo.insert()
  end

  def authenticate_user(email, password) do
    with {:ok, user} <- get_user_by_email(email),
         true <- Bcrypt.verify_pass(password, user.password_hash) do
      {:ok, user}
    else
      _ -> {:error, :invalid_credentials}
    end
  end
end
```

## Phoenix LiveView

```elixir
defmodule MyAppWeb.CounterLive do
  use MyAppWeb, :live_view

  @impl true
  def mount(_params, _session, socket) do
    {:ok, assign(socket, count: 0)}
  end

  @impl true
  def handle_event("increment", _params, socket) do
    {:noreply, update(socket, :count, &(&1 + 1))}
  end

  @impl true
  def render(assigns) do
    ~H"""
    <div>
      <p>Count: {@count}</p>
      <button phx-click="increment">+1</button>
    </div>
    """
  end
end
```

## Broadway for Data Pipelines

```elixir
defmodule MyApp.DataPipeline do
  use Broadway

  def start_link(_opts) do
    Broadway.start_link(__MODULE__,
      name: __MODULE__,
      producer: [module: {BroadwaySQS.Producer, queue_url: queue_url()}],
      processors: [default: [concurrency: 10]],
      batchers: [default: [batch_size: 100, batch_timeout: 1000]]
    )
  end

  @impl true
  def handle_message(_processor, message, _context) do
    # Process individual messages
    message
  end

  @impl true
  def handle_batch(_batcher, messages, _batch_info, _context) do
    # Bulk insert/process
    messages
  end
end
```

## Anti-Patterns

```elixir
# WRONG: Sending messages between processes unnecessarily
# (GenServer round-trip adds latency for read-only state)
def get_config(), do: GenServer.call(__MODULE__, :get_all)

# CORRECT: Use ETS for read-heavy shared state
:ets.lookup(:config_table, :key)

# WRONG: Deeply nested case/cond
case result do
  {:ok, value} ->
    case validate(value) do
      {:ok, valid} -> {:ok, process(valid)}
      error -> error
    end
  error -> error
end

# CORRECT: with
with {:ok, value} <- result,
     {:ok, valid} <- validate(value) do
  {:ok, process(valid)}
end
```
