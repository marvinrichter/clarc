---
name: php-testing
description: "PHP testing patterns: PHPUnit 11 with mocks and data providers, Pest v3 with expectations and datasets, Laravel feature/HTTP tests with RefreshDatabase, Symfony WebTestCase, PHPStan static analysis, Infection mutation testing. Use when writing or reviewing PHP tests."
---

# PHP Testing

## When to Activate

- Writing PHP tests with PHPUnit or Pest
- Setting up Laravel/Symfony test suites
- Configuring PHPStan for static analysis
- Adding mutation testing with Infection
- Applying TDD layer by layer: domain value objects first, then application handlers, then infrastructure repositories, then HTTP controllers
- Verifying that test assertions are meaningful (not just coverage-padding) by running Infection mutation testing with an 80% MSI gate
- Choosing between PHPUnit data providers and Pest datasets to parameterize tests across multiple input variants

---

## PHPUnit 11 — Unit Tests

```php
<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;
use App\Domain\Email;

class EmailTest extends TestCase
{
    #[Test]
    public function it_normalizes_email_to_lowercase(): void
    {
        $email = new Email('Alice@EXAMPLE.COM');

        $this->assertSame('alice@example.com', $email->value);
    }

    #[Test]
    public function it_throws_on_invalid_email(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $this->expectExceptionMessage('Invalid email');

        new Email('not-an-email');
    }

    #[Test]
    #[DataProvider('validEmails')]
    public function it_accepts_valid_email_formats(string $input, string $expected): void
    {
        $this->assertSame($expected, (new Email($input))->value);
    }

    public static function validEmails(): array
    {
        return [
            'simple'       => ['alice@example.com', 'alice@example.com'],
            'mixed case'   => ['ALICE@EXAMPLE.COM', 'alice@example.com'],
            'subdomain'    => ['alice@mail.example.com', 'alice@mail.example.com'],
        ];
    }
}
```

### Mocking with PHPUnit

```php
<?php

declare(strict_types=1);

class RegisterUserHandlerTest extends TestCase
{
    private UserRepository $users;
    private PasswordHasher $hasher;
    private EventBus $events;
    private RegisterUserHandler $handler;

    protected function setUp(): void
    {
        $this->users   = $this->createMock(UserRepository::class);
        $this->hasher  = $this->createMock(PasswordHasher::class);
        $this->events  = $this->createMock(EventBus::class);
        $this->handler = new RegisterUserHandler($this->users, $this->hasher, $this->events);
    }

    #[Test]
    public function it_registers_a_new_user(): void
    {
        $this->users->method('findByEmail')->willReturn(null);
        $this->hasher->method('hash')->willReturn('hashed_pw');
        $this->users->expects($this->once())->method('save');
        $this->events->expects($this->once())->method('dispatch')
            ->with($this->isInstanceOf(UserRegistered::class));

        $user = $this->handler->handle(new RegisterUserCommand(
            name: 'Alice',
            email: 'alice@example.com',
            password: 'secure_password_123',
        ));

        $this->assertSame('alice@example.com', (string) $user->getEmail());
    }

    #[Test]
    public function it_throws_on_duplicate_email(): void
    {
        $this->users->method('findByEmail')->willReturn(new User());

        $this->expectException(DuplicateEmailException::class);

        $this->handler->handle(new RegisterUserCommand(
            name: 'Bob',
            email: 'existing@example.com',
            password: 'password_123',
        ));
    }
}
```

---

## Pest v3 — Expressive Syntax

```php
<?php

use App\Domain\Email;
use App\Handler\RegisterUserHandler;

// describe + it grouping
describe('Email', function () {
    it('normalizes to lowercase', function () {
        expect(new Email('ALICE@EXAMPLE.COM'))
            ->value->toBe('alice@example.com');
    });

    it('throws on invalid input', function () {
        expect(fn () => new Email('bad'))->toThrow(\InvalidArgumentException::class);
    });
});

// Dataset (Pest equivalent of DataProvider)
it('accepts valid email formats', function (string $input, string $expected) {
    expect((new Email($input))->value)->toBe($expected);
})->with([
    'simple'     => ['alice@example.com', 'alice@example.com'],
    'mixed case' => ['ALICE@EXAMPLE.COM', 'alice@example.com'],
]);

// Pest mock via mockery
it('dispatches event on registration', function () {
    $users  = mock(UserRepository::class)->allows('findByEmail')->andReturn(null)->allows('save');
    $hasher = mock(PasswordHasher::class)->allows('hash')->andReturn('hash');
    $events = mock(EventBus::class)->expects('dispatch')->once();

    $handler = new RegisterUserHandler($users, $hasher, $events);
    $handler->handle(new RegisterUserCommand('Alice', 'alice@example.com', 'pw'));
});
```

---

## Laravel Feature Tests

```php
<?php

declare(strict_types=1);

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_create_user_returns_201(): void
    {
        $response = $this->postJson('/api/users', [
            'name'                  => 'Alice',
            'email'                 => 'alice@example.com',
            'password'              => 'super_secure_pass',
            'password_confirmation' => 'super_secure_pass',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('data.email', 'alice@example.com');

        $this->assertDatabaseHas('users', ['email' => 'alice@example.com']);
    }

    public function test_create_user_validates_email(): void
    {
        $response = $this->postJson('/api/users', [
            'name'  => 'Bob',
            'email' => 'not-an-email',
        ]);

        $response->assertUnprocessable()
            ->assertJsonValidationErrors(['email', 'password']);
    }

    public function test_duplicate_email_returns_422(): void
    {
        User::factory()->create(['email' => 'alice@example.com']);

        $this->postJson('/api/users', [
            'name'                  => 'Alice 2',
            'email'                 => 'alice@example.com',
            'password'              => 'super_secure_pass',
            'password_confirmation' => 'super_secure_pass',
        ])->assertUnprocessable();
    }
}
```

---

## Symfony WebTestCase

```php
<?php

declare(strict_types=1);

namespace Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class UserControllerTest extends WebTestCase
{
    public function testRegisterUser(): void
    {
        $client = static::createClient();

        $client->request('POST', '/users', [], [], [
            'CONTENT_TYPE' => 'application/json',
        ], json_encode([
            'name'     => 'Alice',
            'email'    => 'alice@example.com',
            'password' => 'super_secure_pass',
        ]));

        $this->assertResponseStatusCodeSame(201);
        $data = json_decode($client->getResponse()->getContent(), true);
        $this->assertSame('alice@example.com', $data['email']);
    }
}
```

---

## PHPStan Static Analysis

```bash
vendor/bin/phpstan analyse src/ --level=9
```

`phpstan.neon`:

```neon
parameters:
    level: 9
    paths:
        - src
    checkMissingIterableValueType: true
    checkGenericClassInNonGenericObjectType: true
```

---

## Infection — Mutation Testing

Mutation testing verifies that tests actually catch bugs:

```bash
vendor/bin/infection --min-msi=80 --min-covered-msi=85
```

`infection.json5`:

```json
{
    "source": { "directories": ["src"] },
    "minMsi": 80,
    "minCoveredMsi": 85,
    "testFramework": "phpunit"
}
```

High MSI (Mutation Score Indicator) confirms test assertions are meaningful, not just coverage-chasing.

---

## Strategy: Layer by Layer

| Layer | Framework | Focus |
|-------|-----------|-------|
| Domain (pure PHP) | PHPUnit / Pest | Value objects, domain logic |
| Application (handlers) | PHPUnit with mocks | Command/query handlers |
| Infrastructure (DB) | TestCase + real DB | Repository implementations |
| HTTP (controllers) | Laravel HTTP tests / Symfony WebTestCase | Endpoints, validation, responses |
