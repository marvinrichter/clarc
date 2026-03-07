---
description: Comprehensive Java code review for idiomatic patterns, Spring Boot 4, hexagonal architecture, DDD, JPA, and security. Invokes the java-reviewer agent.
---

# Java Code Review

This command invokes the **java-reviewer** agent for comprehensive Java-specific code review.

## What This Command Does

1. **Identify Java Changes**: Find modified `.java` files via `git diff`
2. **Run Static Analysis**: Execute `./mvnw checkstyle:check` and `./mvnw spotbugs:check` if available
3. **Security Scan**: Check SQL injection, mass assignment, hardcoded secrets, insecure crypto
4. **Architecture Review**: Verify hexagonal structure, no framework annotations in domain, constructor injection
5. **DDD Review**: Check for anemic domain model, domain logic in use cases, primitive obsession
6. **Generate Report**: Categorize issues by severity

## When to Use

Use `/java-review` when:
- After writing or modifying Java/Spring Boot code
- Before committing Java changes
- Reviewing pull requests with Java code
- Verifying hexagonal architecture boundaries are respected

## Review Categories

### CRITICAL (Must Fix)
- SQL injection via string concatenation in JDBC queries
- Mass assignment (request body bound directly to JPA entity)
- Hardcoded API keys, passwords, or tokens
- Missing `@Valid` on `@RequestBody` parameters
- Insecure password storage (plain text, MD5, SHA1)
- Silent catch blocks

### HIGH (Should Fix)
- Field injection (`@Autowired` on fields) — use constructor injection
- Spring annotations in `domain/` package
- Controller bypassing input port interface
- Use case importing from `adapter/out/persistence/`
- Domain entity exposed via API response
- N+1 queries (missing `@EntityGraph` or `JOIN FETCH`)
- Anemic domain model (entity has only getters/setters, no behavior)
- Non-RFC 7807 error format (use `ProblemDetail` in Spring Boot 4)

### MEDIUM (Consider)
- N+1 queries in loops
- Missing pagination on collection endpoints
- `Optional.get()` without `isPresent()` — use `orElseThrow`
- `System.out.println` — use SLF4J logging

## Automated Checks Run

```bash
# Static analysis (if available)
./mvnw checkstyle:check
./mvnw spotbugs:check

# Run tests
./mvnw test

# OWASP dependency scan
./mvnw dependency-check:check
```

## Example Usage

```text
User: /java-review

Agent:
# Java Code Review Report

## Files Reviewed
- src/main/java/com/example/adapter/in/web/MarketController.java (modified)
- src/main/java/com/example/application/usecase/CreateMarketService.java (modified)

## Issues Found

[HIGH] Field Injection
File: src/main/java/com/example/adapter/in/web/MarketController.java:12
Issue: @Autowired on field violates dependency injection best practice
Fix: Replace with constructor injection

[HIGH] Domain entity in API response
File: src/main/java/com/example/adapter/in/web/MarketController.java:34
Issue: Market JPA entity returned directly from controller
Fix: Map to MarketResponse DTO before returning

## Summary
- CRITICAL: 0
- HIGH: 2
- MEDIUM: 0

Verdict: WARNING — 2 HIGH issues should be resolved before merge.
```

## Approval Criteria

| Status | Condition |
|--------|-----------|
| ✅ Approve | No CRITICAL or HIGH issues |
| ⚠️ Warning | Only MEDIUM issues (merge with caution) |
| ❌ Block | CRITICAL or HIGH issues found |

## Integration with Other Commands

- Use `/tdd` first to ensure tests are written test-first
- Use `/build-fix` if compilation errors occur
- Use `/java-review` before committing
- Use `/code-review` for cross-language concerns

## Related

- Agent: `agents/java-reviewer.md`
- Skills: `skills/java-patterns/`, `skills/springboot-patterns/`, `skills/hexagonal-java/`, `skills/ddd-java/`, `skills/jpa-patterns/`
