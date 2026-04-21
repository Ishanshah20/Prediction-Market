//! PredictionToken — SEP-41 compatible token used for betting.
//! Mints 1,000,000 PRED to deployer on initialize.

#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, String,
};

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Balance(Address),
    Allowance(Address, Address), // (from, spender)
    AllowanceExp(Address, Address),
}

#[contract]
pub struct PredictionToken;

const DECIMALS: u32 = 7;
const INITIAL_SUPPLY: i128 = 1_000_000 * 10_i128.pow(7); // 1M tokens

#[contractimpl]
impl PredictionToken {
    /// Initialize: set admin and mint initial supply.
    pub fn initialize(e: Env, admin: Address) {
        if e.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage().persistent().set(&DataKey::Balance(admin.clone()), &INITIAL_SUPPLY);
        e.events().publish((symbol_short!("mint"),), (admin, INITIAL_SUPPLY));
    }

    pub fn balance(e: Env, id: Address) -> i128 {
        e.storage().persistent().get(&DataKey::Balance(id)).unwrap_or(0)
    }

    pub fn decimals(_e: Env) -> u32 { DECIMALS }

    pub fn name(e: Env) -> String { String::from_str(&e, "PredictionToken") }

    pub fn symbol(e: Env) -> String { String::from_str(&e, "PRED") }

    pub fn approve(e: Env, from: Address, spender: Address, amount: i128, expiration_ledger: u32) {
        from.require_auth();
        e.storage().temporary().set(&DataKey::Allowance(from.clone(), spender.clone()), &amount);
        e.storage().temporary().set(&DataKey::AllowanceExp(from.clone(), spender.clone()), &expiration_ledger);
        e.events().publish((symbol_short!("approve"),), (from, spender, amount));
    }

    pub fn allowance(e: Env, from: Address, spender: Address) -> i128 {
        let exp: u32 = e.storage().temporary()
            .get(&DataKey::AllowanceExp(from.clone(), spender.clone()))
            .unwrap_or(0);
        if exp < e.ledger().sequence() { return 0; }
        e.storage().temporary().get(&DataKey::Allowance(from, spender)).unwrap_or(0)
    }

    pub fn transfer(e: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        Self::_spend_balance(&e, from.clone(), amount);
        Self::_receive_balance(&e, to.clone(), amount);
        e.events().publish((symbol_short!("transfer"),), (from, to, amount));
    }

    pub fn transfer_from(e: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        // Deduct allowance
        let exp: u32 = e.storage().temporary()
            .get(&DataKey::AllowanceExp(from.clone(), spender.clone()))
            .unwrap_or(0);
        if exp < e.ledger().sequence() { panic!("allowance expired"); }
        let allowance: i128 = e.storage().temporary()
            .get(&DataKey::Allowance(from.clone(), spender.clone()))
            .unwrap_or(0);
        if allowance < amount { panic!("insufficient allowance"); }
        e.storage().temporary().set(&DataKey::Allowance(from.clone(), spender.clone()), &(allowance - amount));
        Self::_spend_balance(&e, from.clone(), amount);
        Self::_receive_balance(&e, to.clone(), amount);
        e.events().publish((symbol_short!("xfer_from"),), (spender, from, to, amount));
    }

    pub fn mint(e: Env, to: Address, amount: i128) {
        let admin: Address = e.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        Self::_receive_balance(&e, to.clone(), amount);
        e.events().publish((symbol_short!("mint"),), (to, amount));
    }

    fn _spend_balance(e: &Env, addr: Address, amount: i128) {
        let bal: i128 = e.storage().persistent().get(&DataKey::Balance(addr.clone())).unwrap_or(0);
        if bal < amount { panic!("insufficient balance"); }
        e.storage().persistent().set(&DataKey::Balance(addr), &(bal - amount));
    }

    fn _receive_balance(e: &Env, addr: Address, amount: i128) {
        let bal: i128 = e.storage().persistent().get(&DataKey::Balance(addr.clone())).unwrap_or(0);
        e.storage().persistent().set(&DataKey::Balance(addr), &(bal + amount));
    }
}
