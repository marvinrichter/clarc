---
description: "Java hooks extending common rules"
globs: ["**/*.java", "**/pom.xml", "**/build.gradle", "**/build.gradle.kts"]
alwaysApply: false
---
# Java Hooks

> This file extends the common hooks rule with Java 25+ / Spring Boot 4 specific content.

## PostToolUse Hooks

Configure in `~/.claude/settings.json` (or use the plugin's `hooks/hooks.json`):

- **google-java-format / Spotless**: Auto-format `.java` files after edit
- **checkstyle**: Run style checks after editing `.java` files
- **spotbugs**: Run static bug analysis on modified classes

## Warnings

- Warn about `System.out.println()` in edited files (use `log.info(...)` instead)
- Warn about raw types (e.g. `List` instead of `List<T>`) in edited files

## Build Verification

After significant changes:

```bash
./mvnw compile
./gradlew compileJava
```
