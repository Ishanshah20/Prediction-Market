// ── Premium Market Card ───────────────────────────────────────────────────────

import { Link } from 'react-router-dom'
import { Clock, TrendingUp, CheckCircle, XCircle, Shield, Zap } from 'lucide-react'
import { MarketInfo } from '../hooks/useMarkets'
import { formatXLM } from '../config'

interface MarketCardProps { market: MarketInfo }

const CATEGORY_COLORS: Record<string, string> = {
  sports:   'text-amber-400 bg-amber-400/10 border-amber-400/20',
  crypto:   'text-stellar-400 bg-stellar-400/10 border-stellar-400/20',
  politics: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  default:  'text-slate-400 bg-slate-400/10 border-slate-400/20',
}

export function MarketCard({ market }: MarketCardProps) {
  const totalPool = market.totalYesBets + market.totalNoBets
  const yesPercent = totalPool > 0n ? Number((market.totalYesBets * 100n) / totalPool) : 50
  const isExpired = Date.now() / 1000 > market.deadline
  const timeLeft = getTimeLeft(market.deadline)
  const category = (market as any).category || 'default'
  const catColor = CATEGORY_COLORS[category] || CATEGORY_COLORS.default

  return (
    <Link to={`/market/${market.address}`}
      className="group relative block rounded-2xl border border-slate-800/60
                 bg-[#0d1829]/60 backdrop-blur-sm overflow-hidden
                 hover:border-stellar-700/50 hover:shadow-glow-sm
                 transition-all duration-300 cursor-pointer">

      {/* Top accent line */}
      <div className={`h-0.5 w-full bg-gradient-to-r
        ${market.resolved
          ? market.outcome ? 'from-emerald-500 to-emerald-400' : 'from-rose-500 to-rose-400'
          : isExpired ? 'from-amber-500 to-amber-400'
          : 'from-stellar-500 via-stellar-400 to-oracle-400'}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <StatusBadge resolved={market.resolved} outcome={market.outcome} expired={isExpired} />
            {/* Oracle badge */}
            <span className="oracle-badge">
              <Shield className="w-3 h-3" /> Oracle
            </span>
          </div>
          <div className="flex items-center gap-1 text-slate-500 text-xs">
            <Clock className="w-3 h-3" />
            <span>{timeLeft}</span>
          </div>
        </div>

        {/* Question */}
        <h3 className="text-slate-100 font-semibold text-sm leading-snug mb-4
                       group-hover:text-stellar-300 transition-colors line-clamp-2 min-h-[2.5rem]">
          {market.question}
        </h3>

        {/* Odds display */}
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg
                          px-3 py-2 text-center">
            <div className="text-emerald-400 font-bold text-lg">{yesPercent}%</div>
            <div className="text-slate-500 text-[10px] font-medium">YES</div>
          </div>
          <div className="text-slate-600 text-xs font-bold">vs</div>
          <div className="flex-1 bg-rose-500/10 border border-rose-500/20 rounded-lg
                          px-3 py-2 text-center">
            <div className="text-rose-400 font-bold text-lg">{100 - yesPercent}%</div>
            <div className="text-slate-500 text-[10px] font-medium">NO</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-4">
          <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400
                          rounded-full transition-all duration-700"
               style={{ width: `${yesPercent}%` }} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-slate-500 text-xs">
            <TrendingUp className="w-3 h-3" />
            <span className="font-medium">{formatXLM(totalPool)} XLM</span>
          </div>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${catColor}`}>
            {category}
          </span>
        </div>
      </div>
    </Link>
  )
}

function StatusBadge({ resolved, outcome, expired }:
  { resolved: boolean; outcome: boolean; expired: boolean }) {
  if (resolved) return outcome
    ? <span className="badge bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <CheckCircle className="w-3 h-3" /> YES Won
      </span>
    : <span className="badge bg-rose-500/10 text-rose-400 border border-rose-500/20">
        <XCircle className="w-3 h-3" /> NO Won
      </span>
  if (expired) return (
    <span className="badge bg-amber-500/10 text-amber-400 border border-amber-500/20">
      ⏳ Pending
    </span>
  )
  return (
    <span className="badge bg-stellar-500/10 text-stellar-400 border border-stellar-500/20">
      <Zap className="w-3 h-3" />
      <span className="w-1.5 h-1.5 bg-stellar-400 rounded-full animate-pulse" />
      Live
    </span>
  )
}

function getTimeLeft(deadline: number): string {
  const diff = deadline - Math.floor(Date.now() / 1000)
  if (diff <= 0) return 'Ended'
  const d = Math.floor(diff / 86400)
  const h = Math.floor((diff % 86400) / 3600)
  const m = Math.floor((diff % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}
