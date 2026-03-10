---
name: chaos-engineering
description: "Chaos Engineering for production resilience: steady-state hypothesis design, fault injection tools (Chaos Monkey, Litmus, Gremlin, Toxiproxy, tc netem), GameDay format, and maturity model from manual to continuous chaos."
---

# Chaos Engineering Skill

Load tests tell you if your service handles traffic. Chaos Engineering tells you if it survives reality — network partitions, disk failures, dependency outages, and clock skew.

## When to Activate

- Designing a chaos experiment for a service
- Running a GameDay or resilience review
- Validating that circuit breakers, retries, and fallbacks actually work
- Moving from "we think we're resilient" to "we have evidence"
- Setting up continuous chaos in CI/CD
- Verifying that a new dependency (external API, database, message queue) has correct timeout and fallback handling before go-live
- Preparing a team for an on-call rotation by building evidence that the service degrades gracefully under realistic failure scenarios
- Simulating a database latency spike with Toxiproxy to confirm connection pool exhaustion behavior and alert thresholds

---

## Core Philosophy

**Steady-State Hypothesis first.** Before injecting chaos, define what "normal" looks like:

```
Hypothesis: Under normal conditions, the checkout service processes
≥99% of requests in <500ms and the error rate is <0.1%.
```

Chaos engineering is NOT about breaking things randomly. It's about:
1. Defining expected behavior (steady state)
2. Hypothesizing that behavior holds under adverse conditions
3. Injecting a controlled fault
4. Observing whether the hypothesis holds
5. Learning and fixing when it doesn't

---

## Blast Radius Minimization

**Always start small:**

| Scope | Example | When |
|-------|---------|------|
| Single instance | One pod, one container | First experiment |
| Canary traffic | 5% of requests | After single instance success |
| Single AZ | One availability zone | Proven patterns |
| Full service | All instances | Only with proven fallback |
| Multi-service | Cascading failure | Advanced teams only |

**Abort criteria:** Define rollback triggers before starting. If error rate exceeds X% or latency exceeds Yms — stop and restore.

---

## Experiment Types

### Network Faults
Simulate the most common production failure: network degradation.

```bash
# Linux — tc netem (no external tool needed)
# Add 100ms latency to all outbound traffic from eth0
tc qdisc add dev eth0 root netem delay 100ms

# Add 100ms latency with 30ms jitter (more realistic)
tc qdisc add dev eth0 root netem delay 100ms 30ms

# Simulate 10% packet loss
tc qdisc add dev eth0 root netem loss 10%

# Remove (cleanup)
tc qdisc del dev eth0 root
```

```bash
# macOS — comcast (wraps pfctl)
brew install comcast
comcast --device=en0 --latency=100 --target-bw=1000
comcast --device=en0 --stop
```

### Toxiproxy — Network Simulation Proxy (recommended for services)

```bash
# Install
brew install toxiproxy
# or: docker run -d -p 8474:8474 -p 5432:5432 ghcr.io/shopify/toxiproxy

# Create a proxy for your database
toxiproxy-cli create postgres_proxy -l localhost:25432 -u your-db-host:5432

# Add latency toxic
toxiproxy-cli toxic add postgres_proxy -t latency -a latency=500

# Add connection limiter (simulate connection pool exhaustion)
toxiproxy-cli toxic add postgres_proxy -t limit_data -a bytes=0

# Simulate connection reset
toxiproxy-cli toxic add postgres_proxy -t reset_peer

# Remove toxic (restore)
toxiproxy-cli toxic remove postgres_proxy -n latency_1
```

### CPU / Memory Pressure

```bash
# CPU stress (Linux/macOS) — stress-ng
stress-ng --cpu 4 --timeout 60s

# Memory pressure
stress-ng --vm 2 --vm-bytes 512M --timeout 60s

# Go: simulate CPU spike in test
go test -bench=. -benchtime=30s -cpuprofile=cpu.out
```

### Pod Killing (Kubernetes)

```bash
# Manual: kill random pods in a deployment
kubectl delete pod -l app=my-service --grace-period=0 -n production

# Chaos Mesh: declarative pod failure
cat <<EOF | kubectl apply -f -
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-failure-example
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces: [production]
    labelSelectors:
      app: my-service
  scheduler:
    cron: "@every 5m"
EOF
```

---

## Tools

### Toxiproxy (Network Simulation — Development/Staging)
- Best for: service-to-service network faults in dev/staging
- Supports: latency, bandwidth, packet loss, connection timeouts, connection resets
- Language-agnostic: configure via CLI or REST API

### Chaos Mesh (Kubernetes)
- Best for: Kubernetes-native chaos (pod kill, network chaos, IO chaos, time skew)
- Install: `helm install chaos-mesh chaos-mesh/chaos-mesh -n chaos-testing`
- Features: CRD-based, fine-grained selectors, schedules, workflows

### Litmus (Kubernetes — CNCF project)
- Best for: CNCF-aligned teams, chaos workflows with validation
- Hub of pre-built experiments: `https://hub.litmuschaos.io`

### Gremlin (SaaS — Enterprise)
- Best for: production chaos with fine-grained controls and rollback
- Requires agent installation, has free tier
- Supports: CPU, memory, disk, network, shutdown, time travel, certificates

### AWS Fault Injection Simulator (AWS)
- Native to AWS, supports EC2, ECS, EKS, RDS, Lambda
- IAM-based access control, built-in safety guardrails

---

## GameDay Format

### Before (1 week prior)
1. **Define scope**: Which service, which failure mode
2. **Write hypothesis**: Specific, measurable steady-state
3. **Set abort criteria**: Error rate threshold, latency threshold, blast radius limit
4. **Prepare monitoring**: Dashboards open, alerts set
5. **Notify stakeholders**: On-call, service owners

### During
```markdown
# Chaos Experiment Protocol — [Date]

## Service: [name]
## Hypothesis: [specific statement]
## Steady State: [measurable: p99 <Xms, error rate <Y%]

## Fault to Inject
- Type: [network latency / pod kill / CPU pressure]
- Scope: [single instance / canary 5%]
- Duration: [10 minutes]
- Tool: [Toxiproxy / Chaos Mesh / manual tc]

## Abort Criteria
- Error rate exceeds [X%]
- Latency p99 exceeds [Yms]
- On-call pages triggered

## Timeline
[HH:MM] Baseline confirmed
[HH:MM] Fault injected
[HH:MM] Observation period
[HH:MM] Fault removed
[HH:MM] Recovery confirmed

## Findings
- Hypothesis: [CONFIRMED / REJECTED]
- Observed behavior: [...]
- Action items: [...]
```

### After
- Write up findings in 48h
- File action items as tickets
- Update runbooks if new failure modes discovered
- Schedule follow-up experiment after fixes

---

## Maturity Model

| Level | Characteristics |
|-------|----------------|
| **0 — Unprepared** | No chaos testing. "It'll be fine." |
| **1 — Manual** | Occasional GameDays, no tooling, learning phase |
| **2 — Structured** | Regular GameDays, hypothesis-driven, tooling (Toxiproxy/Litmus) |
| **3 — Automated** | Chaos in staging CI, experiments in pre-prod before every release |
| **4 — Continuous** | Chaos in production, automated rollback, SLO-gated experiments |

Start at Level 1. Most teams benefit most from Level 2–3.

---

## First Experiment Checklist

- [ ] Service has health endpoint and SLI dashboards
- [ ] On-call aware and available during experiment
- [ ] Abort criteria defined before starting
- [ ] Experiment in staging, not production (first time)
- [ ] Fault injection tool tested in isolation first
- [ ] Recovery procedure documented
- [ ] Post-experiment retrospective scheduled

---

## Reference

- Principles of Chaos Engineering: `https://principlesofchaos.org`
- Chaos Mesh: `https://chaos-mesh.org`
- Litmus Hub: `https://hub.litmuschaos.io`
- Gremlin: `https://www.gremlin.com`
- Toxiproxy: `https://github.com/Shopify/toxiproxy`
