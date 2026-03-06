---
name: realtime-patterns
description: "Real-time communication patterns: WebSocket with reconnection and presence, Server-Sent Events (SSE) for one-way streaming, long polling fallback, room-based pub/sub, connection state management, and operational concerns for real-time at scale."
origin: ECC
---

# Real-Time Patterns Skill

## When to Activate

- Building live collaboration features (multiple users editing)
- Live notifications, activity feeds, or presence indicators
- Streaming LLM responses to the client
- Real-time dashboards or live metrics
- Chat or messaging features

---

## Technology Selection

| Use case | Technology | Why |
|----------|------------|-----|
| Bidirectional, low latency (chat, collaboration) | WebSocket | Full duplex |
| Server-to-client streaming (LLM output, live feed) | SSE | Simpler, HTTP/2 multiplexed, auto-reconnect |
| Occasional updates (notifications) | SSE | Lighter than WebSocket |
| Fallback for restrictive firewalls | Long Polling | Works everywhere |
| File transfer, video | WebRTC | Peer-to-peer |

**Default:** Start with SSE. Upgrade to WebSocket only when you need client-to-server streaming.

---

## Pattern 1: Server-Sent Events (SSE)

```typescript
// server: Express SSE endpoint
app.get('/api/v1/stream/notifications', authenticate, (req, res) => {
  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');  // Disable nginx buffering
  res.flushHeaders();

  // Helper to send SSE event
  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Subscribe to events for this user
  const unsubscribe = pubsub.subscribe(
    `user:${req.user.id}:notifications`,
    (notification) => send('notification', notification)
  );

  // Heartbeat: keep connection alive through proxies
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');  // SSE comment, ignored by client
  }, 30_000);

  // Cleanup when client disconnects
  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

// LLM streaming with SSE
app.post('/api/v1/chat', authenticate, async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.flushHeaders();

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: req.body.messages,
  });

  for await (const chunk of stream) {
    if (chunk.type === 'content_block_delta') {
      res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
    }
  }

  res.write('data: [DONE]\n\n');
  res.end();
});
```

```typescript
// client: EventSource with reconnection
function useSSE<T>(url: string, onMessage: (data: T) => void) {
  useEffect(() => {
    const source = new EventSource(url, { withCredentials: true });

    source.onopen = () => console.log('SSE connected');
    source.onerror = (e) => {
      // EventSource auto-reconnects with exponential backoff
      console.warn('SSE error, will reconnect', e);
    };

    source.addEventListener('notification', (e) => {
      onMessage(JSON.parse(e.data) as T);
    });

    return () => source.close();
  }, [url]);
}
```

---

## Pattern 2: WebSocket with Rooms

```typescript
// server: Socket.IO with rooms and auth
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';

const io = new Server(httpServer, {
  cors: { origin: process.env.APP_URL, credentials: true },
  adapter: createAdapter(pubClient, subClient),  // Redis for multi-server
});

// Auth middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;
  const user = await verifyToken(token);
  if (!user) return next(new Error('Unauthorized'));
  socket.data.user = user;
  next();
});

io.on('connection', (socket) => {
  const user = socket.data.user;

  // Join user's personal room
  socket.join(`user:${user.id}`);

  // Join document room for collaboration
  socket.on('join:document', async (documentId: string) => {
    const hasAccess = await checkDocumentAccess(user.id, documentId);
    if (!hasAccess) return socket.emit('error', { code: 'FORBIDDEN' });

    socket.join(`document:${documentId}`);

    // Broadcast presence to room
    socket.to(`document:${documentId}`).emit('user:joined', {
      userId: user.id,
      name: user.name,
    });

    // Track presence in Redis
    await redis.sadd(`presence:${documentId}`, user.id);
    await redis.expire(`presence:${documentId}`, 3600);
  });

  socket.on('document:change', async ({ documentId, patch }) => {
    // Validate access before broadcasting
    if (!socket.rooms.has(`document:${documentId}`)) return;

    // Broadcast to others in room (not sender)
    socket.to(`document:${documentId}`).emit('document:change', { patch, userId: user.id });

    // Persist the change
    await applyPatch(documentId, patch);
  });

  socket.on('disconnect', async () => {
    // Clean up presence
    for (const room of socket.rooms) {
      if (room.startsWith('document:')) {
        const documentId = room.replace('document:', '');
        await redis.srem(`presence:${documentId}`, user.id);
        socket.to(room).emit('user:left', { userId: user.id });
      }
    }
  });
});

// Send to specific user from anywhere in the codebase
function notifyUser(userId: string, event: string, data: unknown) {
  io.to(`user:${userId}`).emit(event, data);
}
```

```typescript
// client: with reconnection and typed events
import { io, Socket } from 'socket.io-client';

function createSocket(token: string): Socket {
  return io(process.env.NEXT_PUBLIC_WS_URL!, {
    auth: { token },
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
}

// React hook
function useSocket() {
  const { data: session } = useSession();
  const [connected, setConnected] = useState(false);

  const socket = useMemo(() => {
    if (!session?.token) return null;
    return createSocket(session.token);
  }, [session?.token]);

  useEffect(() => {
    if (!socket) return;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', (err) => console.error('WS error', err));
    return () => { socket.disconnect(); };
  }, [socket]);

  return { socket, connected };
}
```

---

## Connection State & Offline Handling

```typescript
// Optimistic offline queue
const pendingQueue: PendingMessage[] = [];

function sendOrQueue(socket: Socket, event: string, data: unknown) {
  if (socket.connected) {
    socket.emit(event, data);
  } else {
    pendingQueue.push({ event, data, timestamp: Date.now() });
  }
}

socket.on('connect', () => {
  // Flush queue on reconnect
  while (pendingQueue.length > 0) {
    const msg = pendingQueue.shift()!;
    socket.emit(msg.event, msg.data);
  }
});
```

---

## Redis Pub/Sub for Multi-Server Broadcasting

```typescript
// When running multiple server instances, use Redis to broadcast across them
import { createClient } from 'redis';

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();

await Promise.all([pubClient.connect(), subClient.connect()]);

// Publish from any service (e.g., after DB write)
async function broadcastToUser(userId: string, event: string, data: unknown) {
  await pubClient.publish(
    'ws:events',
    JSON.stringify({ room: `user:${userId}`, event, data })
  );
}

// Each WebSocket server subscribes and forwards to local connections
subClient.subscribe('ws:events', (message) => {
  const { room, event, data } = JSON.parse(message);
  io.to(room).emit(event, data);
});
```

---

## Checklist

- [ ] Auth verified before any WebSocket connection or SSE stream
- [ ] Authorization re-checked on each room join, not just at connection
- [ ] Heartbeat / ping-pong implemented (prevents proxy timeouts)
- [ ] Client handles disconnect and auto-reconnects with backoff
- [ ] Redis adapter used when running multiple server instances
- [ ] Presence cleaned up on disconnect (including crash/network failure)
- [ ] Rate limiting on message send events (prevent spam)
- [ ] Max connections per user enforced (prevent resource exhaustion)
- [ ] `X-Accel-Buffering: no` set for SSE behind nginx
