---
name: ruby-patterns-advanced
description: "Advanced Ruby patterns — DDD with domain objects, Sorbet type system, value objects, event sourcing, background jobs, and API response standards with RFC 7807."
---

# Ruby Patterns Advanced

Advanced Ruby on Rails patterns for production-grade applications covering DDD, type safety, event-driven design, and API standards.

## When to Activate

- Implementing Domain-Driven Design in Rails (aggregates, value objects, domain events)
- Adding Sorbet type annotations to a Ruby codebase
- Designing event sourcing or CQRS patterns in Rails
- Building background job pipelines with Sidekiq
- Implementing RFC 7807 Problem Details error responses
- Refactoring to clean hexagonal architecture in Rails

## Domain-Driven Design in Rails

### Value Objects

```ruby
# app/domain/money.rb
class Money
  include Comparable

  attr_reader :amount, :currency

  def initialize(amount, currency)
    raise ArgumentError, "amount must be non-negative" if amount < 0
    raise ArgumentError, "invalid currency" unless %w[USD EUR GBP].include?(currency)

    @amount = amount.freeze
    @currency = currency.freeze
    freeze
  end

  def +(other)
    raise ArgumentError, "currency mismatch" unless currency == other.currency
    Money.new(amount + other.amount, currency)
  end

  def <=>(other)
    return nil unless currency == other.currency
    amount <=> other.amount
  end

  def to_s = "#{currency} #{format('%.2f', amount)}"
  def zero? = amount.zero?
end
```

### Aggregate Root

```ruby
# app/domain/order.rb
class Order
  attr_reader :id, :status, :line_items, :events

  def initialize(id:)
    @id = id
    @status = :draft
    @line_items = []
    @events = []
  end

  def add_item(product_id:, quantity:, price:)
    raise DomainError, "Cannot modify confirmed order" unless draft?
    raise ArgumentError, "quantity must be positive" unless quantity.positive?

    @line_items << LineItem.new(product_id: product_id, quantity: quantity, price: price)
    @events << OrderItemAdded.new(order_id: id, product_id: product_id)
    self
  end

  def confirm
    raise DomainError, "Cannot confirm empty order" if line_items.empty?
    raise DomainError, "Order already confirmed" unless draft?

    @status = :confirmed
    @events << OrderConfirmed.new(order_id: id, total: total)
    self
  end

  def total
    line_items.sum { |item| item.price * item.quantity }
  end

  def draft? = status == :draft
  def confirmed? = status == :confirmed
end
```

### Domain Events

```ruby
# app/domain/events/order_confirmed.rb
OrderConfirmed = Data.define(:order_id, :total, :occurred_at) do
  def initialize(order_id:, total:, occurred_at: Time.current)
    super
  end
end

# app/services/order_event_publisher.rb
class OrderEventPublisher
  def publish(events)
    events.each do |event|
      case event
      when OrderConfirmed
        OrderMailer.confirmation(event.order_id).deliver_later
        Analytics.track("order.confirmed", order_id: event.order_id, total: event.total)
      when OrderItemAdded
        InventoryService.reserve(event.product_id)
      end
    end
  end
end
```

## Sorbet Type System

### Basic Typed Module

```ruby
# typed: strict
# app/services/payment_service.rb
class PaymentService
  extend T::Sig

  sig { params(order: Order, card_token: String).returns(T::Boolean) }
  def charge(order, card_token)
    response = Stripe::Charge.create(
      amount: (order.total * 100).to_i,
      currency: order.currency,
      source: card_token
    )
    response.status == "succeeded"
  rescue Stripe::CardError => e
    Rails.logger.error("Payment failed: #{e.message}")
    false
  end
end
```

### Typed Interfaces (Abstract Classes)

```ruby
# typed: strict
module PaymentGateway
  extend T::Helpers
  extend T::Sig
  interface!

  sig { abstract.params(amount_cents: Integer, token: String).returns(T::Boolean) }
  def charge(amount_cents, token); end

  sig { abstract.params(charge_id: String).returns(T::Boolean) }
  def refund(charge_id); end
end

class StripeGateway
  include PaymentGateway
  extend T::Sig

  sig { override.params(amount_cents: Integer, token: String).returns(T::Boolean) }
  def charge(amount_cents, token)
    # ...
  end
end
```

## RFC 7807 Problem Details

FastAPI/Rails API error standard — use for all 4xx/5xx responses:

```ruby
# app/concerns/problem_details.rb
module ProblemDetails
  extend ActiveSupport::Concern

  included do
    rescue_from ActiveRecord::RecordNotFound, with: :not_found
    rescue_from ActionController::ParameterMissing, with: :bad_request
    rescue_from DomainError, with: :unprocessable_entity
  end

  private

  def render_problem(status:, title:, detail:, type: nil, **extras)
    render(
      json: {
        type: type || "about:blank",
        title: title,
        status: status,
        detail: detail,
        instance: request.path,
        **extras
      }.compact,
      status: status,
      content_type: "application/problem+json"
    )
  end

  def not_found(exception)
    render_problem(
      status: 404,
      title: "Not Found",
      detail: exception.message
    )
  end

  def unprocessable_entity(exception)
    render_problem(
      status: 422,
      title: "Unprocessable Entity",
      detail: exception.message
    )
  end

  def bad_request(exception)
    render_problem(
      status: 400,
      title: "Bad Request",
      detail: "Required parameter missing: #{exception.param}"
    )
  end
end

# app/controllers/application_controller.rb
class ApplicationController < ActionController::API
  include ProblemDetails
end
```

## Advanced Background Jobs

### Idempotent Sidekiq Jobs

```ruby
# app/jobs/process_order_job.rb
class ProcessOrderJob < ApplicationJob
  queue_as :critical
  sidekiq_options retry: 3, dead: false

  # Idempotency: safe to run multiple times
  def perform(order_id)
    order = Order.find(order_id)
    return if order.processed?

    ActiveRecord::Base.transaction do
      order.process!
      order.update!(processed_at: Time.current)
    end

    OrderEventPublisher.new.publish(order.events)
  rescue ActiveRecord::RecordNotFound
    Rails.logger.warn("Order #{order_id} not found — skipping job")
  end
end
```

### Job Batching with Sidekiq Pro

```ruby
# app/jobs/import_products_job.rb
class ImportProductsJob < ApplicationJob
  def perform(file_url)
    batch = Sidekiq::Batch.new
    batch.description = "Product import #{file_url}"
    batch.on(:complete, ImportCompleteCallback, file_url: file_url)

    batch.jobs do
      CSV.parse(URI.open(file_url).read, headers: true).each_slice(100) do |rows|
        ImportProductBatchJob.perform_later(rows.map(&:to_h))
      end
    end
  end
end

class ImportCompleteCallback
  def on_complete(status, options)
    Rails.logger.info("Import complete: #{status.total} products from #{options['file_url']}")
    AdminMailer.import_complete(status.total).deliver_later
  end
end
```

## Query Objects

```ruby
# app/queries/active_orders_query.rb
class ActiveOrdersQuery
  def initialize(relation = Order.all)
    @relation = relation
  end

  def call(user:, status: nil, limit: 20)
    result = @relation
      .where(user_id: user.id)
      .includes(:line_items, :shipping_address)
      .order(created_at: :desc)
      .limit(limit)

    result = result.where(status: status) if status
    result
  end
end

# Usage
orders = ActiveOrdersQuery.new.call(user: current_user, status: :confirmed)
```

## Related Skills

- **`ruby-patterns`** — Core patterns: Service Objects, Form Objects, Decorators
- **`ruby-testing`** — RSpec, FactoryBot, shared examples, request specs
- **`ddd-python`** — DDD concepts applicable across languages
