// ── Featured Cricket Market — Premium UI ─────────────────────────────────────

import { useState, useEffect } from 'react'
import { Trophy, Zap, TrendingUp, Users, Clock, Shield, Activity } from 'lucide-react'

const INDIA_POOL  = 68_420
const PAK_POOL    = 32_180
const TOTAL_POOL  = INDIA_POOL + PAK_POOL
const INDIA_PCT   = Math.round((INDIA_POOL / TOTAL_POOL) * 100)
const PAK_PCT     = 100 - INDIA_PCT
const INDIA_ODDS  = (TOTAL_POOL / INDIA_POOL).toFixed(2)
const PAK_ODDS    = (TOTAL_POOL / PAK_POOL).toFixed(2)

const RECENT_BETS = [
  { user: 'G3xK...f9aB', side: 'India',    amount: 500,  time: '12s' },
  { user: 'HBQR...2mNc', side: 'Pakistan', amount: 200,  time: '45s' },
  { user: 'SADF...kL9p', side: 'India',    amount: 1200, time: '1m'  },
  { user: 'MNOP...3rTy', side: 'India',    amount: 750,  time: '2m'  },
  { user: 'WXYZ...8uVw', side: 'Pakistan', amount: 300,  time: '3m'  },
  { user: 'ABCD...5sEf', side: 'India',    amount: 2000, time: '4m'  },
]

interface CricketMarketProps {
  onBet: (side: 'india' | 'pakistan') => void
  walletConnected: boolean
}

export function CricketMarket({ onBet, walletConnected }: CricketMarketProps) {
  const [hovered, setHovered] = useState<'india' | 'pakistan' | null>(null)
  const [timeLeft, setTimeLeft] = useState('2h 34m 12s')

  // Countdown timer
  useEffect(() => {
    const target = Date.now() + (2 * 3600 + 34 * 60 + 12) * 1000
    const t = setInterval(() => {
      const diff = Math.max(0, Math.floor((target - Date.now()) / 1000))
      const h = Math.floor(diff / 3600)
      const m = Math.floor((diff % 3600) / 60)
      const s = diff % 60
      setTimeLeft(`${h}h ${m}m ${s}s`)
      if (diff === 0) clearInterval(t)
    }, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="relative overflow-hidden rounded-2xl mb-10"
         style={{
           background: 'linear-gradient(135deg, #0d1829 0%, #0a1520 50%, #0d1020 100%)',
           border: '1px solid rgba(245, 158, 11, 0.2)',
           boxShadow: '0 0 40px rgba(245, 158, 11, 0.05), 0 4px 24px rgba(0,0,0,0.5)',
         }}>

      {/* Background glow effects */}
      <div className="absolute top-0 left-1/4 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Top bar */}
      <div className="h-0.5 w-full bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500" />

      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-slate-800/40">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex items-center gap-1.5 bg-red-500/15 border border-red-500/30
                              rounded-full px-2.5 py-0.5">
                <span className="w-1.5 h-1.5 bg-red-400 rounded-full animate-pulse" />
                <span className="text-red-400 text-[10px] font-black tracking-widest uppercase">Live</span>
              </div>
              <span className="text-amber-400/70 text-xs font-medium">ICC Champions Trophy 2025</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              🏏 India vs Pakistan
            </h2>
            <p className="text-slate-400 text-sm mt-0.5">Who will win the match?</p>
          </div>

          {/* Oracle status */}
          <div className="oracle-badge flex-shrink-0">
            <Shield className="w-3 h-3" />
            Oracle Verified
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-amber-400 font-mono font-bold">{timeLeft}</span>
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" /> 1,247 bettors
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            {TOTAL_POOL.toLocaleString()} XLM
          </span>
          <span className="flex items-center gap-1">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-emerald-400">High activity</span>
          </span>
        </div>
      </div>

      {/* Main betting area */}
      <div className="px-6 py-5">
        <div className="grid grid-cols-2 gap-4 mb-5">

          {/* India */}
          <button
            onClick={() => walletConnected && onBet('india')}
            onMouseEnter={() => setHovered('india')}
            onMouseLeave={() => setHovered(null)}
            disabled={!walletConnected}
            className={`relative group rounded-2xl border p-5 text-left transition-all duration-300
              disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden
              ${hovered === 'india'
                ? 'border-emerald-400/60 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
                : 'border-emerald-800/40 hover:border-emerald-600/50'}`}
            style={{
              background: hovered === 'india'
                ? 'linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.05) 100%)'
                : 'linear-gradient(135deg, rgba(16,185,129,0.06) 0%, transparent 100%)',
            }}>

            {/* Favourite ribbon */}
            <div className="absolute -top-px -right-px">
              <div className="bg-emerald-500 text-white text-[9px] font-black
                              px-3 py-0.5 rounded-bl-xl uppercase tracking-wider">
                Favourite
              </div>
            </div>

            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">🇮🇳</span>
              <div>
                <div className="font-black text-white text-xl">India</div>
                <div className="text-emerald-400 text-xs font-medium">Team India</div>
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="text-emerald-400 text-3xl font-black">{INDIA_PCT}%</div>
                <div className="text-slate-500 text-xs">probability</div>
              </div>
              <div className="text-right">
                <div className="text-white font-black text-2xl">{INDIA_ODDS}x</div>
                <div className="text-slate-500 text-xs">payout</div>
              </div>
            </div>

            {walletConnected && (
              <div className={`mt-3 text-center text-xs font-bold text-emerald-400
                              transition-all duration-200
                              ${hovered === 'india' ? 'opacity-100' : 'opacity-0'}`}>
                Click to bet India →
              </div>
            )}
          </button>

          {/* Pakistan */}
          <button
            onClick={() => walletConnected && onBet('pakistan')}
            onMouseEnter={() => setHovered('pakistan')}
            onMouseLeave={() => setHovered(null)}
            disabled={!walletConnected}
            className={`relative group rounded-2xl border p-5 text-left transition-all duration-300
              disabled:opacity-60 disabled:cursor-not-allowed overflow-hidden
              ${hovered === 'pakistan'
                ? 'border-slate-400/60 shadow-[0_0_30px_rgba(148,163,184,0.15)]'
                : 'border-slate-700/40 hover:border-slate-600/50'}`}
            style={{
              background: hovered === 'pakistan'
                ? 'linear-gradient(135deg, rgba(148,163,184,0.08) 0%, transparent 100%)'
                : 'linear-gradient(135deg, rgba(148,163,184,0.03) 0%, transparent 100%)',
            }}>

            <div className="flex items-center gap-3 mb-4">
              <span className="text-4xl">🇵🇰</span>
              <div>
                <div className="font-black text-white text-xl">Pakistan</div>
                <div className="text-slate-400 text-xs font-medium">Men in Green</div>
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="text-slate-300 text-3xl font-black">{PAK_PCT}%</div>
                <div className="text-slate-500 text-xs">probability</div>
              </div>
              <div className="text-right">
                <div className="text-white font-black text-2xl">{PAK_ODDS}x</div>
                <div className="text-slate-500 text-xs">payout</div>
              </div>
            </div>

            {walletConnected && (
              <div className={`mt-3 text-center text-xs font-bold text-slate-400
                              transition-all duration-200
                              ${hovered === 'pakistan' ? 'opacity-100' : 'opacity-0'}`}>
                Click to bet Pakistan →
              </div>
            )}
          </button>
        </div>

        {/* Probability bar */}
        <div className="mb-5">
          <div className="flex justify-between text-xs mb-1.5 font-semibold">
            <span className="text-emerald-400">🇮🇳 India {INDIA_PCT}%</span>
            <span className="text-slate-400">{PAK_PCT}% Pakistan 🇵🇰</span>
          </div>
          <div className="h-2.5 bg-slate-800/80 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
                 style={{
                   width: `${INDIA_PCT}%`,
                   background: 'linear-gradient(90deg, #059669, #34d399)',
                 }} />
          </div>
        </div>

        {/* Pool stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'India Pool', value: INDIA_POOL.toLocaleString(), color: 'text-emerald-400', bg: 'bg-emerald-500/5 border-emerald-500/15' },
            { label: 'Total XLM', value: TOTAL_POOL.toLocaleString(), color: 'text-amber-400', bg: 'bg-amber-500/5 border-amber-500/15' },
            { label: 'Pakistan Pool', value: PAK_POOL.toLocaleString(), color: 'text-slate-300', bg: 'bg-slate-500/5 border-slate-500/15' },
          ].map(s => (
            <div key={s.label} className={`rounded-xl border p-3 text-center ${s.bg}`}>
              <div className={`font-bold text-sm ${s.color}`}>{s.value}</div>
              <div className="text-slate-600 text-[10px] mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Connect prompt */}
        {!walletConnected && (
          <div className="text-center py-2 text-slate-500 text-sm">
            Connect wallet to place a bet
          </div>
        )}

        {/* Recent bets ticker */}
        <div className="border-t border-slate-800/40 pt-3">
          <div className="flex items-center gap-1.5 text-slate-600 text-[10px] mb-2 font-semibold uppercase tracking-wider">
            <Zap className="w-3 h-3" /> Live bets
          </div>
          <div className="ticker-wrap">
            <div className="ticker-inner gap-8">
              {[...RECENT_BETS, ...RECENT_BETS].map((bet, i) => (
                <span key={i} className="inline-flex items-center gap-2 text-xs mr-8">
                  <span className="text-slate-600 font-mono">{bet.user}</span>
                  <span className={`font-bold ${bet.side === 'India' ? 'text-emerald-400' : 'text-slate-300'}`}>
                    {bet.side === 'India' ? '🇮🇳' : '🇵🇰'} {bet.side}
                  </span>
                  <span className="text-amber-400 font-semibold">{bet.amount} XLM</span>
                  <span className="text-slate-700">{bet.time} ago</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
