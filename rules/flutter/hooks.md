---
paths:
  - "**/*.dart"
globs:
  - "**/*.dart"
  - "**/pubspec.{yaml,lock}"
alwaysApply: false
---
# Flutter / Dart Hooks

> This file extends [common/hooks.md](../common/hooks.md) with Flutter/Dart specific content.

## PostToolUse Hook: dart format

After every Edit on a `.dart` file, run `dart format` automatically.

This hook is registered in `hooks/hooks.json` via `post-edit-format-dispatch.js` and dispatches to `post-edit-format-dart.js`.

```json
{
  "matcher": { "tool_name": "Edit" },
  "hooks": [{
    "type": "command",
    "command": "node ~/.claude/scripts/hooks/post-edit-format-dispatch.js"
  }]
}
```

The dispatch script routes `.dart` files to `dart format --fix`.

## PostToolUse Hook: dart analyze

For significant edits (new files, refactors), run static analysis:

```bash
dart analyze lib/
# or project-specific:
dart analyze --fatal-infos lib/
```

## Install Hook Integration

After `install.sh`, the hook fires on all `.dart` file edits with:

```bash
dart format --fix <file>
```

`dart format` is deterministic and configuration-free — no `.dartfmt` needed.

## Additional Quality Gates (CI)

```yaml
# .github/workflows/flutter.yml
- name: Format check
  run: dart format --set-exit-if-changed .

- name: Analyze
  run: dart analyze --fatal-warnings

- name: Test
  run: flutter test --coverage

- name: Coverage gate
  run: |
    COVERAGE=$(lcov --summary coverage/lcov.info | grep "lines......" | awk '{print $2}' | tr -d '%')
    if (( $(echo "$COVERAGE < 80" | bc -l) )); then
      echo "Coverage $COVERAGE% is below 80%"
      exit 1
    fi
```
