---
paths:
  - "**/*.php"
globs:
  - "**/*.php"
  - "**/composer.{json,lock}"
alwaysApply: false
---

# PHP Security

> This file extends [common/security.md](../common/security.md) with PHP specific content.

## SQL Injection Prevention

Always use parameterized queries — never concatenate user input into SQL:

```php
// WRONG — SQL injection vulnerability
$id = $_GET['id'];
$result = $pdo->query("SELECT * FROM users WHERE id = $id");

// CORRECT — parameterized query
$stmt = $pdo->prepare('SELECT * FROM users WHERE id = :id');
$stmt->execute(['id' => (int) $_GET['id']]);
$user = $stmt->fetch();
```

With Doctrine QueryBuilder:

```php
// CORRECT
$user = $em->createQueryBuilder()
    ->select('u')
    ->from(User::class, 'u')
    ->where('u.id = :id')
    ->setParameter('id', $id)
    ->getQuery()
    ->getOneOrNullResult();
```

## XSS Prevention

Always escape output — never pass raw user data to templates:

```php
// WRONG — XSS vulnerability
echo "<p>Hello, {$_GET['name']}</p>";

// CORRECT
echo '<p>Hello, ' . htmlspecialchars($_GET['name'], ENT_QUOTES, 'UTF-8') . '</p>';
```

In Twig templates, autoescaping is enabled by default — explicitly mark safe only trusted content:

```twig
{# Auto-escaped (safe) #}
{{ user.name }}

{# Explicitly unescaped — only for trusted HTML #}
{{ trusted_html_content|raw }}
```

## Input Validation

Validate and sanitize at boundaries — never trust user input:

```php
// Use filter_var for basic validation
$email = filter_var($_POST['email'], FILTER_VALIDATE_EMAIL);
if ($email === false) {
    throw new ValidationException('Invalid email address');
}

// Use Laravel Validator for rich validation
$validated = $request->validate([
    'name'  => 'required|string|max:255',
    'email' => 'required|email|unique:users',
    'age'   => 'required|integer|min:0|max:150',
]);
```

## CSRF Protection

- Laravel: CSRF middleware enabled by default on all web routes — include `@csrf` in forms
- Symfony: Use `CsrfTokenManager` for non-form endpoints
- Never disable CSRF on routes that change state

## Secret Management

```php
// WRONG — hardcoded secret
$apiKey = 'sk-prod-abc123';

// CORRECT — environment variable
$apiKey = $_ENV['PAYMENT_API_KEY'] ?? throw new \RuntimeException('PAYMENT_API_KEY not set');
```

Use `vlucas/phpdotenv` for local `.env` files. Never commit `.env` files.

## Shell Execution

Never pass unvalidated user input to PHP shell-executing functions (`shell_exec`, `passthru`, `system`, `popen`, `proc_open`, backtick operator).

```php
// WRONG — command injection risk: user-controlled dir concatenated into shell command
$output = shell_exec('ls -la ' . $_GET['dir']);

// CORRECT — avoid the shell entirely; validate and use PHP filesystem APIs
$dir = realpath((string) $_GET['dir']);
if ($dir === false || !str_starts_with($dir, '/var/www/uploads')) {
    throw new \RuntimeException('Invalid directory');
}
$files = scandir($dir);  // No shell involved
```

When a shell command is unavoidable, use `escapeshellarg` on every user-supplied argument and prefer `proc_open` with an argv array over shell-string functions.

## File Uploads

```php
// Validate MIME type and size; never trust client-provided filename
$file = $request->file('avatar');
if (!in_array($file->getMimeType(), ['image/jpeg', 'image/png', 'image/webp'], true)) {
    throw new ValidationException('Only JPEG, PNG, and WebP images are allowed');
}
// Store with a generated name — never use original filename
$path = $file->store('avatars', 'private');
```

## Dependency Security

```bash
composer audit              # check for known vulnerabilities
composer outdated           # identify stale packages
```

Run `composer audit` in CI on every build.
