## Docs

https://docs.poidh.xyz

## Contributing

Thank you for your interest in contributing to poidh! Before you start coding, please review this guide to ensure a smooth process from development to submitting a pull request.

If you're new or unsure where to begin, check the [Discussions](https://github.com/poidh/poidh-app/discussions) tab for ideas and help.

### Quick Start Guide

This guide will help you set up your local environment for running and contributing to the poidh app, including setting up automatic formatting and linting.

#### Overview

- [Cloning the Repository](#cloning-the-repository)
- [Installing Node.js and pnpm](#installing-nodejs-and-pnpm)
- [Installing Dependencies](#installing-dependencies)
- [Running the Project](#running-the-project)
- [Submitting Pull Requests](#submitting-pull-requests)

---

### Cloning the Repository

1. Clone the repository to your local machine. Ensure you have Git installed. [Git installation guide](https://git-scm.com/docs).

   ```bash
   git clone https://github.com/picsoritdidnthappen/poidh-app
   ```

2. Navigate into the project directory.

   ```bash
   cd poidh-app
   ```

<div align="right">
<a href="#quick-start-guide">↑ Back to Overview</a>
</div>

---

### Installing Node.js and pnpm

poidh uses **pnpm** as a package manager and requires **Node.js v18.12 or higher**.

1. Check your versions to confirm compatibility:

   ```bash
   node -v
   pnpm -v
   ```

2. If you need to install or update:

   - [Install Node.js](https://nodejs.org)
   - [Install pnpm](https://pnpm.io/)

<div align="right">
<a href="#quick-start-guide">↑ Back to Overview</a>
</div>

---

### Indexer Setup

Before starting, make sure to clone the **Indexer** repository:

```bash
git clone https://github.com/yukigesho/poidh-indexer.git
```

Next, follow the setup instructions in the **Indexer** repository's README. Don't forget to configure the `.env` file with your PostgreSQL database connection URL:

```plaintext
DATABASE_URL="postgresql://<username>:<password>@<host>:<port>/<database>"
```

Ensure the database is properly set up before proceeding.

<div align="right">
<a href="#quick-start-guide">↑ Back to Overview</a>
</div>

---

### Installing Dependencies

1. In the project root directory, install all required dependencies:

   ```bash
   pnpm install
   ```

2. This command will update and install all necessary packages.

3. Next, create a `.env` file in the project root directory and add the following:

   ```plaintext
   DATABASE_URL="postgresql://<username>:<password>@<host>:<port>/<database>"
   ADMINS="0x…,0x…,0x…"
   MAINNET_RPC_URL="https://eth-mainnet…"
   ARBITRUM_RPC_URL="https://arbitrum-mainnet…"
   BASE_RPC_URL="https://base-mainnet…"
   NEYNAR_API_KEY="sk-…"
   ```

> Degen Chain is retired and is no longer required for local development. Historical Degen data may still exist in the database and frontend, but new Degen Chain interactions are not supported.

<div align="right">
<a href="#quick-start-guide">↑ Back to Overview</a>
</div>

---

### Image and metadata uploads

Uploads use the Railway IPFS service, not the legacy Google Cloud Function. Configure these **build-time** variables in local `.env` and your frontend hosting environment:

```plaintext
NEXT_PUBLIC_IPFS_API_URL="https://poidh-ipfs-service-production.up.railway.app"
NEXT_PUBLIC_IPFS_API_TOKEN="<same value as the service's API_BEARER_TOKEN>"
```

Restart the dev server or rebuild/redeploy production after changing them. The URL defaults to Railway, including in development; to run the upload service locally, override it with `http://localhost:3001` (the frontend uses port 3000). For local development against Railway, its `ALLOWED_ORIGINS` must explicitly include `http://localhost:3000`; production origins need `https://poidh.xyz,https://*.poidh.xyz` as appropriate.

**The API token is public in a browser build.** This is compatibility with the service's current shared-key authentication, not a secure user-login mechanism. Never supply `PINATA_JWT`, `PINATA_KEY`, or `PINATA_SECRET` here. An authenticated short-lived token flow or an authenticated server-side proxy is required to keep a permanent API credential private. Missing API tokens fail before sending uploads.

Both image and metadata uploads send the Bearer header through `src/utils/pinata.ts`. Claim creation and generated share cards use this utility. Existing IPFS gateway URLs are unchanged because they serve already-pinned content. Image compression is only a client optimization; validation remains the upload service's responsibility. Upload errors stop claim submission (share cards retain their existing fallback), and pins are not automatically retried because a timeout may occur after storage succeeded.

### Database Migration

1. After indexer finished indexing, run the following command:

   ```bash
   pnpm generate
   ```

2. Next, run the following command to migrate the database:

   ```bash
   pnpm migrate
   ```

<div align="right">
<a href="#quick-start-guide">↑ Back to Overview</a>
</div>

---

### Running the Project

1. Start the poidh app:

   ```bash
   pnpm start
   ```

   Or, if you're running a development build:

   ```bash
   pnpm dev
   ```

2. The app should now be running locally! Check your terminal output for any additional information or errors.

<div align="right">
<a href="#quick-start-guide">↑ Back to Overview</a>
</div>

---

### Submitting Pull Requests

To contribute code, follow these steps:

1. **Style Guide**: Please review the poidh style guide to maintain consistency in the codebase.

2. **Code Check**: Before submitting, make sure your code is formatted and linted. GitHub Actions will automatically build, lint, and format your pull request, highlighting issues if they exist.

3. **Commit Titles and Descriptions**: Keep titles and descriptions concise yet informative to help reviewers understand your changes.

4. **Build Command**: Don’t forget to run the following to ensure your build is up to date:

   ```bash
   pnpm build
   ```

5. **Pull Request Review**: After submitting, if you see a ❌, review the error logs under the “Actions” tab to identify any issues.

<div align="right">
<a href="#quick-start-guide">↑ Back to Overview</a>
</div>

---

### Thank You!

We appreciate your contribution to poidh. Happy coding and thank you for helping to make poidh even better!

## Smart-account login + cross-chain deposits (ZeroDev)

poidh supports logging in **without a seed phrase or browser extension**.
Two login options create a ZeroDev Kernel v3.1 smart account on
**Arbitrum One** (the destination chain) and appear as wallets in the
RainbowKit modal under "Smart accounts", plus as one-click buttons in
the header:

- **🔑 Passkey login** — WebAuthn register/login via the ZeroDev passkey
  server. The smart account signs every transaction as an ERC-4337 user
  operation through the ZeroDev bundler.
- **🔵 Google login** — Google OAuth via the ZeroDev social validator
  (Magic-powered embedded signer). OAuth is a full-page redirect; the
  `/social-callback` route finishes the flow and the app auto-connects.
  In ZeroDev dev mode social login works on `localhost` only — a public
  deployment needs Social Auth approved on the ZeroDev dashboard.
- **Cross-chain deposits** — the "fund on Arbitrum from any chain"
  widget (shown once connected) quotes Relay (relay.link) and lets a
  user bridge ETH from Ethereum, Base, or Degen into their poidh
  account on Arbitrum with one signed transaction on the origin chain.
- **Gas** — users pay gas from the smart account itself; no paymaster
  policy is required from the maintainer. `wallet_sendCalls` (EIP-5792)
  batches several contract calls into a single user operation.

### Setup

1. Create a free project at https://dashboard.zerodev.app
2. Set `NEXT_PUBLIC_ZERODEV_PROJECT_ID=<project id>` in your env.
   Without it the smart-account options stay hidden and everything else
   is unchanged.

Relevant code: `src/zerodev/` (config, passkeySmartAccount,
socialSmartAccount, zerodevConnector, PasskeyConnectButton,
SocialConnectButton, CrossChainDeposit), `src/app/social-callback/`,
and `src/wagmiConfig.ts`. Tests: `src/zerodev/__tests__/zerodev.test.ts`.
