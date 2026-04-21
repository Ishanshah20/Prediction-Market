//! PredictionMarket — YES/NO betting with XLM via PredictionToken.
//! reward = (userBet / winningPool) * totalPool

#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, String,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Question,
    Deadline,
    TokenAddress,
    Admin,
    TotalYesBets,
    TotalNoBets,
    UserBet(Address),
    Result,
    Resolved,
    Claimed(Address),
}

#[contracttype]
#[derive(Clone)]
pub struct BetInfo {
    pub prediction: bool,
    pub amount: i128,
}

#[contracttype]
#[derive(Clone)]
pub struct MarketInfo {
    pub question: String,
    pub deadline: u64,
    pub total_yes_bets: i128,
    pub total_no_bets: i128,
    pub resolved: bool,
    pub outcome: bool,
    pub token_address: Address,
}

// Minimal token client for cross-contract calls
mod token {
    use soroban_sdk::{contractclient, Address, Env};
    #[contractclient(name = "TokenClient")]
    pub trait Token {
        fn transfer_from(e: Env, spender: Address, from: Address, to: Address, amount: i128);
        fn transfer(e: Env, from: Address, to: Address, amount: i128);
    }
}

#[contract]
pub struct PredictionMarket;

#[contractimpl]
impl PredictionMarket {
    pub fn init(e: Env, question: String, deadline: u64, token_address: Address, admin: Address) {
        if e.storage().instance().has(&DataKey::Question) { panic!("already initialized"); }
        e.storage().instance().set(&DataKey::Question, &question);
        e.storage().instance().set(&DataKey::Deadline, &deadline);
        e.storage().instance().set(&DataKey::TokenAddress, &token_address);
        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage().instance().set(&DataKey::TotalYesBets, &0_i128);
        e.storage().instance().set(&DataKey::TotalNoBets, &0_i128);
        e.storage().instance().set(&DataKey::Resolved, &false);
        e.events().publish((symbol_short!("init"),), (question, deadline));
    }

    /// Place a YES/NO bet. User must approve this contract first.
    pub fn place_bet(e: Env, user: Address, prediction: bool, amount: i128) {
        user.require_auth();
        if amount <= 0 { panic!("amount must be positive"); }

        let deadline: u64 = e.storage().instance().get(&DataKey::Deadline).unwrap();
        if e.ledger().timestamp() >= deadline { panic!("market is closed"); }

        let resolved: bool = e.storage().instance().get(&DataKey::Resolved).unwrap();
        if resolved { panic!("market already resolved"); }

        if e.storage().persistent().has(&DataKey::UserBet(user.clone())) {
            panic!("user already placed a bet");
        }

        // Inter-contract call: pull tokens from user into this contract
        let token_address: Address = e.storage().instance().get(&DataKey::TokenAddress).unwrap();
        let token = token::TokenClient::new(&e, &token_address);
        token.transfer_from(&e.current_contract_address(), &user, &e.current_contract_address(), &amount);

        e.storage().persistent().set(&DataKey::UserBet(user.clone()), &BetInfo { prediction, amount });

        if prediction {
            let t: i128 = e.storage().instance().get(&DataKey::TotalYesBets).unwrap();
            e.storage().instance().set(&DataKey::TotalYesBets, &(t + amount));
        } else {
            let t: i128 = e.storage().instance().get(&DataKey::TotalNoBets).unwrap();
            e.storage().instance().set(&DataKey::TotalNoBets, &(t + amount));
        }

        e.events().publish((symbol_short!("bet"),), (user, prediction, amount));
    }

    /// Admin declares result after deadline.
    pub fn declare_result(e: Env, outcome: bool) {
        let admin: Address = e.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        let deadline: u64 = e.storage().instance().get(&DataKey::Deadline).unwrap();
        if e.ledger().timestamp() < deadline { panic!("market still open"); }
        let resolved: bool = e.storage().instance().get(&DataKey::Resolved).unwrap();
        if resolved { panic!("already declared"); }
        e.storage().instance().set(&DataKey::Result, &outcome);
        e.storage().instance().set(&DataKey::Resolved, &true);
        e.events().publish((symbol_short!("resolved"),), (outcome,));
    }

    /// Winner claims proportional reward.
    pub fn claim_reward(e: Env, user: Address) {
        user.require_auth();
        let resolved: bool = e.storage().instance().get(&DataKey::Resolved).unwrap();
        if !resolved { panic!("not resolved yet"); }
        if e.storage().persistent().has(&DataKey::Claimed(user.clone())) { panic!("already claimed"); }

        let bet: BetInfo = e.storage().persistent()
            .get(&DataKey::UserBet(user.clone()))
            .expect("no bet found");

        let outcome: bool = e.storage().instance().get(&DataKey::Result).unwrap();
        if bet.prediction != outcome { panic!("bet on losing side"); }

        let total_yes: i128 = e.storage().instance().get(&DataKey::TotalYesBets).unwrap();
        let total_no: i128 = e.storage().instance().get(&DataKey::TotalNoBets).unwrap();
        let total_pool = total_yes + total_no;
        let winning_pool = if outcome { total_yes } else { total_no };
        if winning_pool == 0 { panic!("no winning bets"); }

        // reward = userBet * totalPool / winningPool
        let reward = bet.amount * total_pool / winning_pool;

        // Mark claimed BEFORE transfer (reentrancy guard)
        e.storage().persistent().set(&DataKey::Claimed(user.clone()), &true);

        let token_address: Address = e.storage().instance().get(&DataKey::TokenAddress).unwrap();
        let token = token::TokenClient::new(&e, &token_address);
        token.transfer(&e.current_contract_address(), &user, &reward);

        e.events().publish((symbol_short!("claimed"),), (user, reward));
    }

    pub fn get_market_info(e: Env) -> MarketInfo {
        let resolved: bool = e.storage().instance().get(&DataKey::Resolved).unwrap_or(false);
        let outcome: bool = if resolved {
            e.storage().instance().get(&DataKey::Result).unwrap_or(false)
        } else { false };
        MarketInfo {
            question: e.storage().instance().get(&DataKey::Question).unwrap(),
            deadline: e.storage().instance().get(&DataKey::Deadline).unwrap(),
            total_yes_bets: e.storage().instance().get(&DataKey::TotalYesBets).unwrap_or(0),
            total_no_bets: e.storage().instance().get(&DataKey::TotalNoBets).unwrap_or(0),
            resolved,
            outcome,
            token_address: e.storage().instance().get(&DataKey::TokenAddress).unwrap(),
        }
    }

    pub fn get_user_bet(e: Env, user: Address) -> Option<BetInfo> {
        e.storage().persistent().get(&DataKey::UserBet(user))
    }

    pub fn has_claimed(e: Env, user: Address) -> bool {
        e.storage().persistent().has(&DataKey::Claimed(user))
    }
}
