---
description: "Java security extending common rules"
globs: ["**/*.java", "**/pom.xml", "**/build.gradle", "**/build.gradle.kts"]
alwaysApply: false
---
# Java Security

> This file extends the common security rule with Java 25+ / Spring Boot 4 specific content.

## Secret Management

Never hardcode secrets. Use environment variables or a secrets manager:

```java
@Value("${api.key}")
private String apiKey;
```

## SQL Injection

Always use parameterized queries — never concatenate user input into SQL:

```java
// ✅ Safe
jdbcTemplate.query("SELECT * FROM markets WHERE slug = ?", ps -> ps.setString(1, slug), mapper);

// ✅ Spring Data JPA — safe by default
marketRepository.findBySlug(slug);

// ❌ Never
String sql = "SELECT * FROM markets WHERE slug = '" + slug + "'";
```

## Input Validation

Validate at API boundaries using Bean Validation:

```java
public record CreateMarketRequest(@NotBlank String name, @Size(max = 255) String description) {}

@PostMapping
ResponseEntity<MarketDto> create(@Valid @RequestBody CreateMarketRequest request) {}
```

## Security Scanning

```bash
./mvnw org.owasp:dependency-check-maven:check
./mvnw spotbugs:check
./gradlew dependencyCheckAnalyze spotbugsMain
```

## Spring Security Baseline

- Enable CSRF for browser-facing endpoints
- Use `@PreAuthorize` for method-level security
- Store passwords with `BCryptPasswordEncoder` — never plain text or MD5/SHA1
- Set `HttpOnly` and `Secure` on session cookies

## Common Vulnerabilities

- **Mass assignment**: Never bind request body directly to entity — use DTOs
- **Path traversal**: Validate and normalize file paths
- **XXE**: Disable external entity processing in XML parsers
- **Insecure deserialization**: Avoid Java object deserialization from untrusted sources

## Reference

See skill: `springboot-security` for full Spring Boot security configuration patterns.
