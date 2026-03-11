---
description: PHP 8.4+ code review for strict types, security, Laravel/Symfony patterns, and PHPStan compliance. Invokes the php-reviewer agent.
---

# PHP Code Review

This command invokes the **php-reviewer** agent for PHP-specific code review.

## What This Command Does

1. **Identify PHP Changes**: Find modified `.php` files via `git diff`
2. **Security Scan**: SQL injection, XSS, CSRF, mass assignment vulnerabilities
3. **Type Safety**: Missing `declare(strict_types=1)`, nullable misuse, missing return types
4. **Framework Patterns**: Laravel/Symfony conventions, service container misuse, ORM issues
5. **Static Analysis**: PHPStan level 9 compatibility check
6. **Generate Report**: Categorize issues by severity

## When to Use

- After writing or modifying PHP code
- Before committing PHP changes
- Reviewing pull requests with PHP code
- Checking Laravel/Symfony architecture compliance

## Review Categories

### CRITICAL (Must Fix)
- SQL injection (raw queries without parameterization)
- XSS (unescaped user input in views)
- CSRF missing on state-changing forms
- Mass assignment (missing `$fillable`/`$guarded`)
- Hardcoded credentials or secrets

### HIGH (Should Fix)
- Missing `declare(strict_types=1)` in new files
- Missing return type declarations
- Direct `$_GET`/`$_POST` access without validation
- PHPStan level 9 errors

### MEDIUM (Consider)
- Missing `readonly` properties (PHP 8.1+)
- Procedural code where OOP would improve clarity
- Missing enum usage where string constants are used

## Automated Checks

```bash
phpstan analyse --level=9
php artisan test        # Laravel
php bin/console lint    # Symfony
```

## When to Use This vs /code-review

| | `/php-review` | `/code-review` |
|---|---|---|
| **Use when** | PHP 8.4+ / Laravel / Symfony project | Multi-language project or unsure |
| **Reviewer** | php-reviewer (specialist) | code-reviewer → routes to php-reviewer automatically |
| **Output** | PHP-specific: strict types, security, framework patterns | Combined report across all changed languages |

Both invoke the same specialist. Use `/code-review` when changes span multiple languages.

## After This

- `/tdd` — add tests if coverage gaps were flagged
- `/commit-push-pr` — commit and open PR after CRITICAL/HIGH are resolved

## Related

- Agent: `agents/php-reviewer.md`
- Skills: `skills/php-patterns/`, `skills/php-testing/`
