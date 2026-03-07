---
paths:
  - "**/*.rb"
  - "**/*.rake"
  - "**/*.gemspec"
  - "**/Gemfile"
  - "**/Gemfile.lock"
---
> This file extends [common/security.md](../common/security.md) with Ruby-specific content.

# Ruby Security

## Security Scanning

**Brakeman** — static analysis for Rails security issues:

```bash
gem install brakeman
brakeman -o brakeman-report.html
```

Run before every PR. Address HIGH and CRITICAL findings.

## Mass Assignment Protection

```ruby
# WRONG: permit all parameters
def user_params
  params.require(:user).permit!  # Never do this
end

# CORRECT: explicit whitelist
def user_params
  params.require(:user).permit(:email, :first_name, :last_name)
end
```

## SQL Injection Prevention

```ruby
# WRONG: string interpolation in queries
User.where("email = '#{params[:email]}'")
User.where("name LIKE '%#{params[:q]}%'")

# CORRECT: parameterized queries
User.where(email: params[:email])
User.where("name LIKE ?", "%#{params[:q]}%")
User.where("name LIKE :q", q: "%#{params[:q]}%")
```

## XSS Prevention

Rails auto-escapes in ERB views by default. Avoid:

```ruby
# WRONG: raw HTML injection
<%= raw user_input %>
<%= user_input.html_safe %>

# CORRECT: use built-in escaping or sanitize
<%= user_input %>
<%= sanitize(user_content, tags: %w[p b i em strong]) %>
```

## CSRF Protection

Rails includes CSRF by default via `protect_from_forgery`. Ensure:

```ruby
class ApplicationController < ActionController::Base
  protect_from_forgery with: :exception  # Don't disable this
end

# For API-only controllers, use token verification:
class Api::BaseController < ActionController::API
  before_action :verify_api_token
end
```

## Authentication

- Use **Devise** or **Rodauth** (not hand-rolled)
- Use `bcrypt` for passwords (never MD5/SHA1)
- Never store plaintext passwords

```ruby
# Devise auto-hashes with bcrypt:
class User < ApplicationRecord
  devise :database_authenticatable, :registerable,
         :recoverable, :rememberable, :validatable
end
```

## Authorization

```ruby
# Use Pundit or CanCanCan — never roll your own
class PostPolicy < ApplicationPolicy
  def update?
    user.admin? || record.author == user
  end
end

# In controller
def update
  authorize @post
  @post.update!(post_params)
end
```

## Sensitive Data

```ruby
# WRONG: log sensitive parameters
# (This logs the password in plaintext)

# CORRECT: filter in ApplicationController
class ApplicationController < ActionController::Base
  # config/initializers/filter_parameter_logging.rb
  # Rails.application.config.filter_parameters += [:password, :token, :secret, :api_key]
end
```

## Security Checklist

- [ ] Brakeman passes with no HIGH/CRITICAL findings
- [ ] Strong parameters on all controllers
- [ ] No raw SQL with string interpolation
- [ ] No `html_safe` / `raw` with user input
- [ ] CSRF protection enabled
- [ ] Secrets in ENV or Rails credentials (not in code)
- [ ] Dependencies audited: `bundle audit check --update`
