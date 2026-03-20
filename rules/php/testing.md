---
paths:
  - "**/*.php"
globs:
  - "**/*.php"
  - "**/composer.{json,lock}"
alwaysApply: false
---

# PHP Testing

> This file extends [common/testing.md](../common/testing.md) with PHP specific content.

## Test Framework: PHPUnit

```bash
vendor/bin/phpunit --coverage-html coverage/
```

```php
<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Service\UserService;
use App\Repository\UserRepository;

class UserServiceTest extends TestCase
{
    private UserRepository $repository;
    private UserService $service;

    protected function setUp(): void
    {
        $this->repository = $this->createMock(UserRepository::class);
        $this->service    = new UserService($this->repository);
    }

    public function testFindByIdReturnsUser(): void
    {
        $user = new User(id: 1, name: 'Alice');
        $this->repository
            ->expects($this->once())
            ->method('findById')
            ->with(1)
            ->willReturn($user);

        $result = $this->service->findById(1);

        $this->assertSame($user, $result);
    }

    public function testFindByIdReturnsNullWhenNotFound(): void
    {
        $this->repository->method('findById')->willReturn(null);

        $this->assertNull($this->service->findById(999));
    }
}
```

## Modern Alternative: Pest

Pest provides a readable, expressive syntax:

```php
<?php

use App\Service\UserService;

it('returns a user when found', function () {
    $repository = mock(UserRepository::class)
        ->expects('findById')->with(1)->andReturn(new User(id: 1, name: 'Alice'));

    $service = new UserService($repository);

    expect($service->findById(1))->toBeInstanceOf(User::class);
});

it('returns null when user not found', function () {
    $repository = mock(UserRepository::class)
        ->expects('findById')->andReturn(null);

    $service = new UserService($repository);

    expect($service->findById(999))->toBeNull();
});
```

## Test Organization

```
project/
  src/
    Service/UserService.php
    Repository/UserRepository.php
  tests/
    Unit/
      Service/UserServiceTest.php
    Integration/
      Repository/UserRepositoryTest.php
    Feature/
      UserApiTest.php
  phpunit.xml
```

## Configuration

```xml
<!-- phpunit.xml -->
<?xml version="1.0"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         bootstrap="vendor/autoload.php"
         colors="true">
    <testsuites>
        <testsuite name="Unit">
            <directory>tests/Unit</directory>
        </testsuite>
        <testsuite name="Integration">
            <directory>tests/Integration</directory>
        </testsuite>
    </testsuites>
    <source>
        <include>
            <directory>src</directory>
        </include>
    </source>
</phpunit>
```

## Reference

For advanced patterns: `skills/php-patterns`
For testing patterns and mocking: `skills/php-testing`
