//! Integration tests for PredictionMarket contracts
//! Tests: placing bets, declaring result, claiming rewards

#![cfg(test)]

use soroban_sdk::{
    testutils::{Address as _, Ledger, LedgerInfo},
    Address, Env, String,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

fn create_env() -> Env {
    Env::default()
}

fn advance_time(e: &Env, seconds: u64) {
    e.ledger().with_mut(|li| {
        li.timestamp += seconds;
    });
}

// ─── PredictionToken Tests ────────────────────────────────────────────────────

mod token_tests {
    use super::*;
    use prediction_token::PredictionTokenClient;

    fn deploy_token(e: &Env, admin: &Address) -> PredictionTokenClient {
        let contract_id = e.register_contract(None, prediction_token::PredictionToken);
        let client = PredictionTokenClient::new(e, &contract_id);
        client.initialize(
            admin,
            &7u32,
            &String::from_str(e, "PredictionToken"),
            &String::from_str(e, "PRED"),
        );
        client
    }

    #[test]
    fn test_initial_supply_minted_to_admin() {
        let e = create_env();
        let admin = Address::generate(&e);
        let token = deploy_token(&e, &admin);

        // 1,000,000 * 10^7 = 10_000_000_000_000
        assert_eq!(token.balance(&admin), 10_000_000_000_000_i128);
    }

    #[test]
    fn test_transfer() {
        let e = create_env();
        let admin = Address::generate(&e);
        let user = Address::generate(&e);
        let token = deploy_token(&e, &admin);

        token.transfer(&admin, &user, &1_000_0000000_i128);
        assert_eq!(token.balance(&user), 1_000_0000000_i128);
    }

    #[test]
    fn test_approve_and_transfer_from() {
        let e = create_env();
        let admin = Address::generate(&e);
        let spender = Address::generate(&e);
        let token = deploy_token(&e, &admin);

        let amount = 500_0000000_i128;
        token.approve(&admin, &spender, &amount, &(e.ledger().sequence() + 100));
        assert_eq!(token.allowance(&admin, &spender), amount);

        token.transfer_from(&spender, &admin, &spender, &amount);
        assert_eq!(token.balance(&spender), amount);
    }

    #[test]
    #[should_panic(expected = "insufficient balance")]
    fn test_transfer_insufficient_balance() {
        let e = create_env();
        let admin = Address::generate(&e);
        let user = Address::generate(&e);
        let token = deploy_token(&e, &admin);

        // user has 0 balance, try to transfer
        token.transfer(&user, &admin, &1_i128);
    }
}

// ─── PredictionMarket Tests ───────────────────────────────────────────────────

mod market_tests {
    use super::*;
    use prediction_token::PredictionTokenClient;
    use prediction_market::PredictionMarketClient;

    fn setup(e: &Env) -> (Address, PredictionTokenClient, PredictionMarketClient, u64) {
        let admin = Address::generate(e);
        let user1 = Address::generate(e);

        // Deploy token
        let token_id = e.register_contract(None, prediction_token::PredictionToken);
        let token = PredictionTokenClient::new(e, &token_id);
        token.initialize(
            &admin,
            &7u32,
            &String::from_str(e, "PredictionToken"),
            &String::from_str(e, "PRED"),
        );

        // Set deadline 1 hour from now
        let deadline = e.ledger().timestamp() + 3600;

        // Deploy market
        let market_id = e.register_contract(None, prediction_market::PredictionMarket);
        let market = PredictionMarketClient::new(e, &market_id);
        market.init(
            &String::from_str(e, "Will BTC reach $100k by end of 2025?"),
            &deadline,
            &token_id,
            &admin,
        );

        (admin, token, market, deadline)
    }

    #[test]
    fn test_place_bet_yes() {
        let e = create_env();
        let (admin, token, market, _deadline) = setup(&e);
        let user = Address::generate(&e);

        // Fund user
        let bet_amount = 100_0000000_i128;
        token.transfer(&admin, &user, &bet_amount);

        // Approve market to spend tokens
        token.approve(&user, &market.address, &bet_amount, &(e.ledger().sequence() + 100));

        // Place YES bet
        market.place_bet(&user, &true, &bet_amount);

        let info = market.get_market_info();
        assert_eq!(info.total_yes_bets, bet_amount);
        assert_eq!(info.total_no_bets, 0);
    }

    #[test]
    fn test_place_bet_no() {
        let e = create_env();
        let (admin, token, market, _deadline) = setup(&e);
        let user = Address::generate(&e);

        let bet_amount = 200_0000000_i128;
        token.transfer(&admin, &user, &bet_amount);
        token.approve(&user, &market.address, &bet_amount, &(e.ledger().sequence() + 100));

        market.place_bet(&user, &false, &bet_amount);

        let info = market.get_market_info();
        assert_eq!(info.total_no_bets, bet_amount);
        assert_eq!(info.total_yes_bets, 0);
    }

    #[test]
    #[should_panic(expected = "user already placed a bet")]
    fn test_double_bet_rejected() {
        let e = create_env();
        let (admin, token, market, _deadline) = setup(&e);
        let user = Address::generate(&e);

        let bet_amount = 100_0000000_i128;
        token.transfer(&admin, &user, &(bet_amount * 2));
        token.approve(&user, &market.address, &(bet_amount * 2), &(e.ledger().sequence() + 100));

        market.place_bet(&user, &true, &bet_amount);
        market.place_bet(&user, &false, &bet_amount); // should panic
    }

    #[test]
    fn test_declare_result_and_claim_reward() {
        let e = create_env();
        let (admin, token, market, deadline) = setup(&e);

        let yes_user = Address::generate(&e);
        let no_user = Address::generate(&e);

        let yes_bet = 300_0000000_i128;
        let no_bet = 100_0000000_i128;

        // Fund and bet
        token.transfer(&admin, &yes_user, &yes_bet);
        token.transfer(&admin, &no_user, &no_bet);
        token.approve(&yes_user, &market.address, &yes_bet, &(e.ledger().sequence() + 100));
        token.approve(&no_user, &market.address, &no_bet, &(e.ledger().sequence() + 100));

        market.place_bet(&yes_user, &true, &yes_bet);
        market.place_bet(&no_user, &false, &no_bet);

        // Advance past deadline
        advance_time(&e, 3601);

        // Admin declares YES wins
        market.declare_result(&true);

        let info = market.get_market_info();
        assert!(info.resolved);
        assert!(info.outcome);

        // YES user claims reward
        // reward = (300 / 300) * 400 = 400 tokens
        let balance_before = token.balance(&yes_user);
        market.claim_reward(&yes_user);
        let balance_after = token.balance(&yes_user);

        let total_pool = yes_bet + no_bet; // 400
        let expected_reward = yes_bet * total_pool / yes_bet; // 400
        assert_eq!(balance_after - balance_before, expected_reward);
    }

    #[test]
    #[should_panic(expected = "reward already claimed")]
    fn test_double_claim_rejected() {
        let e = create_env();
        let (admin, token, market, deadline) = setup(&e);

        let user = Address::generate(&e);
        let bet_amount = 100_0000000_i128;
        token.transfer(&admin, &user, &bet_amount);
        token.approve(&user, &market.address, &bet_amount, &(e.ledger().sequence() + 100));
        market.place_bet(&user, &true, &bet_amount);

        advance_time(&e, 3601);
        market.declare_result(&true);
        market.claim_reward(&user);
        market.claim_reward(&user); // should panic
    }

    #[test]
    #[should_panic(expected = "user bet on losing side")]
    fn test_loser_cannot_claim() {
        let e = create_env();
        let (admin, token, market, deadline) = setup(&e);

        let user = Address::generate(&e);
        let bet_amount = 100_0000000_i128;
        token.transfer(&admin, &user, &bet_amount);
        token.approve(&user, &market.address, &bet_amount, &(e.ledger().sequence() + 100));
        market.place_bet(&user, &false, &bet_amount); // bet NO

        advance_time(&e, 3601);
        market.declare_result(&true); // YES wins
        market.claim_reward(&user);   // should panic
    }

    #[test]
    #[should_panic(expected = "market still open")]
    fn test_declare_result_before_deadline_rejected() {
        let e = create_env();
        let (admin, _token, market, _deadline) = setup(&e);
        market.declare_result(&true); // should panic - deadline not passed
    }

    #[test]
    fn test_proportional_rewards_multiple_winners() {
        let e = create_env();
        let (admin, token, market, deadline) = setup(&e);

        let user1 = Address::generate(&e);
        let user2 = Address::generate(&e);
        let loser = Address::generate(&e);

        // user1 bets 100 YES, user2 bets 300 YES, loser bets 200 NO
        let bet1 = 100_0000000_i128;
        let bet2 = 300_0000000_i128;
        let bet_no = 200_0000000_i128;

        token.transfer(&admin, &user1, &bet1);
        token.transfer(&admin, &user2, &bet2);
        token.transfer(&admin, &loser, &bet_no);

        token.approve(&user1, &market.address, &bet1, &(e.ledger().sequence() + 100));
        token.approve(&user2, &market.address, &bet2, &(e.ledger().sequence() + 100));
        token.approve(&loser, &market.address, &bet_no, &(e.ledger().sequence() + 100));

        market.place_bet(&user1, &true, &bet1);
        market.place_bet(&user2, &true, &bet2);
        market.place_bet(&loser, &false, &bet_no);

        advance_time(&e, 3601);
        market.declare_result(&true); // YES wins

        let total_pool = bet1 + bet2 + bet_no; // 600
        let winning_pool = bet1 + bet2;         // 400

        // user1 reward = 100 * 600 / 400 = 150
        let b1_before = token.balance(&user1);
        market.claim_reward(&user1);
        let b1_after = token.balance(&user1);
        assert_eq!(b1_after - b1_before, bet1 * total_pool / winning_pool);

        // user2 reward = 300 * 600 / 400 = 450
        let b2_before = token.balance(&user2);
        market.claim_reward(&user2);
        let b2_after = token.balance(&user2);
        assert_eq!(b2_after - b2_before, bet2 * total_pool / winning_pool);
    }
}
