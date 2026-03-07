---
name: elixir-patterns-advanced
description: "Advanced Elixir/Phoenix patterns — distributed Erlang clusters, CRDT-based state, Ecto multi-tenancy, event sourcing, Commanded framework, and RFC 7807 API errors."
---

# Elixir Patterns Advanced

Advanced Elixir patterns for distributed, fault-tolerant production systems.

## When to Activate

- Building distributed Elixir clusters with `libcluster`
- Implementing event sourcing or CQRS with Commanded
- Designing multi-tenant systems with Ecto
- Using CRDTs or distributed state with `delta_crdt`
- Implementing RFC 7807 Problem Details in Phoenix APIs
- Advanced OTP: dynamic supervisors, process registries, partition supervisor

## Distributed Elixir with libcluster

```elixir
# config/runtime.exs
config :libcluster,
  topologies: [
    k8s: [
      strategy: Cluster.Strategy.Kubernetes,
      config: [
        mode: :ip,
        kubernetes_selector: "app=myapp",
        kubernetes_node_basename: "myapp"
      ]
    ]
  ]

# lib/my_app/application.ex
def start(_type, _args) do
  children = [
    {Cluster.Supervisor, [Application.get_env(:libcluster, :topologies), [name: MyApp.ClusterSupervisor]]},
    MyApp.Repo,
    MyAppWeb.Endpoint
  ]
  Supervisor.start_link(children, strategy: :one_for_one)
end
```

## Event Sourcing with Commanded

```elixir
# lib/my_app/domain/order/commands.ex
defmodule MyApp.Order.Commands.PlaceOrder do
  defstruct [:order_id, :user_id, :line_items, :total]
end

# lib/my_app/domain/order/events.ex
defmodule MyApp.Order.Events.OrderPlaced do
  @derive Jason.Encoder
  defstruct [:order_id, :user_id, :total, :placed_at]
end

# lib/my_app/domain/order/aggregate.ex
defmodule MyApp.Order.Aggregate do
  defstruct [:order_id, :status, :total]

  alias MyApp.Order.Commands.PlaceOrder
  alias MyApp.Order.Events.OrderPlaced

  def execute(%__MODULE__{order_id: nil}, %PlaceOrder{} = cmd) do
    %OrderPlaced{
      order_id: cmd.order_id,
      user_id: cmd.user_id,
      total: cmd.total,
      placed_at: DateTime.utc_now()
    }
  end

  def execute(%__MODULE__{status: :placed}, %PlaceOrder{}) do
    {:error, :order_already_placed}
  end

  def apply(%__MODULE__{} = order, %OrderPlaced{} = event) do
    %{order | order_id: event.order_id, status: :placed, total: event.total}
  end
end

# lib/my_app/domain/order/router.ex
defmodule MyApp.OrderRouter do
  use Commanded.Commands.Router

  dispatch PlaceOrder, to: MyApp.Order.Aggregate, identity: :order_id
end
```

## Ecto Multi-Tenancy

```elixir
# lib/my_app/repo.ex — Schema-based multi-tenancy
defmodule MyApp.Repo do
  use Ecto.Repo, otp_app: :my_app, adapter: Ecto.Adapters.Postgres

  def with_tenant(tenant_id, fun) do
    prefix = "tenant_#{tenant_id}"
    put_dynamic_repo(%{prefix: prefix})
    try do
      fun.()
    after
      put_dynamic_repo(nil)
    end
  end
end

# In controllers / resolvers:
MyApp.Repo.with_tenant(current_tenant.id, fn ->
  MyApp.Products.list_products()
end)

# Schema with prefix
defmodule MyApp.Product do
  use Ecto.Schema

  @schema_prefix "tenant_default"  # overridden at query time
  schema "products" do
    field :name, :string
    field :price, :decimal
    timestamps()
  end
end
```

## Dynamic Supervisor Pattern

```elixir
# lib/my_app/session_supervisor.ex
defmodule MyApp.SessionSupervisor do
  use DynamicSupervisor

  def start_link(init_arg) do
    DynamicSupervisor.start_link(__MODULE__, init_arg, name: __MODULE__)
  end

  def init(_init_arg) do
    DynamicSupervisor.init(strategy: :one_for_one, max_children: 1000)
  end

  def start_session(session_id) do
    spec = {MyApp.Session, session_id: session_id}
    DynamicSupervisor.start_child(__MODULE__, spec)
  end

  def stop_session(session_id) do
    case Registry.lookup(MyApp.SessionRegistry, session_id) do
      [{pid, _}] -> DynamicSupervisor.terminate_child(__MODULE__, pid)
      [] -> :ok
    end
  end
end

# lib/my_app/session.ex
defmodule MyApp.Session do
  use GenServer, restart: :temporary

  def start_link(opts) do
    session_id = Keyword.fetch!(opts, :session_id)
    GenServer.start_link(__MODULE__, session_id,
      name: {:via, Registry, {MyApp.SessionRegistry, session_id}}
    )
  end

  def init(session_id) do
    Process.send_after(self(), :expire, :timer.minutes(30))
    {:ok, %{id: session_id, data: %{}, created_at: DateTime.utc_now()}}
  end

  def handle_info(:expire, state) do
    {:stop, :normal, state}
  end
end
```

## RFC 7807 Problem Details in Phoenix

```elixir
# lib/my_app_web/problem_details.ex
defmodule MyAppWeb.ProblemDetails do
  import Plug.Conn

  def render_problem(conn, status, title, detail, opts \\ []) do
    body = %{
      type: Keyword.get(opts, :type, "about:blank"),
      title: title,
      status: status,
      detail: detail,
      instance: conn.request_path
    }

    body = if extras = Keyword.get(opts, :extras) do
      Map.merge(body, extras)
    else
      body
    end

    conn
    |> put_resp_content_type("application/problem+json")
    |> send_resp(status, Jason.encode!(body))
    |> halt()
  end
end

# lib/my_app_web/controllers/fallback_controller.ex
defmodule MyAppWeb.FallbackController do
  use MyAppWeb, :controller
  import MyAppWeb.ProblemDetails

  def call(conn, {:error, :not_found}) do
    render_problem(conn, 404, "Not Found", "The requested resource was not found.")
  end

  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    errors = Ecto.Changeset.traverse_errors(changeset, fn {msg, opts} ->
      Regex.replace(~r"%{(\w+)}", msg, fn _, key ->
        opts |> Keyword.get(String.to_existing_atom(key), key) |> to_string()
      end)
    end)

    render_problem(conn, 422, "Unprocessable Entity",
      "Validation failed. See 'errors' for details.",
      extras: %{errors: errors}
    )
  end

  def call(conn, {:error, :unauthorized}) do
    render_problem(conn, 401, "Unauthorized", "Authentication required.")
  end
end
```

## Telemetry and Observability

```elixir
# lib/my_app/telemetry.ex
defmodule MyApp.Telemetry do
  use Supervisor
  import Telemetry.Metrics

  def start_link(arg) do
    Supervisor.start_link(__MODULE__, arg, name: __MODULE__)
  end

  def init(_arg) do
    children = [
      {TelemetryMetricsPrometheus, metrics: metrics()}
    ]
    Supervisor.init(children, strategy: :one_for_one)
  end

  def metrics do
    [
      counter("my_app.orders.placed.count"),
      sum("my_app.orders.placed.total", unit: {:native, :millisecond}),
      last_value("my_app.repo.query.total_time", unit: {:native, :millisecond}),
      distribution("phoenix.router_dispatch.stop.duration",
        unit: {:native, :millisecond},
        reporter_options: [buckets: [10, 50, 100, 250, 500, 1000]]
      )
    ]
  end
end

# Emit custom telemetry events
:telemetry.execute([:my_app, :orders, :placed], %{total: order.total}, %{user_id: user.id})
```

## Broadway Data Pipelines

```elixir
# lib/my_app/pipelines/order_pipeline.ex
defmodule MyApp.Pipelines.OrderPipeline do
  use Broadway

  def start_link(_opts) do
    Broadway.start_link(__MODULE__,
      name: __MODULE__,
      producer: [
        module: {BroadwaySQS.Producer, queue_url: System.fetch_env!("ORDER_QUEUE_URL")},
        concurrency: 2
      ],
      processors: [
        default: [concurrency: 10, max_demand: 5]
      ],
      batchers: [
        db: [concurrency: 2, batch_size: 50, batch_timeout: 1000]
      ]
    )
  end

  def handle_message(_, %Broadway.Message{data: data} = msg, _context) do
    case Jason.decode(data) do
      {:ok, payload} ->
        msg
        |> Broadway.Message.update_data(fn _ -> payload end)
        |> Broadway.Message.put_batcher(:db)
      {:error, reason} ->
        Broadway.Message.failed(msg, reason)
    end
  end

  def handle_batch(:db, messages, _batch_info, _context) do
    payloads = Enum.map(messages, & &1.data)
    case MyApp.Orders.bulk_insert(payloads) do
      {:ok, _} -> messages
      {:error, reason} ->
        Enum.map(messages, &Broadway.Message.failed(&1, reason))
    end
  end
end
```

## Related Skills

- **`elixir-patterns`** — Core patterns: GenServer, Supervisors, Phoenix contexts, LiveView
- **`elixir-testing`** — ExUnit, Mox, StreamData property testing
- **`message-queue-patterns`** — SQS, RabbitMQ, Broadway integration
