---
description: "Ruby coding style extending common rules"
globs: ["**/*.rb", "**/*.rake", "**/Gemfile", "**/Rakefile"]
alwaysApply: false
---
# Ruby Coding Style

> This file extends the common coding style rule with Ruby specific content.

## Standards

- Follow **RuboCop** conventions (`rubocop --autocorrect` after every edit)
- 2-space indentation, `snake_case` for methods/variables, `CamelCase` for classes
- Methods ≤ 15 lines (Sandi Metz rule: aim for ≤ 10)
- Max 4 parameters — use keyword args or data objects for more

## Guard Clauses

```ruby
# WRONG: nested conditionals
def process(user)
  if user.active?
    if user.verified?
      perform(user)
    end
  end
end

# CORRECT: guard clauses
def process(user)
  return unless user.active?
  return unless user.verified?
  perform(user)
end
```

## Immutability

Prefer returning new objects over mutation:

```ruby
# WRONG: mutating in place
def normalize(attrs)
  attrs[:email] = attrs[:email].downcase
  attrs
end

# CORRECT: return new hash
def normalize(attrs)
  attrs.merge(email: attrs[:email].downcase)
end
```

## Idiomatic Patterns

```ruby
# Use map over each + push
names = users.map(&:full_name)

# Use safe navigation
user&.profile&.avatar_url

# Use conditional assignment
@cache ||= load_cache

# Prefer symbols for hash keys
{ name: 'Jane', role: :admin }
```
