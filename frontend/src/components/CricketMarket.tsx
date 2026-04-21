// ── Live Cricket Market Card ──────────────────────────────────────────────────
// Featured market: India vs Pakistan — hardcoded demo with live-feel animations

import { useState } from 'react'
import { Trophy, Zap, TrendingUp, Users, Clock } from 'lucide-react'

// Simulated live bet pool — India favored at ~68%
const INDIA_POOL = 68_420
const PAK_POOL = 32_180
const TOTAL_POOL = INDIA_POOL + PAK_POOL
const INDIA_PCT = Math.round((INDIA_POOL / TOTAL_POOL) * 100)
const PAK_PCT = 100 - INDIA_PCT

// Implied odds (like a bookmaker)
const INDIA_ODDS = (TOTAL_POOL / INDIA_POOL).toFixed(2)
const PAK_ODDS = (TOTAL_POOL / PAK_POOL).toFixed(2)

interface CricketMarketProps {
  onBet: (side: 'india' | 'pakistan') => void
  walletConnected: boolean
}

export function CricketMarket({ onBet, walletConnected }: CricketMarketProps) {
  const [hoveredSide, setHoveredSide] = useState<'india' | 'pakistan' | null>(null)

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/30
                    bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20
                    shadow-2xl shadow-amber-900/10 mb-10">

      {/* Live badge */}
      <div className="absolute top-4 right-4 flex items-center gap-1.5
                      bg-red-500/20 border border-red-500/40 rounded-full px-3 py-1">
        <span className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
        <span className="text-red-400 text-xs font-bold tracking-wide">LIVE</span>
      </div>

      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-slate-800/60">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-amber-400 text-xs font-semibold uppercase tracking-wider">
            Featured Match · ICC Champions Trophy 2025
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white">
          🏏 Who will win — India vs Pakistan?
        </h2>
        <div className="flex items-center gap-4 mt-2 text-slate-500 text-sm">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Closes in 2h 34m
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5" />
            1,247 bettors
          </span>
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            {(TOTAL_POOL).toLocaleString()} XLM pool
          </span>
        </div>
      </div>

      {/* Teams */}
      <div className="px-6 py-5">
        <div className="grid grid-cols-2 gap-3 mb-5">

          {/* India */}
          <button
            onClick={() => walletConnected && onBet('india')}
            onMouseEnter={() => setHoveredSide('india')}
            onMouseLeave={() => setHoveredSide(null)}
            disabled={!walletConnected}
            className={`relative group rounded-xl border p-4 text-left transition-all duration-200
              ${hoveredSide === 'india'
                ? 'border-emerald-400 bg-emerald-900/30 shadow-lg shadow-emerald-900/20'
                : 'border-emerald-800/50 bg-emerald-900/10 hover:border-emerald-600'
              }
              disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            {/* Favorite tag */}
            <div className="absolute -top-2.5 left-3">
              <span className="bg-emerald-500 text-white text-[10px] font-bold
                               px-2 py-0.5 rounded-full uppercase tracking-wide">
                Favourite
              </span>
            </div>

            <div className="flex items-center gap-3 mb-3 mt-1">
              <span className="text-3xl">🇮🇳</span>
              <div>
                <div className="font-bold text-white text-lg">India</div>
                <div className="text-emerald-400 text-xs">Team India</div>
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="text-emerald-400 text-2xl font-bold">{INDIA_PCT}%</div>
                <div className="text-slate-500 text-xs">win probability</div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold text-lg">{INDIA_ODDS}x</div>
                <div className="text-slate-500 text-xs">payout</div>
              </div>
            </div>

            <div className="mt-3 text-center text-xs font-semibold text-emerald-400
                            opacity-0 group-hover:opacity-100 transition-opacity">
              {walletConnected ? 'Click to bet YES →' : 'Connect wallet to bet'}
            </div>
          </button>

          {/* Pakistan */}
          <button
            onClick={() => walletConnected && onBet('pakistan')}
            onMouseEnter={() => setHoveredSide('pakistan')}
            onMouseLeave={() => setHoveredSide(null)}
            disabled={!walletConnected}
            className={`relative group rounded-xl border p-4 text-left transition-all duration-200
              ${hoveredSide === 'pakistan'
                ? 'border-emerald-400 bg-emerald-900/20 shadow-lg shadow-emerald-900/10'
                : 'border-slate-700/50 bg-slate-800/30 hover:border-slate-600'
              }
              disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center gap-3 mb-3">
              <span className="text-3xl">🇵🇰</span>
              <div>
                <div className="font-bold text-white text-lg">Pakistan</div>
                <div className="text-slate-400 text-xs">Men in Green</div>
              </div>
            </div>

            <div className="flex items-end justify-between">
              <div>
                <div className="text-slate-300 text-2xl font-bold">{PAK_PCT}%</div>
                <div className="text-slate-500 text-xs">win probability</div>
              </div>
              <div className="text-right">
                <div className="text-white font-bold text-lg">{PAK_ODDS}x</div>
                <div className="text-slate-500 text-xs">payout</div>
              </div>
            </div>

            <div className="mt-3 text-center text-xs font-semibold text-slate-400
                            opacity-0 group-hover:opacity-100 transition-opacity">
              {walletConnected ? 'Click to bet YES →' : 'Connect wallet to bet'}
            </div>
          </button>
        </div>

        {/* Probability bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              🇮🇳 India {INDIA_PCT}%
            </span>
            <span className="text-slate-400 font-semibold flex items-center gap-1">
              {PAK_PCT}% Pakistan 🇵🇰
            </span>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden flex">
            <div
              className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 transition-all duration-700"
              style={{ width: `${INDIA_PCT}%` }}
            />
            <div
              className="h-full bg-gradient-to-r from-slate-600 to-slate-500 flex-1"
            />
          </div>
        </div>

        {/* Pool breakdown */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-emerald-900/20 border border-emerald-900/40 rounded-lg py-2 px-3">
            <div className="text-emerald-400 font-bold text-sm">
              {INDIA_POOL.toLocaleString()}
            </div>
            <div className="text-slate-600 text-xs">India pool</div>
          </div>
          <div className="bg-slate-800/50 border border-slate-700/40 rounded-lg py-2 px-3">
            <div className="text-amber-400 font-bold text-sm">
              {TOTAL_POOL.toLocaleString()}
            </div>
            <div className="text-slate-600 text-xs">Total XLM</div>
          </div>
          <div className="bg-slate-800/30 border border-slate-700/40 rounded-lg py-2 px-3">
            <div className="text-slate-300 font-bold text-sm">
              {PAK_POOL.toLocaleString()}
            </div>
            <div className="text-slate-600 text-xs">Pakistan pool</div>
          </div>
        </div>

        {/* Recent bets ticker */}
        <RecentBetsTicker />
      </div>
    </div>
  )
}

// ── Scrolling recent bets ─────────────────────────────────────────────────────

const RECENT_BETS = [
  { user: 'G3xK...f9aB', side: 'India', amount: 500, time: '12s ago' },
  { user: 'HBQR...2mNc', side: 'Pakistan', amount: 200, time: '45s ago' },
  { user: 'SADF...kL9p', side: 'India', amount: 1200, time: '1m ago' },
  { user: 'MNOP...3rTy', side: 'India', amount: 750, time: '2m ago' },
  { user: 'WXYZ...8uVw', side: 'Pakistan', amount: 300, time: '3m ago' },
  { user: 'ABCD...5sEf', side: 'India', amount: 2000, time: '4m ago' },
]

function RecentBetsTicker() {
  return (
    <div className="mt-4 border-t border-slate-800/60 pt-3">
      <div className="text-slate-600 text-xs mb-2 flex items-center gap-1">
        <Zap className="w-3 h-3" /> Recent bets
      </div>
      <div className="space-y-1.5 max-h-24 overflow-hidden">
        {RECENT_BETS.map((bet, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="text-slate-500 font-mono">{bet.user}</span>
            <span className={`font-semibold ${bet.side === 'India' ? 'text-emerald-400' : 'text-slate-300'}`}>
              {bet.side === 'India' ? '🇮🇳' : '🇵🇰'} {bet.side}
            </span>
            <span className="text-amber-400 font-medium">{bet.amount} XLM</span>
            <span className="text-slate-600">{bet.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
