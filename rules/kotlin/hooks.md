---
paths:
  - "**/*.kt"
  - "**/*.kts"
  - "**/build.gradle.kts"
globs:
  - "**/*.{kt,kts}"
  - "**/build.gradle.kts"
  - "**/settings.gradle.kts"
alwaysApply: false
---

# Kotlin Hooks

> This file extends [common/hooks.md](../common/hooks.md) with Kotlin specific content.

## PostToolUse: Auto-Format with ktfmt

After every Kotlin file edit, `ktfmt` runs automatically via the PostToolUse hook.

### Formatter: ktfmt

```bash
ktfmt --kotlinlang-style <file>.kt
```

The `--kotlinlang-style` flag applies the official Kotlin coding conventions (4-space indent, 100-char line limit).

### Installation

```bash
# macOS via Homebrew (ktlint, which includes formatting)
brew install ktlint

# Standalone ktfmt via download
curl -L https://github.com/facebook/ktfmt/releases/latest/download/ktfmt-jar-with-dependencies.jar \
  -o ~/.local/bin/ktfmt.jar
echo '#!/bin/bash\njava -jar ~/.local/bin/ktfmt.jar "$@"' > ~/.local/bin/ktfmt
chmod +x ~/.local/bin/ktfmt

# Gradle plugin
plugins {
  id("com.ncorti.ktfmt.gradle") version "0.18.0"
}
```

### ktlint (alternative)

```bash
# Install
brew install ktlint

# Format in-place
ktlint --format "src/**/*.kt"

# Lint only (CI)
ktlint "src/**/*.kt"
```

### CI Integration

```yaml
- name: Check Kotlin formatting
  run: ktlint "src/**/*.kt"

- name: Run detekt static analysis
  run: ./gradlew detekt
```

### detekt (static analysis)

Add to `build.gradle.kts`:

```kotlin
plugins {
  id("io.gitlab.arturbosch.detekt") version "1.23.6"
}

detekt {
  config.setFrom("detekt.yml")
  buildUponDefaultConfig = true
}
```
