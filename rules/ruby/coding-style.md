> This file extends [common/coding-style.md](../common/coding-style.md) with Ruby-specific content.

# Ruby Coding Style

## Formatting

- **RuboCop** is the standard: `rubocop --autocorrect` after every edit
- **StandardRB** alternative: `standardrb` (zero-config RuboCop)
- 2-space indentation, no tabs
- Max line length: 120 characters (RuboCop default: 80, adjust `.rubocop.yml`)

## Naming Conventions

- `snake_case` for methods, variables, files
- `CamelCase` for classes and modules
- `SCREAMING_SNAKE_CASE` for constants
- Predicate methods end with `?` (e.g., `valid?`, `empty?`)
- Dangerous/mutating methods end with `!` (e.g., `save!`, `update!`)

## Ruby Idioms

```ruby
# WRONG: verbose iteration
result = []
items.each { |i| result << i * 2 }

# CORRECT: map
result = items.map { |i| i * 2 }

# WRONG: nil check
if obj.nil? == false
  obj.do_something
end

# CORRECT: safe navigation
obj&.do_something

# WRONG: string concatenation
name = "Hello " + user.name + "!"

# CORRECT: interpolation
name = "Hello #{user.name}!"

# CORRECT: conditional assignment
@config ||= load_config
```

## Method Design

- Methods should be ≤ 10 lines (Sandi Metz rule)
- Max 4 method parameters — use keyword arguments or objects
- Return early, avoid `else` when possible
- Prefer `guard clauses` over nested conditionals

```ruby
# WRONG: nested
def process(user)
  if user.active?
    if user.admin?
      perform_admin_task(user)
    end
  end
end

# CORRECT: guard clauses
def process(user)
  return unless user.active?
  return unless user.admin?
  perform_admin_task(user)
end
```

## Classes and Modules

- Follow Convention over Configuration (Rails)
- Single Responsibility Principle — one class, one job
- Extract to Service Objects for complex business logic
- Prefer composition over inheritance
- Use `attr_reader` / `attr_accessor` over manual `def name; @name; end`

## Error Handling

```ruby
# WRONG: rescue all
begin
  risky_operation
rescue => e
  nil
end

# CORRECT: rescue specific exception
begin
  risky_operation
rescue ActiveRecord::RecordNotFound => e
  Rails.logger.warn("Record not found: #{e.message}")
  raise
rescue StandardError => e
  Rails.logger.error("Unexpected error: #{e.message}")
  raise
end
```

## Code Quality Checklist

- [ ] RuboCop passes with zero offenses (or justified disables)
- [ ] Methods ≤ 10 lines
- [ ] No deep nesting (> 3 levels)
- [ ] Guard clauses instead of nested if/else
- [ ] Descriptive names (no single-letter vars except iterators)
- [ ] No `rescue Exception` (catches system signals)
