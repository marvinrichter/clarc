---
name: php-patterns
description: "PHP 8.4+ patterns: readonly classes/properties, enums, named arguments, match expressions, value objects, repository pattern, service layer with command/handler, Laravel controller/FormRequest, Symfony service wiring, Doctrine QueryBuilder, Fiber async. Use when writing or reviewing PHP code."
---

# PHP Patterns

## When to Activate

- Writing PHP 8.4+ source files (`.php`)
- Designing service/repository layers
- Reviewing PHP code for idiomatic patterns
- Working with Laravel or Symfony frameworks
- Replacing stringly-typed status comparisons with backed enums and `match` expressions for exhaustive, type-safe branching
- Modeling domain value objects as `readonly` classes to enforce immutability and input validation at construction time
- Structuring command/handler pairs to keep controllers thin and business logic independently testable

---

## PHP 8.4+ Language Features

### Readonly Classes

```php
<?php

declare(strict_types=1);

// Entire class is readonly — all properties implicitly readonly
final readonly class Money
{
    public function __construct(
        public int $amount,
        public string $currency,
    ) {}

    public function add(Money $other): self
    {
        if ($this->currency !== $other->currency) {
            throw new \InvalidArgumentException('Currency mismatch');
        }
        return new self($this->amount + $other->amount, $this->currency);
    }
}
```

### Enums with Methods

```php
<?php

declare(strict_types=1);

enum OrderStatus: string
{
    case Pending    = 'pending';
    case Processing = 'processing';
    case Shipped    = 'shipped';
    case Delivered  = 'delivered';
    case Cancelled  = 'cancelled';

    public function canTransitionTo(self $next): bool
    {
        return match($this) {
            self::Pending    => in_array($next, [self::Processing, self::Cancelled]),
            self::Processing => in_array($next, [self::Shipped, self::Cancelled]),
            self::Shipped    => $next === self::Delivered,
            default          => false,
        };
    }

    public function label(): string
    {
        return match($this) {
            self::Pending    => 'Awaiting processing',
            self::Processing => 'Being processed',
            self::Shipped    => 'On the way',
            self::Delivered  => 'Delivered',
            self::Cancelled  => 'Cancelled',
        };
    }
}

// Usage
$status = OrderStatus::from($row['status']);
$status->canTransitionTo(OrderStatus::Shipped); // bool
```

### Named Arguments

```php
// WRONG — positional, order-dependent
$result = array_slice($items, 0, 5, true);

// CORRECT — named, self-documenting
$result = array_slice(array: $items, offset: 0, length: 5, preserve_keys: true);
```

### Match Expression (exhaustive)

```php
$discount = match(true) {
    $order->total >= 1000 => 0.15,
    $order->total >= 500  => 0.10,
    $order->total >= 100  => 0.05,
    default               => 0.00,
};
```

---

## Value Objects

```php
<?php

declare(strict_types=1);

final readonly class Email
{
    public string $value;

    public function __construct(string $value)
    {
        $normalized = strtolower(trim($value));
        if (!filter_var($normalized, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException("Invalid email: {$value}");
        }
        $this->value = $normalized;
    }

    public function equals(self $other): bool
    {
        return $this->value === $other->value;
    }

    public function __toString(): string
    {
        return $this->value;
    }
}

final readonly class UserId
{
    public function __construct(public int $value)
    {
        if ($value <= 0) {
            throw new \InvalidArgumentException('UserId must be positive');
        }
    }
}
```

---

## Repository Pattern

```php
<?php

declare(strict_types=1);

interface UserRepository
{
    public function findById(UserId $id): ?User;
    public function findByEmail(Email $email): ?User;
    /** @return User[] */
    public function findAll(int $limit, int $offset): array;
    public function save(User $user): void;
    public function remove(UserId $id): void;
}

// Doctrine implementation
final class DoctrineUserRepository implements UserRepository
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    public function findById(UserId $id): ?User
    {
        return $this->em->find(User::class, $id->value);
    }

    public function findByEmail(Email $email): ?User
    {
        return $this->em->getRepository(User::class)
            ->findOneBy(['email' => $email->value]);
    }

    public function save(User $user): void
    {
        $this->em->persist($user);
        $this->em->flush();
    }
}
```

---

## Command / Handler (CQRS-lite)

```php
<?php

declare(strict_types=1);

// Command — immutable data bag
final readonly class RegisterUserCommand
{
    public function __construct(
        public string $name,
        public string $email,
        public string $password,
    ) {}
}

// Handler — single responsibility
final class RegisterUserHandler
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly PasswordHasher $hasher,
        private readonly EventBus $events,
    ) {}

    public function handle(RegisterUserCommand $cmd): User
    {
        $email = new Email($cmd->email);

        if ($this->users->findByEmail($email) !== null) {
            throw new DuplicateEmailException($email);
        }

        $user = User::register(
            name: $cmd->name,
            email: $email,
            passwordHash: $this->hasher->hash($cmd->password),
        );

        $this->users->save($user);
        $this->events->dispatch(new UserRegistered($user->getId()));

        return $user;
    }
}
```

---

## Laravel Patterns

### Thin Controller

```php
<?php

declare(strict_types=1);

class UserController extends Controller
{
    public function store(
        RegisterUserRequest $request,
        RegisterUserHandler $handler,
    ): JsonResponse {
        $user = $handler->handle(new RegisterUserCommand(
            name: $request->string('name'),
            email: $request->string('email'),
            password: $request->string('password'),
        ));

        return response()->json([
            'data' => ['id' => $user->getId(), 'email' => (string) $user->getEmail()],
        ], 201);
    }
}
```

### FormRequest Validation

```php
<?php

declare(strict_types=1);

class RegisterUserRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name'     => ['required', 'string', 'max:255'],
            'email'    => ['required', 'email:rfc,dns', 'unique:users,email'],
            'password' => ['required', 'string', 'min:12', 'confirmed'],
        ];
    }
}
```

### Eloquent with Casting

```php
<?php

class User extends Model
{
    protected $casts = [
        'status'     => OrderStatus::class,     // enum cast
        'created_at' => 'datetime',
        'settings'   => 'array',
    ];
}
```

---

## Symfony Service Wiring

```yaml
# config/services.yaml
services:
    _defaults:
        autowire: true
        autoconfigure: true

    App\Repository\UserRepository:
        class: App\Infrastructure\Doctrine\DoctrineUserRepository

    App\Handler\RegisterUserHandler: ~
```

```php
// Controller with Symfony
#[Route('/users', methods: ['POST'])]
public function register(Request $request, RegisterUserHandler $handler): JsonResponse
{
    $cmd = new RegisterUserCommand(
        name: $request->request->getString('name'),
        email: $request->request->getString('email'),
        password: $request->request->getString('password'),
    );

    $user = $handler->handle($cmd);

    return $this->json(['id' => $user->getId()], 201);
}
```

---

## Anti-Patterns

| Anti-Pattern | Problem | Better |
|---|---|---|
| Fat controller (>30 lines) | Violates SRP | Extract service/handler |
| Active Record god object | Business logic in model | Domain model + repository |
| `$_GET`/`$_POST` in service | Not testable | Inject validated DTO |
| `array` return types without shape | No IDE support | Use typed objects or `@return T[]` |
| `null` return without `?Type` hint | Silent contract violation | Declare `?ReturnType` |
| String `'active'` comparisons | Fragile | Enum with `Status::from()` |
