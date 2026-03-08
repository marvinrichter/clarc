# Skill: WebRTC Patterns

## When to Activate

- Building real-time audio/video calls (1:1 or group)
- Implementing screen sharing
- Building a live streaming feature with low latency (<500ms)
- Choosing between P2P, SFU (LiveKit, Mediasoup), or MCU architectures
- Deploying TURN servers for NAT traversal
- Designing WebRTC signaling with WebSocket
- Debugging ICE connection failures or poor video quality

---

## WebRTC Core Concepts

WebRTC is a browser/native API for peer-to-peer real-time audio, video, and data. Three core APIs:

| API | Purpose |
|-----|---------|
| `RTCPeerConnection` | Manages the peer connection — media, codec negotiation, ICE |
| `RTCDataChannel` | Arbitrary binary/text data between peers (without a server) |
| `MediaStream` | Audio/video track container from camera, microphone, or screen |

**What WebRTC does NOT define:** signaling. The mechanism to exchange offer/answer/ICE is left to the application — typically WebSocket.

---

## ICE, STUN, and TURN

```
Browser A ─────── STUN Server ──── discovers public IP
    │
    │  ICE Candidates exchanged via Signaling (WebSocket)
    │
Browser B ─────── STUN Server ──── discovers public IP
    │
    └──────── Direct P2P connection (if NAT allows) ────────┘
                        OR
    └──── TURN Server (relay) ── if P2P impossible (symmetric NAT) ──┘
```

- **STUN** (Session Traversal Utilities for NAT): Browser asks "what's my public IP:port?" — free to run, minimal bandwidth
- **TURN** (Traversal Using Relays around NAT): Full media relay through server — required for ~15-20% of connections behind corporate/symmetric NAT
- **ICE** (Interactive Connectivity Establishment): Tries all possible connection paths (host, srflx, relay) and selects the best one

---

## Offer/Answer Flow (Signaling)

```javascript
// ──── CALLER (Browser A) ────────────────────────────────────────────────────
const pc = new RTCPeerConnection({ iceServers: [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'turn:turn.myapp.com:3478', username: 'user', credential: 'pass' },
]});

// Add local media tracks
const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
stream.getTracks().forEach(track => pc.addTrack(track, stream));

// Create Offer
const offer = await pc.createOffer();
await pc.setLocalDescription(offer);

// Send offer via signaling channel
signalingSocket.emit('offer', { to: remoteUserId, sdp: offer });

// Trickle ICE: send candidates as they arrive (don't wait for all)
pc.onicecandidate = ({ candidate }) => {
  if (candidate) signalingSocket.emit('ice-candidate', { to: remoteUserId, candidate });
};

// Receive Answer
signalingSocket.on('answer', async ({ sdp }) => {
  await pc.setRemoteDescription(new RTCSessionDescription(sdp));
});

// Receive remote ICE candidates
signalingSocket.on('ice-candidate', async ({ candidate }) => {
  await pc.addIceCandidate(new RTCIceCandidate(candidate));
});

// Receive remote stream
pc.ontrack = ({ streams }) => {
  remoteVideoElement.srcObject = streams[0];
};

// ──── CALLEE (Browser B) ────────────────────────────────────────────────────
signalingSocket.on('offer', async ({ from, sdp }) => {
  await pc.setRemoteDescription(new RTCSessionDescription(sdp));

  const localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  signalingSocket.emit('answer', { to: from, sdp: answer });
});
```

---

## Media Server Architectures

### P2P Mesh (no server)
- Every participant connects to every other: N*(N-1)/2 connections
- Scales to ~4-6 participants before bandwidth and CPU collapse
- Best for: 1:1 calls, small groups with good network

### SFU — Selective Forwarding Unit (recommended for group calls)
- Each participant sends one upstream to the SFU; receives N-1 downstreams from it
- Server does NOT decode/re-encode (just forwards) → low server CPU
- Scales to 50-200 active speakers in one room with simulcast
- Best for: group video calls, webinars, live streaming

### MCU — Multipoint Control Unit (rarely used)
- Server decodes all streams, mixes them into one composite, re-encodes and sends it
- Client bandwidth: only one stream regardless of participants
- Tradeoff: very high server CPU + cost, encoding delay, lower quality
- Best for: SIP gateway, legacy systems, very limited client bandwidth

---

## LiveKit (Modern SFU — Recommended)

[LiveKit](https://livekit.io) is an open-source SFU written in Go. Production-ready, batteries-included.

### Architecture

```
                     ┌─────────────────┐
Client App  ───────► │  LiveKit Server │ ◄────── Access Token (JWT)
(Web/iOS/Android)    │   (SFU in Go)   │
                     └────────┬────────┘
                              │ Egress API
                         ┌────▼────┐
                         │   S3    │ (recording)
                         └─────────┘
```

### Server Setup

```bash
# Docker (development)
docker run -d \
  -p 7880:7880 \     # HTTP/gRPC
  -p 7881:7881 \     # TLS
  -p 7882:7882/udp \ # RTC/UDP
  -e LIVEKIT_KEYS="devkey: devsecret" \
  livekit/livekit-server:latest

# Kubernetes (production)
helm repo add livekit https://helm.livekit.io
helm install livekit livekit/livekit-server \
  --set livekit.keys.mykey=mysecret \
  --set livekit.turn.enabled=true
```

### Access Tokens (Server-Side)

```typescript
// Generate JWT token — never share LiveKit API key with clients
import { AccessToken } from 'livekit-server-sdk';

async function createRoomToken(
  roomName: string,
  participantIdentity: string,
  participantName: string,
): Promise<string> {
  const token = new AccessToken(
    process.env.LIVEKIT_API_KEY!,
    process.env.LIVEKIT_API_SECRET!,
    {
      identity: participantIdentity,
      name: participantName,
      ttl: '2h', // token expires in 2 hours
    },
  );

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return token.toJwt();
}

// REST endpoint: GET /api/rooms/:roomId/token
app.get('/api/rooms/:roomId/token', authenticate, async (req, res) => {
  const token = await createRoomToken(
    req.params.roomId,
    req.user.id,
    req.user.displayName,
  );
  res.json({ data: { token, serverUrl: process.env.LIVEKIT_URL } });
});
```

### Client Integration (Web)

```typescript
import { Room, RoomEvent, RemoteParticipant, Track } from 'livekit-client';

async function joinRoom(serverUrl: string, token: string) {
  const room = new Room({
    adaptiveStream: true,  // adjust quality to bandwidth
    dynacast: true,        // only send simulcast layers that are subscribed
    videoCaptureDefaults: {
      resolution: VideoPresets.h720.resolution,
    },
  });

  // Event handlers
  room
    .on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      if (track.kind === Track.Kind.Video) {
        const videoElement = document.getElementById(`video-${participant.identity}`);
        track.attach(videoElement as HTMLVideoElement);
      }
    })
    .on(RoomEvent.ParticipantConnected, (participant: RemoteParticipant) => {
      console.log('Participant joined:', participant.identity);
    })
    .on(RoomEvent.Disconnected, (reason) => {
      console.log('Disconnected from room:', reason);
      // Implement reconnection logic
    });

  // Connect to room
  await room.connect(serverUrl, token);

  // Publish local camera + microphone
  await room.localParticipant.enableCameraAndMicrophone();

  return room;
}

// Clean up
function leaveRoom(room: Room) {
  room.disconnect();
}
```

### LiveKit iOS/Android SDKs

```swift
// iOS (Swift)
import LiveKit

let room = Room()
let url = "wss://my-livekit-server.com"
let token = await fetchTokenFromAPI()
try await room.connect(url, token)
try await room.localParticipant.setCamera(enabled: true)
try await room.localParticipant.setMicrophone(enabled: true)
```

```kotlin
// Android (Kotlin)
val room = Room(context)
room.connect("wss://my-livekit-server.com", token) { result ->
    result.onSuccess {
        room.localParticipant.setMicrophoneEnabled(true)
        room.localParticipant.setCameraEnabled(true)
    }
}
```

---

## Mediasoup (Low-Level SFU)

[Mediasoup](https://mediasoup.org) is a Node.js SFU that gives you full control but requires building your own signaling protocol. Choose Mediasoup over LiveKit when:
- You need complete control over the media pipeline
- You want to process/inspect media server-side (recording at RTP level)
- You need ORTC compatibility

```javascript
// Mediasoup server — simplified
const mediasoup = require('mediasoup');

const worker = await mediasoup.createWorker({ logLevel: 'warn' });
const router = await worker.createRouter({
  mediaCodecs: [
    { kind: 'audio', mimeType: 'audio/opus', clockRate: 48000, channels: 2 },
    { kind: 'video', mimeType: 'video/VP8', clockRate: 90000 },
    { kind: 'video', mimeType: 'video/H264', clockRate: 90000,
      parameters: { 'packetization-mode': 1, 'profile-level-id': '42e01f' } },
  ],
});

// Create WebRTC transport for each participant
const transport = await router.createWebRtcTransport({
  listenIps: [{ ip: '0.0.0.0', announcedIp: process.env.ANNOUNCED_IP }],
  enableUdp: true,
  enableTcp: true,
  preferUdp: true,
});

// Producer (sending peer) connects and produces
const producer = await transport.produce({ kind: 'video', rtpParameters });

// Consumer (receiving peer) connects and consumes
const consumer = await transport.consume({
  producerId: producer.id,
  rtpCapabilities: peerRtpCapabilities,
});
```

---

## Simulcast

Simulcast allows a sender to transmit multiple quality layers (e.g., 1080p + 540p + 270p) simultaneously. The SFU forwards only the layer appropriate for each receiver's bandwidth.

```javascript
// Publish with simulcast (Web)
const videoTrack = await navigator.mediaDevices.getUserMedia({ video: true });
pc.addTransceiver(videoTrack, {
  sendEncodings: [
    { rid: 'high', maxBitrate: 1_200_000, scaleResolutionDownBy: 1 },
    { rid: 'medium', maxBitrate: 400_000, scaleResolutionDownBy: 2 },
    { rid: 'low', maxBitrate: 100_000, scaleResolutionDownBy: 4 },
  ],
});

// LiveKit enables simulcast automatically:
room.localParticipant.publishVideoTrack(track, {
  simulcast: true,
  videoSimulcastLayers: [VideoPresets.h1080, VideoPresets.h540, VideoPresets.h216],
});
```

---

## TURN Server Deployment (Coturn)

TURN is required for ~15-20% of users behind corporate firewalls or symmetric NAT. Without it, those calls fail.

```bash
# Install Coturn (Ubuntu)
apt-get install coturn

# /etc/turnserver.conf
listening-port=3478
tls-listening-port=5349
listening-ip=0.0.0.0
relay-ip=YOUR_PUBLIC_IP
external-ip=YOUR_PUBLIC_IP
realm=turn.myapp.com
server-name=turn.myapp.com
lt-cred-mech
user=username:password
# For time-limited credentials (HMAC):
use-auth-secret
static-auth-secret=your-secret-key
# TLS
cert=/etc/letsencrypt/live/turn.myapp.com/fullchain.pem
pkey=/etc/letsencrypt/live/turn.myapp.com/privkey.pem
```

**Time-limited TURN credentials (more secure — no static password):**

```typescript
// Generate TURN credentials server-side, valid for 1 hour
function generateTurnCredentials(userId: string): { username: string; credential: string } {
  const timestamp = Math.floor(Date.now() / 1000) + 3600; // expires in 1h
  const username = `${timestamp}:${userId}`;
  const credential = createHmac('sha1', process.env.TURN_SECRET!)
    .update(username)
    .digest('base64');
  return { username, credential };
}

// Include in ICE servers config
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: ['turn:turn.myapp.com:3478', 'turns:turn.myapp.com:5349'],
    ...generateTurnCredentials(userId),
  },
];
```

**Alternatives to self-hosted TURN:**
- Twilio Network Traversal Service (pay-per-use)
- Cloudflare Calls (includes TURN)
- Xirsys TURN-as-a-service

---

## Recording with LiveKit Egress

```typescript
import { EgressClient, EncodedFileOutput, RoomCompositeEgressRequest } from 'livekit-server-sdk';

const egress = new EgressClient(process.env.LIVEKIT_URL!, process.env.LIVEKIT_API_KEY!, process.env.LIVEKIT_API_SECRET!);

// Record entire room to S3
const egressInfo = await egress.startRoomCompositeEgress(roomName, {
  file: new EncodedFileOutput({
    filepath: `recordings/${roomName}-${Date.now()}.mp4`,
    output: {
      case: 's3',
      value: {
        accessKey: process.env.AWS_ACCESS_KEY_ID!,
        secret: process.env.AWS_SECRET_ACCESS_KEY!,
        bucket: 'my-recordings-bucket',
        region: 'us-east-1',
      },
    },
  }),
});

// Stop recording
await egress.stopEgress(egressInfo.egressId);
```

---

## Testing WebRTC

```bash
# Chrome flags for fake media (useful in Playwright/Puppeteer E2E tests)
chromium --use-fake-ui-for-media-stream \
         --use-fake-device-for-media-stream \
         --allow-file-access-from-files

# LiveKit load test
livekit-cli load-test \
  --url wss://my-server.com \
  --api-key devkey --api-secret devsecret \
  --room load-test-room \
  --publishers 10 \
  --subscribers 50 \
  --duration 60s
```

**Playwright WebRTC test:**
```typescript
// playwright.config.ts — grant camera/mic permissions
use: {
  permissions: ['camera', 'microphone'],
  launchOptions: {
    args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
  },
},
```

---

## Security Checklist

```
- [ ] Access tokens are short-lived (max 2-4 hours) and participant-scoped
- [ ] TURN credentials use HMAC time-limited method (not static passwords)
- [ ] Room creation is server-side only (clients cannot create arbitrary rooms)
- [ ] Recording requires explicit participant consent (GDPR)
- [ ] Room permissions enforced server-side (canPublish, canSubscribe per role)
- [ ] TURN server uses TLS (turns://) not plaintext (turn://) in production
- [ ] LiveKit API key/secret is server-side only — never in client bundle
```

---

## Reference

- Skill: `realtime-patterns` — WebSockets, SSE, when to choose WebRTC vs WebSocket
- Command: `webrtc-review` — architectural review checklist for WebRTC systems
- [LiveKit documentation](https://docs.livekit.io)
- [Mediasoup documentation](https://mediasoup.org/documentation/)
- [Coturn wiki](https://github.com/coturn/coturn/wiki)
