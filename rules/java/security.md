---
paths:
  - "**/*.java"
  - "**/pom.xml"
  - "**/build.gradle"
  - "**/build.gradle.kts"
---
# Java Security

> This file extends [common/security.md](../common/security.md) with Java specific content.

## Secret Management

Never hardcode secrets. Use environment variables or a secrets manager:

```java
@Value("${api.key}")
private String apiKey;

// or via environment
String apiKey = System.getenv("API_KEY");
if (apiKey == null || apiKey.isBlank()) {
    throw new IllegalStateException("API_KEY is not configured");
}
```

## SQL Injection

Always use parameterized queries. Never concatenate user input into SQL:

```java
// ✅ Safe — parameterized
String sql = "SELECT * FROM markets WHERE slug = ?";
jdbcTemplate.query(sql, ps -> ps.setString(1, slug), mapper);

// ✅ Spring Data JPA — safe by default
marketRepository.findBySlug(slug);

// ❌ Never do this
String sql = "SELECT * FROM markets WHERE slug = '" + slug + "'";
```

## Input Validation

Validate at API boundaries using Bean Validation:

```java
public record CreateMarketRequest(
    @NotBlank String name,
    @Size(max = 255) String description
) {}

@PostMapping
ResponseEntity<MarketDto> create(@Valid @RequestBody CreateMarketRequest request) {}
```

## Security Scanning

```bash
# OWASP Dependency Check (Maven)
./mvnw org.owasp:dependency-check-maven:check

# SpotBugs with find-sec-bugs
./mvnw spotbugs:check

# Gradle equivalent
./gradlew dependencyCheckAnalyze
./gradlew spotbugsMain
```

## Spring Security Baseline

- Enable CSRF protection for browser-facing endpoints
- Use `@PreAuthorize` for method-level security
- Store passwords with `BCryptPasswordEncoder` — never plain text or MD5/SHA1
- Set `HttpOnly` and `Secure` flags on session cookies

## Common Vulnerabilities to Check

- **Mass assignment**: Never bind request body directly to entity — use DTOs
- **Path traversal**: Validate and normalize file paths before use
- **XXE**: Disable external entity processing in XML parsers
- **Insecure deserialization**: Avoid Java object deserialization from untrusted sources

## Reference

See skill: `springboot-security` for full Spring Boot security configuration patterns.
