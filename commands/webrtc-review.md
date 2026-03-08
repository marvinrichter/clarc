---
description: WebRTC architecture review — P2P vs SFU vs MCU decision, TURN configuration, signaling robustness, simulcast, access token security, recording consent, and error handling.
---

# WebRTC Architecture Review

Perform a systematic review of a WebRTC implementation. Adapt depth based on `$ARGUMENTS` — default to full review if no specific focus is given.

## Step 1 — Architecture Assessment

Determine which architecture is in use and whether it's appropriate:

| Architecture | Max Participants | Server Cost | Use Case |
|---|---|---|---|
| P2P Mesh | 4-6 | Zero | 1:1 or small group |
| SFU (LiveKit, Mediasoup) | 50-200 active speakers | Medium | Group calls, webinars |
| MCU | Unlimited (server-bound) | High | Legacy PSTN bridge, very constrained clients |

**Review questions:**
- Is P2P used for more than 6 participants? → Recommend SFU migration
- Is MCU used where SFU would suffice? → MCU has 3-5x higher server cost and adds 200-400ms latency from re-encoding
- Are group calls growing past SFU limits? → Consider multiple rooms with LiveKit or Cloudflare Calls

```bash
# Find architecture signals in code
grep -rn "RTCPeerConnection\|livekit\|mediasoup\|janus" --include="*.ts" --include="*.js" src/
grep -rn "createOffer\|createAnswer" --include="*.ts" src/
```

## Step 2 — TURN Configuration

TURN servers are essential — without them, ~15-20% of calls fail behind corporate/symmetric NAT.

**Check:**
- [ ] TURN server configured? (`urls: 'turn:...'` in `iceServers`)
- [ ] TURN over TLS configured? (`turns://` on port 5349 — needed for firewalls blocking UDP/3478)
- [ ] Credentials are time-limited? (HMAC method, not static username:password in code)
- [ ] TURN credentials generated server-side? (Never expose TURN secret in client bundle)
- [ ] Fallback to TURN if ICE fails? (`iceTransportPolicy: 'relay'` option tested?)

```bash
# Find ICE server configuration
grep -rn "iceServers\|stunUrls\|turnUrls\|RTCConfiguration" --include="*.ts" --include="*.js" src/
```

**Red flags:**
```javascript
// WRONG: static TURN credentials in client code
const config = { iceServers: [{ urls: 'turn:turn.example.com', username: 'user', credential: 'hardcoded' }] };

// CORRECT: credentials fetched from API (time-limited HMAC)
const { iceServers } = await fetch('/api/webrtc/ice-servers').then(r => r.json());
```

## Step 3 — Signaling Robustness

WebRTC requires a signaling channel to exchange SDP offer/answer and ICE candidates. The signaling channel itself must be resilient.

**Check:**
- [ ] WebSocket reconnection logic implemented? (signaling disconnect = call failure)
- [ ] Pending ICE candidates buffered when `remoteDescription` not yet set?
- [ ] `iceConnectionState` changes monitored? (`failed`, `disconnected`, `closed`)
- [ ] ICE restart implemented on `failed` state? (`pc.restartIce()` + new offer)
- [ ] Offer/answer race condition handled? (both peers call `createOffer` simultaneously — requires glare resolution)

```bash
grep -rn "iceConnectionState\|iceGatheringState\|signalingState\|restartIce" --include="*.ts" src/
```

## Step 4 — Simulcast Configuration

Simulcast dramatically improves quality for participants on poor connections.

**Check:**
- [ ] Simulcast enabled for video publishing?
- [ ] At least 3 layers configured (high/medium/low)?
- [ ] SFU configured to forward appropriate layer per subscriber?
- [ ] Bandwidth estimation / adaptive bitrate enabled?

```bash
grep -rn "simulcast\|sendEncodings\|scaleResolutionDownBy\|rid:" --include="*.ts" src/
```

## Step 5 — Access Token Security

**Check:**
- [ ] Tokens are short-lived (max 2-4 hours)?
- [ ] Each token is participant-scoped (one token per user per room)?
- [ ] Room creation is server-side only (clients cannot create arbitrary rooms)?
- [ ] `canPublish` / `canSubscribe` permissions match the user's role (viewer vs presenter)?
- [ ] LiveKit/Mediasoup API key and secret are server-side only (not in `NEXT_PUBLIC_*` or client bundle)?
- [ ] Tokens are not reused across sessions?

```bash
# Check for API key/secret exposure
grep -rn "LIVEKIT_API_KEY\|MEDIASOUP_SECRET\|TURN_SECRET" --include="*.env*" .
grep -rn "NEXT_PUBLIC.*SECRET\|NEXT_PUBLIC.*KEY" --include="*.ts" src/  # Should find nothing
```

## Step 6 — Recording and Data Privacy

**Check:**
- [ ] Recording requires explicit participant consent (UI shows recording indicator)?
- [ ] Recording consent is stored and auditable (GDPR Article 7)?
- [ ] Recorded files encrypted at rest (S3 SSE-S3 or SSE-KMS)?
- [ ] Recording retention policy defined (GDPR Article 5: not stored longer than necessary)?
- [ ] Participants can request deletion of their recordings (GDPR Article 17)?

## Step 7 — Error Handling and Resilience

**Check:**
- [ ] ICE `failed` → retry with ICE restart or show user-facing error?
- [ ] TURN authentication failure → clear error message (not silent failure)?
- [ ] Media device not found → graceful fallback (audio-only or error screen)?
- [ ] Browser not supported → polite message with supported browser list?
- [ ] Network change (WiFi → cellular) → handled? (`onnegotiationneeded` triggered)?
- [ ] Maximum room capacity → enforced server-side with clear user message?

```bash
grep -rn "onerror\|oniceconnectionstatechange\|failed\|catch\|iceConnectionState" --include="*.ts" src/
```

## Step 8 — Performance Diagnostics

```bash
# Chrome WebRTC internals (open in browser during a call)
# chrome://webrtc-internals

# LiveKit load test
livekit-cli load-test --url wss://server.com --api-key KEY --api-secret SECRET \
  --room test-room --publishers 10 --subscribers 100 --duration 60s

# Check TURN server reachability
turnutils_uclient -u username -w password turn.myapp.com
```

## Output Format

```text
[CRITICAL] Issue title
Impact: Why this breaks calls or violates security/privacy
Fix: Concrete code or config change

[HIGH] Issue title
Impact: ...
Fix: ...

[MEDIUM] Issue title
Impact: ...
Fix: ...
```

## Reference Skills

- `webrtc-patterns` — ICE/STUN/TURN, LiveKit, Mediasoup, Simulcast, TURN deployment
- `realtime-patterns` — when to use WebRTC vs WebSocket vs SSE
- `security-review` — general security checklist
- `gdpr-privacy` — GDPR consent and data retention
