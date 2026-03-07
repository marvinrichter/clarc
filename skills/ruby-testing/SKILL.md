---
name: ruby-testing
description: RSpec testing patterns for Ruby and Rails — factories, mocks, request specs, feature specs, VCR, and SimpleCov coverage.
---

# Ruby Testing

## When to Activate

Use this skill when:
- Writing tests for Ruby or Rails applications
- Setting up RSpec in a new project
- Writing model, request, or feature specs
- Using FactoryBot for test data
- Mocking external services in tests
- Setting up code coverage with SimpleCov
- Debugging flaky tests or test isolation issues
- Writing property-based tests for Ruby code

## RSpec Setup

```ruby
# Gemfile (test group)
group :test do
  gem 'rspec-rails'
  gem 'factory_bot_rails'
  gem 'shoulda-matchers'
  gem 'faker'
  gem 'database_cleaner-active_record'
  gem 'vcr'
  gem 'webmock'
  gem 'simplecov', require: false
  gem 'capybara'       # for feature specs
  gem 'selenium-webdriver'
end
```

```ruby
# spec/spec_helper.rb
require 'simplecov'
SimpleCov.start 'rails' do
  minimum_coverage 80
  add_filter '/spec/'
  add_filter '/config/'
end
```

## Unit Tests (Models)

```ruby
RSpec.describe User, type: :model do
  # Shoulda-Matchers for associations and validations
  it { is_expected.to validate_presence_of(:email) }
  it { is_expected.to validate_uniqueness_of(:email).case_insensitive }
  it { is_expected.to have_many(:posts).dependent(:destroy) }
  it { is_expected.to belong_to(:organization) }

  describe '#full_name' do
    subject(:user) { build(:user, first_name: 'Jane', last_name: 'Doe') }
    it { expect(user.full_name).to eq('Jane Doe') }
  end

  describe '.active' do
    it 'returns only active users' do
      active = create(:user, active: true)
      _inactive = create(:user, active: false)
      expect(User.active).to contain_exactly(active)
    end
  end
end
```

## Service Object Tests

```ruby
RSpec.describe UserRegistrationService do
  describe '#call' do
    subject(:service) { described_class.new(params) }

    context 'with valid params' do
      let(:params) { attributes_for(:user) }

      it 'creates a user' do
        expect { service.call }.to change(User, :count).by(1)
      end

      it 'sends welcome email' do
        expect { service.call }.to have_enqueued_mail(UserMailer, :welcome)
      end
    end

    context 'with duplicate email' do
      let!(:existing) { create(:user) }
      let(:params) { { email: existing.email, password: 'password' } }

      it 'raises ValidationError' do
        expect { service.call }.to raise_error(ValidationError, /email.*taken/i)
      end
    end
  end
end
```

## Request Specs (API)

```ruby
RSpec.describe 'POST /api/v1/users', type: :request do
  let(:valid_params) { { user: attributes_for(:user) } }
  let(:headers) { { 'Accept' => 'application/json', 'Content-Type' => 'application/json' } }

  context 'with valid params' do
    it 'returns 201 Created' do
      post '/api/v1/users', params: valid_params.to_json, headers: headers
      expect(response).to have_http_status(:created)
    end

    it 'returns the created user' do
      post '/api/v1/users', params: valid_params.to_json, headers: headers
      expect(JSON.parse(response.body)).to include('email' => valid_params[:user][:email])
    end
  end

  context 'with invalid email' do
    it 'returns 422 Unprocessable Entity' do
      post '/api/v1/users', params: { user: { email: 'bad', password: 'pw' } }.to_json, headers: headers
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
```

## FactoryBot Best Practices

```ruby
# spec/factories/users.rb
FactoryBot.define do
  factory :user do
    sequence(:email) { |n| "user#{n}@example.com" }
    password { 'SecurePass123!' }
    first_name { Faker::Name.first_name }
    last_name  { Faker::Name.last_name }
    active { true }

    trait :admin do
      role { :admin }
    end

    trait :inactive do
      active { false }
    end

    trait :with_posts do
      after(:create) do |user|
        create_list(:post, 3, author: user)
      end
    end
  end
end
```

## VCR for External Services

```ruby
# spec/support/vcr.rb
VCR.configure do |c|
  c.cassette_library_dir = 'spec/cassettes'
  c.hook_into :webmock
  c.configure_rspec_metadata!
  c.filter_sensitive_data('<STRIPE_KEY>') { ENV['STRIPE_API_KEY'] }
end

# Usage in spec:
RSpec.describe StripeCheckoutService, :vcr do
  it 'creates a payment intent' do
    result = described_class.new(amount: 1000).call
    expect(result.status).to eq('requires_payment_method')
  end
end
```

## Test Doubles and Mocks

```ruby
RSpec.describe NotificationService do
  let(:mailer) { instance_double(UserMailer, deliver_later: true) }

  before do
    allow(UserMailer).to receive(:notification).and_return(mailer)
  end

  it 'sends notification' do
    described_class.new(user).notify
    expect(UserMailer).to have_received(:notification).with(user)
    expect(mailer).to have_received(:deliver_later)
  end
end
```

## Anti-Patterns

```ruby
# WRONG: Testing implementation details
it 'calls save! on the model' do
  expect(@user).to receive(:save!)
  service.call
end

# CORRECT: Test behavior and outcomes
it 'persists the user' do
  expect { service.call }.to change(User, :count).by(1)
end

# WRONG: Shared state between tests
before(:all) do
  @user = create(:user)  # Shared state causes test pollution
end

# CORRECT: Isolated per-test data
let(:user) { create(:user) }

# WRONG: Bypassing database cleaner
after(:each) { User.delete_all }

# CORRECT: Configure DatabaseCleaner properly in spec_helper
```

## Reference

- See `ruby-patterns` skill for service object and query object patterns
- See `rules/ruby/testing.md` for project-level testing standards
