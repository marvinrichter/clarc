---
name: ruby-patterns
description: Rails patterns, ActiveRecord best practices, Service Objects, Query Objects, Decorators, Form Objects, and idiomatic Ruby design.
---

# Ruby Patterns

## When to Activate

Use this skill when:
- Building or reviewing Ruby on Rails applications
- Designing service layer architecture in Ruby
- Working with ActiveRecord models and queries
- Implementing business logic that doesn't fit cleanly in controllers or models
- Refactoring fat models or fat controllers
- Designing form handling with complex validations
- Implementing the repository pattern in Ruby
- Writing idiomatic Ruby code following community standards

## Core Patterns

### Service Objects

The primary pattern for business logic in Rails:

```ruby
# app/services/order_fulfillment_service.rb
class OrderFulfillmentService
  Result = Data.define(:success, :order, :errors)

  def initialize(order, payment_params)
    @order = order
    @payment_params = payment_params
  end

  def call
    return Result.new(success: false, order: @order, errors: ['Order already fulfilled']) if @order.fulfilled?

    ActiveRecord::Base.transaction do
      charge = PaymentGateway.charge(@payment_params.merge(amount: @order.total))
      @order.update!(status: :fulfilled, payment_id: charge.id)
      OrderMailer.confirmation(@order).deliver_later
    end

    Result.new(success: true, order: @order, errors: [])
  rescue PaymentGateway::Error => e
    Result.new(success: false, order: @order, errors: [e.message])
  end
end
```

### Query Objects

Encapsulate complex ActiveRecord queries:

```ruby
# app/queries/expiring_subscriptions_query.rb
class ExpiringSubscriptionsQuery
  def initialize(relation = Subscription.all)
    @relation = relation
  end

  def call(within_days: 7)
    @relation
      .active
      .where(expires_at: Time.current..within_days.days.from_now)
      .includes(:user, :plan)
      .order(:expires_at)
  end
end

# Usage
ExpiringSubscriptionsQuery.new.call(within_days: 3).each do |sub|
  RenewalReminderMailer.send(sub).deliver_later
end
```

### Form Objects

```ruby
# app/forms/checkout_form.rb
class CheckoutForm
  include ActiveModel::Model
  include ActiveModel::Attributes

  attribute :email, :string
  attribute :card_number, :string
  attribute :shipping_address, :string
  attribute :agree_to_terms, :boolean

  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :card_number, presence: true, format: { with: /\A\d{16}\z/ }
  validates :shipping_address, presence: true
  validates :agree_to_terms, acceptance: true

  def card_last_four
    card_number&.last(4)
  end
end
```

### Concerns (Shared Behavior)

```ruby
# app/models/concerns/taggable.rb
module Taggable
  extend ActiveSupport::Concern

  included do
    has_many :taggings, as: :taggable, dependent: :destroy
    has_many :tags, through: :taggings

    scope :tagged_with, ->(tag_name) {
      joins(:tags).where(tags: { name: tag_name })
    }
  end

  def tag_list
    tags.pluck(:name).join(', ')
  end

  def tag_with(*names)
    names.flatten.each do |name|
      tags << Tag.find_or_create_by!(name: name)
    end
  end
end
```

### ActiveRecord Scopes

```ruby
class Post < ApplicationRecord
  # Named scopes for reusable query fragments
  scope :published, -> { where(published_at: ..Time.current) }
  scope :recent, -> { order(created_at: :desc) }
  scope :by_author, ->(author) { where(author: author) }
  scope :featured, -> { where(featured: true).limit(5) }

  # Avoid scopes with complex joins — use Query Objects instead
end
```

## Anti-Patterns

```ruby
# WRONG: Business logic in controllers
class OrdersController < ApplicationController
  def create
    @order = Order.new(order_params)
    if @order.save
      PaymentGateway.charge(params[:card], @order.total)
      OrderMailer.confirmation(@order).deliver_later
      InventoryService.update(@order.items)
      render json: @order
    end
  end
end

# CORRECT: Delegate to service
def create
  result = OrderCreationService.new(order_params, params[:card]).call
  if result.success
    render json: result.order, status: :created
  else
    render json: { errors: result.errors }, status: :unprocessable_entity
  end
end

# WRONG: Fat model with callbacks
class Order < ApplicationRecord
  after_create :send_email, :notify_warehouse, :update_stats, :log_audit

  # CORRECT: explicit service layer, minimal callbacks
end

# WRONG: N+1 queries
Order.all.each { |o| puts o.user.name }

# CORRECT: eager loading
Order.includes(:user).each { |o| puts o.user.name }
```

## Idiomatic Ruby

```ruby
# Use Ruby 3 pattern matching
case user
in { role: 'admin', active: true }
  grant_admin_access(user)
in { role: 'user', active: true }
  grant_user_access(user)
in { active: false }
  raise UnauthorizedError
end

# Data objects (Ruby 3.2+)
Point = Data.define(:x, :y) do
  def distance_to(other)
    Math.sqrt((x - other.x)**2 + (y - other.y)**2)
  end
end

# Frozen string literals
# frozen_string_literal: true
```

## Reference

- See `ruby-testing` skill for RSpec patterns and test helpers
- See `rules/ruby/` for RuboCop config and coding standards
