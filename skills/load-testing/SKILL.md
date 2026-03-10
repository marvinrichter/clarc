---
name: load-testing
description: "Load and performance testing with k6 (TypeScript/Go/any HTTP) and Locust (Python). Covers test types (smoke, load, stress, spike, soak), SLO thresholds, CI integration, and interpreting results."
---

# Load Testing Skill

Does your service hold up under real traffic? Unit tests say nothing about performance. Load tests validate SLOs before you find out in production.

## When to Activate

- Before launching a new service or feature to production
- After major performance-sensitive changes (new query, new algorithm)
- Setting up performance regression tests in CI
- Diagnosing a production performance issue
- Validating database indexes under realistic load
- Establishing SLO thresholds (p95, p99 latency, error rate) as enforceable k6 test gates
- Running soak tests to detect memory leaks or gradual performance degradation over hours of sustained traffic

---

## Test Types

| Type | Load | Duration | Goal |
|------|------|----------|------|
| Smoke | 1-2 VUs | 1 min | Does it work at all? |
| Load | Expected production load | 10-30 min | Does it meet SLOs? |
| Stress | 2-5x expected load | 20 min | At what point does it break? |
| Spike | 0 → 10x in 30s | 5 min | What happens on sudden traffic? |
| Soak | Normal load | 4-24 hours | Memory leaks? Degradation over time? |

---

## k6 (recommended — JavaScript, any backend)

### Installation

```bash
brew install k6  # macOS
# or: docker run -i grafana/k6 run - < script.js
```

### Basic Load Test

```javascript
// tests/load/checkout.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const checkoutDuration = new Trend('checkout_duration');

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Hold at 50
    { duration: '2m', target: 100 },  // Ramp up to 100
    { duration: '5m', target: 100 },  // Hold at 100
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],  // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],    // Error rate < 1%
    errors: ['rate<0.01'],
  },
};

export default function () {
  const base = __ENV.BASE_URL || 'http://localhost:3000';

  // Login
  const loginRes = http.post(`${base}/api/v1/auth/login`, JSON.stringify({
    email: 'test@example.com',
    password: 'password',
  }), { headers: { 'Content-Type': 'application/json' } });

  check(loginRes, { 'login 200': (r) => r.status === 200 });
  errorRate.add(loginRes.status !== 200);

  const token = loginRes.json('data.access_token');

  // Checkout
  const start = Date.now();
  const checkoutRes = http.post(`${base}/api/v1/orders`, JSON.stringify({
    items: [{ productId: 'prod-123', quantity: 1 }],
  }), { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });

  checkoutDuration.add(Date.now() - start);
  check(checkoutRes, { 'checkout 201': (r) => r.status === 201 });
  errorRate.add(checkoutRes.status !== 201);

  sleep(1);
}
```

### Running

```bash
# Basic run
k6 run tests/load/checkout.js

# Against staging
BASE_URL=https://staging.myapp.com k6 run tests/load/checkout.js

# With output to InfluxDB/Grafana
k6 run --out influxdb=http://localhost:8086/k6 tests/load/checkout.js
```

### Smoke Test Variant

```javascript
export const options = {
  vus: 1, duration: '30s',
  thresholds: { http_req_failed: ['rate<0.01'] },
};
```

### Stress Test Variant

```javascript
export const options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 200 },
    { duration: '2m', target: 400 },  // 4x expected — find breaking point
    { duration: '5m', target: 400 },
    { duration: '5m', target: 0 },
  ],
};
```

---

## Locust (Python services)

```python
# tests/load/locustfile.py
from locust import HttpUser, task, between

class CheckoutUser(HttpUser):
    wait_time = between(1, 3)
    token = None

    def on_start(self):
        res = self.client.post('/api/v1/auth/login', json={
            'email': 'test@example.com', 'password': 'password'
        })
        self.token = res.json()['data']['access_token']

    @task(3)
    def list_products(self):
        self.client.get('/api/v1/products', headers={'Authorization': f'Bearer {self.token}'})

    @task(1)
    def checkout(self):
        self.client.post('/api/v1/orders',
            json={'items': [{'productId': 'prod-123', 'quantity': 1}]},
            headers={'Authorization': f'Bearer {self.token}'}
        )
```

```bash
locust -f tests/load/locustfile.py --headless \
  -u 100 -r 10 --run-time 5m \
  --host https://staging.myapp.com
```

---

## CI Integration (k6 in GitHub Actions)

```yaml
  load-test:
    name: Load Test (Smoke)
    runs-on: ubuntu-latest
    needs: deploy-staging
    steps:
      - uses: actions/checkout@v4
      - uses: grafana/setup-k6-action@v1
      - run: |
          k6 run tests/load/checkout.js \
            --vus 5 --duration 60s \
            --env BASE_URL=${{ vars.STAGING_URL }}
```

Run only the smoke test in CI (1-5 VUs, 60s). Run full load tests manually or nightly.

---

## Reading Results

```
scenarios: (100.00%) 1 scenario, 100 max VUs, 17m30s max duration
default: Up and slowly ramping up iterations, 100 max VUs ...

✓ login 200
✓ checkout 201

checks.........................: 99.92% ✓ 11990  ✗ 9
data_received..................: 45 MB   75 kB/s
http_req_duration..............: avg=234ms min=12ms med=198ms max=2.1s p(90)=412ms p(95)=487ms p(99)=891ms
  { expected_response:true }...: avg=231ms ...
http_req_failed................: 0.07%  ✓ 0     ✗ 9
```

**What to look at:**
- `p(95)` and `p(99)` latency — your SLO targets
- `http_req_failed` — any unexpected errors
- Max values — outliers that hurt user experience
- Trend over time — does p95 degrade under sustained load?

---

## Defining SLOs (Service Level Objectives)

```javascript
// In k6 thresholds — your SLOs become enforceable tests
thresholds: {
  'http_req_duration{endpoint:checkout}': ['p(95)<500', 'p(99)<1000'],
  'http_req_duration{endpoint:list_products}': ['p(95)<200'],
  'http_req_failed': ['rate<0.001'],  // < 0.1% error rate
}
```

Align with your SLA: if you promise 99.9% uptime and p95 < 500ms, these become your k6 thresholds.
