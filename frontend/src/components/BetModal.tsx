// ── Bet Modal ─────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { X, Loader2, Trophy, AlertCircle } from 'lucide-react'
import { formatXLM, parseXLM } from '../config'

interface BetModalProps {
  side: 'india' | 'pakistan'
  balance: bigint          // in stroops
  onConfirm: (amount: bigint) => Promise<void>
  onClose: () => void
}

const INDIA_ODDS  = 1.47
const PAK_ODDS    = 3.12

export function BetModal({ side, balance, onConfirm, onClose }: BetModalProps) {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isIndia = side === 'india'
  const odds    = isIndia ? INDIA_ODDS : PAK_ODDS
  const flag    = isIndia ? '🇮🇳' : '🇵🇰'
  const name    = isIndia ? 'India' : 'Pakistan'

  const parsedAmount   = parseXLM(amount)
  const estimatedReturn = parsedAmount > 0n
    ? (parsedAmount * BigInt(Math.round(odds * 100))) / 100n
    : 0n

  async function handleConfirm() {
    setError('')
    if (!amount || parsedAmount <= 0n) { setError('Enter an amount'); return }
    if (parsedAmount > balance)        { setError('Insufficient XLM balance'); return }
    setLoading(true)
    try {
      await onConfirm(parsedAmount)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Transaction failed')
    } finally {
      setLoading(false)
    }
  }

  const QUICK = ['10', '50', '100', '500']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl
                      w-full max-w-sm shadow-2xl"
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{flag}</span>
            <div>
              <div className="font-bold text-white">Bet on {name}</div>
              <div className="text-slate-500 text-xs">India vs Pakistan · ICC 2025</div>
            </div>
          </div>
          <button onClick={onClose}
                  className="text-slate-500 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Odds */}
          <div className={`rounded-xl p-3 flex items-center justify-between
            ${isIndia
              ? 'bg-emerald-900/20 border border-emerald-800/40'
              : 'bg-slate-800/50 border border-slate-700/40'}`}>
            <div>
              <div className="text-slate-400 text-xs">Current odds</div>
              <div className={`text-2xl font-bold ${isIndia ? 'text-emerald-400' : 'text-white'}`}>
                {odds}x
              </div>
            </div>
            <div className="text-right">
              <div className="text-slate-400 text-xs">Win probability</div>
              <div className="text-white font-bold text-lg">
                {isIndia ? '68%' : '32%'}
              </div>
            </div>
          </div>

          {/* Amount input */}
          <div>
            <div className="flex justify-between text-sm mb-2">
              <label className="text-slate-400">Bet amount</label>
              <span className="text-slate-500 flex items-center gap-1">
                <span>⭐</span>
                Balance: <span className="text-white font-semibold ml-1">{formatXLM(balance)} XLM</span>
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={e => { setAmount(e.target.value); setError('') }}
                placeholder="0"
                min="0"
                step="0.1"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3
                           text-white text-lg placeholder-slate-600 pr-20
                           focus:outline-none focus:border-stellar-500 focus:ring-1 focus:ring-stellar-500"
              />
              {/* XLM label inside input */}
              <div className="absolute right-10 top-1/2 -translate-y-1/2 flex items-center gap-1
                              text-stellar-400 font-semibold text-sm pointer-events-none">
                <span>⭐</span><span>XLM</span>
              </div>
              <button
                onClick={() => setAmount(formatXLM(balance))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px]
                           text-stellar-400 hover:text-stellar-300 font-bold bg-stellar-900/40
                           px-1.5 py-0.5 rounded"
              >
                MAX
              </button>
            </div>

            {/* Quick amounts */}
            <div className="flex gap-2 mt-2">
              {QUICK.map(q => (
                <button key={q}
                  onClick={() => setAmount(q)}
                  className="flex-1 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700
                             text-slate-400 hover:text-white rounded-lg py-1.5 transition-colors">
                  {q} XLM
                </button>
              ))}
            </div>
          </div>

          {/* Estimated return */}
          {parsedAmount > 0n && (
            <div className="bg-slate-800/50 rounded-xl p-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-400 text-sm">
                <Trophy className="w-4 h-4 text-amber-400" />
                Estimated return
              </div>
              <div className="text-amber-400 font-bold flex items-center gap-1">
                <span>⭐</span>
                ~{formatXLM(estimatedReturn)} XLM
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-rose-400 text-sm bg-rose-900/20
                            border border-rose-800/40 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Confirm */}
          <button
            onClick={handleConfirm}
            disabled={loading || !amount || parsedAmount <= 0n}
            className={`w-full py-3 rounded-xl font-bold text-white flex items-center
                        justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed
              ${isIndia
                ? 'bg-emerald-500 hover:bg-emerald-400'
                : 'bg-stellar-500 hover:bg-stellar-400'}`}
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Placing bet...</>
              : <>{flag} Bet {name}{amount ? ` · ${amount} XLM` : ''}</>
            }
          </button>

          <p className="text-slate-600 text-xs text-center">
            Bets are placed on-chain via Stellar Soroban
          </p>
        </div>
      </div>
    </div>
  )
}
