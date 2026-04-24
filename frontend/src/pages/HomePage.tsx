// ── Home Page — Premium UI ────────────────────────────────────────────────────

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, RefreshCw, TrendingUp, AlertCircle, Loader2, Shield, Zap, BarChart3 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMarkets } from '../hooks/useMarkets'
import { useXlmBalance } from '../hooks/useXlmBalance'
import { MarketCard } from '../components/MarketCard'
import { CricketMarket } from '../components/CricketMarket'
import { BetModal } from '../components/BetModal'
import { WalletState } from '../hooks/useWallet'
import { placeBet } from '../lib/stellar'

const CRICKET_MARKET_ADDRESS = import.meta.env.VITE_CRICKET_MARKET_ID || ''

interface HomePageProps { wallet: WalletState }

export function HomePage({ wallet }: HomePageProps) {
  const { markets, loading, error, refetch } = useMarkets()
  const { balance, refetch: refetchBalance } = useXlmBalance(wallet.publicKey)
  const [betSide, setBetSide] = useState<'india' | 'pakistan' | null>(null)

  const liveMarkets    = markets.filter(m => !m.resolved && Date.now() / 1000 < m.deadline)
  const resolvedMarkets = markets.filter(m => m.resolved)
  const pendingMarkets  = markets.filter(m => !m.resolved && Date.now() / 1000 >= m.deadline)

  async function handleCricketBet(amount: bigint) {
    if (!wallet.connected || !wallet.publicKey) { toast.error('Connect wallet first'); return }
    if (!CRICKET_MARKET_ADDRESS) {
      toast.success(`Demo bet on ${betSide === 'india' ? '🇮🇳 India' : '🇵🇰 Pakistan'}! Deploy contracts to go live.`)
      return
    }
    toast.loading('Placing bet...', { id: 'cricket-bet' })
    const hash = await placeBet(wallet.publicKey, CRICKET_MARKET_ADDRESS, betSide === 'india', amount, wallet.signTx)
    toast.success(`Bet placed! TX: ${hash.slice(0, 8)}...`, { id: 'cricket-bet' })
    await refetchBalance()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 glass border border-stellar-800/40
                        rounded-full px-4 py-1.5 text-stellar-400 text-sm mb-5">
          <span className="w-2 h-2 bg-stellar-400 rounded-full animate-pulse" />
          Powered by Stellar Soroban + Optimistic Oracle
        </div>
        <h1 className="text-5xl sm:text-6xl font-black text-white mb-5 leading-tight">
          Predict Smarter,{' '}
          <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r
                           from-stellar-400 via-oracle-400 to-emerald-400">
            Win Bigger
          </span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-8">
          Decentralized prediction markets with oracle-verified outcomes.
          Bet XLM on real-world events — sports, crypto, politics.
        </p>

        <div className="flex items-center justify-center gap-3 flex-wrap">
          {wallet.connected ? (
            <Link to="/create" className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create Market
            </Link>
          ) : (
            <button onClick={wallet.connect} className="btn-primary flex items-center gap-2">
              <Zap className="w-4 h-4" /> Connect & Start Betting
            </button>
          )}
          <Link to="/oracle" className="btn-oracle flex items-center gap-2">
            <Shield className="w-4 h-4" /> How Oracle Works
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
        {[
          { label: 'Total Markets', value: markets.length + 1, icon: BarChart3, color: 'text-stellar-400' },
          { label: 'Live Now', value: liveMarkets.length + 1, icon: Zap, color: 'text-emerald-400' },
          { label: 'Resolved', value: resolvedMarkets.length, icon: Shield, color: 'text-oracle-400' },
          { label: 'Total Volume', value: '100K+ XLM', icon: TrendingUp, color: 'text-amber-400' },
        ].map(stat => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="glass rounded-2xl p-4 text-center border border-slate-800/40">
              <Icon className={`w-5 h-5 ${stat.color} mx-auto mb-2`} />
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-slate-500 text-xs mt-0.5">{stat.label}</div>
            </div>
          )
        })}
      </div>

      {/* Featured cricket market */}
      <CricketMarket
        onBet={side => {
          if (!wallet.connected) { wallet.connect(); return }
          setBetSide(side)
        }}
        walletConnected={wallet.connected}
      />

      {/* Market list header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-stellar-400" />
          All Markets
        </h2>
        <button onClick={refetch} disabled={loading}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors
                     text-sm glass px-3 py-1.5 rounded-xl hover:border-slate-600/50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-rose-900/20 border border-rose-800/40
                        rounded-2xl p-4 mb-6 text-rose-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Failed to load markets</p>
            <p className="text-sm text-rose-500">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && markets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mb-3 text-stellar-400" />
          <p>Loading markets from Stellar...</p>
        </div>
      )}

      {/* Empty */}
      {!loading && markets.length === 0 && !error && (
        <div className="text-center py-16">
          <div className="w-16 h-16 glass rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-slate-300 font-bold text-lg mb-2">No on-chain markets yet</h3>
          <p className="text-slate-500 mb-6">Deploy contracts and create your first market!</p>
          {wallet.connected && (
            <Link to="/create" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" /> Create First Market
            </Link>
          )}
        </div>
      )}

      {liveMarkets.length > 0 && (
        <Section title="🟢 Live Markets">
          <MarketGrid markets={liveMarkets} />
        </Section>
      )}
      {pendingMarkets.length > 0 && (
        <Section title="⏳ Awaiting Oracle Resolution">
          <MarketGrid markets={pendingMarkets} />
        </Section>
      )}
      {resolvedMarkets.length > 0 && (
        <Section title="✅ Resolved Markets">
          <MarketGrid markets={resolvedMarkets} />
        </Section>
      )}

      {betSide && (
        <BetModal
          side={betSide}
          balance={balance}
          onConfirm={handleCricketBet}
          onClose={() => setBetSide(null)}
        />
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-10">
      <h3 className="text-slate-300 font-semibold mb-4 flex items-center gap-2">{title}</h3>
      {children}
    </div>
  )
}

function MarketGrid({ markets }: { markets: ReturnType<typeof useMarkets>['markets'] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {markets.map(m => <MarketCard key={m.address} market={m} />)}
    </div>
  )
}
