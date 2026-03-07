---
description: "Ruby testing standards with RSpec, FactoryBot, and SimpleCov"
globs: ["**/*_spec.rb", "spec/**/*.rb"]
alwaysApply: false
---
# Ruby Testing

> See `ruby-testing` skill for full RSpec patterns.

## RSpec Conventions

- Describe what the class does, not how it does it
- Use `let` for test data, never instance variables
- One expectation per example where possible
- Use `context` for different scenarios

```ruby
RSpec.describe UserService do
  describe '#call' do
    context 'with valid params' do
      let(:params) { { email: 'user@example.com' } }
      it 'creates a user' do
        expect { described_class.new(params).call }.to change(User, :count).by(1)
      end
    end
  end
end
```

## FactoryBot

Always use factories for test data:

```ruby
let(:user) { create(:user) }
let(:admin) { create(:user, :admin) }
```

## Coverage Requirement: 80%+

Configure SimpleCov in `spec/spec_helper.rb`.
