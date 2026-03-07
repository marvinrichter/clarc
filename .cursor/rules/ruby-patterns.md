---
description: "Ruby/Rails architecture patterns — Service Objects, Query Objects, Form Objects"
globs: ["app/**/*.rb", "lib/**/*.rb"]
alwaysApply: false
---
# Ruby Patterns

> See `ruby-patterns` skill for full pattern catalog.

## Service Objects

Business logic belongs in `app/services/`, not controllers or models:

```ruby
# app/services/user_registration_service.rb
class UserRegistrationService
  def initialize(params) = @params = params

  def call
    user = User.create!(@params)
    UserMailer.welcome(user).deliver_later
    user
  rescue ActiveRecord::RecordInvalid => e
    raise ValidationError, e.record.errors.full_messages
  end
end
```

## Query Objects

Complex queries belong in `app/queries/`:

```ruby
class ActiveUsersQuery
  def call(since: 30.days.ago)
    User.where(active: true).where('last_sign_in_at > ?', since)
  end
end
```

## Avoid

- Business logic in controllers or model callbacks
- `after_create` chains with side effects — use service objects instead
- `Model.all.each` on large tables — use `find_each`
