---
description: "Ruby/Rails security rules — SQL injection, mass assignment, XSS, Brakeman"
globs: ["**/*.rb", "app/controllers/**/*.rb", "app/models/**/*.rb"]
alwaysApply: false
---
# Ruby Security

> See `rules/ruby/security.md` for full security guidelines.

## Critical Checks

- **Never** use `permit!` — always whitelist specific parameters
- **Never** interpolate user input in SQL — use `where(email: params[:email])`
- **Never** use `html_safe` / `raw` with user input
- Run `brakeman` before every PR

```ruby
# WRONG
User.where("email = '#{params[:email]}'")
params.require(:user).permit!

# CORRECT
User.where(email: params[:email])
params.require(:user).permit(:email, :name)
```
