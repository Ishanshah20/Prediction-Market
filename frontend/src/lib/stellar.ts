// ── Stellar Transaction Utilities ─────────────────────────────────────────────

import { RPC_URL, NETWORK_PASSPHRASE } from '../config'

async function getSdk() {
  return import('@stellar/stellar-sdk')
}

export async function invokeContract(
  publicKey: string,
  contractId: string,
  method: string,
  args: unknown[],
  signTx: (xdr: string) => Promise<string>,
): Promise<string> {
  const sdk = await getSdk()
  const { SorobanRpc, Contract, TransactionBuilder, BASE_FEE, Account } = sdk

  const server = new SorobanRpc.Server(RPC_URL)
  const accountData = await server.getAccount(publicKey)
  const account = new Account(publicKey, accountData.sequenceNumber())
  const contract = new Contract(contractId)

  // @ts-ignore
  let tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    // @ts-ignore
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build()

  const sim = await server.simulateTransaction(tx)
  if (!SorobanRpc.Api.isSimulationSuccess(sim)) {
    const err = sim as SorobanRpc.Api.SimulateTransactionErrorResponse
    throw new Error(`Simulation failed: ${err.error}`)
  }

  tx = SorobanRpc.assembleTransaction(tx, sim).build()
  const signedXdr = await signTx(tx.toXDR())
  const signedTx = sdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE)

  const result = await server.sendTransaction(signedTx)
  if (result.status === 'ERROR') throw new Error('Transaction submission failed')

  const hash = result.hash
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 2000))
    const status = await server.getTransaction(hash)
    if (status.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) return hash
    if (status.status === SorobanRpc.Api.GetTransactionStatus.FAILED)
      throw new Error(`Transaction failed: ${hash}`)
  }
  throw new Error('Transaction timed out')
}

export async function placeBet(
  publicKey: string,
  marketAddress: string,
  prediction: boolean,
  amount: bigint,
  signTx: (xdr: string) => Promise<string>,
) {
  const { Address, nativeToScVal } = await getSdk()
  return invokeContract(publicKey, marketAddress, 'place_bet', [
    Address.fromString(publicKey).toScVal(),
    nativeToScVal(prediction, { type: 'bool' }),
    nativeToScVal(amount, { type: 'i128' }),
  ], signTx)
}

export async function claimReward(
  publicKey: string,
  marketAddress: string,
  signTx: (xdr: string) => Promise<string>,
) {
  const { Address } = await getSdk()
  return invokeContract(publicKey, marketAddress, 'claim_reward', [
    Address.fromString(publicKey).toScVal(),
  ], signTx)
}

export async function createMarket(
  publicKey: string,
  factoryAddress: string,
  question: string,
  deadline: number,
  signTx: (xdr: string) => Promise<string>,
) {
  const { Address, nativeToScVal } = await getSdk()
  return invokeContract(publicKey, factoryAddress, 'create_market', [
    Address.fromString(publicKey).toScVal(),
    nativeToScVal(question, { type: 'string' }),
    nativeToScVal(BigInt(deadline), { type: 'u64' }),
  ], signTx)
}
