//! MarketFactory — deploys and tracks PredictionMarket contracts.

#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, BytesN, Env, String, Vec, Val, IntoVal,
    xdr::ToXdr,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Markets,
    Admin,
    TokenAddress,
    MarketWasm,
}

#[contract]
pub struct MarketFactory;

#[contractimpl]
impl MarketFactory {
    pub fn initialize(e: Env, admin: Address, token_address: Address, market_wasm_hash: BytesN<32>) {
        if e.storage().instance().has(&DataKey::Admin) { panic!("already initialized"); }
        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage().instance().set(&DataKey::TokenAddress, &token_address);
        e.storage().instance().set(&DataKey::MarketWasm, &market_wasm_hash);
        let markets: Vec<Address> = Vec::new(&e);
        e.storage().instance().set(&DataKey::Markets, &markets);
    }

    pub fn create_market(e: Env, creator: Address, question: String, deadline: u64) -> Address {
        creator.require_auth();
        if deadline <= e.ledger().timestamp() { panic!("deadline must be in the future"); }

        let token_address: Address = e.storage().instance().get(&DataKey::TokenAddress).unwrap();
        let wasm_hash: BytesN<32> = e.storage().instance().get(&DataKey::MarketWasm).unwrap();

        // Unique salt derived from question
        let salt = e.crypto().sha256(&question.clone().to_xdr(&e));

        // Deploy market contract (no constructor args)
        let market_address = e.deployer()
            .with_current_contract(salt)
            .deploy_v2(wasm_hash, ());

        // Build init args as Vec<Val>
        let mut init_args: Vec<Val> = Vec::new(&e);
        init_args.push_back(question.clone().into_val(&e));
        init_args.push_back(deadline.into_val(&e));
        init_args.push_back(token_address.into_val(&e));
        init_args.push_back(creator.clone().into_val(&e));

        // Call init on the deployed market
        e.invoke_contract::<()>(&market_address, &symbol_short!("init"), init_args);

        // Track market
        let mut markets: Vec<Address> = e.storage().instance()
            .get(&DataKey::Markets).unwrap_or(Vec::new(&e));
        markets.push_back(market_address.clone());
        e.storage().instance().set(&DataKey::Markets, &markets);

        e.events().publish(
            (symbol_short!("mkt_new"),),
            (market_address.clone(), question, deadline, creator),
        );

        market_address
    }

    pub fn get_markets(e: Env) -> Vec<Address> {
        e.storage().instance().get(&DataKey::Markets).unwrap_or(Vec::new(&e))
    }

    pub fn market_count(e: Env) -> u32 {
        let m: Vec<Address> = e.storage().instance()
            .get(&DataKey::Markets).unwrap_or(Vec::new(&e));
        m.len()
    }

    pub fn get_token(e: Env) -> Address {
        e.storage().instance().get(&DataKey::TokenAddress).unwrap()
    }
}
