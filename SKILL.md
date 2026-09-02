---
name: poidh-bounty
description: "Post bounties, discover and inspect bounties, submit claims, evaluate submissions, and accept or nominate winning claims on poidh (pics or it didn't happen) on Ethereum Mainnet, Arbitrum, or Base. Use this skill when the user wants to create a bounty on poidh.xyz, find available bounties, post a task with an ETH reward on-chain, submit proof to an existing bounty, evaluate submissions using vision or other content tools, accept a winning claim on a solo bounty, initiate/resolve voting on an open bounty, query poidh data, or withdraw bounty winnings."
metadata:
  clawdbot:
    env:
      - PRIVATE_KEY
      - RPC_URL
      - POIDH_CHAIN
    bin:
      - cast
      - python3
---

## Overview

This skill interacts with poidh across Ethereum Mainnet, Arbitrum, and Base.

It can:

1. **Discover bounties**
2. **Read bounty and claim data**
3. **Post bounties** — solo or open
4. **Submit claims**
5. **Evaluate claim submissions**
6. **Accept winning claims** on solo bounties
7. **Initiate and resolve contributor voting** on open bounties
8. **Withdraw bounty winnings**

**poidh** ("pics or it didn't happen") is an onchain bounty protocol.

A bounty issuer escrows ETH and describes an outcome. Claimants submit proof that they completed the bounty. The issuer — or contributors through weighted voting — can accept a winning claim and release the bounty payout.

Proof is freeform. A claim may point to:

* an image
* video
* social post
* webpage
* GitHub repository or pull request
* benchmark result
* document
* dataset
* IPFS object
* other verifiable evidence

---

## Contract Immutability

The deployed poidh v3 contracts are **immutable**.

They cannot be upgraded or modified after deployment.

This has two important consequences:

1. integrations do not need to account for proxy upgrades or implementation changes at these addresses
2. known contract behavior — including known getter bugs — remains part of the deployed contract unless a new contract is deployed

Do not assume a documented contract bug has been fixed merely because the frontend behaves correctly.

Always verify which contract address is being used.

---

## Supported Networks

The actively supported poidh networks for this skill are:

* Ethereum Mainnet
* Arbitrum
* Base

All bounty funding and payouts on these networks use ETH.

---

## Retired Network: Degen Chain

Degen Chain (`chainId 666666666`) is retired and is **not a supported poidh network**.

Historical poidh activity from Degen Chain may still appear:

* on historical poidh.xyz bounty pages
* in the poidh indexer
* in profile and leaderboard data
* in analytics
* in historical datasets
* in old links or documentation

Treat all Degen Chain records as **historical, read-only data**.

> 🚨 **DO NOT CREATE BOUNTIES, SUBMIT CLAIMS, CONTRIBUTE FUNDS, ACCEPT CLAIMS, VOTE, WITHDRAW FUNDS, OR ATTEMPT ANY OTHER WRITE OPERATION ON DEGEN CHAIN.**

Do not attempt to switch the user's wallet to Degen Chain or request a Degen RPC URL.

If an indexer or frontend endpoint returns a Degen Chain bounty, do not treat it as an actionable bounty even if its historical status appears open.

If the user provides a historical Degen bounty URL, the skill may inspect available frontend or indexer data for historical purposes, but must clearly state that Degen Chain is retired and that no transaction can be performed through this skill.

---

## poidh v3 Core Contracts

| Chain            | Core Contract                                | Explorer                                                                  |
| ---------------- | -------------------------------------------- | ------------------------------------------------------------------------- |
| Ethereum Mainnet | `0xE731dFadBFf20542E10D09D26Fc71445C70d4232` | `https://etherscan.io/address/0xe731dfadbff20542e10d09d26fc71445c70d4232` |
| Arbitrum         | `0x5555Fa783936C260f77385b4E153B9725feF1719` | `https://arbiscan.io/address/0x5555fa783936c260f77385b4e153b9725fef1719`  |
| Base             | `0x5555Fa783936C260f77385b4E153B9725feF1719` | `https://basescan.org/address/0x5555fa783936c260f77385b4e153b9725fef1719` |

---

## poidh v3 NFT Contracts

Claim proof NFTs are minted through the poidh NFT contracts.

| Chain            | NFT Contract                                 |
| ---------------- | -------------------------------------------- |
| Ethereum Mainnet | `0x9c5f45d5e1382e4058d334d93c6c01442012a4d9` |
| Arbitrum         | `0x27e117cc9a8da363442e7bd0618939e3eeeacf6a` |
| Base             | `0x27e117cc9a8da363442e7bd0618939e3eeeacf6a` |

The NFT contract can also be resolved dynamically from the core contract:

```bash
cast call $POIDH_CONTRACT_ADDRESS \
  "poidhNft()(address)" \
  --rpc-url $RPC_URL
```

Prefer resolving it dynamically when interacting with a live contract.

---

# 🚨 Never Use poidh v2 Contracts

poidh v3 is a security-focused rebuild of the protocol following an exploit affecting poidh v2 in December 2025.

Historical poidh v2 activity may still appear:

* on poidh.xyz
* in the indexer
* in analytics
* in historical datasets
* in old documentation

The v2 contracts are retained only as historical onchain records.

> 🚨 **DO NOT CREATE BOUNTIES, SUBMIT CLAIMS, SEND FUNDS, OR OTHERWISE INTERACT WITH POIDH V2 CONTRACTS.**

This skill must only perform write operations against the poidh v3 contracts listed above.

If a contract address does not match a supported v3 deployment, stop and verify it before sending a transaction.

---

# 🚨 Known poidh v3 Pagination Bug

The following convenience getters in the currently deployed poidh v3 contracts do **not** implement working offset pagination:

```solidity
getBounties(uint256 offset)

getClaimsByBountyId(
    uint256 bountyId,
    uint256 offset
)

getBountiesByUser(
    address user,
    uint256 offset
)

getClaimsByUser(
    address user,
    uint256 offset
)
```

Do not use these functions to exhaustively enumerate protocol data.

For collections larger than 10 rows, they may repeatedly return the same newest 10 records while older records remain unreachable through the getter.

This is especially dangerous when evaluating claims because older submissions may include:

* the earliest submission
* the first valid submission
* the actual winner under the bounty rules

### Never:

```text
getClaimsByBountyId(bountyId, 0)
getClaimsByBountyId(bountyId, 10)
getClaimsByBountyId(bountyId, 20)
```

and assume those are different pages.

They are not reliable pagination.

### Instead: walk the index

The public array getters are exact **when the RPC call succeeds**. Read indexes from `0`
upward and read each referenced record by id:

```solidity
bountyClaims(uint256 bountyId, uint256 index) returns (uint256 claimId)
claims(uint256 claimId) returns (
    uint256 id, address issuer, uint256 bountyId, address bountyIssuer,
    string name, string description, uint256 createdAt, bool accepted
)
```

Do **not** treat a failed indexed read as proof that the array ended.

A provider may surface an out-of-bounds revert, rate limit, transport failure, unsupported
method, or other RPC problem through the same generic client exception. A bare
`catch { break; }` can therefore silently truncate an array or turn a non-empty array into
an empty one.

Use this rule:

1. read `bountyClaims(bountyId, i)` from the current provider
2. if it returns a claim ID, record it and continue
3. if it fails, retry the **same exact `(bountyId, i)` read** through a genuinely independent RPC provider
4. verify the second provider is healthy with at least one known-good read
5. if the independent provider returns a claim ID, the first provider failed; continue the walk
6. only treat index `i` as the end when a healthy independent provider also reports that the same index is unavailable
7. if no independent provider is available, fail loudly and do not claim the enumeration was exhaustive

Conceptual example:

```js
async function walkBountyClaims(primary, secondary, bountyId) {
  const ids = [];

  for (let i = 0; ; i++) {
    try {
      ids.push(await primary.bountyClaims(bountyId, i));
      continue;
    } catch (primaryError) {
      // Confirm the exact same index through independent infrastructure.
      // `knownGoodRead` must be a call whose successful result is already known.
      await knownGoodRead(secondary);

      try {
        ids.push(await secondary.bountyClaims(bountyId, i));
        continue; // primary failed; this index exists
      } catch (secondaryError) {
        // Both providers report this exact index unavailable.
        // Treat this as the boundary only after the secondary provider passed
        // the known-good health check above.
        break;
      }
    }
  }

  return ids;
}
```

The independent provider must be genuinely independent infrastructure. A second URL or
transport that ultimately reaches the same RPC host is not a meaningful second opinion.

Apply the same boundary-confirmation rule to `userClaims(user, i)` and
`userBounties(user, i)`.

The same shape replaces all four broken getters:

| Do not use                              | Exact replacement                                                                            |
| --------------------------------------- | -------------------------------------------------------------------------------------------- |
| `getBounties(offset)`                   | `bountyCounter()`, then `bounties(id)` for each id                                           |
| `getClaimsByBountyId(bountyId, offset)` | `bountyClaims(bountyId, i)` walked to an independently confirmed boundary, then `claims(id)` |
| `getBountiesByUser(user, offset)`       | `userBounties(user, i)` walked to an independently confirmed boundary, then `bounties(id)`   |
| `getClaimsByUser(user, offset)`         | `userClaims(user, i)` walked to an independently confirmed boundary, then `claims(id)`       |

### A returned row is not necessarily a record

The same convenience getters allocate a fixed array of 10 and never shrink it, so short
results are **zero-padded**. Never treat `result.length` as the number of real records, and do
not attempt to repair these convenience getters by filtering their output.

Use the exact index-based replacements above for enumeration instead.

---

# Data Source Trust Hierarchy

poidh exposes several ways to obtain data.

Use the source appropriate to the task.

## 1. Onchain State — Authoritative

Use direct contract calls for:

* bounty status
* payout decisions
* claim acceptance
* voting state
* balances
* issuer authorization
* finalization state
* critical real-time checks
* anything immediately preceding a transaction

For critical decisions, the contract is the source of truth.

---

## 2. Onchain Indexes and Events — Authoritative Historical Discovery

For targeted exhaustive reads, prefer the contract's public index getters:

* `bountyClaims(bountyId, i)` for claims on one bounty
* `userBounties(user, i)` for bounties associated with one user
* `userClaims(user, i)` for claims associated with one user
* `bountyCounter()` + `bounties(id)` for the complete bounty registry
* `claimCounter()` + `claims(id)` for the complete claim registry

Walk array indexes from `0` upward. If an indexed read fails, confirm the **same exact
index** through a healthy independent RPC provider before treating the failure as the end
of the array. Then read each referenced record by id.

Use contract events for:

* proof URI discovery
* historical event metadata
* transaction history
* alternative exhaustive discovery when a public index is unavailable or inconvenient

For evaluating a single bounty, `bountyClaims(bountyId, i)` + `claims(id)` is the preferred
authoritative claim-enumeration path. `ClaimCreated` events are especially useful for retrieving
the submitted `imageUri`.

---

## 3. poidh Indexer — Convenient and Fast

poidh operates an offchain indexer populated from onchain events.

API documentation:

```text
https://indexer.poidh.xyz/swagger
```

The indexer is useful for:

* browsing bounties
* browsing claims
* relational queries
* building frontends
* finding candidate records quickly
* avoiding large numbers of RPC calls

The indexer is approximately **99.9% historically accurate**, but it is an offchain derived data source.

Therefore:

> Use the indexer for discovery and convenience, but verify critical state directly against the contract before transferring funds, accepting claims, submitting votes, or making other consensus-sensitive decisions.

---

## 4. poidh JSON Endpoints — Lightweight Discovery

poidh.xyz exposes lightweight frontend JSON endpoints.

These are useful when an agent wants structured bounty data without directly interacting with the indexer or parsing chain events.

They are convenience endpoints, not the ultimate authority for critical contract state.

---

# Required Environment Variables

| Variable      | Description                                                           |
| ------------- | --------------------------------------------------------------------- |
| `PRIVATE_KEY` | Private key of the EOA signing transactions, hex with or without `0x` |
| `RPC_URL`     | RPC URL for the target chain                                          |
| `POIDH_CHAIN` | `mainnet`, `arbitrum`, or `base`                                      |

Do not expose `PRIVATE_KEY` in output, logs, URLs, command history shown to the user, or error reports.

---

# Resolve Chain Configuration

At the start of an onchain session:

```bash
case "$POIDH_CHAIN" in
  mainnet)
    POIDH_CONTRACT_ADDRESS="0xE731dFadBFf20542E10D09D26Fc71445C70d4232"
    POIDH_BASE_URL="https://poidh.xyz/mainnet"
    POIDH_V2_OFFSET=0
    ;;
  arbitrum)
    POIDH_CONTRACT_ADDRESS="0x5555Fa783936C260f77385b4E153B9725feF1719"
    POIDH_BASE_URL="https://poidh.xyz/arbitrum"
    POIDH_V2_OFFSET=180
    ;;
  base)
    POIDH_CONTRACT_ADDRESS="0x5555Fa783936C260f77385b4E153B9725feF1719"
    POIDH_BASE_URL="https://poidh.xyz/base"
    POIDH_V2_OFFSET=986
    ;;
  *)
    echo "Unknown POIDH_CHAIN: '$POIDH_CHAIN' (expected mainnet, arbitrum, or base)" >&2
    exit 1
    ;;
esac
```

---

# Frontend IDs vs Contract IDs

A poidh.xyz bounty ID is not always the same as its poidh v3 contract bounty ID.

Historical v2 bounties are included in frontend numbering.

Ethereum Mainnet never had poidh v2, so Mainnet IDs do not require an offset.

## Contract ID → Frontend ID

```text
frontend_id = contract_bounty_id + POIDH_V2_OFFSET
```

## Frontend ID → Contract ID

```text
contract_bounty_id = frontend_id - POIDH_V2_OFFSET
```

Current offsets:

| Chain            | Offset |
| ---------------- | -----: |
| Ethereum Mainnet |    `0` |
| Arbitrum         |  `180` |
| Base             |  `986` |

Example:

```text
Base contract bounty ID: 285

285 + 986 = 1271

Frontend:
https://poidh.xyz/base/bounty/1271
```

> 🚨 Never assume `/base/bounty/106` corresponds to `bounties(106)`.

Convert the ID before making contract calls.

---

# Part 1: Discovering Bounties

Agents do not need to scan the entire contract registry just to discover current opportunities.

Use the frontend JSON feed or indexer first.

---

## Recent Open Bounties Feed

Endpoint:

```text
https://poidh.xyz/bounties/data
```

It returns recent open bounties across poidh.

Default limit:

```text
20
```

A larger limit can be requested:

```text
https://poidh.xyz/bounties/data?limit=100
```

Use this endpoint for tasks such as:

* "show me current poidh bounties"
* "find a bounty I can complete"
* "what bounties are open?"
* "find software bounties"
* "find photo bounties"
* "find bounties worth more than X"

After identifying a bounty, inspect its individual data endpoint and/or verify the relevant state onchain.

The frontend feed or indexer may contain historical Degen Chain records.

When discovering actionable bounties, only return bounties on:

* Ethereum Mainnet
* Arbitrum
* Base

Exclude Degen Chain (`chainId 666666666`) from actionable bounty results even if a historical record appears open.

---

## Individual Bounty JSON

Append:

```text
/data
```

to a bounty URL.

Format:

```text
https://poidh.xyz/[chain]/bounty/[frontend-bounty-id]/data
```

Example:

```text
https://poidh.xyz/base/bounty/1271/data
```

Typical response fields include:

```json
{
  "id": 1271,
  "onChainId": 285,
  "chainId": 8453,
  "title": "Best Bounty (July 2026) 🏆",
  "description": "Each month, we celebrate the bounty creators...",
  "amount": "67000000000000000",
  "issuer": "0x4200ac338555e25b20c8fe82ac02a5c8d4e5a5b4",
  "createdAt": "1782908709",
  "inProgress": true,
  "isJoinedBounty": false,
  "isCanceled": false,
  "isMultiplayer": true,
  "isVoting": false,
  "deadline": null,
  "ban": [],
  "extra": {
    "bountyId": 1271,
    "chainId": 8453,
    "album": "poidh"
  },
  "hasClaims": true,
  "hasParticipants": false,
  "priceUsd": 125.56135,
  "currency": "eth",
  "url": "https://poidh.xyz/base/bounty/1271"
}
```

Of particular importance:

```text
id
```

is the frontend bounty ID.

```text
onChainId
```

is the v3 contract bounty ID.

When available, prefer the returned `onChainId` rather than manually calculating the offset.

Still verify critical state directly against the contract before a transaction.

---

# Part 2: Reading Bounties Directly Onchain

For authoritative bounty state:

```bash
cast call $POIDH_CONTRACT_ADDRESS \
  "bounties(uint256)(uint256,address,string,string,uint256,address,uint256,uint256)" \
  <BOUNTY_ID> \
  --rpc-url $RPC_URL
```

Returns:

```text
id
issuer
name
description
amount
claimer
createdAt
claimId
```

Typical interpretation:

```text
claimer == 0x0000000000000000000000000000000000000000
```

Bounty has not been finalized.

```text
claimer == issuer
```

Bounty was cancelled.

```text
claimer == another address
```

Bounty has a winning claimant.

---

## Exhaustive Bounty Enumeration

Do **not** use:

```solidity
getBounties(offset)
```

for exhaustive enumeration.

Instead:

```bash
cast call $POIDH_CONTRACT_ADDRESS \
  "bountyCounter()(uint256)" \
  --rpc-url $RPC_URL
```

Then:

```bash
cast call $POIDH_CONTRACT_ADDRESS \
  "bounties(uint256)(uint256,address,string,string,uint256,address,uint256,uint256)" \
  <BOUNTY_ID> \
  --rpc-url $RPC_URL
```

for each valid registry index.

For ordinary bounty discovery, prefer the JSON feed or indexer rather than scanning the entire registry.

---

# Part 3: Posting a Bounty

## Verify Minimum Bounty

Do not hardcode assumptions immediately before a transaction.

Query:

```bash
cast call $POIDH_CONTRACT_ADDRESS \
  "MIN_BOUNTY_AMOUNT()(uint256)" \
  --rpc-url $RPC_URL
```

Current expected minimum on Mainnet, Arbitrum, and Base:

```text
0.001 ETH
```

Minimum open-bounty contribution:

```bash
cast call $POIDH_CONTRACT_ADDRESS \
  "MIN_CONTRIBUTION()(uint256)" \
  --rpc-url $RPC_URL
```

Current expected value:

```text
0.00001 ETH
```

---

## EOA Requirement

PoidhV3 enforces an EOA requirement for relevant write operations.

Smart contract wallets may revert.

The signing wallet should be an EOA.

Resolve its address with:

```bash
cast wallet address --private-key $PRIVATE_KEY
```

---

## Post a Solo Bounty

Solo bounties are funded only by the issuer.

```bash
cast send $POIDH_CONTRACT_ADDRESS \
  "createSoloBounty(string,string)" \
  "<BOUNTY_NAME>" \
  "<BOUNTY_DESCRIPTION>" \
  --value <AMOUNT> \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL
```

Example:

```bash
cast send $POIDH_CONTRACT_ADDRESS \
  "createSoloBounty(string,string)" \
  "Brooklyn Bridge at sunset" \
  "High quality photo of the Brooklyn Bridge during golden hour. Must show the full span." \
  --value 0.001ether \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL
```

---

## Post an Open Bounty

Open bounties allow other wallets to contribute ETH.

```bash
cast send $POIDH_CONTRACT_ADDRESS \
  "createOpenBounty(string,string)" \
  "<BOUNTY_NAME>" \
  "<BOUNTY_DESCRIPTION>" \
  --value <AMOUNT> \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL
```

If external contributors join, claim acceptance uses contributor-weighted voting.

---

## Get the Bounty ID

After creation, inspect the transaction receipt and decode the bounty creation event.

```bash
cast receipt <TX_HASH> \
  --rpc-url $RPC_URL \
  --json
```

Do not blindly assume the first log containing multiple topics is the bounty creation event.

Decode the correct event emitted by `POIDH_CONTRACT_ADDRESS`.

Then:

```text
frontend_id = contract_bounty_id + POIDH_V2_OFFSET
```

Return both:

* contract bounty ID
* poidh.xyz frontend URL

---

# Part 4: Submitting a Claim

A claimant can submit proof to an eligible active bounty.

The signing wallet cannot be the bounty issuer.

---

## Inspect Bounty First

If given a poidh URL, use its `/data` endpoint for convenient metadata and `onChainId`.

Then verify onchain:

```bash
cast call $POIDH_CONTRACT_ADDRESS \
  "bounties(uint256)(uint256,address,string,string,uint256,address,uint256,uint256)" \
  <BOUNTY_ID> \
  --rpc-url $RPC_URL
```

---

## Verify No Vote Is Active

```bash
cast call $POIDH_CONTRACT_ADDRESS \
  "bountyCurrentVotingClaim(uint256)(uint256)" \
  <BOUNTY_ID> \
  --rpc-url $RPC_URL
```

A return value of `0` indicates there is no current voting claim.

---

## Verify Claimant Is Not Issuer

Resolve signing wallet:

```bash
cast wallet address --private-key $PRIVATE_KEY
```

Compare against:

```text
bounty.issuer
```

The issuer cannot submit a claim on their own bounty.

---

## Submit Claim

```bash
cast send $POIDH_CONTRACT_ADDRESS \
  "createClaim(uint256,string,string,string)" \
  <BOUNTY_ID> \
  "<CLAIM_NAME>" \
  "<CLAIM_DESCRIPTION>" \
  "<PROOF_URI>" \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL
```

Parameters:

### `CLAIM_NAME`

Short title for the submission.

### `CLAIM_DESCRIPTION`

Explanation of how the claimant completed the bounty.

### `PROOF_URI`

The submitted evidence.

It may be:

* IPFS URI
* image URL
* video URL
* tweet
* Farcaster post
* GitHub URL
* webpage
* document
* benchmark evidence
* another proof source

---

## Decode Claim ID

After confirmation:

```bash
cast receipt <TX_HASH> \
  --rpc-url $RPC_URL \
  --json
```

Decode the `ClaimCreated` event emitted by the poidh core contract.

Do not infer the claim ID from an unrelated log.

---

# Part 5: Evaluating Claims

Winner selection is a high-integrity operation.

The agent must evaluate **all eligible claims**, not merely the newest ten.

Workflow:

1. identify the correct contract bounty ID
2. read the bounty
3. enumerate every claim
4. obtain the proof URI for every claim
5. inspect each submission
6. apply the bounty's explicit rules
7. recommend a winner
8. report uncertainty
9. obtain user confirmation
10. only then transact

> 🚨 Never recommend a winner until exhaustive claim enumeration has completed successfully.

---

## Step 1: Read Bounty Rules

```bash
cast call $POIDH_CONTRACT_ADDRESS \
  "bounties(uint256)(uint256,address,string,string,uint256,address,uint256,uint256)" \
  <BOUNTY_ID> \
  --rpc-url $RPC_URL
```

The onchain bounty name and description are the base selection rules.

Additional rules visible through the frontend or supplied by the user may also matter if they can be verified.

---

# Step 2: Enumerate Every Claim

## Never Page `getClaimsByBountyId`

This is **not** an exhaustive data source:

```bash
cast call $POIDH_CONTRACT_ADDRESS \
  "getClaimsByBountyId(uint256,uint256)(tuple(uint256,address,uint256,address,string,string,uint256,bool)[])" \
  <BOUNTY_ID> 0 \
  --rpc-url $RPC_URL
```

It may show recent claims for convenience.

It must never be used as the sole candidate set for winner selection.

---

## Preferred Method: Walk `bountyClaims`

Enumerate the bounty's exact claim index:

```solidity
bountyClaims(uint256 bountyId, uint256 index) returns (uint256 claimId)
```

Read indexes starting at `0` and increasing by one.

For each returned claim ID, read current state with:

```bash
cast call $POIDH_CONTRACT_ADDRESS \
  "claims(uint256)(uint256,address,uint256,address,string,string,uint256,bool)" \
  <CLAIM_ID> \
  --rpc-url $RPC_URL
```

A failed `bountyClaims(bountyId, i)` call is **not** by itself proof that index `i` is out of
bounds. RPC failures and genuine contract reverts may be indistinguishable through some
client libraries.

Before declaring the array complete:

1. retry the **same exact `bountyClaims(bountyId, i)`** through a genuinely independent RPC provider
2. verify that provider is healthy with a known-good contract read
3. if the second provider returns a claim ID, continue enumeration
4. only accept the boundary if the healthy second provider also reports that exact index unavailable
5. if an independent provider is unavailable or health cannot be verified, stop and report that exhaustive enumeration could not be confirmed

Do not replace this with a same-provider canary alone. A provider can successfully answer
one key while failing a different `(bountyId, index)` read.

This is the preferred authoritative method for enumerating every claim on a specific bounty.

Do not stop after ten results, and do not silently convert an RPC failure into a shorter
claim list.

---

## Alternative: `ClaimCreated` Events

The event is:

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

`bountyId` is indexed, so `ClaimCreated` logs can be filtered for the target bounty.

Events are useful for:

* alternative exhaustive claim discovery
* retrieving the original proof URI (`imageUri`)
* claim creation metadata
* historical transaction context

Despite its historical name, `imageUri` may contain proof that is not an image.

RPC providers may restrict:

* block ranges
* returned log counts
* large `eth_getLogs` requests

If a log query fails, reduce the block range or use the public `bountyClaims` index.

Do not treat an RPC error as evidence that no claims exist.

---

## Last-Resort Fallback: Global Claim Registry

If targeted index reads and event queries are unavailable, get:

```bash
cast call $POIDH_CONTRACT_ADDRESS \
  "claimCounter()(uint256)" \
  --rpc-url $RPC_URL
```

Then inspect:

```bash
cast call $POIDH_CONTRACT_ADDRESS \
  "claims(uint256)(uint256,address,uint256,address,string,string,uint256,bool)" \
  <CLAIM_ID> \
  --rpc-url $RPC_URL
```

Retain every claim where:

```text
claim.bountyId == target_bounty_id
```

Do not stop after ten results.

Batch RPC calls where appropriate.

---

# Step 3: Verify Current Claim State

Claims discovered through events should be checked against current contract state when their current state matters. Claims read through `bountyClaims(...)` + `claims(id)` already use current contract state.

```bash
cast call $POIDH_CONTRACT_ADDRESS \
  "claims(uint256)(uint256,address,uint256,address,string,string,uint256,bool)" \
  <CLAIM_ID> \
  --rpc-url $RPC_URL
```

Confirm:

* correct bounty
* correct claimant
* accepted state
* other relevant current state

---

# Step 4: Obtain Proof URI

When `ClaimCreated` data is available, use:

```text
imageUri
```

as the submitted proof URI.

If the proof URI was not retrieved during enumeration, query the relevant `ClaimCreated` event or the NFT contract.

Resolve NFT contract:

```bash
NFT_ADDRESS=$(cast call $POIDH_CONTRACT_ADDRESS \
  "poidhNft()(address)" \
  --rpc-url $RPC_URL)
```

Then:

```bash
cast call $NFT_ADDRESS \
  "tokenURI(uint256)(string)" \
  <CLAIM_ID> \
  --rpc-url $RPC_URL
```

---

# Step 5: Resolve URI

```python
uri = "<URI>"

if uri.startswith("ipfs://"):
    url = uri.replace(
        "ipfs://",
        "https://ipfs.io/ipfs/",
        1
    )
elif uri.startswith("ar://"):
    url = uri.replace(
        "ar://",
        "https://arweave.net/",
        1
    )
else:
    url = uri
```

A `tokenURI` may return ERC-721 metadata.

Example:

```python
import requests

response = requests.get(url, timeout=30)

try:
    meta = response.json()

    content_url = (
        meta.get("animation_url")
        or meta.get("image")
        or url
    )

    if content_url.startswith("ipfs://"):
        content_url = content_url.replace(
            "ipfs://",
            "https://ipfs.io/ipfs/",
            1
        )

    elif content_url.startswith("ar://"):
        content_url = content_url.replace(
            "ar://",
            "https://arweave.net/",
            1
        )

except Exception:
    content_url = url
```

Do not assume:

* every token URI is JSON
* every proof URI is an image
* every claim uses IPFS

---

# Step 6: Inspect Proof

Use the appropriate capability.

### Image

Inspect visually.

### Webpage / social post

Open and read it.

### GitHub repository / PR

Inspect:

* code
* changes
* documentation
* tests
* deliverables
* reproducibility

### Video

Inspect available:

* video content
* representative frames
* transcript
* metadata
* linked evidence

### PDF / document

Read the document.

### Benchmark or dataset

Inspect:

* reported result
* methodology
* traces
* output
* configuration
* reproducibility requirements

Do not reject a claim solely because it is not photographic proof.

---

# Step 7: Apply the Actual Bounty Rules

Possible criteria include:

* eligibility
* completeness
* relevance
* quality
* authenticity
* originality
* reproducibility
* benchmark performance
* deadline
* submission order
* required social post
* required tags
* required links
* creativity
* issuer discretion

Only apply criteria that are present or reasonably implied by the actual bounty.

Do not invent additional requirements.

---

## Earliest-Valid Submission Rules

If the bounty states:

> first valid submission wins

or similar language such as:

> priority will be given to the earliest valid submission

then claim chronology matters.

Exhaustively enumerate claims and sort qualifying submissions using:

* `createdAt`
* claim ID / event order where useful as a secondary ordering signal

Never judge an earliest-valid bounty from only the newest 10 claims.

---

# Step 8: Present Evaluation

Before transacting, report:

* total claims discovered
* enumeration method
* claims evaluated
* inaccessible claims, if any
* disqualified claims and reasons
* qualifying finalists
* recommended winner
* reasoning
* whether chronology affected the decision
* uncertainty

If even one potentially eligible claim cannot be inspected, disclose that.

Do not silently discard inaccessible evidence.

---

# Part 6: Accepting a Solo Bounty Claim

For solo bounties — and open bounties where no external contributor ever participated — acceptance can occur directly.

First check:

```bash
cast call $POIDH_CONTRACT_ADDRESS \
  "everHadExternalContributor(uint256)(bool)" \
  <BOUNTY_ID> \
  --rpc-url $RPC_URL
```

If `false`, direct acceptance may be used.

Before sending:

1. verify bounty is active
2. verify selected claim belongs to bounty
3. verify all claims were enumerated
4. verify winner satisfies bounty rules
5. verify signing wallet is issuer
6. obtain explicit user confirmation

Then:

```bash
cast send $POIDH_CONTRACT_ADDRESS \
  "acceptClaim(uint256,uint256)" \
  <BOUNTY_ID> \
  <CLAIM_ID> \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL
```

Acceptance:

* finalizes the bounty
* credits claimant payout to `pendingWithdrawals`
* deducts protocol fee
* transfers the winning claim NFT to the issuer

---

# Part 7: Open Bounty Voting

If:

```bash
cast call $POIDH_CONTRACT_ADDRESS \
  "everHadExternalContributor(uint256)(bool)" \
  <BOUNTY_ID> \
  --rpc-url $RPC_URL
```

returns:

```text
true
```

use contributor voting.

---

## Nominate Claim

Issuer:

```bash
cast send $POIDH_CONTRACT_ADDRESS \
  "submitClaimForVote(uint256,uint256)" \
  <BOUNTY_ID> \
  <CLAIM_ID> \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL
```

The issuer's contribution weight is automatically cast as a YES vote.

Contributors then have **2 days** to vote YES or NO.

---

## Read Vote Status

```bash
cast call $POIDH_CONTRACT_ADDRESS \
  "bountyVotingTracker(uint256)(uint256,uint256,uint256)" \
  <BOUNTY_ID> \
  --rpc-url $RPC_URL
```

Returns:

```text
yes_weight
no_weight
deadline_timestamp
```

---

## Resolve Vote

After the deadline:

```bash
cast send $POIDH_CONTRACT_ADDRESS \
  "resolveVote(uint256)" \
  <BOUNTY_ID> \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL
```

Resolution is permissionless.

---

# Part 8: Withdrawing Funds

Winning bounty payouts are credited to:

```solidity
pendingWithdrawals(address)
```

---

## Check Balance

```bash
cast call $POIDH_CONTRACT_ADDRESS \
  "pendingWithdrawals(address)(uint256)" \
  <ADDRESS> \
  --rpc-url $RPC_URL
```

---

## Withdraw to Signing Wallet

```bash
cast send $POIDH_CONTRACT_ADDRESS \
  "withdraw()" \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL
```

---

## Withdraw to Another Address

```bash
cast send $POIDH_CONTRACT_ADDRESS \
  "withdrawTo(address)" \
  <RECIPIENT_ADDRESS> \
  --private-key $PRIVATE_KEY \
  --rpc-url $RPC_URL
```

Check the pending balance before sending.

---

# Complete Protocol Enumeration

For analytics or exhaustive historical work, do not rely on the broken convenience getters.

---

## Bounties

```bash
cast call $POIDH_CONTRACT_ADDRESS \
  "bountyCounter()(uint256)" \
  --rpc-url $RPC_URL
```

Then:

```bash
cast call $POIDH_CONTRACT_ADDRESS \
  "bounties(uint256)(uint256,address,string,string,uint256,address,uint256,uint256)" \
  <ID> \
  --rpc-url $RPC_URL
```

---

## Claims

```bash
cast call $POIDH_CONTRACT_ADDRESS \
  "claimCounter()(uint256)" \
  --rpc-url $RPC_URL
```

Then:

```bash
cast call $POIDH_CONTRACT_ADDRESS \
  "claims(uint256)(uint256,address,uint256,address,string,string,uint256,bool)" \
  <ID> \
  --rpc-url $RPC_URL
```

For large scans, use batched JSON-RPC requests.

For ordinary application development, consider the poidh indexer instead.

---

# Broken Getter Technical Reference

The known faulty pattern is equivalent to:

```solidity
uint256 counter;

for (
    uint256 i = ids.length;
    i > offset && counter < 10;
    i--
) {
    result[counter] = items[ids[i - 1]];
    counter++;
}
```

The loop always starts at:

```text
ids.length
```

not:

```text
ids.length - offset
```

Therefore `offset` acts as a lower loop boundary rather than a page starting position.

For collections containing more than ten entries, the loop typically reaches:

```text
counter == 10
```

before the offset changes the returned records.

A large offset near the array length may shorten the returned result, creating the misleading appearance that offset is working.

A proper conceptual newest-first implementation would instead resemble:

```solidity
if (offset >= ids.length) {
    return new Claim[](0);
}

for (
    uint256 i = ids.length - offset;
    i > 0 && counter < 10;
    i--
) {
    result[counter] = claims[ids[i - 1]];
    counter++;
}
```

The deployed contracts are immutable.

Do not assume this bug will change at the existing addresses.

---

# Native Token Reference

poidh uses ETH on every network supported by this skill.

| Human amount | Cast value   |
| ------------ | ------------ |
| `0.001 ETH`  | `0.001ether` |
| `0.01 ETH`   | `0.01ether`  |
| `0.1 ETH`    | `0.1ether`   |
| `1 ETH`      | `1ether`     |

---

# Protocol Fee

PoidhV3 takes a **2.5% protocol fee** on accepted bounty payouts.

The fee is applied at settlement.

Before settlement, contributed funds remain in bounty escrow subject to the contract's rules.

The winner receives the bounty payout minus the protocol fee through the withdrawal mechanism.

---

# Agent Decision Flow

## Discovering a Bounty

1. Use:

   * `https://poidh.xyz/bounties/data`, or
   * the poidh indexer.
2. Filter opportunities according to the user's request.
3. Inspect:

   * bounty description
   * amount
   * chain
   * status
   * issuer
   * claims
4. Use individual `/data` endpoint if helpful.
5. Before submitting a claim, verify current contract state.

---

## Posting a Bounty

1. Determine:

   * chain
   * name
   * description
   * ETH amount
   * solo/open
2. Resolve v3 contract.
3. Verify `MIN_BOUNTY_AMOUNT()`.
4. Verify wallet is an EOA.
5. Verify sufficient ETH.
6. Explain transaction.
7. Obtain confirmation.
8. Send transaction.
9. Decode creation event.
10. Return:

    * transaction hash
    * contract bounty ID
    * frontend URL

---

## Submitting a Claim

1. Determine:

   * chain
   * bounty
   * claim name
   * claim description
   * proof URI
2. If given frontend URL:

   * use `/data`
   * obtain `onChainId`
3. Verify bounty onchain.
4. Verify no active vote.
5. Verify wallet is not issuer.
6. Explain transaction.
7. Obtain confirmation.
8. Submit claim.
9. Decode `ClaimCreated`.
10. Return claim ID and transaction hash.

---

## Evaluating a Bounty

1. Resolve contract bounty ID.
2. Read bounty rules.
3. Enumerate every claim.
4. Prefer `bountyClaims(bountyId, i)` walked from `0` upward.
5. If an indexed read fails, confirm the **same exact index** through a healthy independent RPC provider before treating it as the array boundary.
6. If no independent provider is available, do not claim exhaustive enumeration succeeded.
7. Read each returned claim ID with `claims(id)`.
8. Use `ClaimCreated` logs to retrieve proof URIs or as an alternative exhaustive discovery path.
9. Fall back to `claimCounter()` + `claims(id)` only when necessary.
10. Never use paginated `getClaimsByBountyId` as the complete candidate list.
11. Resolve every proof URI.
12. Inspect every potentially eligible submission.
13. Apply only the bounty's actual requirements.
14. Account for deadlines and chronology.
15. Present findings.
16. Obtain user confirmation before accepting or nominating.

---

## Accepting a Claim

1. Verify all claims were evaluated.
2. Verify selected claim.
3. Check external-contributor state.
4. If no external contributor:

   * `acceptClaim`
5. If external contributors exist:

   * `submitClaimForVote`
6. Explain result to user.

---

# Transaction Safety Rules

Before **every** write transaction:

1. verify network
2. verify v3 contract address
3. verify bounty ID
4. verify claim ID if applicable
5. verify frontend ID conversion if applicable
6. verify current onchain state
7. verify signing wallet
8. verify ETH amount
9. explain the exact effect of the transaction
10. obtain explicit user confirmation

Never send funds to an unverified contract address.

Never interact with a poidh v2 contract.

Never expose the private key.

Never execute a winner transaction solely because an automated evaluation produced a recommendation.

Evaluation and transaction execution are separate actions.

---

# Error Reference

| Error                             | Cause                         | Fix                                      |
| --------------------------------- | ----------------------------- | ---------------------------------------- |
| `ContractsCannotCreateBounties()` | Wallet is a smart contract    | Use an EOA                               |
| `MinimumBountyNotMet()`           | Bounty below minimum          | Increase `--value`                       |
| `MinimumContributionNotMet()`     | Contribution below minimum    | Increase contribution                    |
| `NoEther()`                       | No ETH sent                   | Add `--value`                            |
| `WrongCaller()`                   | Caller not authorized         | Use issuer wallet                        |
| `VotingOngoing()`                 | Vote active                   | Wait or resolve after deadline           |
| `VotingEnded()`                   | Voting window finished        | Resolve vote                             |
| `NotSoloBounty()`                 | Direct acceptance unavailable | Use voting flow                          |
| `ClaimAlreadyAccepted()`          | Claim already accepted        | No further action                        |
| `BountyClaimed()`                 | Bounty finalized              | No further action                        |
| `BountyClosed()`                  | Bounty cancelled              | No further action                        |
| `BountyNotFound()`                | Wrong contract bounty ID      | Verify ID                                |
| `ClaimNotFound()`                 | Invalid claim ID              | Verify claim                             |
| `IssuerCannotClaim()`             | Issuer attempted own bounty   | Use different claimant wallet            |
| `NotActiveParticipant()`          | Caller not active contributor | Verify contribution state                |
| `MaxParticipantsReached()`        | Contributor cap reached       | Cannot join until slot becomes available |
| `NothingToWithdraw()`             | No pending payout             | Check pending balance                    |
| `VoteWouldPass()`                 | Attempted invalid vote reset  | Cannot override passing vote that way    |

---

# Critical Rules

1. **Only interact with poidh v3 contracts.**
2. **Never interact with poidh v2 contracts.**
3. **Only use Ethereum Mainnet, Arbitrum, or Base for live poidh activity.**
4. **Degen Chain (`666666666`) is retired. Treat Degen records as historical and never attempt transactions or wallet switching on Degen.**
5. **Never treat a historical Degen bounty as actionable merely because frontend or indexer data reports it as open.**
6. **Treat poidh's deployed contracts as immutable.**
7. **Never trust the four broken `offset` getters for exhaustive enumeration.**
8. **Never evaluate only the newest 10 claims when choosing a winner.**
9. **Never treat a failed `bountyClaims`, `userClaims`, or `userBounties` indexed read as proof that the array ended without confirming the same exact index through a healthy independent RPC provider.**
10. **If independent boundary confirmation is unavailable, fail loudly and do not claim exhaustive enumeration succeeded.**
11. **Use `bountyClaims(bountyId, i)` + `claims(id)` as the preferred exhaustive claim-enumeration path. Use `ClaimCreated` logs as an alternative and for proof URI retrieval.**
12. **Use `/bounties/data`, individual `/data` endpoints, or the indexer for convenient discovery.**
13. **Treat indexer and frontend JSON data as derived convenience data, not final consensus state.**
14. **Verify critical state directly onchain before any transaction.**
15. **Always distinguish frontend bounty IDs from v3 contract bounty IDs.**
16. **Prefer `onChainId` from the individual JSON endpoint when available.**
17. **Respect rules such as "first valid submission wins."**
18. **Never silently ignore an inaccessible claim.**
19. **Confirm with the user before every state-changing transaction.**
20. **Never reveal or log the user's private key.**
