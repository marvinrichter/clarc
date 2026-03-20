---
paths:
  - "**/*.rb"
  - "**/*.rake"
  - "**/*.gemspec"
  - "**/Gemfile"
  - "**/Gemfile.lock"
globs:
  - "**/*.{rb,rake,gemspec}"
  - "**/Gemfile{,.lock}"
alwaysApply: false
---
> This file extends [common/testing.md](../common/testing.md) with Ruby-specific content.

# Ruby Testing

## Framework: RSpec

RSpec is the standard for Ruby/Rails testing.

```ruby
# spec/models/user_spec.rb
RSpec.describe User, type: :model do
  describe '#full_name' do
    it 'returns first and last name joined' do
      user = build(:user, first_name: 'Jane', last_name: 'Doe')
      expect(user.full_name).to eq('Jane Doe')
    end
  end
end
```

## Test Types

### Unit Tests (models, services, POROs)
```ruby
RSpec.describe UserRegistrationService do
  subject(:service) { described_class.new(params) }

  describe '#call' do
    context 'with valid params' do
      let(:params) { { email: 'user@example.com', password: 'secure123' } }

      it 'creates a user' do
        expect { service.call }.to change(User, :count).by(1)
      end
    end

    context 'with invalid email' do
      let(:params) { { email: 'invalid', password: 'secure123' } }

      it 'raises ValidationError' do
        expect { service.call }.to raise_error(ValidationError)
      end
    end
  end
end
```

### Request Specs (API integration)
```ruby
RSpec.describe 'POST /api/users', type: :request do
  it 'returns 201 with valid params' do
    post '/api/users', params: { user: attributes_for(:user) }
    expect(response).to have_http_status(:created)
  end
end
```

### Feature Specs (E2E with Capybara)
```ruby
RSpec.describe 'User login', type: :feature do
  it 'redirects to dashboard after login' do
    user = create(:user, password: 'password123')
    visit login_path
    fill_in 'Email', with: user.email
    fill_in 'Password', with: 'password123'
    click_button 'Sign In'
    expect(page).to have_current_path(dashboard_path)
  end
end
```

## FactoryBot

Use FactoryBot for test data, never raw `create` calls:

```ruby
# spec/factories/users.rb
FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "user#{n}@example.com" }
    password { 'SecurePass123!' }
    first_name { 'Test' }
    last_name  { 'User' }

    trait :admin do
      role { 'admin' }
    end
  end
end
```

## Shoulda-Matchers

Use for model validation and association specs:

```ruby
RSpec.describe User, type: :model do
  it { is_expected.to validate_presence_of(:email) }
  it { is_expected.to validate_uniqueness_of(:email) }
  it { is_expected.to have_many(:posts) }
  it { is_expected.to belong_to(:organization) }
end
```

## VCR for External HTTP

Record and replay external HTTP interactions:

```ruby
RSpec.describe WeatherApi do
  it 'fetches current temperature', vcr: { cassette_name: 'weather/current' } do
    result = WeatherApi.current(city: 'Berlin')
    expect(result[:temperature]).to be_a(Numeric)
  end
end
```

## Test Isolation

- Use `let` and `let!` (not instance variables)
- Use `subject` for the object under test
- Never rely on test execution order (use `--order random`)
- Database cleaner strategy: `transaction` for unit tests, `truncation` for Capybara

## Coverage

```bash
# Run with coverage report
COVERAGE=true bundle exec rspec

# SimpleCov config in spec/spec_helper.rb:
SimpleCov.start 'rails' do
  minimum_coverage 80
end
```
