---
name: typescript-patterns
description: TypeScript patterns — type system best practices, strict mode, utility types, generics, discriminated unions, error handling with Result types, and module organization. Core patterns for production TypeScript.
---

# TypeScript Patterns

Production-grade TypeScript patterns for type-safe, maintainable applications.

## When to Activate

- Writing TypeScript code in any framework (Node.js, React, Next.js)
- Designing type-safe APIs and domain models
- Handling errors without exceptions
- Structuring TypeScript modules and configurations

## TypeScript Configuration

### Strict tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",

    // Strict mode — ALL of these
    "strict": true,              // enables all strict checks below
    "noUncheckedIndexedAccess": true,  // arr[0] is T | undefined
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,

    // Interop
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

## Core Type System Patterns

### Prefer `interface` for Object Shapes

```typescript
// Good: interface for objects (extensible, better error messages)
interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// Good: type alias for unions, intersections, computed types
type UserId = string;
type AdminUser = User & { role: 'admin'; permissions: string[] };
type UserOrAdmin = User | AdminUser;
```

### Discriminated Unions

The most powerful TypeScript pattern for modeling state machines and API responses:

```typescript
// Model all states explicitly
type LoadingState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: User[] }
  | { status: 'error'; error: Error; message: string };

// Exhaustive switch with never check
function renderState(state: LoadingState): string {
  switch (state.status) {
    case 'idle':    return 'Ready';
    case 'loading': return 'Loading...';
    case 'success': return `Loaded ${state.data.length} users`;
    case 'error':   return `Error: ${state.message}`;
    default: {
      const _exhaustive: never = state;  // Compile error if case missing
      return _exhaustive;
    }
  }
}

// Domain events with discriminated unions
type OrderEvent =
  | { type: 'ORDER_PLACED';    orderId: string; items: OrderItem[] }
  | { type: 'ORDER_PAID';      orderId: string; amount: number }
  | { type: 'ORDER_SHIPPED';   orderId: string; trackingId: string }
  | { type: 'ORDER_DELIVERED'; orderId: string; deliveredAt: Date };
```

### Literal Types and Const Assertion

```typescript
// Literal types for enumerating values
type Direction = 'north' | 'south' | 'east' | 'west';
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type StatusCode = 200 | 201 | 400 | 401 | 403 | 404 | 500;

// const assertion — preserves literal types
const ROUTES = {
  home: '/',
  users: '/users',
  products: '/products',
} as const;

type Route = typeof ROUTES[keyof typeof ROUTES];  // '/' | '/users' | '/products'

// Enum alternative — const object is more flexible than enum
const OrderStatus = {
  DRAFT:     'DRAFT',
  PENDING:   'PENDING',
  CONFIRMED: 'CONFIRMED',
  SHIPPED:   'SHIPPED',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
} as const;

type OrderStatus = typeof OrderStatus[keyof typeof OrderStatus];
```

### Generics

```typescript
// Generic with constraint
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// Generic container
interface Repository<T, Id = string> {
  findById(id: Id): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: Id): Promise<void>;
}

// Generic with default
interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    hasNext: boolean;
  };
}

function paginate<T>(
  items: T[],
  page: number,
  limit: number
): PaginatedResult<T> {
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    meta: {
      total: items.length,
      page,
      limit,
      hasNext: start + limit < items.length,
    },
  };
}
```

## Utility Types

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

// Partial — all fields optional (e.g., update DTOs)
type UpdateUserDto = Partial<Omit<User, 'id' | 'createdAt'>>;

// Required — all fields required
type CompleteUser = Required<User>;

// Pick — select subset of fields
type PublicUser = Pick<User, 'id' | 'name' | 'email'>;

// Omit — exclude fields
type UserWithoutPassword = Omit<User, 'password'>;

// Record — typed object map
type UsersByEmail = Record<string, User>;
const cache: UsersByEmail = {};

// Readonly — immutable object
type ImmutableUser = Readonly<User>;

// ReturnType / Parameters — infer from functions
async function fetchUser(id: string): Promise<User> { ... }
type FetchUserReturn = Awaited<ReturnType<typeof fetchUser>>;  // User
type FetchUserParams = Parameters<typeof fetchUser>;           // [string]

// Extract / Exclude — filter union members
type SuccessStatuses = Extract<LoadingState, { status: 'success' | 'idle' }>;
type ErrorStates = Exclude<LoadingState, { status: 'idle' | 'loading' }>;

// NonNullable — remove null and undefined
type RequiredString = NonNullable<string | null | undefined>;  // string
```

## Error Handling with Result Types

Avoid throwing exceptions for expected errors. Use Result/Either types instead:

```typescript
// Simple Result type
type Result<T, E = Error> =
  | { ok: true;  value: T }
  | { ok: false; error: E };

// Constructors
const Ok  = <T>(value: T): Result<T, never>  => ({ ok: true,  value });
const Err = <E>(error: E): Result<never, E>  => ({ ok: false, error });

// Usage
interface ParseError {
  code: 'INVALID_JSON' | 'MISSING_FIELD' | 'TYPE_ERROR';
  message: string;
  field?: string;
}

function parseUserInput(raw: unknown): Result<User, ParseError> {
  if (typeof raw !== 'object' || raw === null) {
    return Err({ code: 'TYPE_ERROR', message: 'Expected object' });
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj['name'] !== 'string') {
    return Err({ code: 'MISSING_FIELD', message: 'name is required', field: 'name' });
  }
  return Ok({ id: crypto.randomUUID(), name: obj['name'] as string, ...} as User);
}

// Consuming
const result = parseUserInput(body);
if (!result.ok) {
  return res.status(400).json({ error: result.error.message });
}
const user = result.value;  // Narrowed to User
```

### Async Result

```typescript
type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

async function fetchUser(id: string): AsyncResult<User, ApiError> {
  try {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) {
      return Err({ code: response.status, message: response.statusText });
    }
    return Ok(await response.json() as User);
  } catch (err) {
    return Err({ code: 0, message: 'Network error' });
  }
}

// Chain results
async function getUsername(id: string): AsyncResult<string> {
  const result = await fetchUser(id);
  if (!result.ok) return result;  // Propagate error
  return Ok(result.value.name);
}
```

## Branded Types (Nominal Typing)

Prevent mixing up values of the same underlying type:

```typescript
// Brand: make string subtypes incompatible
type Brand<T, B extends string> = T & { readonly _brand: B };

type UserId    = Brand<string, 'UserId'>;
type ProductId = Brand<string, 'ProductId'>;
type Email     = Brand<string, 'Email'>;

// Constructors with validation
function UserId(id: string): UserId {
  if (!id.trim()) throw new Error('UserId cannot be empty');
  return id as UserId;
}

function Email(email: string): Email {
  if (!email.includes('@')) throw new Error('Invalid email');
  return email as Email;
}

// Now these are type-incompatible
function getUser(id: UserId): Promise<User> { ... }

const uid = UserId('user-123');
const pid = ProductId('prod-456');

getUser(uid);  // OK
getUser(pid);  // Type error: ProductId not assignable to UserId
```

## Module Organization

```
src/
├── domain/           # Pure domain types and logic
│   ├── user.ts       # User type, value objects, domain rules
│   ├── order.ts
│   └── index.ts      # Re-export public API
├── application/      # Use cases (service layer)
│   ├── user-service.ts
│   └── order-service.ts
├── infrastructure/   # External adapters (DB, HTTP, email)
│   ├── user-repository.ts
│   └── email-service.ts
├── api/              # HTTP controllers/routes
│   ├── users.ts
│   └── orders.ts
└── shared/           # Shared utilities
    ├── result.ts
    └── pagination.ts
```

### Barrel Exports

```typescript
// domain/index.ts — explicit exports (avoid star re-exports)
export type { User, UserId } from './user';
export type { Order, OrderStatus, OrderEvent } from './order';
export { createUser, validateEmail } from './user';
```

## Quick Reference

| Pattern | When to Use |
|---------|-------------|
| `interface` | Object shapes, classes, extensible APIs |
| `type` | Unions, intersections, computed types, aliases |
| Discriminated union | State machines, response types, events |
| `as const` | Constant object/array with literal types |
| Result type | Expected errors (validation, not-found, network) |
| Branded types | IDs, emails — prevent passing wrong string type |
| `noUncheckedIndexedAccess` | Force null-check on array/object access |
| `Readonly<T>` | Immutable domain objects |
| `Partial<T>` | Update/patch DTOs |
| `Omit<T, K>` | Strip sensitive fields from output types |

> For advanced patterns — mapped types, template literal types, conditional types, infer, type guards & narrowing, decorator patterns, async patterns, testing with vitest/jest, and performance optimization — see skill: `typescript-patterns-advanced`.
