> This file extends [common/patterns.md](../common/patterns.md) with Ruby-specific content.

# Ruby Patterns

## Service Objects

Encapsulate business logic outside of models and controllers:

```ruby
# app/services/user_registration_service.rb
class UserRegistrationService
  def initialize(params)
    @params = params
  end

  def call
    user = User.new(@params)
    raise ValidationError, user.errors.full_messages unless user.valid?
    user.save!
    UserMailer.welcome(user).deliver_later
    user
  end

  private

  attr_reader :params
end

# Usage in controller
def create
  user = UserRegistrationService.new(user_params).call
  render json: UserSerializer.new(user), status: :created
rescue ValidationError => e
  render json: { errors: e.message }, status: :unprocessable_entity
end
```

## Query Objects

Move complex ActiveRecord queries out of models:

```ruby
# app/queries/active_users_query.rb
class ActiveUsersQuery
  def initialize(relation = User.all)
    @relation = relation
  end

  def call(since: 30.days.ago)
    @relation
      .where(active: true)
      .where('last_sign_in_at > ?', since)
      .order(last_sign_in_at: :desc)
  end
end

# Usage
ActiveUsersQuery.new.call(since: 7.days.ago)
```

## Decorator Pattern (Draper)

Separate presentation logic from models:

```ruby
# app/decorators/user_decorator.rb
class UserDecorator < Draper::Decorator
  delegate_all

  def full_name
    "#{first_name} #{last_name}"
  end

  def avatar_url
    gravatar_url(email)
  end
end
```

## Form Objects

Handle complex form logic with validations:

```ruby
# app/forms/registration_form.rb
class RegistrationForm
  include ActiveModel::Model
  include ActiveModel::Attributes

  attribute :email, :string
  attribute :password, :string
  attribute :terms_accepted, :boolean

  validates :email, presence: true, format: { with: URI::MailTo::EMAIL_REGEXP }
  validates :password, length: { minimum: 8 }
  validates :terms_accepted, acceptance: true
end
```

## Repository Pattern

```ruby
# app/repositories/user_repository.rb
class UserRepository
  def find(id)
    User.find(id)
  rescue ActiveRecord::RecordNotFound
    raise NotFoundError, "User #{id} not found"
  end

  def find_by_email(email)
    User.find_by!(email: email)
  rescue ActiveRecord::RecordNotFound
    raise NotFoundError, "No user with email #{email}"
  end

  def create(attrs)
    User.create!(attrs)
  rescue ActiveRecord::RecordInvalid => e
    raise ValidationError, e.record.errors.full_messages
  end
end
```

## Rails-Specific Patterns

### Concerns (shared behavior)
```ruby
# app/models/concerns/soft_deletable.rb
module SoftDeletable
  extend ActiveSupport::Concern

  included do
    scope :active, -> { where(deleted_at: nil) }
    scope :deleted, -> { where.not(deleted_at: nil) }
  end

  def soft_delete!
    update!(deleted_at: Time.current)
  end

  def restore!
    update!(deleted_at: nil)
  end
end

class User < ApplicationRecord
  include SoftDeletable
end
```

### Callbacks: Use Sparingly
```ruby
# WRONG: complex business logic in callbacks
class Order < ApplicationRecord
  after_create :send_confirmation, :update_inventory, :notify_warehouse
end

# CORRECT: explicit service call
class OrderCreationService
  def call
    order = Order.create!(@params)
    OrderConfirmationMailer.send(order)
    InventoryService.update(order)
    WarehouseNotifier.notify(order)
    order
  end
end
```
