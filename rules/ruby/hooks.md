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
> This file extends [common/hooks.md](../common/hooks.md) with Ruby-specific content.

# Ruby Hooks

## PostToolUse: Auto-Format

After editing `.rb` files, auto-format with RuboCop:

```json
{
  "matcher": "Edit",
  "hooks": [{
    "type": "command",
    "command": "bash -c 'echo \"$CLAUDE_TOOL_INPUT\" | python3 -c \"import sys,json; p=json.load(sys.stdin); f=p.get(\\\"file_path\\\",\\\"\\\"); print(f)\" | grep -q \\.rb$ && rubocop --autocorrect --no-color \"$(echo \"$CLAUDE_TOOL_INPUT\" | python3 -c \"import sys,json; p=json.load(sys.stdin); print(p.get(\\\"file_path\\\",\\\"\\\"))\")\" 2>/dev/null || true'",
    "async": true
  }]
}
```

Or simpler via post-edit-format-dispatch.js (already handles Ruby via rubocop):

The existing `post-edit-format-dispatch.js` hook detects `.rb` files and runs:

```bash
rubocop --autocorrect --no-color <file>
# or
standardrb --fix <file>
```

## Recommended Tools

Install these in your Ruby projects:

```bash
# Gemfile (development group)
gem 'rubocop', require: false
gem 'rubocop-rails', require: false
gem 'rubocop-rspec', require: false
gem 'rubocop-performance', require: false
gem 'standardrb', require: false  # alternative to rubocop
gem 'brakeman', require: false    # security scanning
gem 'bundle-audit', require: false
```

## PreToolUse: Brakeman Check

Add a security check before Bash tool runs git push:

```json
{
  "matcher": "Bash",
  "hooks": [{
    "type": "command",
    "command": "node ${CLAUDE_PLUGIN_ROOT}/scripts/hooks/pre-bash-dispatch.js"
  }]
}
```

## .rubocop.yml Baseline

```yaml
# .rubocop.yml
require:
  - rubocop-rails
  - rubocop-rspec
  - rubocop-performance

AllCops:
  NewCops: enable
  TargetRubyVersion: 3.2
  Exclude:
    - 'db/schema.rb'
    - 'db/migrate/*.rb'
    - 'bin/**/*'
    - 'vendor/**/*'
    - 'node_modules/**/*'

Metrics/MethodLength:
  Max: 15

Metrics/ClassLength:
  Max: 200

Style/Documentation:
  Enabled: false
```
