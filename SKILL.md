# SKILL: Smart Contract Interface for L2 Liquidity

This document describes the smart contract interface for the POIDH protocol. It is intended for developers building on top of POIDH, including frontend applications, indexers, and automated evaluators.

---

## Part 1: Creating Bounties

### `createBounty`

Creates a new bounty with the specified parameters.

```solidity
function createBounty(
    uint256 chainId,
    address token,
    uint256 amount,
    string calldata title,
    string calldata description,
    string calldata imageUri,
    uint256 roundLength,
    uint256 evaluationDelay,
    address evaluator
) external returns (uint256 bountyId);
```

**Parameters:**
- `chainId`: The chain ID where the bounty is created (e.g., 1 for Ethereum, 42161 for Arbitrum)
- `token`: The ERC-20 token address for the reward (use `0x0000000000000000000000000000000000000000` for native ETH)
- `amount`: The reward amount in wei (or smallest unit of the token)
- `title`: Short title of the bounty
- `description`: Detailed description of the bounty requirements
- `imageUri`: URI for the bounty image (IPFS, HTTPS, or data URI)
- `roundLength`: Duration of each round in seconds
- `evaluationDelay`: Delay after round ends before evaluation can begin (in seconds)
- `evaluator`: Address authorized to evaluate and accept claims

**Returns:** `bountyId` - Unique identifier for the created bounty.

**Events:** `BountyCreated(uint256 indexed id, address indexed issuer, uint256 chainId, address token, uint256 amount, string title, string description, string imageUri, uint256 roundLength, uint256 evaluationDelay, address evaluator, uint256 createdAt)`

---

## Part 2: Evaluating Claims

### Step 1: Fetch Claims for a Bounty

#### `getClaimsByBountyId`

Returns up to 10 claims for a given bounty, most recent first. **This function does not support pagination** — the `offset` parameter is ignored by the contract. Calling with any offset returns the same 10 most recent claims.

```solidity
function getClaimsByBountyId(uint256 bountyId, uint256 offset) external view returns (Claim[] memory);
```

**Parameters:**
- `bountyId`: The bounty identifier
- `offset`: **Ignored by the contract** — included for interface compatibility only

**Returns:** Array of up to 10 `Claim` structs, ordered most recent first:
```solidity
struct Claim {
    uint256 id;
    address claimant;
    uint256 bountyId;
    address bountyIssuer;
    string title;
    string description;
    uint256 createdAt;
    bool accepted;
}
```

> ⚠️ **Important**: On bounties with more than 10 claims, older claims are **not accessible** via this function. To retrieve all claims, use the `ClaimCreated` event logs instead (see below).

#### Alternative: Fetch All Claims via Event Logs (Recommended)

To retrieve **all** claims for a bounty (including those beyond the 10 most recent), query the `ClaimCreated` event:

```solidity
event ClaimCreated(
    uint256 indexed id,
    address indexed issuer,
    uint256 indexed bountyId,
    address bountyIssuer,
    string title,
    string description,
    uint256 createdAt,
    string imageUri,
    uint256 round
);
```

**Query parameters:**
- Filter by `bountyId` (indexed)
- Optionally filter by `issuer` (indexed) if you only want claims for a specific issuer's bounties

**Advantages over `getClaimsByBountyId`:**
1. Returns **all** claims, not just the 10 most recent
2. Includes `imageUri` and `round` fields not returned by `getClaimsByBountyId`
3. Eliminates the need for per-claim `tokenURI` calls in Step 2
4. Returns claims in chronological order (oldest first), which matches the "earliest valid submission" priority rule used by many bounties

**Example (JavaScript/viem):**
```javascript
import { createPublicClient, http, parseAbiItem } from 'viem';
import { arbitrum } from 'viem/chains';

const client = createPublicClient({
  chain: arbitrum,
  transport: http('https://arb1.arbitrum.io/rpc') // Note: some public RPCs block eth_getLogs
});

const claimCreatedAbi = parseAbiItem('event ClaimCreated(uint256 indexed id, address indexed issuer, uint256 indexed bountyId, address bountyIssuer, string title, string description, uint256 createdAt, string imageUri, uint256 round)');

const logs = await client.getLogs({
  address: '0x5555fa783936c260f77385b4e153b9725fef1719', // POIDH contract on Arbitrum
  event: claimCreatedAbi,
  args: { bountyId: 143n },
  fromBlock: 'earliest',
  toBlock: 'latest',
});

const claims = logs.map(log => log.args);
// claims[0] is the earliest claim, claims[claims.length - 1] is the most recent
```

> 💡 **Tip**: The `arb1.arbitrum.io/rpc` endpoint supports `eth_getLogs` for this query. Some public RPCs (e.g., `arbitrum-one-rpc.publicnode.com`) return 403.

---

### Step 2: Fetch Claim Metadata (Only if Using `getClaimsByBountyId`)

If you used `getClaimsByBountyId` in Step 1, you must fetch the `imageUri` for each claim via `tokenURI`:

```solidity
function tokenURI(uint256 claimId) external view returns (string memory);
```

**Parameters:**
- `claimId`: The claim identifier

**Returns:** JSON metadata URI (typically IPFS or HTTPS) containing the claim's `imageUri`.

> ⚠️ This requires one RPC call per claim. Using the event log approach in Step 1 avoids this entirely.

---

### Step 3: Accept a Claim

#### `acceptClaim`

Accepts a claim, marking it as the winner and transferring the bounty reward.

```solidity
function acceptClaim(uint256 claimId) external;
```

**Parameters:**
- `claimId`: The claim identifier to accept

**Requirements:**
- Caller must be the `evaluator` set at bounty creation
- Bounty round must have ended
- `evaluationDelay` must have passed
- Claim must not already be accepted

**Events:** `ClaimAccepted(uint256 indexed claimId, address indexed evaluator, uint256 acceptedAt)`

---

## Part 3: Claiming a Bounty

### `createClaim`

Submits a claim for an active bounty.

```solidity
function createClaim(
    uint256 bountyId,
    string calldata title,
    string calldata description,
    string calldata imageUri
) external returns (uint256 claimId);
```

**Parameters:**
- `bountyId`: The bounty to claim
- `title`: Short title of the submission
- `description`: Detailed description of the work submitted
- `imageUri`: URI for the submission image (IPFS, HTTPS, or data URI)

**Returns:** `claimId` - Unique identifier for the created claim.

**Events:** `ClaimCreated(...)` (see Part 2, Step 1 for full event signature)

---

## Part 4: Contract Addresses

| Network | Chain ID | Contract Address |
|---------|----------|------------------|
| Ethereum Mainnet | 1 | `0x...` |
| Arbitrum One | 42161 | `0x5555fa783936c260f77385b4e153b9725fef1719` |
| Base | 8453 | `0x...` |
| Degen | 666666666 | `0x...` |

---

## Part 5: Common Pitfalls

1. **Pagination doesn't work on `getClaimsByBountyId`** — The `offset` parameter is ignored. Always use event logs for bounties with >10 claims.
2. **Claim priority is chronological** — Many bounties specify "earliest valid submission wins." Event logs return claims oldest-first; `getClaimsByBountyId` returns newest-first.
3. **RPC limitations** — Some public RPCs block `eth_getLogs`. Use `arb1.arbitrum.io/rpc` for Arbitrum or run your own node.
4. **Round timing** — Claims can only be created during active rounds. Check `getCurrentRound(bountyId)` and round timing before submitting.
5. **Token approvals** — For ERC-20 bounties, the contract must have allowance to pull the reward amount.

---

*Last updated: 2025*
