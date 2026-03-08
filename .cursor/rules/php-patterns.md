---
paths:
  - "**/*.php"
---

# PHP Patterns

> This file extends [common/patterns.md](../common/patterns.md) with PHP specific content.

## Repository Pattern

Encapsulate data access behind an interface:

```php
<?php

declare(strict_types=1);

interface UserRepository
{
    public function findById(int $id): ?User;
    public function findByEmail(string $email): ?User;
    public function save(User $user): void;
    public function delete(int $id): void;
}

class DoctrineUserRepository implements UserRepository
{
    public function __construct(private readonly EntityManagerInterface $em) {}

    public function findById(int $id): ?User
    {
        return $this->em->find(User::class, $id);
    }

    public function save(User $user): void
    {
        $this->em->persist($user);
        $this->em->flush();
    }
}
```

## Value Objects (PHP 8 readonly)

```php
<?php

declare(strict_types=1);

final readonly class Email
{
    public function __construct(public readonly string $value)
    {
        if (!filter_var($value, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException("Invalid email: {$value}");
        }
    }

    public function __toString(): string
    {
        return $this->value;
    }
}

// Usage — invalid email throws at construction
$email = new Email('alice@example.com');
```

## Enums (PHP 8.1+)

```php
<?php

declare(strict_types=1);

enum Status: string
{
    case Active   = 'active';
    case Inactive = 'inactive';
    case Banned   = 'banned';

    public function label(): string
    {
        return match($this) {
            Status::Active   => 'Active',
            Status::Inactive => 'Inactive',
            Status::Banned   => 'Banned',
        };
    }
}

// From database string
$status = Status::from($row['status']);

// Exhaustive match — UnhandledMatchError if new case added
$message = match($status) {
    Status::Active   => 'Welcome back!',
    Status::Inactive => 'Account not activated.',
    Status::Banned   => 'Your account has been suspended.',
};
```

## Service Layer Pattern

```php
<?php

declare(strict_types=1);

final class CreateUserCommand
{
    public function __construct(
        public readonly string $name,
        public readonly string $email,
    ) {}
}

final class CreateUserHandler
{
    public function __construct(
        private readonly UserRepository $users,
        private readonly EventDispatcher $events,
    ) {}

    public function handle(CreateUserCommand $cmd): User
    {
        if ($this->users->findByEmail($cmd->email) !== null) {
            throw new DuplicateEmailException($cmd->email);
        }

        $user = User::create(name: $cmd->name, email: new Email($cmd->email));
        $this->users->save($user);
        $this->events->dispatch(new UserCreated($user->getId()));

        return $user;
    }
}
```

## Laravel Patterns

```php
// Controller stays thin — delegates to service/handler
class UserController extends Controller
{
    public function store(CreateUserRequest $request, CreateUserHandler $handler): JsonResponse
    {
        $user = $handler->handle(new CreateUserCommand(
            name: $request->string('name'),
            email: $request->string('email'),
        ));

        return response()->json($user, 201);
    }
}

// Form Request for validation
class CreateUserRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name'  => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users'],
        ];
    }
}
```

## Reference

For detailed patterns: `skills/php-patterns`
For testing: `skills/php-testing`
