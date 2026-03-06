---
description: "Java coding style extending common rules"
globs: ["**/*.java", "**/pom.xml", "**/build.gradle", "**/build.gradle.kts"]
alwaysApply: false
---
# Java Coding Style

> This file extends the common coding style rule with Java 25+ / Spring Boot 4 specific content.

## Formatting

- **google-java-format** or **Spotless** are mandatory — no style debates
- 2 or 4 spaces consistently (align with existing project standard)
- One public top-level type per file; filename matches class name

## Naming

- Classes/Records/Interfaces/Enums: `PascalCase`
- Methods and fields: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Packages: `lowercase`, no underscores

## Immutability

- Prefer `record` for pure data carriers (Java 25+)
- Use `final` fields; no setters unless framework requires it
- Collections: return unmodifiable views (`List.copyOf`, `Collections.unmodifiableList`)

## Error Handling

- Use unchecked exceptions for domain errors
- Create domain-specific exceptions (`MarketNotFoundException`)
- Avoid broad `catch (Exception ex)` unless logging centrally and rethrowing

## Null Handling

- Use `@NonNull` / `@Nullable` at API boundaries
- Prefer `Optional<T>` for absent return values — never return `null` from public methods
- Use Bean Validation (`@NotNull`, `@NotBlank`) on inputs

## Reference

See skill: `java-coding-standards` for comprehensive Java idioms and patterns.
