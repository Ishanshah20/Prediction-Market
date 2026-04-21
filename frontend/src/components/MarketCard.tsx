// ── MarketCard Component ──────────────────────────────────────────────────────

import { Link } from 'react-router-dom'
import { Clock, TrendingUp, CheckCircle, XCircle } from 'lucide-react'
import { MarketInfo } from '../hooks/useMarkets'
import { formatTokenAmount } from '../config'

interface MarketCardProps {
  market: MarketInfo
}

export function MarketCard({ market }: MarketCardProps) {
  const totalPool = market.totalYesBets + market.totalNoBets
  const yesPercent =
    totalPool > 0n
      ? Number((market.totalYesBets * 100n) / totalPool)
      : 50

  const isExpired = Date.now() / 1000 > market.deadline
  const timeLeft = getTimeLeft(market.deadline)

  return (
    <Link
      to={`/market/${market.address}`}
      className="card hover:border-stellar-700 hover:shadow-stellar-900/20 transition-all
                 duration-200 group cursor-pointer block"
    >
      {/* Status badge */}
      <div className="flex items-start justify-between mb-3">
        <StatusBadge resolved={market.resolved} outcome={market.outcome} expired={isExpired} />
        <div className="flex items-center gap-1 text-slate-500 text-xs">
          <Clock className="w-3 h-3" />
          <span>{timeLeft}</span>
        </div>
      </div>

      {/* Question */}
      <h3 className="text-slate-100 font-semibold text-base leading-snug mb-4
                     group-hover:text-stellar-300 transition-colors line-clamp-2">
        {market.question}
      </h3>

      {/* YES/NO bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-emerald-400 font-medium">YES {yesPercent}%</span>
          <span className="text-rose-400 font-medium">NO {100 - yesPercent}%</span>
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full
                       transition-all duration-500"
            style={{ width: `${yesPercent}%` }}
          />
        </div>
      </div>

      {/* Pool info */}
      <div className="flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-1">
          <TrendingUp className="w-3 h-3" />
          <span>Pool: {formatTokenAmount(totalPool)} XLM</span>
        </div>
        <span className="text-slate-600 font-mono text-[10px]">
          {market.address.slice(0, 8)}...
        </span>
      </div>
    </Link>
  )
}

function StatusBadge({
  resolved,
  outcome,
  expired,
}: {
  resolved: boolean
  outcome: boolean
  expired: boolean
}) {
  if (resolved) {
    return outcome ? (
      <span className="badge bg-emerald-900/50 text-emerald-400 border border-emerald-800">
        <CheckCircle className="w-3 h-3 mr-1" /> YES Won
      </span>
    ) : (
      <span className="badge bg-rose-900/50 text-rose-400 border border-rose-800">
        <XCircle className="w-3 h-3 mr-1" /> NO Won
      </span>
    )
  }
  if (expired) {
    return (
      <span className="badge bg-amber-900/50 text-amber-400 border border-amber-800">
        Awaiting Result
      </span>
    )
  }
  return (
    <span className="badge bg-stellar-900/50 text-stellar-400 border border-stellar-800">
      <span className="w-1.5 h-1.5 bg-stellar-400 rounded-full mr-1.5 animate-pulse inline-block" />
      Live
    </span>
  )
}

function getTimeLeft(deadline: number): string {
  const now = Math.floor(Date.now() / 1000)
  const diff = deadline - now
  if (diff <= 0) return 'Ended'
  const days = Math.floor(diff / 86400)
  const hours = Math.floor((diff % 86400) / 3600)
  const mins = Math.floor((diff % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h left`
  if (hours > 0) return `${hours}h ${mins}m left`
  return `${mins}m left`
}
