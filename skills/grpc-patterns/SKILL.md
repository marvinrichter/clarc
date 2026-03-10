---
name: grpc-patterns
description: "gRPC + Protocol Buffers patterns — proto schema design, code generation, unary and streaming call types, error handling with gRPC status codes, interceptors, reflection, and client usage. For service-to-service communication where REST is insufficient."
---

# gRPC Patterns

Binary RPC framework built on HTTP/2. Use when you need: strong typing between services, bi-directional streaming, or high-throughput service-to-service calls.

## When to Activate

- Designing service-to-service internal APIs (not public-facing)
- Need bi-directional streaming (chat, live data feeds, multiplayer)
- Performance-critical service calls (gRPC is ~10x smaller than JSON)
- Building microservices that need a strongly-typed contract
- Replacing REST endpoints between internal services
- Versioning a proto schema safely after an already-deployed service has external consumers
- Setting up `buf lint` and `buf breaking` checks in CI to prevent accidental wire-incompatible changes
- Choosing between unary, server-streaming, client-streaming, and bidirectional streaming for a new RPC method

## gRPC vs REST — Decision

| Factor | gRPC | REST |
|---|---|---|
| Contract | `.proto` file (strict) | OpenAPI (flexible) |
| Payload | Protocol Buffers (binary) | JSON (text) |
| Browser support | Needs grpc-web proxy | Native |
| Streaming | Native (4 modes) | SSE only |
| Tooling | Generated clients | Manual fetch / OpenAPI codegen |
| Use case | Internal services | Public APIs, browser clients |

**Rule:** gRPC for internal services; REST+OpenAPI for anything browser-accessible or public.

---

## Proto Schema Design

```protobuf
// proto/order/v1/order.proto
syntax = "proto3";

package order.v1;

option go_package = "github.com/myorg/myapp/gen/order/v1;orderv1";
option java_package = "com.myorg.myapp.order.v1";

import "google/protobuf/timestamp.proto";

// Always version your package: order.v1, order.v2
// Breaking changes → new version, keep old running during transition

service OrderService {
  // Unary: one request, one response
  rpc CreateOrder(CreateOrderRequest) returns (CreateOrderResponse);
  rpc GetOrder(GetOrderRequest) returns (Order);

  // Server streaming: one request, many responses (e.g., status updates)
  rpc WatchOrder(WatchOrderRequest) returns (stream OrderEvent);

  // Client streaming: many requests, one response (e.g., bulk upload)
  rpc BulkCreateOrders(stream CreateOrderRequest) returns (BulkCreateOrdersResponse);

  // Bidirectional streaming: many requests, many responses
  rpc SyncOrders(stream SyncRequest) returns (stream SyncResponse);
}

message Order {
  string id          = 1;
  string user_id     = 2;
  OrderStatus status = 3;
  repeated OrderItem items = 4;
  google.protobuf.Timestamp created_at = 5;
  // Field numbers NEVER change — adding new fields is safe
  // Removing fields → mark reserved, never reuse the number
}

message OrderItem {
  string product_id = 1;
  int32  quantity   = 2;
  int64  price_cents = 3;  // use int64 for money, never float
}

enum OrderStatus {
  ORDER_STATUS_UNSPECIFIED = 0;  // always 0 = default/unknown
  ORDER_STATUS_PENDING     = 1;
  ORDER_STATUS_CONFIRMED   = 2;
  ORDER_STATUS_SHIPPED     = 3;
  ORDER_STATUS_CANCELLED   = 4;
}

message CreateOrderRequest {
  string user_id            = 1;
  repeated OrderItem items  = 2;
}
message CreateOrderResponse { Order order = 1; }
message GetOrderRequest     { string id   = 1; }
message WatchOrderRequest   { string id   = 1; }
message OrderEvent {
  oneof event {
    Order updated   = 1;
    string cancelled_reason = 2;
  }
}
message BulkCreateOrdersResponse { int32 created_count = 1; }
message SyncRequest  { string last_sync_token = 1; }
message SyncResponse { Order order = 1; string sync_token = 2; }
```

### Proto Field Rules

```
✅ Field numbers never change (wire compatibility)
✅ Old fields marked reserved if removed: reserved 5, 6; reserved "old_field";
✅ Use google.protobuf.Timestamp for times (not string)
✅ Money as int64 cents (not float/double)
✅ Enum default value = 0 and always UNSPECIFIED
✅ Package versioned: order.v1
❌ Reusing field numbers after deletion
❌ Changing field types
❌ Renaming fields (safe for semantics, breaks JSON interop)
```

---

## Code Generation

### Setup (Node.js / TypeScript)

```bash
# Install buf (recommended over protoc directly)
brew install bufbuild/buf/buf

# buf.yaml — in proto/ directory
cat > proto/buf.yaml << 'EOF'
version: v2
modules:
  - path: .
deps:
  - buf.build/googleapis/googleapis
EOF

# buf.gen.yaml — code generation config
cat > buf.gen.yaml << 'EOF'
version: v2
plugins:
  - remote: buf.build/connectrpc/es
    out: gen
    opt:
      - target=ts
  - remote: buf.build/bufbuild/es
    out: gen
    opt:
      - target=ts
EOF
```

```bash
# Generate TypeScript types + client
buf generate proto/

# Output: gen/order/v1/order_pb.ts (types)
#         gen/order/v1/order_connect.ts (client + server interface)
```

### Setup (Go)

```bash
# buf.gen.yaml for Go
cat > buf.gen.yaml << 'EOF'
version: v2
plugins:
  - remote: buf.build/protocolbuffers/go
    out: gen
    opt:
      - paths=source_relative
  - remote: buf.build/grpc/go
    out: gen
    opt:
      - paths=source_relative
EOF

buf generate proto/
```

---

## Server Implementation — Node.js (ConnectRPC)

```typescript
// src/services/order-service.ts
import { ConnectRouter } from '@connectrpc/connect';
import { OrderService } from '../gen/order/v1/order_connect.js';
import type { HandlerContext } from '@connectrpc/connect';

export function routes(router: ConnectRouter) {
  router.service(OrderService, {
    async createOrder(req, ctx: HandlerContext) {
      // Access metadata (auth token, trace ID)
      const userId = ctx.requestHeader.get('x-user-id');
      if (!userId) throw new ConnectError('Unauthenticated', Code.Unauthenticated);

      const order = await db.orders.create({
        userId: req.userId,
        items: req.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          priceCents: BigInt(item.priceCents),
        })),
      });

      return { order: toProtoOrder(order) };
    },

    async *watchOrder(req, ctx) {
      // Server streaming: yield events until cancelled
      while (!ctx.signal.aborted) {
        const event = await orderEventBus.next(req.id, ctx.signal);
        if (!event) break;
        yield { event: { case: 'updated', value: toProtoOrder(event.order) } };
      }
    },
  });
}
```

```typescript
// src/index.ts
import { createServer } from '@connectrpc/connect-node';
import { routes } from './services/order-service.js';

const server = createServer({
  routes,
  interceptors: [authInterceptor, loggingInterceptor],
});

await server.listen('0.0.0.0:50051');
```

## Server Implementation — Go

```go
// internal/server/order_server.go
package server

import (
    "context"
    orderv1 "myapp/gen/order/v1"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

type OrderServer struct {
    orderv1.UnimplementedOrderServiceServer  // embed for forward compatibility
    repo order.Repository
}

func (s *OrderServer) CreateOrder(ctx context.Context, req *orderv1.CreateOrderRequest) (*orderv1.CreateOrderResponse, error) {
    if req.UserId == "" {
        return nil, status.Error(codes.InvalidArgument, "user_id is required")
    }

    order, err := s.repo.Create(ctx, req)
    if err != nil {
        return nil, status.Errorf(codes.Internal, "failed to create order: %v", err)
    }

    return &orderv1.CreateOrderResponse{Order: toProtoOrder(order)}, nil
}

func (s *OrderServer) WatchOrder(req *orderv1.WatchOrderRequest, stream orderv1.OrderService_WatchOrderServer) error {
    sub := s.eventBus.Subscribe(req.Id)
    defer sub.Unsubscribe()

    for {
        select {
        case event := <-sub.Events():
            if err := stream.Send(toProtoEvent(event)); err != nil {
                return err
            }
        case <-stream.Context().Done():
            return nil
        }
    }
}
```

---

## Error Handling — gRPC Status Codes

```typescript
import { ConnectError, Code } from '@connectrpc/connect';

// Map domain errors to gRPC codes
function toGrpcError(err: unknown): ConnectError {
  if (err instanceof NotFoundError)
    return new ConnectError(err.message, Code.NotFound);
  if (err instanceof ValidationError)
    return new ConnectError(err.message, Code.InvalidArgument);
  if (err instanceof UnauthorizedError)
    return new ConnectError(err.message, Code.Unauthenticated);
  if (err instanceof ForbiddenError)
    return new ConnectError(err.message, Code.PermissionDenied);
  if (err instanceof ConflictError)
    return new ConnectError(err.message, Code.AlreadyExists);

  // Never expose internal error details to client
  console.error('Unexpected error:', err);
  return new ConnectError('Internal server error', Code.Internal);
}
```

| gRPC Code | HTTP Equiv | Use When |
|---|---|---|
| `OK` | 200 | Success |
| `InvalidArgument` | 400 | Bad request / validation failure |
| `NotFound` | 404 | Resource doesn't exist |
| `AlreadyExists` | 409 | Conflict / duplicate |
| `PermissionDenied` | 403 | Authenticated but not authorized |
| `Unauthenticated` | 401 | No valid credentials |
| `ResourceExhausted` | 429 | Rate limited |
| `Internal` | 500 | Unexpected server error |
| `Unavailable` | 503 | Service temporarily unavailable |
| `DeadlineExceeded` | 504 | Timeout |

---

## Interceptors (Middleware)

```typescript
// Logging interceptor
import type { Interceptor } from '@connectrpc/connect';

export const loggingInterceptor: Interceptor = (next) => async (req) => {
  const start = Date.now();
  try {
    const res = await next(req);
    console.log({ method: req.method.name, duration: Date.now() - start, status: 'ok' });
    return res;
  } catch (err) {
    console.error({ method: req.method.name, duration: Date.now() - start, error: err });
    throw err;
  }
};

// Auth interceptor
export const authInterceptor: Interceptor = (next) => async (req) => {
  const token = req.header.get('authorization')?.replace('Bearer ', '');
  if (!token) throw new ConnectError('Missing auth token', Code.Unauthenticated);

  const user = await verifyToken(token);
  req.header.set('x-user-id', user.id);
  return next(req);
};
```

---

## Client Usage — TypeScript

```typescript
import { createClient } from '@connectrpc/connect';
import { createConnectTransport } from '@connectrpc/connect-node';
import { OrderService } from '../gen/order/v1/order_connect.js';

const transport = createConnectTransport({
  baseUrl: 'https://api.internal:50051',
  httpVersion: '2',
});

const client = createClient(OrderService, transport);

// Unary call
const { order } = await client.createOrder({ userId: '123', items: [] });

// Server streaming
for await (const event of client.watchOrder({ id: order.id })) {
  console.log('Order event:', event);
}
```

---

## Buf Linting & Breaking Change Detection

```bash
# Lint proto files
buf lint proto/

# Check for breaking changes vs main branch
buf breaking proto/ --against '.git#branch=main'

# Breaking changes detected:
# proto/order/v1/order.proto:15:3:Field "1" on message "Order" changed type from "string" to "int64".
```

Add to CI:
```yaml
- name: Lint protos
  run: buf lint proto/

- name: Check breaking changes
  run: buf breaking proto/ --against 'https://github.com/myorg/myapp.git#branch=main'
```

---

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| Reusing field numbers | Wire format corruption for old clients | Mark removed fields `reserved` |
| `float` / `double` for money | Floating point precision errors | Use `int64` cents |
| Missing `UnimplementedXxxServer` embed in Go | Breaks forward compat when new methods added | Always embed |
| Returning raw internal errors | Leaks implementation details | Map to gRPC status codes |
| Using gRPC for browser-facing APIs | Browser can't use gRPC directly | Use grpc-web or REST for browser clients |
| No deadline on client calls | Hung goroutines / connections | Always set `ctx, cancel := context.WithTimeout(...)` |
| Proto files not versioned | Breaking changes break all clients | Version packages: `order.v1`, `order.v2` |
