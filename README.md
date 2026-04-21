# Stellar Prediction Market Platform

[![CI/CD Pipeline](https://github.com/Ishanshah20/Prediction-Market/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Ishanshah20/Prediction-Market/actions/workflows/ci-cd.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Built on Stellar](https://img.shields.io/badge/Built%20on-Stellar%20Soroban-6366f1)](https://stellar.org/soroban)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black)](https://vercel.com)

> **Replace `YOUR_GITHUB_USERNAME` in the badge URL above with your actual GitHub username after pushing.**

A fully decentralized prediction market platform built on **Stellar Soroban** smart contracts. Users bet YES or NO on real-world outcomes using **PRED** tokens. Winners claim proportional rewards from the total pool — no middleman, no custody.

---

## Live Demo

**[https://stellar-predict.vercel.app](https://stellar-predict.vercel.app)**

> Update this link after deploying to Vercel.

---

## Mobile Responsive Screenshot

| Home — Market List |
|---|
| ![Stellar Prediction Market - mobile home screen with cricket market and YES/NO odds](screenshot/ss.PNG) |

---

## CI/CD Pipeline Screenshot

> Screenshot will appear here after pushing to GitHub and the Actions workflow runs green.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                    STELLAR SOROBAN LAYER                      │
│                                                              │
│  ┌───────────────────┐   deploys   ┌───────────────────────┐ │
│  │   MarketFactory   │────────────▶│   PredictionMarket    │ │
│  │                   │             │   (one per market)    │ │
│  │  initialize()     │             │                       │ │
│  │  create_market()  │             │  init()               │ │
│  │  get_markets()    │             │  place_bet()          │ │
│  │  market_count()   │             │  declare_result()     │ │
│  └───────────────────┘             │  claim_reward()       │ │
│           │                        │  get_market_info()    │ │
│           │ reads token addr       └──────────┬────────────┘ │
│           ▼                                   │              │
│  ┌───────────────────┐    transfer_from()     │              │
│  │  PredictionToken  │◀──────────────────────┘              │
│  │   (SEP-41 PRED)   │    transfer()                        │
│  │                   │                                      │
│  │  initialize()     │  ← 1,000,000 PRED minted to admin   │
│  │  mint()           │                                      │
│  │  transfer()       │                                      │
│  │  approve()        │                                      │
│  │  transfer_from()  │                                      │
│  │  balance()        │                                      │
│  └───────────────────┘                                      │
└──────────────────────────────────────────────────────────────┘
                          ▲
              Stellar SDK + Freighter Wallet
┌──────────────────────────────────────────────────────────────┐
│                    REACT FRONTEND (Vite)                      │
│                                                              │
│  HomePage            MarketPage          CreateMarketPage    │
│  (list all markets)  (bet + claim)       (deploy via factory)│
│                                                              │
│  useWallet()         useMarkets()        useTokenBalance()   │
│  Freighter connect   factory reads       token balance poll  │
│                                                              │
│  stellar.ts → build tx → simulate → sign → submit           │
└──────────────────────────────────────────────────────────────┘
```

---

## Inter-Contract Calls

`PredictionMarket` calls `PredictionToken` directly on-chain:

| Call | Direction | Purpose |
|---|---|---|
| `token.transfer_from(market, user, market, amount)` | Market → Token | Pull bet tokens into escrow |
| `token.transfer(market, user, reward)` | Market → Token | Pay out winnings |

`MarketFactory` calls `PredictionMarket` on-chain:

| Call | Direction | Purpose |
|---|---|---|
| `market.init(question, deadline, token, admin)` | Factory → Market | Initialize newly deployed market |

---

## Project Structure

```
stellar-prediction-market/
├── contracts/
│   ├── prediction_token/         # SEP-41 PRED token (ERC-20 equivalent)
│   │   └── src/
│   │       ├── lib.rs            # Module root
│   │       ├── contract_impl.rs  # Token logic
│   │       ├── admin.rs          # Admin storage
│   │       ├── balance.rs        # Balance storage
│   │       ├── allowance.rs      # Approve/transferFrom
│   │       ├── metadata.rs       # Name/symbol/decimals
│   │       └── storage_types.rs  # Storage key types
│   ├── market_factory/           # Deploys + tracks markets
│   │   └── src/lib.rs
│   └── prediction_market/        # Core betting logic
│       └── src/lib.rs
├── scripts/
│   ├── deploy.sh                 # Full one-command deployment
│   └── create_market.sh          # Create a market via CLI
├── test/
│   └── test_prediction_market.rs # 8 integration tests
├── frontend/
│   ├── src/
│   │   ├── components/           # Navbar, MarketCard
│   │   ├── hooks/                # useWallet, useMarkets, useTokenBalance
│   │   ├── lib/stellar.ts        # Tx build → simulate → sign → submit
│   │   ├── pages/                # HomePage, MarketPage, CreateMarketPage
│   │   ├── config.ts             # Network config + token helpers
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── index.html
│   ├── vercel.json               # SPA routing + security headers
│   ├── tailwind.config.js
│   └── package.json
├── docs/screenshots/             # Add your screenshots here
├── .github/workflows/ci-cd.yml   # CI/CD pipeline
├── .env.example                  # Environment variable template
├── Cargo.toml                    # Workspace root
└── README.md
```

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Rust | stable | [rustup.rs](https://rustup.rs/) |
| wasm32 target | — | `rustup target add wasm32-unknown-unknown` |
| Stellar CLI | latest | [Install guide](https://developers.stellar.org/docs/tools/developer-tools/cli/install-stellar-cli) |
| Node.js | 20+ | [nodejs.org](https://nodejs.org/) |
| Freighter Wallet | latest | [freighter.app](https://freighter.app/) |

---

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/YOUR_GITHUB_USERNAME/stellar-prediction-market
cd stellar-prediction-market

# 2. Copy environment template
cp .env.example .env

# 3. Add Rust WASM target
rustup target add wasm32-unknown-unknown

# 4. Install frontend dependencies
cd frontend && npm install && cd ..
```

---

## Run Locally

```bash
# Run all contract tests
cargo test --workspace

# Start frontend dev server (runs at http://localhost:5173)
cd frontend && npm run dev
```

> Without deployed contracts the frontend shows empty markets. Deploy to testnet first (see below).

---

## Deploy Contracts to Stellar Testnet

```bash
# 1. Generate a testnet keypair and fund it via Friendbot
stellar keys generate alice --network testnet
stellar keys fund alice --network testnet

# 2. Run the full deployment script
chmod +x scripts/deploy.sh
./scripts/deploy.sh

# Addresses are auto-saved to .env.contracts and frontend/.env
```

The script:
1. Builds all WASM contracts
2. Deploys `PredictionToken` → initializes with 1,000,000 PRED minted to admin
3. Uploads `PredictionMarket` WASM → stores hash in factory
4. Deploys `MarketFactory` → initializes with token address + market WASM hash
5. Creates one sample market
6. Saves all addresses to `.env.contracts`

---

## Contract Addresses (Testnet)

| Contract | Address |
|---|---|
| PredictionToken (PRED) | `CDOMWRQ2QIZ3K5BWYOJTLQXN7CDJVQESGZU4FRWHP6CTGHZEZ5VJJ6DE` |
| MarketFactory | `CBMSIJCCNQUP3IYVWWJXSPSLASIQDPCOWWY2CM4P4NCBIDANT4GOTZHE` |
| Admin Account | `GBZQGAKTDD2CC7SAXXPLR457US5XYAQORNIWW7L4YEV5AUTOQLK25YLU` |

### Token Address

```
Token Contract:  CDOMWRQ2QIZ3K5BWYOJTLQXN7CDJVQESGZU4FRWHP6CTGHZEZ5VJJ6DE
Token Symbol:    PRED
Decimals:        7
Initial Supply:  1,000,000 PRED (10,000,000,000,000 stroops)
Minted To:       GBZQGAKTDD2CC7SAXXPLR457US5XYAQORNIWW7L4YEV5AUTOQLK25YLU
```

### Deployment Transaction Hashes

| Step | Transaction Hash | Explorer |
|---|---|---|
| Deploy PredictionToken | `bd712bfe355f1959b53c88f7c1bdf8ef7b938745d722ed3adfb4962a5feb3a6f` | [View](https://stellar.expert/explorer/testnet/tx/bd712bfe355f1959b53c88f7c1bdf8ef7b938745d722ed3adfb4962a5feb3a6f) |
| Initialize Token (mint 1M) | `994236a005de0b40a5091b262089199e092d8922541b64566e0ea64e0ce0c692` | [View](https://stellar.expert/explorer/testnet/tx/994236a005de0b40a5091b262089199e092d8922541b64566e0ea64e0ce0c692) |
| Upload Market WASM | `e277cffc9e6355d78129221dae5b08f8faeff653b92a3d55542812aee473fad6` | [View](https://stellar.expert/explorer/testnet/tx/e277cffc9e6355d78129221dae5b08f8faeff653b92a3d55542812aee473fad6) |
| Deploy MarketFactory | `b70c892e3694ae6a79f27cd96075cbdf61e023b59926ea16b3f57ec59d08c115` | [View](https://stellar.expert/explorer/testnet/tx/b70c892e3694ae6a79f27cd96075cbdf61e023b59926ea16b3f57ec59d08c115) |

### WASM Hashes

```
PredictionToken WASM:  8ac2ff456b9b5d9a4b921fce5f9e9f70637dae05e6c20f4bd02f1bc091437f65
PredictionMarket WASM: 6259b67d662929627fbe276daec446a9a54b4713645cbf1815ed99c0966a47de
MarketFactory WASM:    9b19375833b919ebd8eb8f4113d8f242eda6f3799597625af2bb23694379297a
```

---

## How Rewards Work

```
reward = (userBet / totalWinningPool) * totalPool

Example:
  User A bets 300 PRED → YES
  User B bets 100 PRED → NO
  Total pool = 400 PRED, Winning pool (YES) = 300 PRED

  YES wins:
    User A reward = (300 / 300) * 400 = 400 PRED  ✅
    User B reward = 0 (lost)                       ❌

Multi-winner example:
  User A bets 100 PRED → YES
  User B bets 300 PRED → YES
  User C bets 200 PRED → NO
  Total pool = 600, Winning pool = 400

  YES wins:
    User A reward = (100 / 400) * 600 = 150 PRED
    User B reward = (300 / 400) * 600 = 450 PRED
```

---

## CI/CD Pipeline

GitHub Actions (`.github/workflows/ci-cd.yml`) runs on every push to `main` or `develop`:

```
push to main/develop
        │
        ├── test-contracts
        │     ├── Install Rust + wasm32 target
        │     ├── cargo test --workspace
        │     ├── stellar contract build
        │     └── Upload WASM artifacts
        │
        ├── build-frontend
        │     ├── npm ci
        │     ├── npm run lint
        │     ├── npm run build
        │     └── Upload dist artifact
        │
        └── deploy-vercel  (main branch only)
              └── vercel deploy --prod
```

### GitHub Secrets Required

Go to your repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret | Where to get it |
|---|---|
| `VITE_TOKEN_CONTRACT_ID` | Output of `deploy.sh` |
| `VITE_FACTORY_CONTRACT_ID` | Output of `deploy.sh` |
| `VERCEL_TOKEN` | [vercel.com/account/tokens](https://vercel.com/account/tokens) |
| `VERCEL_ORG_ID` | `vercel env ls` or Vercel dashboard |
| `VERCEL_PROJECT_ID` | `vercel env ls` or Vercel dashboard |

---

## Vercel Deployment (Manual)

```bash
npm install -g vercel
cd frontend
vercel --prod
```

---

## Suggested Git Commits

Make these commits in order as you build:

```bash
git commit -m "chore: initialize project structure with Cargo workspace and Vite frontend"
git commit -m "feat: add PredictionToken SEP-41 contract with 1M PRED initial supply mint"
git commit -m "feat: implement MarketFactory with dynamic Soroban contract deployment"
git commit -m "feat: add PredictionMarket with place_bet and inter-contract token transfer"
git commit -m "feat: add declare_result and proportional claim_reward with reentrancy guard"
git commit -m "test: add 8 integration tests covering bets, results, rewards, and edge cases"
git commit -m "feat: build React frontend with Freighter wallet, market list, and bet UI"
git commit -m "ci: add GitHub Actions CI/CD pipeline with Vercel production deployment"
git commit -m "docs: add complete README with architecture diagram, deploy guide, and screenshots"
```

---

## Security

| Protection | Implementation |
|---|---|
| Reentrancy guard | `Claimed` flag set before token transfer |
| Double-bet prevention | `UserBet` key checked before accepting bet |
| Double-claim prevention | `Claimed` key checked before payout |
| Auth on all writes | `require_auth()` on every state-changing function |
| Deadline enforcement | `ledger().timestamp()` checked on bet + declare |
| Admin-only resolution | `Admin` address stored at init, checked on declare |
| Re-initialization guard | `Question` key existence checked in `init()` |

---

## Mobile Responsiveness

Built with Tailwind CSS responsive utilities:

- `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` — market grid adapts to screen size
- `hidden sm:block` — navbar text hidden on small screens
- `hidden sm:flex` — token balance hidden on mobile to save space
- Full-width bet buttons on mobile, side-by-side on larger screens
- Touch-friendly tap targets (min 44px)

---

## License

MIT — see [LICENSE](LICENSE)
