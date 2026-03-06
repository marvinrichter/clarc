---
paths:
  - "**/*.rs"
  - "**/Cargo.toml"
  - "**/Cargo.lock"
---
# Rust Hooks

> This file extends [common/hooks.md](../common/hooks.md) with Rust specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **rustfmt**: Auto-format `.rs` files after edit
  ```json
  {
    "matcher": "Edit",
    "hooks": [{"type": "command", "command": "rustfmt \"$CLAUDE_TOOL_INPUT_FILE_PATH\" 2>/dev/null || true"}],
    "description": "Auto-format Rust files after edit"
  }
  ```

- **clippy**: Run lints after editing `.rs` files
  ```json
  {
    "matcher": "Edit",
    "hooks": [{"type": "command", "command": "if [[ \"$CLAUDE_TOOL_INPUT_FILE_PATH\" == *.rs ]]; then cargo clippy --quiet 2>&1 | head -20; fi"}],
    "description": "Run clippy after editing Rust files"
  }
  ```

## Note on Rust Formatter Integration

The `post-edit-format-dispatch.js` hook (included in this plugin) does not yet support Rust. To add Rust formatting, extend `scripts/hooks/post-edit-format-dispatch.js` with:

```javascript
'.rs': 'post-edit-format-rust.js',
```

And create `scripts/hooks/post-edit-format-rust.js` that calls `rustfmt`.
