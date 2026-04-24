//! ═══════════════════════════════════════════════════════════════════
//! OptimisticOracle — UMA-style dispute resolution on Stellar Soroban
//! ═══════════════════════════════════════════════════════════════════
//!
//! Flow:
//!   1. Market admin proposes outcome after deadline
//!   2. 2-hour dispute window opens
//!   3. Any staker can dispute by posting a bond
//!   4. If disputed → escalates to arbitration committee vote
//!   5. Committee resolves by majority vote
//!   6. Loser of dispute forfeits bond to winner
//!   7. If no dispute → outcome finalised automatically
//!
//! This mirrors UMA's Optimistic Oracle V3 pattern adapted for Soroban.

#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, String, Vec,
};

// ── Constants ────────────────────────────────────────────────────────────────

/// Dispute window: 2 hours in seconds
const DISPUTE_WINDOW_SECS: u64 = 7_200;
/// Minimum bond to propose or dispute (in stroops = 10 XLM)
const MIN_BOND: i128 = 100_000_000;
/// Arbitration committee size
const COMMITTEE_SIZE: u32 = 3;

// ── Storage Keys ─────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Admin,
    Committee,                    // Vec<Address> — arbitrators
    Request(u64),                 // OracleRequest by request_id
    RequestCount,
    TokenAddress,
}

// ── Data Structures ───────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum RequestState {
    Pending,      // Proposed, in dispute window
    Disputed,     // Under arbitration
    Settled,      // Finalised (no dispute or arbitration complete)
    Expired,      // No proposal made in time
}

#[contracttype]
#[derive(Clone)]
pub struct OracleRequest {
    pub request_id: u64,
    pub market_address: Address,
    pub question: String,
    pub proposed_outcome: bool,
    pub proposer: Address,
    pub proposal_time: u64,       // ledger timestamp of proposal
    pub disputer: Address,        // zero address if no dispute
    pub disputed: bool,
    pub state: RequestState,
    pub final_outcome: bool,
    pub proposer_bond: i128,
    pub disputer_bond: i128,
    pub committee_yes_votes: u32,
    pub committee_no_votes: u32,
    pub committee_voted: Vec<Address>,
}

// ── Token client for bond transfers ──────────────────────────────────────────

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
pub struct OptimisticOracle;

#[contractimpl]
impl OptimisticOracle {

    /// Initialize oracle with admin, token, and initial committee.
    pub fn initialize(
        e: Env,
        admin: Address,
        token_address: Address,
        committee: Vec<Address>,
    ) {
        if e.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        if committee.len() < COMMITTEE_SIZE {
            panic!("committee too small");
        }
        e.storage().instance().set(&DataKey::Admin, &admin);
        e.storage().instance().set(&DataKey::TokenAddress, &token_address);
        e.storage().instance().set(&DataKey::Committee, &committee);
        e.storage().instance().set(&DataKey::RequestCount, &0_u64);
    }

    /// Market calls this to register a new oracle request.
    /// Returns the request_id.
    pub fn register_request(
        e: Env,
        market_address: Address,
        question: String,
    ) -> u64 {
        market_address.require_auth();

        let count: u64 = e.storage().instance().get(&DataKey::RequestCount).unwrap_or(0);
        let request_id = count + 1;

        let dummy_addr = e.current_contract_address(); // placeholder for "no disputer"

        let request = OracleRequest {
            request_id,
            market_address: market_address.clone(),
            question,
            proposed_outcome: false,
            proposer: dummy_addr.clone(),
            proposal_time: 0,
            disputer: dummy_addr,
            disputed: false,
            state: RequestState::Pending,
            final_outcome: false,
            proposer_bond: 0,
            disputer_bond: 0,
            committee_yes_votes: 0,
            committee_no_votes: 0,
            committee_voted: Vec::new(&e),
        };

        e.storage().persistent().set(&DataKey::Request(request_id), &request);
        e.storage().instance().set(&DataKey::RequestCount, &request_id);

        e.events().publish(
            (symbol_short!("req_new"),),
            (request_id, market_address),
        );

        request_id
    }

    /// Proposer submits outcome with bond. Starts dispute window.
    pub fn propose_outcome(
        e: Env,
        proposer: Address,
        request_id: u64,
        outcome: bool,
        bond: i128,
    ) {
        proposer.require_auth();
        if bond < MIN_BOND { panic!("bond too small"); }

        let mut req: OracleRequest = e.storage().persistent()
            .get(&DataKey::Request(request_id))
            .expect("request not found");

        if req.state != RequestState::Pending { panic!("request not in pending state"); }
        if req.proposal_time != 0 { panic!("outcome already proposed"); }

        // Pull bond from proposer
        let token_addr: Address = e.storage().instance().get(&DataKey::TokenAddress).unwrap();
        let token = token::TokenClient::new(&e, &token_addr);
        token.transfer_from(
            &e.current_contract_address(),
            &proposer,
            &e.current_contract_address(),
            &bond,
        );

        req.proposer = proposer.clone();
        req.proposed_outcome = outcome;
        req.proposal_time = e.ledger().timestamp();
        req.proposer_bond = bond;

        e.storage().persistent().set(&DataKey::Request(request_id), &req);

        e.events().publish(
            (symbol_short!("proposed"),),
            (request_id, proposer, outcome, bond),
        );
    }

    /// Anyone can dispute within the dispute window by posting a bond.
    pub fn dispute(
        e: Env,
        disputer: Address,
        request_id: u64,
        bond: i128,
    ) {
        disputer.require_auth();
        if bond < MIN_BOND { panic!("bond too small"); }

        let mut req: OracleRequest = e.storage().persistent()
            .get(&DataKey::Request(request_id))
            .expect("request not found");

        if req.proposal_time == 0 { panic!("no proposal yet"); }
        if req.disputed { panic!("already disputed"); }

        // Must be within dispute window
        let elapsed = e.ledger().timestamp() - req.proposal_time;
        if elapsed > DISPUTE_WINDOW_SECS { panic!("dispute window closed"); }

        // Pull disputer bond
        let token_addr: Address = e.storage().instance().get(&DataKey::TokenAddress).unwrap();
        let token = token::TokenClient::new(&e, &token_addr);
        token.transfer_from(
            &e.current_contract_address(),
            &disputer,
            &e.current_contract_address(),
            &bond,
        );

        req.disputer = disputer.clone();
        req.disputer_bond = bond;
        req.disputed = true;
        req.state = RequestState::Disputed;

        e.storage().persistent().set(&DataKey::Request(request_id), &req);

        e.events().publish(
            (symbol_short!("disputed"),),
            (request_id, disputer, bond),
        );
    }

    /// Committee member casts vote during arbitration.
    pub fn vote(
        e: Env,
        voter: Address,
        request_id: u64,
        vote_outcome: bool,
    ) {
        voter.require_auth();

        let committee: Vec<Address> = e.storage().instance()
            .get(&DataKey::Committee).unwrap();

        // Verify voter is on committee
        let mut is_member = false;
        for i in 0..committee.len() {
            if committee.get(i).unwrap() == voter {
                is_member = true;
                break;
            }
        }
        if !is_member { panic!("not a committee member"); }

        let mut req: OracleRequest = e.storage().persistent()
            .get(&DataKey::Request(request_id))
            .expect("request not found");

        if req.state != RequestState::Disputed { panic!("not in arbitration"); }

        // Check not already voted
        for i in 0..req.committee_voted.len() {
            if req.committee_voted.get(i).unwrap() == voter {
                panic!("already voted");
            }
        }

        req.committee_voted.push_back(voter.clone());
        if vote_outcome {
            req.committee_yes_votes += 1;
        } else {
            req.committee_no_votes += 1;
        }

        // Check if majority reached (>50% of committee)
        let total_committee = committee.len();
        let majority = total_committee / 2 + 1;

        if req.committee_yes_votes >= majority || req.committee_no_votes >= majority {
            // Majority reached — settle
            let final_outcome = req.committee_yes_votes >= majority;
            req.final_outcome = final_outcome;
            req.state = RequestState::Settled;

            // Distribute bonds: winner gets both bonds
            let token_addr: Address = e.storage().instance().get(&DataKey::TokenAddress).unwrap();
            let token = token::TokenClient::new(&e, &token_addr);
            let total_bond = req.proposer_bond + req.disputer_bond;

            if final_outcome == req.proposed_outcome {
                // Proposer was right — gets both bonds
                token.transfer(&e.current_contract_address(), &req.proposer, &total_bond);
            } else {
                // Disputer was right — gets both bonds
                token.transfer(&e.current_contract_address(), &req.disputer, &total_bond);
            }

            e.events().publish(
                (symbol_short!("settled"),),
                (request_id, final_outcome),
            );
        }

        e.storage().persistent().set(&DataKey::Request(request_id), &req);
        e.events().publish((symbol_short!("voted"),), (request_id, voter, vote_outcome));
    }

    /// Settle without dispute after window expires.
    pub fn settle_no_dispute(e: Env, request_id: u64) {
        let mut req: OracleRequest = e.storage().persistent()
            .get(&DataKey::Request(request_id))
            .expect("request not found");

        if req.disputed { panic!("request is disputed"); }
        if req.proposal_time == 0 { panic!("no proposal yet"); }

        let elapsed = e.ledger().timestamp() - req.proposal_time;
        if elapsed <= DISPUTE_WINDOW_SECS { panic!("dispute window still open"); }

        req.final_outcome = req.proposed_outcome;
        req.state = RequestState::Settled;

        // Return proposer bond
        let token_addr: Address = e.storage().instance().get(&DataKey::TokenAddress).unwrap();
        let token = token::TokenClient::new(&e, &token_addr);
        token.transfer(&e.current_contract_address(), &req.proposer, &req.proposer_bond);

        e.storage().persistent().set(&DataKey::Request(request_id), &req);

        e.events().publish(
            (symbol_short!("settled"),),
            (request_id, req.final_outcome),
        );
    }

    /// Returns the final outcome for a settled request.
    /// Called by PredictionMarket to resolve.
    pub fn get_outcome(e: Env, request_id: u64) -> (bool, bool) {
        let req: OracleRequest = e.storage().persistent()
            .get(&DataKey::Request(request_id))
            .expect("request not found");
        // Returns (is_settled, outcome)
        (req.state == RequestState::Settled, req.final_outcome)
    }

    /// Returns full request details.
    pub fn get_request(e: Env, request_id: u64) -> OracleRequest {
        e.storage().persistent()
            .get(&DataKey::Request(request_id))
            .expect("request not found")
    }

    /// Admin can update committee.
    pub fn update_committee(e: Env, new_committee: Vec<Address>) {
        let admin: Address = e.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        if new_committee.len() < COMMITTEE_SIZE { panic!("committee too small"); }
        e.storage().instance().set(&DataKey::Committee, &new_committee);
    }
}
