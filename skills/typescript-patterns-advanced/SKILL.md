---
name: typescript-patterns-advanced
description: Advanced TypeScript — mapped types, template literal types, conditional types, infer, type guards, decorators, async patterns, testing with Vitest/Jest, and performance. Extends typescript-patterns.
origin: ECC
---

# TypeScript Patterns — Advanced

> This skill extends [typescript-patterns](../typescript-patterns/SKILL.md) with the type system internals, advanced generics, async patterns, testing, and runtime performance.

## When to Activate

- Building type-safe library APIs with advanced generics
- Writing type-level transformations (mapped/conditional types)
- Testing TypeScript with Vitest or Jest
- Optimizing TypeScript compilation and bundle size

## Mapped Types

Transform one object type into another by iterating over keys:

```typescript
// Read-only deep clone
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

// Make specific keys optional
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
}

type UserUpdate = PartialBy<User, 'phone' | 'email'>;
// { id: string; name: string; email?: string; phone?: string }

// Mapped type with remapping (key renaming, +/- modifiers)
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type UserGetters = Getters<User>;
// { getId: () => string; getName: () => string; ... }

// Nullable to required
type NonNullableProperties<T> = {
  [K in keyof T]-?: NonNullable<T[K]>;  // -? removes optional
};
```

## Template Literal Types

Build types from string patterns:

```typescript
// HTTP method + route path → event name
type EventName<Method extends string, Path extends string> =
  `${Lowercase<Method>}:${Path}`;

type GetUsersEvent = EventName<'GET', '/users'>;  // 'get:/users'

// CSS property types
type CssValue = `${number}px` | `${number}%` | `${number}rem` | 'auto';
type CssProperty = 'margin' | 'padding' | 'fontSize';
type CssRule = `${CssProperty}: ${CssValue}`;

// Extract parameter names from URL patterns
type ExtractRouteParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractRouteParams<`/${Rest}`>
    : T extends `${string}:${infer Param}`
      ? Param
      : never;

type Params = ExtractRouteParams<'/users/:userId/posts/:postId'>;
// 'userId' | 'postId'

// Build typed route handler
function createRoute<Path extends string>(
  path: Path,
  handler: (params: Record<ExtractRouteParams<Path>, string>) => void
) { ... }

createRoute('/users/:id', (params) => {
  console.log(params.id);    // OK
  console.log(params.name);  // Type error
});
```

## Conditional Types

Types that depend on other types:

```typescript
// infer — extract type from structure
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type UnwrapArray<T>   = T extends Array<infer U>   ? U : T;

type ResolvedUser = UnwrapPromise<Promise<User>>;  // User

// Deep unwrap
type DeepUnwrap<T> = T extends Promise<infer U>
  ? DeepUnwrap<U>
  : T extends Array<infer U>
    ? DeepUnwrap<U>[]
    : T;

// Infer function return type (without ReturnType<>)
type MyReturnType<T extends (...args: any) => any> =
  T extends (...args: any) => infer R ? R : never;

// Distributive conditional types — distributes over unions
type IsString<T> = T extends string ? true : false;
type Test = IsString<string | number>;  // boolean (true | false)

// Disable distribution with tuple wrapping
type IsExactlyString<T> = [T] extends [string] ? true : false;
type Test2 = IsExactlyString<string | number>;  // false
```

## Type Guards and Narrowing

```typescript
// typeof guard
function format(value: string | number): string {
  if (typeof value === 'string') {
    return value.toUpperCase();  // narrowed to string
  }
  return value.toFixed(2);       // narrowed to number
}

// instanceof guard
function handleError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;  // narrowed to Error
  }
  return String(error);
}

// Custom type predicate
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'name' in value &&
    typeof (value as User).id === 'string'
  );
}

// Discriminant-based narrowing
function processEvent(event: OrderEvent): void {
  if (event.type === 'ORDER_PAID') {
    console.log(event.amount);  // narrowed: amount is available
  }
}

// Assertion function (throws on invalid)
function assertIsString(value: unknown): asserts value is string {
  if (typeof value !== 'string') {
    throw new TypeError(`Expected string, got ${typeof value}`);
  }
}

// Using assertion functions
function processId(id: unknown) {
  assertIsString(id);
  id.toUpperCase();  // Narrowed to string after assertion
}
```

## Async Patterns

### Type-Safe API Client

```typescript
interface ApiClient {
  get<T>(path: string): Promise<T>;
  post<T, B = unknown>(path: string, body: B): Promise<T>;
  put<T, B = unknown>(path: string, body: B): Promise<T>;
  delete(path: string): Promise<void>;
}

// With Result type
type ApiResult<T> = Promise<Result<T, ApiError>>;

interface ApiError {
  status: number;
  message: string;
  details?: Record<string, string[]>;
}

class HttpClient implements ApiClient {
  constructor(private baseUrl: string) {}

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`);
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json() as Promise<T>;
  }

  async post<T, B = unknown>(path: string, body: B): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json() as Promise<T>;
  }

  // ...
}
```

### Typed Event Emitter

```typescript
type EventMap = {
  'user:created':  { user: User };
  'user:deleted':  { userId: string };
  'order:placed':  { order: Order };
  'order:shipped': { orderId: string; trackingId: string };
};

class TypedEmitter<Events extends Record<string, unknown>> {
  private listeners = new Map<string, Set<Function>>();

  on<K extends keyof Events & string>(
    event: K,
    handler: (data: Events[K]) => void
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
    return () => this.listeners.get(event)?.delete(handler);
  }

  emit<K extends keyof Events & string>(event: K, data: Events[K]): void {
    this.listeners.get(event)?.forEach(fn => fn(data));
  }
}

const emitter = new TypedEmitter<EventMap>();
emitter.on('user:created', ({ user }) => console.log(user.name));
emitter.emit('user:created', { user: someUser });
```

### Typed Promise.all

```typescript
// TypeScript infers the tuple type correctly
async function fetchAll(userId: string, orderId: string) {
  const [user, order] = await Promise.all([
    fetchUser(userId),    // Promise<User>
    fetchOrder(orderId),  // Promise<Order>
  ]);
  // user: User, order: Order — fully typed
  return { user, order };
}
```

## Decorator Patterns (TypeScript 5+)

```typescript
// Method decorator for logging
function log(target: unknown, context: ClassMethodDecoratorContext) {
  const methodName = String(context.name);

  return function (this: unknown, ...args: unknown[]) {
    console.log(`Calling ${methodName}`, args);
    const result = (target as Function).apply(this, args);
    console.log(`${methodName} returned`, result);
    return result;
  };
}

// Field decorator for validation
function minLength(min: number) {
  return function (value: undefined, context: ClassFieldDecoratorContext) {
    return function (this: unknown, initialValue: string) {
      if (initialValue.length < min) {
        throw new Error(`${String(context.name)} must be at least ${min} chars`);
      }
      return initialValue;
    };
  };
}

class UserService {
  @log
  createUser(name: string, email: string): User {
    return { id: crypto.randomUUID(), name, email, createdAt: new Date() };
  }
}
```

## Testing with Vitest

### Setup

```bash
npm install -D vitest @vitest/coverage-v8
```

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      thresholds: { lines: 80, functions: 80, branches: 80 },
    },
  },
});
```

### Type-Safe Test Patterns

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('UserService', () => {
  let mockRepo: ReturnType<typeof createMockRepo>;

  beforeEach(() => {
    mockRepo = createMockRepo();
  });

  it('creates a user with hashed password', async () => {
    const service = new UserService(mockRepo);
    const user = await service.create({ name: 'Alice', email: 'a@test.com' });

    expect(user.id).toBeDefined();
    expect(user.name).toBe('Alice');
    expect(mockRepo.save).toHaveBeenCalledOnce();
  });

  it('throws on duplicate email', async () => {
    mockRepo.findByEmail.mockResolvedValue({ id: '1', email: 'a@test.com' });

    await expect(
      new UserService(mockRepo).create({ name: 'Bob', email: 'a@test.com' })
    ).rejects.toThrow('Email already in use');
  });
});

// Type-safe mock factory
function createMockRepo(): jest.Mocked<UserRepository> {
  return {
    findById:    vi.fn(),
    findByEmail: vi.fn(),
    save:        vi.fn(),
    delete:      vi.fn(),
  };
}
```

### Testing Result Types

```typescript
it('returns error result for invalid input', () => {
  const result = parseUserInput({ name: 123 });

  expect(result.ok).toBe(false);
  if (!result.ok) {
    expect(result.error.code).toBe('TYPE_ERROR');
    expect(result.error.field).toBe('name');
  }
});

it('returns ok result for valid input', () => {
  const result = parseUserInput({ name: 'Alice', email: 'a@test.com' });

  expect(result.ok).toBe(true);
  if (result.ok) {
    expect(result.value.name).toBe('Alice');
  }
});
```

## Performance

### Compilation Performance

```json
// tsconfig.json — speed up compilation
{
  "compilerOptions": {
    "incremental": true,          // Cache compilation
    "tsBuildInfoFile": ".tsbuildinfo",
    "skipLibCheck": true,         // Skip node_modules type check
    "isolatedModules": true       // Compatible with esbuild/swc
  }
}
```

### Avoid Type-Level Recursion Depth

```typescript
// Bad: unbounded recursion can slow tsc
type DeepPartial<T> = { [K in keyof T]?: DeepPartial<T[K]> };

// Good: limit depth
type DeepPartial<T, Depth extends number = 3> =
  Depth extends 0
    ? T
    : { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K], [-1, 0, 1, 2][Depth]> : T[K] };
```

## Quick Reference

| Feature | Usage |
|---------|-------|
| Mapped type | `{ [K in keyof T]: ... }` |
| Template literal | `` `${Prefix}${string}` `` |
| Conditional type | `T extends X ? A : B` |
| Infer | `T extends Promise<infer U> ? U : never` |
| Type predicate | `function isUser(x): x is User` |
| Assertion function | `function assert(x): asserts x is T` |
| Distributive | `T extends X ? A : B` distributes over unions |
| Non-distributive | `[T] extends [X] ? A : B` |
| `satisfies` | `const config = { ... } satisfies Config` |
| `const` type param | `function id<const T>(x: T): T` (TS 5.0) |
