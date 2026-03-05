---
paths:
  - "**/*.java"
  - "**/pom.xml"
  - "**/build.gradle"
  - "**/build.gradle.kts"
---
# Java Hooks

> This file extends [common/hooks.md](../common/hooks.md) with Java specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json`:

- **google-java-format / Spotless**: Auto-format `.java` files after edit
- **checkstyle**: Run style checks after editing `.java` files
- **spotbugs**: Run static bug analysis on modified classes

## Warnings

- Warn about `System.out.println()` in edited files (use `log.info(...)` instead)
- Warn about raw types (e.g. `List` instead of `List<T>`) in edited files

## Build Verification

After significant changes, run:

```bash
# Maven
./mvnw compile

# Gradle
./gradlew compileJava
```
