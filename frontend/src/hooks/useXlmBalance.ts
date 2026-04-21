// ── XLM Native Balance Hook ───────────────────────────────────────────────────
// Fetches the native XLM balance for a Stellar account.
// Returns both a human-readable string AND a bigint in stroops.

import { useState, useEffect, useCallback } from 'react'
import { RPC_URL, XLM_FACTOR } from '../config'

export function useXlmBalance(publicKey: string | null) {
  const [balance, setBalance] = useState<bigint>(0n)       // stroops (for bet math)
  const [xlmBalance, setXlmBalance] = useState<string>('0.00') // display string
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(async () => {
    if (!publicKey) return
    setLoading(true)
    try {
      const { SorobanRpc } = await import('@stellar/stellar-sdk')
      const server = new SorobanRpc.Server(RPC_URL)
      const account = await server.getAccount(publicKey)

      const native = (account.balances as Array<{ asset_type: string; balance: string }>)
        .find(b => b.asset_type === 'native')

      if (native) {
        const val = parseFloat(native.balance)
        // Store as stroops bigint
        setBalance(BigInt(Math.round(val * XLM_FACTOR)))
        // Store as display string
        setXlmBalance(val.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 4,
        }))
      }
    } catch {
      setBalance(0n)
      setXlmBalance('0.00')
    } finally {
      setLoading(false)
    }
  }, [publicKey])

  useEffect(() => {
    fetch()
    const t = setInterval(fetch, 15_000)
    return () => clearInterval(t)
  }, [fetch])

  return { balance, xlmBalance, loading, refetch: fetch }
}
