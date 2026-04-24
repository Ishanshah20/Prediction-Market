//! ═══════════════════════════════════════════════════════════════════
//! PredictionMarket v2 — Complex market with Oracle integration
//! ═══════════════════════════════════════════════════════════════════
//!
//! Features:
//!   - Oracle-backed resolution via OptimisticOracle
//!   - Protocol fee (1%) on all bets → fee treasury
//!   - Dynamic odds based on pool ratio
//!   - Liquidity provider (LP) positions
//!   - Multi-tier bet limits (min/max per bet)
//!   - Emergency pause by admin
//!   - Slippage-protected bets
//!   - Full event log for all state changes

#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, String,
};

// ── Constants ─────────────────────────────────────────────────────────────────

/// Protocol fee: 1% = 100 basis points
const PROTOCOL_FEE_BPS: i128 = 100;
const BPS_DENOMINATOR: i128 = 10_000;
/// Minimum bet: 1 XLM in stroops
const MIN_BET: i128 = 10_000_000;
/// Maximum bet: 100,000 XLM in stroops
const MAX_BET: i128 = 1_000_000_000_000;
/// Initial liquidity required to open market
const MIN_LIQUIDITY: i128 = 100_000_000; // 10 XLM

// ── Storage Keys ──────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Question,
    Deadline,
    TokenAddress,
    OracleAddress,
    OracleRequestId,
    Admin,
    TreasuryAddress,
    TotalYesBets,
    TotalNoBets,
    TotalFees,
    LiquidityPool,        // Total LP deposits
    UserBet(Address),
    LpPosition(Address),  // LP deposit amount
    Resolved,
    FinalOutcome,
    Paused,
    Claimed(Address),
    LpClaimed(Address),
    MarketCategory,       // String: "sports", "crypto", "politics"
    ResolutionSource,     // String: oracle URL / description
}

// ── Data Structures ───────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub struct BetInfo {
    pub prediction: bool,
    pub amount: i128,       // net amount after fee
    pub gross_amount: i128, // amount before fee
    pub timestamp: u64,
    pub odds_at_bet: u32,   // implied odds * 1000 at time of bet
}

#[contracttype]
#[derive(Clone)]
pub struct MarketInfo {
    pub question: String,
    pub deadline: u64,
    pub total_yes_bets: i128,
    pub total_no_bets: i128,
    pub total_fees: i128,
    pub liquidity_pool: i128,
    pub resolved: bool,
    pub outcome: bool,
    pub paused: bool,
    pub token_address: Address,
    pub oracle_request_id: u64,
    pub category: String,
    pub resolution_source: String,
    pub yes_odds: u32,   // implied probability * 1000 (e.g. 680 = 68.0%)
    pub no_odds: u32,
}

// ── Oracle client ─────────────────────────────────────────────────────────────

mod oracle {
    use soroban_sdk::{contractclient, Env};
    #[contractclient(name = "OracleClient")]
    pub trait Oracle {
        fn get_outcome(e: Env, request_id: u64) -> (bool, bool);
        fn register_request(e: Env, market_address: soroban_sdk::Address, question: soroban_sdk::String) -> u64;
    }
}

// ── Token client ──────────────────────────────────────────────────────────────

mod token {
    use soroban_sdk::{contractclient, Address, Env};
    #[contractclient(name = "TokenClient")]
    pub trait Token {
        fn transfer_from(e: Env, spender: Address, from: Address, to: Address, amount: i128);
        fn transfer(e: Env, from: Address, to: Address, amount: i128);
    }
}

// ── Contract ──────────────────────────────────────────────────────────────────

#[contract]
pub struct PredictionMarket;

#[contractimpl]
impl PredictionMarket {

    /// Initialize market with oracle integration.
    pub fn init(
        e: Env,
        question: String,
        deadline: u64,
        token_address: Address,
        admin: Address,
        oracle_address: Address,
        treasury_address: Address,
        category: String,
        resolution_source: String,
    ) {
        if e.storage().instance().has(&DataKey::Question) {
            panic!("already initialized");
        }

        e.storage().instance().set(&DataKey::Question, &question);
        e.storage().instance().set(&DataKey::Deadline, &deadline);
        e.storage().instance().set(&DataKey::TokenAddress, &token_address);
        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage().instance().set(&DataKey::OracleAddress, &oracle_address);
        e.storage().instance().set(&DataKey::TreasuryAddress, &treasury_address);
        e.storage().instance().set(&DataKey::TotalYesBets, &0_i128);
        e.storage().instance().set(&DataKey::TotalNoBets, &0_i128);
        e.storage().instance().set(&DataKey::TotalFees, &0_i128);
        e.storage().instance().set(&DataKey::LiquidityPool, &0_i128);
        e.storage().instance().set(&DataKey::Resolved, &false);
        e.storage().instance().set(&DataKey::Paused, &false);
        e.storage().instance().set(&DataKey::OracleRequestId, &0_u64);
        e.storage().instance().set(&DataKey::MarketCategory, &category);
        e.storage().instance().set(&DataKey::ResolutionSource, &resolution_source);

        // Register with oracle
        let oracle = oracle::OracleClient::new(&e, &oracle_address);
        let request_id = oracle.register_request(
            &e.current_contract_address(),
            &question,
        );
        e.storage().instance().set(&DataKey::OracleRequestId, &request_id);

        e.events().publish(
            (symbol_short!("mkt_init"),),
            (question, deadline, oracle_address, request_id),
        );
    }

    /// LP deposits initial liquidity to bootstrap the market.
    pub fn add_liquidity(e: Env, provider: Address, amount: i128) {
        provider.require_auth();
        if amount < MIN_LIQUIDITY { panic!("liquidity too low"); }
        Self::_require_not_paused(&e);

        let deadline: u64 = e.storage().instance().get(&DataKey::Deadline).unwrap();
        if e.ledger().timestamp() >= deadline { panic!("market closed"); }

        let token_addr: Address = e.storage().instance().get(&DataKey::TokenAddress).unwrap();
        let token = token::TokenClient::new(&e, &token_addr);
        token.transfer_from(
            &e.current_contract_address(),
            &provider,
            &e.current_contract_address(),
            &amount,
        );

        let current_lp: i128 = e.storage().instance().get(&DataKey::LiquidityPool).unwrap_or(0);
        e.storage().instance().set(&DataKey::LiquidityPool, &(current_lp + amount));

        let current_pos: i128 = e.storage().persistent()
            .get(&DataKey::LpPosition(provider.clone())).unwrap_or(0);
        e.storage().persistent().set(&DataKey::LpPosition(provider.clone()), &(current_pos + amount));

        e.events().publish((symbol_short!("lp_add"),), (provider, amount));
    }

    /// Place a YES/NO bet with slippage protection.
    /// max_odds: maximum acceptable implied odds * 1000 (0 = no limit)
    pub fn place_bet(
        e: Env,
        user: Address,
        prediction: bool,
        gross_amount: i128,
        max_odds: u32,
    ) {
        user.require_auth();
        Self::_require_not_paused(&e);

        if gross_amount < MIN_BET { panic!("bet below minimum"); }
        if gross_amount > MAX_BET { panic!("bet above maximum"); }

        let deadline: u64 = e.storage().instance().get(&DataKey::Deadline).unwrap();
        if e.ledger().timestamp() >= deadline { panic!("market is closed"); }

        let resolved: bool = e.storage().instance().get(&DataKey::Resolved).unwrap();
        if resolved { panic!("market already resolved"); }

        if e.storage().persistent().has(&DataKey::UserBet(user.clone())) {
            panic!("user already placed a bet");
        }

        // Calculate current odds for slippage check
        let yes_bets: i128 = e.storage().instance().get(&DataKey::TotalYesBets).unwrap();
        let no_bets: i128 = e.storage().instance().get(&DataKey::TotalNoBets).unwrap();
        let lp: i128 = e.storage().instance().get(&DataKey::LiquidityPool).unwrap_or(0);
        let total = yes_bets + no_bets + lp;

        let current_odds: u32 = if total == 0 {
            500 // 50% default
        } else if prediction {
            ((yes_bets + lp / 2) * 1000 / total) as u32
        } else {
            ((no_bets + lp / 2) * 1000 / total) as u32
        };

        // Slippage check
        if max_odds > 0 && current_odds > max_odds {
            panic!("slippage exceeded");
        }

        // Deduct protocol fee
        let fee = gross_amount * PROTOCOL_FEE_BPS / BPS_DENOMINATOR;
        let net_amount = gross_amount - fee;

        // Pull gross amount from user
        let token_addr: Address = e.storage().instance().get(&DataKey::TokenAddress).unwrap();
        let token = token::TokenClient::new(&e, &token_addr);
        token.transfer_from(
            &e.current_contract_address(),
            &user,
            &e.current_contract_address(),
            &gross_amount,
        );

        // Send fee to treasury
        let treasury: Address = e.storage().instance().get(&DataKey::TreasuryAddress).unwrap();
        token.transfer(&e.current_contract_address(), &treasury, &fee);

        // Record bet
        let bet = BetInfo {
            prediction,
            amount: net_amount,
            gross_amount,
            timestamp: e.ledger().timestamp(),
            odds_at_bet: current_odds,
        };
        e.storage().persistent().set(&DataKey::UserBet(user.clone()), &bet);

        // Update totals
        if prediction {
            let t: i128 = e.storage().instance().get(&DataKey::TotalYesBets).unwrap();
            e.storage().instance().set(&DataKey::TotalYesBets, &(t + net_amount));
        } else {
            let t: i128 = e.storage().instance().get(&DataKey::TotalNoBets).unwrap();
            e.storage().instance().set(&DataKey::TotalNoBets, &(t + net_amount));
        }

        let total_fees: i128 = e.storage().instance().get(&DataKey::TotalFees).unwrap();
        e.storage().instance().set(&DataKey::TotalFees, &(total_fees + fee));

        e.events().publish(
            (symbol_short!("bet"),),
            (user, prediction, gross_amount, net_amount, fee, current_odds),
        );
    }

    /// Resolve market via oracle. Anyone can call after deadline.
    pub fn resolve_via_oracle(e: Env) {
        let resolved: bool = e.storage().instance().get(&DataKey::Resolved).unwrap();
        if resolved { panic!("already resolved"); }

        let deadline: u64 = e.storage().instance().get(&DataKey::Deadline).unwrap();
        if e.ledger().timestamp() < deadline { panic!("market still open"); }

        let oracle_addr: Address = e.storage().instance().get(&DataKey::OracleAddress).unwrap();
        let request_id: u64 = e.storage().instance().get(&DataKey::OracleRequestId).unwrap();

        let oracle = oracle::OracleClient::new(&e, &oracle_addr);
        let (is_settled, outcome) = oracle.get_outcome(&request_id);

        if !is_settled { panic!("oracle not settled yet"); }

        e.storage().instance().set(&DataKey::FinalOutcome, &outcome);
        e.storage().instance().set(&DataKey::Resolved, &true);

        e.events().publish(
            (symbol_short!("resolved"),),
            (outcome, request_id),
        );
    }

    /// Admin emergency override (fallback if oracle fails).
    pub fn admin_resolve(e: Env, outcome: bool) {
        let admin: Address = e.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let resolved: bool = e.storage().instance().get(&DataKey::Resolved).unwrap();
        if resolved { panic!("already resolved"); }

        let deadline: u64 = e.storage().instance().get(&DataKey::Deadline).unwrap();
        if e.ledger().timestamp() < deadline { panic!("market still open"); }

        e.storage().instance().set(&DataKey::FinalOutcome, &outcome);
        e.storage().instance().set(&DataKey::Resolved, &true);

        e.events().publish((symbol_short!("adm_res"),), (outcome,));
    }

    /// Winner claims proportional reward from betting pool.
    pub fn claim_reward(e: Env, user: Address) {
        user.require_auth();

        let resolved: bool = e.storage().instance().get(&DataKey::Resolved).unwrap();
        if !resolved { panic!("not resolved yet"); }

        if e.storage().persistent().has(&DataKey::Claimed(user.clone())) {
            panic!("already claimed");
        }

        let bet: BetInfo = e.storage().persistent()
            .get(&DataKey::UserBet(user.clone()))
            .expect("no bet found");

        let outcome: bool = e.storage().instance().get(&DataKey::FinalOutcome).unwrap();
        if bet.prediction != outcome { panic!("bet on losing side"); }

        let yes_bets: i128 = e.storage().instance().get(&DataKey::TotalYesBets).unwrap();
        let no_bets: i128 = e.storage().instance().get(&DataKey::TotalNoBets).unwrap();
        let lp: i128 = e.storage().instance().get(&DataKey::LiquidityPool).unwrap_or(0);
        let total_pool = yes_bets + no_bets + lp;
        let winning_pool = if outcome { yes_bets } else { no_bets };

        if winning_pool == 0 { panic!("no winning bets"); }

        // reward = userBet * totalPool / winningPool
        let reward = bet.amount * total_pool / winning_pool;

        // Reentrancy guard
        e.storage().persistent().set(&DataKey::Claimed(user.clone()), &true);

        let token_addr: Address = e.storage().instance().get(&DataKey::TokenAddress).unwrap();
        let token = token::TokenClient::new(&e, &token_addr);
        token.transfer(&e.current_contract_address(), &user, &reward);

        e.events().publish((symbol_short!("claimed"),), (user, reward));
    }

    /// LP withdraws their share of the losing pool after resolution.
    pub fn lp_withdraw(e: Env, provider: Address) {
        provider.require_auth();

        let resolved: bool = e.storage().instance().get(&DataKey::Resolved).unwrap();
        if !resolved { panic!("not resolved yet"); }

        if e.storage().persistent().has(&DataKey::LpClaimed(provider.clone())) {
            panic!("already withdrawn");
        }

        let lp_deposit: i128 = e.storage().persistent()
            .get(&DataKey::LpPosition(provider.clone()))
            .expect("no LP position");

        let total_lp: i128 = e.storage().instance().get(&DataKey::LiquidityPool).unwrap_or(0);
        if total_lp == 0 { panic!("no liquidity"); }

        let outcome: bool = e.storage().instance().get(&DataKey::FinalOutcome).unwrap();
        let yes_bets: i128 = e.storage().instance().get(&DataKey::TotalYesBets).unwrap();
        let no_bets: i128 = e.storage().instance().get(&DataKey::TotalNoBets).unwrap();

        // LP earns from losing side proportional to their share
        let losing_pool = if outcome { no_bets } else { yes_bets };
        let lp_share = lp_deposit * losing_pool / total_lp;
        let lp_return = lp_deposit + lp_share;

        e.storage().persistent().set(&DataKey::LpClaimed(provider.clone()), &true);

        let token_addr: Address = e.storage().instance().get(&DataKey::TokenAddress).unwrap();
        let token = token::TokenClient::new(&e, &token_addr);
        token.transfer(&e.current_contract_address(), &provider, &lp_return);

        e.events().publish((symbol_short!("lp_out"),), (provider, lp_return));
    }

    /// Admin pause/unpause.
    pub fn set_paused(e: Env, paused: bool) {
        let admin: Address = e.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        e.storage().instance().set(&DataKey::Paused, &paused);
        e.events().publish((symbol_short!("paused"),), (paused,));
    }

    // ── Read functions ────────────────────────────────────────────────────────

    pub fn get_market_info(e: Env) -> MarketInfo {
        let resolved: bool = e.storage().instance().get(&DataKey::Resolved).unwrap_or(false);
        let outcome: bool = if resolved {
            e.storage().instance().get(&DataKey::FinalOutcome).unwrap_or(false)
        } else { false };

        let yes_bets: i128 = e.storage().instance().get(&DataKey::TotalYesBets).unwrap_or(0);
        let no_bets: i128 = e.storage().instance().get(&DataKey::TotalNoBets).unwrap_or(0);
        let lp: i128 = e.storage().instance().get(&DataKey::LiquidityPool).unwrap_or(0);
        let total = yes_bets + no_bets + lp;

        let (yes_odds, no_odds) = if total == 0 {
            (500u32, 500u32)
        } else {
            let y = ((yes_bets + lp / 2) * 1000 / total) as u32;
            (y, 1000 - y)
        };

        MarketInfo {
            question: e.storage().instance().get(&DataKey::Question).unwrap(),
            deadline: e.storage().instance().get(&DataKey::Deadline).unwrap(),
            total_yes_bets: yes_bets,
            total_no_bets: no_bets,
            total_fees: e.storage().instance().get(&DataKey::TotalFees).unwrap_or(0),
            liquidity_pool: lp,
            resolved,
            outcome,
            paused: e.storage().instance().get(&DataKey::Paused).unwrap_or(false),
            token_address: e.storage().instance().get(&DataKey::TokenAddress).unwrap(),
            oracle_request_id: e.storage().instance().get(&DataKey::OracleRequestId).unwrap_or(0),
            category: e.storage().instance().get(&DataKey::MarketCategory).unwrap(),
            resolution_source: e.storage().instance().get(&DataKey::ResolutionSource).unwrap(),
            yes_odds,
            no_odds,
        }
    }

    pub fn get_user_bet(e: Env, user: Address) -> Option<BetInfo> {
        e.storage().persistent().get(&DataKey::UserBet(user))
    }

    pub fn has_claimed(e: Env, user: Address) -> bool {
        e.storage().persistent().has(&DataKey::Claimed(user))
    }

    pub fn get_lp_position(e: Env, provider: Address) -> i128 {
        e.storage().persistent().get(&DataKey::LpPosition(provider)).unwrap_or(0)
    }

    pub fn get_current_odds(e: Env) -> (u32, u32) {
        let yes_bets: i128 = e.storage().instance().get(&DataKey::TotalYesBets).unwrap_or(0);
        let no_bets: i128 = e.storage().instance().get(&DataKey::TotalNoBets).unwrap_or(0);
        let lp: i128 = e.storage().instance().get(&DataKey::LiquidityPool).unwrap_or(0);
        let total = yes_bets + no_bets + lp;
        if total == 0 { return (500, 500); }
        let y = ((yes_bets + lp / 2) * 1000 / total) as u32;
        (y, 1000 - y)
    }

    // ── Internal helpers ──────────────────────────────────────────────────────

    fn _require_not_paused(e: &Env) {
        let paused: bool = e.storage().instance().get(&DataKey::Paused).unwrap_or(false);
        if paused { panic!("market is paused"); }
    }
}
