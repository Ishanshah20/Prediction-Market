// ── Markets Hook ──────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback } from 'react'
import { RPC_URL, FACTORY_CONTRACT_ID, NETWORK_PASSPHRASE } from '../config'

export interface MarketInfo {
  address: string
  question: string
  deadline: number
  totalYesBets: bigint
  totalNoBets: bigint
  resolved: boolean
  outcome: boolean
  tokenAddress: string
}

const DUMMY = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN'

async function simCall(contractId: string, method: string, args: unknown[] = []) {
  const { Contract, TransactionBuilder, Account, BASE_FEE, SorobanRpc, scValToNative } =
    await import('@stellar/stellar-sdk')
  const server = new SorobanRpc.Server(RPC_URL)
  const contract = new Contract(contractId)
  const account = new Account(DUMMY, '0')

  const builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })

  // @ts-ignore
  const tx = builder.addOperation(contract.call(method, ...args)).setTimeout(30).build()
  const sim = await server.simulateTransaction(tx)
  if (!SorobanRpc.Api.isSimulationSuccess(sim)) return null
  if (!sim.result?.retval) return null
  return scValToNative(sim.result.retval)
}

export function useMarkets() {
  const [markets, setMarkets] = useState<MarketInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMarkets = useCallback(async () => {
    if (!FACTORY_CONTRACT_ID) { setError('Factory contract not configured'); return }
    setLoading(true); setError(null)
    try {
      const addresses = await simCall(FACTORY_CONTRACT_ID, 'get_markets') as string[] | null
      if (!addresses || !Array.isArray(addresses)) { setMarkets([]); return }

      const infos = await Promise.all(addresses.map(async (addr) => {
        try {
          const raw = await simCall(addr, 'get_market_info') as Record<string, unknown>
          if (!raw) return null
          return {
            address: addr,
            question: String(raw.question ?? ''),
            deadline: Number(raw.deadline ?? 0),
            totalYesBets: BigInt(String(raw.total_yes_bets ?? 0)),
            totalNoBets: BigInt(String(raw.total_no_bets ?? 0)),
            resolved: Boolean(raw.resolved),
            outcome: Boolean(raw.outcome),
            tokenAddress: String(raw.token_address ?? ''),
          } as MarketInfo
        } catch { return null }
      }))

      setMarkets(infos.filter(Boolean) as MarketInfo[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load markets')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMarkets()
    const t = setInterval(fetchMarkets, 30_000)
    return () => clearInterval(t)
  }, [fetchMarkets])

  return { markets, loading, error, refetch: fetchMarkets }
}
