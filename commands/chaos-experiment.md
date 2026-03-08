---
description: Design and run a chaos experiment — from hypothesis to tool-specific commands and experiment protocol
---

# Chaos Experiment Command

Guide the user through designing and running a chaos experiment: $ARGUMENTS

## Your Task

Help the user design a structured chaos experiment following the Principles of Chaos Engineering. Walk through each step interactively, generate concrete commands, and produce a ready-to-use experiment protocol document.

## Step 1 — Identify the Target Service

Ask:
1. What service or component will be tested?
2. What are its external dependencies? (databases, APIs, queues, caches)
3. What is the primary user-facing behavior that must be preserved?

## Step 2 — Define the Steady-State Hypothesis

Help the user formulate a specific, measurable hypothesis:

```
Template:
"Under normal conditions, [service] [behavior] with
[SLI metric] ≥/≤ [threshold] and [error rate] < [X%]"

Example:
"Under normal conditions, the checkout service processes payment requests
with p99 latency ≤ 500ms and error rate < 0.1%"
```

The hypothesis MUST be measurable. If they can't measure it, help them set up monitoring first.

## Step 3 — Choose Experiment Type

Present options based on the service's dependencies:

| Fault Type | Best Tool | Simulates |
|------------|-----------|-----------|
| Network latency | Toxiproxy / tc netem | Slow dependencies |
| Network partition | iptables / Toxiproxy | Dependency unreachable |
| Packet loss | tc netem | Degraded network |
| Pod/process kill | kill / kubectl delete | Instance failure |
| CPU pressure | stress-ng | Resource contention |
| Memory pressure | stress-ng | Memory exhaustion |
| Disk full | fallocate | Storage failure |
| Clock skew | timedatectl | Time-dependent bugs |
| Dependency slowdown | Toxiproxy latency | Slow external service |

## Step 4 — Define Blast Radius

Recommend the smallest possible blast radius:
1. **Single instance** — one pod/process
2. **Canary** — 5% of traffic (via load balancer)
3. **Single AZ** — one availability zone
4. **Full service** — only after lower levels succeed

**Abort criteria** — define BEFORE running:
```
Stop if:
- Error rate exceeds [X%] (recommendation: 5x normal)
- Latency p99 exceeds [Yms] (recommendation: 3x normal SLO)
- Any customer-visible impact beyond expected scope
- On-call receives a page
```

## Step 5 — Generate Tool Commands

Generate the exact commands for the chosen fault type and tool.

### Toxiproxy (for service-to-service dependencies)
```bash
# Install
brew install toxiproxy  # macOS
# Start server: toxiproxy-server &

# Create proxy (adjust ports to match your service)
toxiproxy-cli create [service]-proxy -l localhost:[local-port] -u [target-host]:[target-port]

# Inject fault
toxiproxy-cli toxic add [service]-proxy -t latency -a latency=[ms]     # Latency
toxiproxy-cli toxic add [service]-proxy -t bandwidth -a rate=[kbps]    # Bandwidth limit
toxiproxy-cli toxic add [service]-proxy -t timeout -a timeout=[ms]     # Connection timeout
toxiproxy-cli toxic add [service]-proxy -t reset_peer                  # Connection reset

# Remove (restore)
toxiproxy-cli toxic remove [service]-proxy -n latency_1
toxiproxy-cli delete [service]-proxy
```

### Linux tc netem (for host-level network faults)
```bash
# Inject latency
tc qdisc add dev eth0 root netem delay [Xms] [Yms]  # Xms ± Yms jitter

# Packet loss
tc qdisc add dev eth0 root netem loss [X%]

# Restore
tc qdisc del dev eth0 root
```

### Chaos Mesh (Kubernetes)
```bash
# Generate Chaos Mesh manifest based on experiment type
# (Provide ready-to-apply YAML for the chosen fault type)
```

### Manual pod kill (Kubernetes)
```bash
# Kill one pod
kubectl delete pod -l app=[service-name] -n [namespace] --grace-period=0

# Kill one pod every minute (use with caution)
while true; do kubectl delete pod $(kubectl get pods -l app=[service-name] -o name | shuf -n1); sleep 60; done
```

## Step 6 — Generate Experiment Protocol

Output a filled-in experiment protocol document:

```markdown
# Chaos Experiment Protocol

**Date:** [YYYY-MM-DD]
**Operator:** [name]
**Service:** [service name]
**Environment:** [staging/production]

## Hypothesis
[From Step 2]

## Steady-State Baseline
- Metric: [SLI name]
- Current value: [measure before starting]
- Threshold: [value that triggers abort]

## Experiment Details
- Fault type: [from Step 3]
- Blast radius: [from Step 4]
- Duration: [recommended: 10-15 minutes]
- Tool: [from Step 5]

## Abort Criteria
- [ ] Error rate > [X%]
- [ ] Latency p99 > [Yms]
- [ ] Any unexpected alert fires
- [ ] On-call paged

## Commands
### Inject
[exact commands from Step 5]

### Verify injection active
[health check or metric command]

### Restore
[cleanup commands]

## Timeline
| Time | Action | Observed |
|------|--------|----------|
| T+0 | Baseline confirmed | |
| T+5 | Fault injected | |
| T+15 | Observation complete | |
| T+20 | Fault removed | |
| T+25 | Recovery confirmed | |

## Findings
- Hypothesis: [ ] CONFIRMED / [ ] REJECTED
- Observed behavior:
- Unexpected findings:
- Action items:
  - [ ]
  - [ ]
```

## Step 7 — Post-Experiment Actions

After the experiment completes:
1. Verify all faults removed and service is back to steady state
2. File action items as tickets (with priority: CRITICAL/HIGH/MEDIUM)
3. Update runbooks with new failure modes discovered
4. Schedule follow-up experiment after fixes are deployed

## Reference Skills

- `chaos-engineering` — tool reference, experiment types, maturity model
- `resilience-patterns` — implementing circuit breakers, retries, fallbacks
- `observability` — setting up the metrics needed to measure steady state
