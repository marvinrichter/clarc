---
paths:
  - "**/*.php"
globs:
  - "**/*.php"
  - "**/composer.{json,lock}"
alwaysApply: false
---

# PHP Hooks

> This file extends [common/hooks.md](../common/hooks.md) with PHP specific content.

## Auto-Format on Edit

After editing any `.php` file, `php-cs-fixer` runs automatically:

```bash
vendor/bin/php-cs-fixer fix "$FILE" --config=.php-cs-fixer.php
```

Falls back to global `php-cs-fixer` if no local vendor binary is found.

## Recommended `.php-cs-fixer.php`

```php
<?php

return (new PhpCsFixer\Config())
    ->setRules([
        '@PSR12'                  => true,
        'declare_strict_types'    => true,
        'strict_param'            => true,
        'no_unused_imports'       => true,
        'ordered_imports'         => ['sort_algorithm' => 'alpha'],
        'single_quote'            => true,
        'trailing_comma_in_multiline' => true,
    ])
    ->setFinder(
        PhpCsFixer\Finder::create()->in(__DIR__ . '/src')
    );
```

## Static Analysis

Run PHPStan at level 8+ for strict type checking:

```bash
vendor/bin/phpstan analyse src/ --level=8
```

Run Psalm for additional analysis:

```bash
vendor/bin/psalm --show-info=true
```

## Pre-commit Checks

```bash
vendor/bin/php-cs-fixer fix --dry-run --diff src/  # format check
vendor/bin/phpstan analyse src/ --level=8            # type analysis
vendor/bin/phpunit --testdox                         # tests
```
