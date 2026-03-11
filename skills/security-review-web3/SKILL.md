---
name: security-review-web3
description: Security patterns for Web3 and blockchain applications — Solana wallet signature verification, transaction validation, smart contract interaction security, and checklist for DeFi/NFT features.
---

# Security Review — Web3 & Blockchain

Security patterns for applications that interact with blockchains, wallets, and smart contracts.

## When to Activate

- Implementing wallet-based authentication (Solana, Ethereum, EVM chains)
- Verifying on-chain transaction signatures before processing user actions
- Building smart contract interaction logic (minting, trading, staking)
- Implementing DeFi features with balance checks and transaction limits
- Auditing Web3-specific attack surfaces (replay attacks, reentrancy via callbacks)

> For general security (injection, auth, secrets, OWASP Top 10) — see skill `security-review`.
> For auth patterns (JWT, OAuth, sessions) — see skill `auth-patterns`.

## Solana Wallet Verification

### Wallet Signature Verification

```typescript
import { verify } from '@solana/web3.js'

async function verifyWalletOwnership(
  publicKey: string,
  signature: string,
  message: string
) {
  try {
    const isValid = verify(
      Buffer.from(message),
      Buffer.from(signature, 'base64'),
      Buffer.from(publicKey, 'base64')
    )
    return isValid
  } catch (error) {
    return false
  }
}
```

### Transaction Verification

```typescript
async function verifyTransaction(transaction: Transaction) {
  // Verify recipient
  if (transaction.to !== expectedRecipient) {
    throw new Error('Invalid recipient')
  }

  // Verify amount
  if (transaction.amount > maxAmount) {
    throw new Error('Amount exceeds limit')
  }

  // Verify user has sufficient balance
  const balance = await getBalance(transaction.from)
  if (balance < transaction.amount) {
    throw new Error('Insufficient balance')
  }

  return true
}
```

## Security Checklist (Web3)

- [ ] Wallet signatures verified server-side before trusting identity
- [ ] Transaction details validated (recipient, amount, token)
- [ ] Balance checks performed before executing transactions
- [ ] No blind transaction signing — always validate content before submitting
- [ ] Replay attack protection (nonce or timestamp in signed message)
- [ ] Smart contract addresses pinned — never accept user-supplied contract addresses
- [ ] Amount limits enforced server-side (not just client-side)
- [ ] Rate limiting on transaction submission endpoints

## Common Web3 Attack Vectors

| Attack | Description | Fix |
|--------|-------------|-----|
| Replay attack | Reusing a valid signed message | Include nonce + expiry in signed payload |
| Spoofed recipient | User-supplied destination address | Pin recipient addresses server-side |
| Amount overflow | Integer overflow in token math | Use `BN.js` or `BigInt` for all amounts |
| Reentrancy (EVM) | Callback executes before state update | Update state before external calls |
| Front-running | Transaction ordering manipulation | Use commit-reveal schemes |

## Reentrancy: Vulnerable vs. Safe Pattern

### Vulnerable (Classic Reentrancy)
```solidity
contract VulnerableVault {
    mapping(address => uint256) public balances;

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "Insufficient");
        // ❌ External call BEFORE state update — attacker can re-enter here
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        balances[msg.sender] -= amount;  // State updated AFTER call
    }
}
```

**Attack vector:** Malicious contract's `receive()` calls `withdraw()` again before `balances` is decremented. Attacker can drain the vault.

### Safe (Checks-Effects-Interactions)
```solidity
contract SafeVault {
    mapping(address => uint256) public balances;

    function withdraw(uint256 amount) external {
        // ✅ 1. Checks
        require(balances[msg.sender] >= amount, "Insufficient");
        // ✅ 2. Effects (state update BEFORE external call)
        balances[msg.sender] -= amount;
        // ✅ 3. Interactions (external call LAST)
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
    }
}
```

**Rule:** Always follow Checks → Effects → Interactions order. For complex cases, add `ReentrancyGuard` from OpenZeppelin:
```solidity
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
contract SafeVault is ReentrancyGuard {
    function withdraw(uint256 amount) external nonReentrant { ... }
}
```
