// ── Stellar Network Configuration ────────────────────────────────────────────

export const NETWORK = import.meta.env.VITE_NETWORK || 'testnet'
export const RPC_URL =
  import.meta.env.VITE_RPC_URL || 'https://soroban-testnet.stellar.org'
export const NETWORK_PASSPHRASE =
  import.meta.env.VITE_NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015'

export const FACTORY_CONTRACT_ID = import.meta.env.VITE_FACTORY_CONTRACT_ID || ''

// XLM uses 7 decimal places (stroops)
export const XLM_DECIMALS = 7
export const XLM_FACTOR = 10 ** XLM_DECIMALS

/** Format stroops → human-readable XLM  e.g. 10_000_000n → "1.00" */
export function formatXLM(raw: bigint | string | number): string {
  const n = BigInt(raw)
  const whole = n / BigInt(XLM_FACTOR)
  const frac = n % BigInt(XLM_FACTOR)
  const fracStr = frac.toString().padStart(XLM_DECIMALS, '0').replace(/0+$/, '')
  return fracStr ? `${whole}.${fracStr}` : whole.toString()
}

/** Parse human-readable XLM → stroops  e.g. "1.5" → 15_000_000n */
export function parseXLM(amount: string): bigint {
  if (!amount || isNaN(parseFloat(amount))) return 0n
  const [whole, frac = ''] = amount.split('.')
  const fracPadded = frac.padEnd(XLM_DECIMALS, '0').slice(0, XLM_DECIMALS)
  return BigInt(whole || '0') * BigInt(XLM_FACTOR) + BigInt(fracPadded || '0')
}

// Keep old name as alias so existing imports don't break
export const formatTokenAmount = formatXLM
export const parseTokenAmount = parseXLM
