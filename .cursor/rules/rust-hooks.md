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

## Dispatch Hook Integration

The `post-edit-format-dispatch.js` hook routes `.rs` files to `scripts/hooks/post-edit-format-rust.js`, which calls `rustfmt` automatically. Enable by adding the dispatch hook to `hooks.json`:

```json
{
  "matcher": "Edit",
  "hooks": [{"type": "command", "command": "node \"${CLAUDE_PLUGIN_ROOT}/scripts/hooks/post-edit-format-dispatch.js\""}]
}
```
