---
name: cqrs-event-sourcing
description: "CQRS and Event Sourcing: command/query separation with read model projections, Event Sourcing (append-only event log, aggregate reconstruction, snapshots), Outbox Pattern for atomic DB + event publishing, Saga Pattern (choreography and orchestration with compensating transactions), and temporal queries."
---

# CQRS and Event Sourcing

Advanced patterns for command/query separation and event-based persistence.

## When to Activate

- Separating read and write models for different scaling needs
- Implementing Event Sourcing (events as source of truth)
- Making DB writes and event publishing atomic (Outbox Pattern)
- Coordinating distributed transactions (Saga Pattern)
- Building temporal queries ("what was the state at time X?")
- Designing aggregate reconstruction with snapshots

---

## CQRS — Command Query Responsibility Segregation

```
     WRITE SIDE                          READ SIDE
  ┌──────────────┐                   ┌──────────────────┐
  │   Command    │                   │   Query Handler  │
  │   Handler    │ ──Events──────▶   │   (Read Model)   │
  │   (Aggregate)│                   │   (Optimized for │
  └──────────────┘                   │    queries)      │
       │                             └──────────────────┘
       ▼                                      │
  Event Store                        Projection/DB Table
  (Append-Only)                      (Eventual Consistency)
```

### Command Side

```typescript
// Commands represent intent — always imperative
interface PlaceOrderCommand {
  type: 'PlaceOrder';
  orderId: string;
  customerId: string;
  items: OrderItem[];
}

// Command handler validates + emits events
class OrderCommandHandler {
  constructor(
    private eventStore: EventStore,
    private inventoryService: InventoryService
  ) {}

  async handle(command: PlaceOrderCommand): Promise<void> {
    // 1. Load aggregate from event history
    const order = await this.loadAggregate(command.orderId);

    // 2. Validate business rules
    if (order.status !== 'PENDING') {
      throw new Error(`Order ${command.orderId} cannot be placed — status: ${order.status}`);
    }
    await this.inventoryService.checkAvailability(command.items);

    // 3. Emit events (don't mutate — emit!)
    const event: OrderPlacedEvent = {
      type: 'OrderPlaced',
      aggregateId: command.orderId,
      timestamp: new Date().toISOString(),
      customerId: command.customerId,
      items: command.items,
    };

    await this.eventStore.append(command.orderId, event);
  }

  private async loadAggregate(orderId: string): Promise<Order> {
    const events = await this.eventStore.load(orderId);
    return Order.fromEvents(events);
  }
}
```

### Query Side (Read Model)

```typescript
// Read model is optimized for specific query needs
// NOT the same as the aggregate — may be denormalized

interface OrderSummaryReadModel {
  orderId: string;
  customerName: string;    // Joined from customer service
  itemCount: number;
  totalAmount: number;
  status: string;
  lastUpdated: string;
}

// Projector: subscribes to events and updates read model
class OrderSummaryProjector {
  async on(event: DomainEvent): Promise<void> {
    switch (event.type) {
      case 'OrderPlaced':
        await this.db.orderSummaries.upsert({
          orderId: event.aggregateId,
          itemCount: event.items.length,
          totalAmount: event.items.reduce((sum, i) => sum + i.price * i.qty, 0),
          status: 'PLACED',
          lastUpdated: event.timestamp,
        });
        break;

      case 'OrderShipped':
        await this.db.orderSummaries.update(
          { orderId: event.aggregateId },
          { status: 'SHIPPED', lastUpdated: event.timestamp }
        );
        break;
    }
  }
}

// Query handler — reads from the projected read model
class OrderQueryHandler {
  async getOrderSummary(orderId: string): Promise<OrderSummaryReadModel | null> {
    return this.db.orderSummaries.findOne({ orderId });
  }

  async getCustomerOrders(customerId: string, page: number): Promise<OrderSummaryReadModel[]> {
    return this.db.orderSummaries.findMany({
      where: { customerId },
      orderBy: { lastUpdated: 'desc' },
      take: 20,
      skip: page * 20,
    });
  }
}
```

---

## Event Sourcing

Events are the source of truth. Current state is derived by replaying events.

### Event Store

```typescript
interface DomainEvent {
  type: string;
  aggregateId: string;
  aggregateVersion: number;  // Optimistic concurrency control
  timestamp: string;
  [key: string]: unknown;
}

// PostgreSQL event store implementation
class PostgresEventStore implements EventStore {
  async append(aggregateId: string, event: DomainEvent): Promise<void> {
    await this.db.query(
      `INSERT INTO events (aggregate_id, aggregate_version, event_type, payload, occurred_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [aggregateId, event.aggregateVersion, event.type, JSON.stringify(event), event.timestamp]
    );
    // Unique constraint on (aggregate_id, aggregate_version) prevents concurrent writes
  }

  async load(aggregateId: string, fromVersion = 0): Promise<DomainEvent[]> {
    const rows = await this.db.query(
      `SELECT payload FROM events
       WHERE aggregate_id = $1 AND aggregate_version >= $2
       ORDER BY aggregate_version ASC`,
      [aggregateId, fromVersion]
    );
    return rows.map(r => r.payload);
  }

  // Load events up to a specific point in time
  async loadUntil(aggregateId: string, until: Date): Promise<DomainEvent[]> {
    const rows = await this.db.query(
      `SELECT payload FROM events
       WHERE aggregate_id = $1 AND occurred_at <= $2
       ORDER BY aggregate_version ASC`,
      [aggregateId, until]
    );
    return rows.map(r => r.payload);
  }
}
```

### Aggregate Reconstruction

```typescript
class Order {
  orderId!: string;
  customerId!: string;
  items: OrderItem[] = [];
  status: 'PENDING' | 'PLACED' | 'SHIPPED' | 'CANCELLED' = 'PENDING';
  version = 0;

  // Reconstruct state by applying events
  static fromEvents(events: DomainEvent[]): Order {
    const order = new Order();
    for (const event of events) {
      order.apply(event);
    }
    return order;
  }

  private apply(event: DomainEvent): void {
    switch (event.type) {
      case 'OrderPlaced':
        this.orderId = event.aggregateId;
        this.customerId = (event as OrderPlacedEvent).customerId;
        this.items = (event as OrderPlacedEvent).items;
        this.status = 'PLACED';
        break;
      case 'OrderShipped':
        this.status = 'SHIPPED';
        break;
      case 'OrderCancelled':
        this.status = 'CANCELLED';
        break;
    }
    this.version = event.aggregateVersion;
  }
}
```

### Snapshots (Performance Optimization)

```typescript
interface Snapshot {
  aggregateId: string;
  version: number;
  state: unknown;
  takenAt: string;
}

// Take snapshot every N events
const SNAPSHOT_THRESHOLD = 50;

async function loadAggregateWithSnapshot(
  aggregateId: string,
  store: EventStore,
  snapshotStore: SnapshotStore
): Promise<Order> {
  // 1. Try to load latest snapshot
  const snapshot = await snapshotStore.latest(aggregateId);

  if (snapshot) {
    // 2. Load only events AFTER the snapshot
    const events = await store.load(aggregateId, snapshot.version + 1);
    const order = Order.fromSnapshot(snapshot.state as OrderSnapshot);
    for (const event of events) order.applyEvent(event);
    return order;
  }

  // 3. No snapshot — replay all events
  const events = await store.load(aggregateId);
  const order = Order.fromEvents(events);

  // 4. Save snapshot if threshold exceeded
  if (order.version > 0 && order.version % SNAPSHOT_THRESHOLD === 0) {
    await snapshotStore.save({
      aggregateId,
      version: order.version,
      state: order.toSnapshot(),
      takenAt: new Date().toISOString(),
    });
  }

  return order;
}
```

### Temporal Queries

```typescript
// "What was the order state on March 1st?"
async function getOrderStateAt(orderId: string, at: Date): Promise<Order> {
  const events = await eventStore.loadUntil(orderId, at);
  return Order.fromEvents(events);
}

// Audit log — all state transitions with timestamps
async function getOrderHistory(orderId: string): Promise<AuditEntry[]> {
  const events = await eventStore.load(orderId);
  return events.map(event => ({
    timestamp: event.timestamp,
    eventType: event.type,
    changes: deriveChanges(event),
    version: event.aggregateVersion,
  }));
}
```

---

## Outbox Pattern

Atomically persist to DB and publish to event bus — no 2PC required.

```
  ┌─────────────────────────────────────────┐
  │  Transaction                            │
  │  ┌──────────────┐  ┌─────────────────┐ │
  │  │ Business Data│  │   Outbox Table  │ │
  │  │   (orders)   │  │  (pending msgs) │ │
  │  └──────────────┘  └─────────────────┘ │
  └─────────────────────────────────────────┘
           ↕ Atomic                ↕
      Published = false     Publisher Process reads + publishes
```

```typescript
// Write to both tables in same transaction
async function placeOrder(order: Order, event: OrderPlacedEvent): Promise<void> {
  await db.transaction(async (tx) => {
    // 1. Save business data
    await tx.orders.create({ data: order });

    // 2. Write event to outbox in SAME transaction
    await tx.outbox.create({
      data: {
        id: generateId(),
        aggregateId: order.orderId,
        eventType: event.type,
        payload: JSON.stringify(event),
        createdAt: new Date(),
        published: false,
      },
    });
  });
  // If transaction fails → neither order nor event is saved → consistent
}

// Separate publisher process polls outbox
class OutboxPublisher {
  async publishPending(): Promise<void> {
    const unpublished = await this.db.outbox.findMany({
      where: { published: false },
      orderBy: { createdAt: 'asc' },
      take: 100,
    });

    for (const entry of unpublished) {
      await this.eventBus.publish(entry.eventType, entry.payload);

      await this.db.outbox.update({
        where: { id: entry.id },
        data: { published: true, publishedAt: new Date() },
      });
    }
  }
}

// Advanced: Use Debezium CDC (Change Data Capture) instead of polling
// Debezium reads PostgreSQL WAL → publishes to Kafka
// More efficient, no polling interval delay
```

---

## Saga Pattern

Coordinate long-running distributed transactions with compensating actions.

### Choreography Saga (Events Trigger Reactions)

```
OrderService        InventoryService     PaymentService
     │                     │                   │
     │── OrderPlaced ──────▶│                   │
     │                InventoryReserved ────────▶│
     │                     │               PaymentProcessed
     │◀─────────────────────────────────────────│
  OrderCompleted           │                   │

On failure:
     │                PaymentFailed ────────────│
     │◀─── InventoryReleased (compensation)     │
  OrderFailed              │                   │
```

```typescript
// Each service reacts to events and emits its own events
@EventHandler('InventoryReserved')
async onInventoryReserved(event: InventoryReservedEvent): Promise<void> {
  try {
    await this.paymentService.charge(event.orderId, event.amount);
    await this.eventBus.emit(new PaymentProcessedEvent(event.orderId));
  } catch (err) {
    await this.eventBus.emit(new PaymentFailedEvent(event.orderId, err.message));
  }
}

// Compensation handler
@EventHandler('PaymentFailed')
async onPaymentFailed(event: PaymentFailedEvent): Promise<void> {
  await this.inventoryService.release(event.orderId);
  await this.eventBus.emit(new InventoryReleasedEvent(event.orderId));
}
```

### Orchestration Saga (Central Coordinator)

```typescript
class OrderSaga {
  async execute(orderId: string): Promise<SagaResult> {
    const compensations: (() => Promise<void>)[] = [];

    try {
      // Step 1: Reserve inventory
      await this.inventoryService.reserve(orderId);
      compensations.push(() => this.inventoryService.release(orderId));

      // Step 2: Process payment
      await this.paymentService.charge(orderId);
      compensations.push(() => this.paymentService.refund(orderId));

      // Step 3: Create shipment
      await this.shippingService.createShipment(orderId);
      // No compensation for shipment — notify customer instead

      return { success: true };

    } catch (err) {
      // Execute compensating transactions in reverse order
      for (const compensate of compensations.reverse()) {
        try {
          await compensate();
        } catch (compensationErr) {
          // Log compensation failure — needs manual intervention
          this.logger.error('Compensation failed — manual intervention required', {
            orderId,
            compensationError: compensationErr.message,
            originalError: (err as Error).message,
          });
        }
      }

      return { success: false, error: (err as Error).message };
    }
  }
}
```

### Saga State Persistence

```typescript
// Persist saga state to resume after crashes
interface SagaState {
  sagaId: string;
  orderId: string;
  currentStep: number;
  completedSteps: string[];
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'COMPENSATING';
  startedAt: string;
  failedAt?: string;
  failureReason?: string;
}

async function runPersistentSaga(orderId: string): Promise<void> {
  const sagaId = generateId();

  await sagaStore.save({
    sagaId,
    orderId,
    currentStep: 0,
    completedSteps: [],
    status: 'RUNNING',
    startedAt: new Date().toISOString(),
  });

  const saga = new OrderSaga(sagaId, sagaStore);
  const result = await saga.execute(orderId);

  await sagaStore.update(sagaId, {
    status: result.success ? 'COMPLETED' : 'FAILED',
    failureReason: result.error,
  });
}
```

---

## Reference

- `event-driven-patterns` — Kafka, EventBridge, pub/sub, CloudEvents
- `message-queue-patterns` — SQS, RabbitMQ, basic async messaging
- `api-design` — REST API design patterns (when not using events)
