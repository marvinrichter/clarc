---
name: e2e-testing-web3
description: Playwright E2E test patterns for Web3 and blockchain features — mocking wallet providers (MetaMask, Phantom), testing wallet connection flows, and handling async blockchain confirmations.
---

# E2E Testing — Web3 & Blockchain

Playwright patterns for testing applications that integrate with browser wallets and blockchain transactions.

## When to Activate

- Writing E2E tests for wallet connection flows (MetaMask, Phantom, WalletConnect)
- Testing DeFi features that trigger on-chain transactions
- Mocking browser wallet providers (`window.ethereum`, `window.solana`) in tests
- Handling async blockchain confirmation waits in test flows

> For general Playwright E2E patterns (page objects, CI artifacts, visual testing) — see skill `e2e-testing`.

## Wallet / Web3 Testing

### Mock Wallet Provider (Ethereum/MetaMask)

```typescript
test('wallet connection', async ({ page, context }) => {
  // Mock wallet provider
  await context.addInitScript(() => {
    window.ethereum = {
      isMetaMask: true,
      request: async ({ method }) => {
        if (method === 'eth_requestAccounts')
          return ['0x1234567890123456789012345678901234567890']
        if (method === 'eth_chainId') return '0x1'
      }
    }
  })

  await page.goto('/')
  await page.locator('[data-testid="connect-wallet"]').click()
  await expect(page.locator('[data-testid="wallet-address"]')).toContainText('0x1234')
})
```

### Financial / Critical Flow Testing

```typescript
test('trade execution', async ({ page }) => {
  // Skip on production — real money
  test.skip(process.env.NODE_ENV === 'production', 'Skip on production')

  await page.goto('/markets/test-market')
  await page.locator('[data-testid="position-yes"]').click()
  await page.locator('[data-testid="trade-amount"]').fill('1.0')

  // Verify preview
  const preview = page.locator('[data-testid="trade-preview"]')
  await expect(preview).toContainText('1.0')

  // Confirm and wait for blockchain
  await page.locator('[data-testid="confirm-trade"]').click()
  await page.waitForResponse(
    resp => resp.url().includes('/api/trade') && resp.status() === 200,
    { timeout: 30000 }
  )

  await expect(page.locator('[data-testid="trade-success"]')).toBeVisible()
})
```

## Wallet Rejection Flow

```typescript
test('wallet rejection shows error state', async ({ page, context }) => {
  await context.addInitScript(() => {
    window.ethereum = {
      isMetaMask: true,
      request: async ({ method }) => {
        if (method === 'eth_requestAccounts') {
          // Simulate user clicking "Reject" in MetaMask
          throw { code: 4001, message: 'User rejected the request.' }
        }
        if (method === 'eth_chainId') return '0x1'
      }
    }
  })

  await page.goto('/')
  await page.locator('[data-testid="connect-wallet"]').click()

  // Error state should appear, not the wallet address
  await expect(page.locator('[data-testid="wallet-error"]')).toContainText('rejected')
  await expect(page.locator('[data-testid="wallet-address"]')).not.toBeVisible()
})
```

## Network Switch Required

```typescript
test('prompts network switch when on wrong chain', async ({ page, context }) => {
  await context.addInitScript(() => {
    window.ethereum = {
      isMetaMask: true,
      chainId: '0x89',  // Polygon, not mainnet
      request: async ({ method, params }) => {
        if (method === 'eth_requestAccounts')
          return ['0xdeadbeef00000000000000000000000000000000']
        if (method === 'eth_chainId') return '0x89'
        if (method === 'wallet_switchEthereumChain')
          throw { code: 4902, message: 'Chain not added' }
      }
    }
  })

  await page.goto('/')
  await page.locator('[data-testid="connect-wallet"]').click()

  // App should prompt user to switch networks
  await expect(page.locator('[data-testid="wrong-network-banner"]')).toBeVisible()
  await expect(page.locator('[data-testid="switch-network-btn"]')).toBeVisible()
})
```

## Gas Estimation Failure

```typescript
test('shows gas error when estimation fails', async ({ page, context }) => {
  await context.addInitScript(() => {
    window.ethereum = {
      isMetaMask: true,
      request: async ({ method }) => {
        if (method === 'eth_requestAccounts')
          return ['0x1234567890123456789012345678901234567890']
        if (method === 'eth_chainId') return '0x1'
        if (method === 'eth_estimateGas')
          throw { code: -32603, message: 'execution reverted: insufficient balance' }
      }
    }
  })

  await page.goto('/swap')
  await page.locator('[data-testid="amount-input"]').fill('999999')
  await page.locator('[data-testid="swap-btn"]').click()

  await expect(page.locator('[data-testid="gas-error"]')).toContainText('insufficient balance')
  await expect(page.locator('[data-testid="swap-btn"]')).toBeDisabled()
})
```

## Web3 Test Checklist

- [ ] Wallet provider mocked via `addInitScript` (not real wallet)
- [ ] Blockchain confirmations awaited with generous timeout (30s+)
- [ ] Production guard applied to tests involving real transactions
- [ ] Wallet address assertions use `toContainText` (partial match — chain-dependent format)
- [ ] Error states tested: rejected wallet request, insufficient funds, network switch required
