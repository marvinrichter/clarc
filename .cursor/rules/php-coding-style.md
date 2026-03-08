---
paths:
  - "**/*.php"
---

# PHP Coding Style

> This file extends [common/coding-style.md](../common/coding-style.md) with PHP specific content.

## Standard

Use PHP 8.2+ as the minimum. Enable strict types in every file:

```php
<?php

declare(strict_types=1);
```

## Naming Conventions

- Classes/Interfaces/Traits/Enums: `PascalCase` — `UserRepository`, `PaymentService`
- Methods/functions: `camelCase` — `findById`, `processPayment`
- Constants: `UPPER_SNAKE_CASE` — `MAX_RETRY_COUNT`
- Properties/variables: `camelCase` — `$userId`, `$emailAddress`
- Private properties: no underscore prefix — use visibility modifiers instead

## Typing

Always declare parameter types, return types, and property types:

```php
<?php

declare(strict_types=1);

class UserService
{
    public function __construct(
        private readonly UserRepository $repository,
        private readonly LoggerInterface $logger,
    ) {}

    public function findById(int $id): ?User
    {
        return $this->repository->findById($id);
    }

    public function create(string $name, string $email): User
    {
        $user = new User(name: $name, email: $email);
        $this->repository->save($user);
        $this->logger->info('User created', ['id' => $user->getId()]);
        return $user;
    }
}
```

## PSR-12 Formatting

Use `php-cs-fixer` with PSR-12:

```bash
# Format a file
vendor/bin/php-cs-fixer fix src/

# Dry-run check
vendor/bin/php-cs-fixer fix --dry-run --diff src/
```

`.php-cs-fixer.php` at project root:

```php
<?php

return (new PhpCsFixer\Config())
    ->setRules([
        '@PSR12' => true,
        'strict_param' => true,
        'declare_strict_types' => true,
    ])
    ->setFinder(PhpCsFixer\Finder::create()->in(__DIR__ . '/src'));
```

## Function Design

- Maximum function length: 30 lines
- One function, one responsibility
- Use named arguments for clarity when calling functions with many parameters:

```php
// WRONG — positional args are ambiguous
$user = new User('Alice', 'alice@example.com', true, null);

// CORRECT — named args are self-documenting
$user = new User(
    name: 'Alice',
    email: 'alice@example.com',
    isActive: true,
    role: null,
);
```

## Error Handling

Throw typed exceptions; never use `@` error suppression:

```php
// WRONG — swallows errors silently
$result = @file_get_contents($path);

// CORRECT
$result = file_get_contents($path);
if ($result === false) {
    throw new \RuntimeException("Cannot read file: {$path}");
}
```

Use PHP 8 match + union types for exhaustive handling:

```php
$message = match($status) {
    Status::Active   => 'Account is active',
    Status::Inactive => 'Account is inactive',
    Status::Banned   => 'Account has been banned',
};
// Throws UnhandledMatchError if Status gains a new case — intentional
```
