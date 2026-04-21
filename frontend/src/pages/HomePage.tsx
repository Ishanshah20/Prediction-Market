// ── Home Page ─────────────────────────────────────────────────────────────────

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Plus, RefreshCw, TrendingUp, AlertCircle, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useMarkets } from '../hooks/useMarkets'
import { useTokenBalance } from '../hooks/useTokenBalance'
import { MarketCard } from '../components/MarketCard'
import { CricketMarket } from '../components/CricketMarket'
import { BetModal } from '../components/BetModal'
import { WalletState } from '../hooks/useWallet'
import { placeBet } from '../lib/stellar'

// Demo cricket market address — replace with real deployed address
const CRICKET_MARKET_ADDRESS = import.meta.env.VITE_CRICKET_MARKET_ID || ''

interface HomePageProps {
  wallet: WalletState
}

export function HomePage({ wallet }: HomePageProps) {
  const { markets, loading, error, refetch } = useMarkets()
  const { balance, refetch: refetchBalance } = useTokenBalance(wallet.publicKey)
  const [betSide, setBetSide] = useState<'india' | 'pakistan' | null>(null)

  const liveMarkets = markets.filter(m => !m.resolved && Date.now() / 1000 < m.deadline)
  const resolvedMarkets = markets.filter(m => m.resolved)
  const pendingMarkets = markets.filter(m => !m.resolved && Date.now() / 1000 >= m.deadline)

  async function handleCricketBet(amount: bigint) {
    if (!wallet.connected || !wallet.publicKey) {
      toast.error('Connect your wallet first')
      return
    }
    if (!CRICKET_MARKET_ADDRESS) {
      // Demo mode — no contract deployed yet
      toast.success(`Demo bet placed on ${betSide === 'india' ? '🇮🇳 India' : '🇵🇰 Pakistan'}! Deploy contracts to make it real.`)
      return
    }
    // Real on-chain bet
    toast.loading('Placing bet...', { id: 'cricket-bet' })
    const prediction = betSide === 'india'
    const hash = await placeBet(wallet.publicKey, CRICKET_MARKET_ADDRESS, prediction, amount, wallet.signTx)
    toast.success(`Bet placed! TX: ${hash.slice(0, 8)}...`, { id: 'cricket-bet' })
    await refetchBalance()
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Hero */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-stellar-900/30 border border-stellar-800
                        rounded-full px-4 py-1.5 text-stellar-400 text-sm mb-4">
          <span className="w-2 h-2 bg-stellar-400 rounded-full animate-pulse" />
          Powered by Stellar Soroban
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
          Predict the Future,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-stellar-400 to-emerald-400">
            Earn Rewards
          </span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Bet on real-world outcomes using XLM on the Stellar network.
          Fast, cheap, and decentralized.
        </p>
        {wallet.connected && (
          <Link to="/create" className="btn-primary inline-flex items-center gap-2 mt-6">
            <Plus className="w-4 h-4" /> Create Market
          </Link>
        )}
      </div>

      {/* ── Featured Cricket Market ── */}
      <CricketMarket
        onBet={(side) => {
          if (!wallet.connected) { wallet.connect(); return }
          setBetSide(side)
        }}
        walletConnected={wallet.connected}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total Markets', value: markets.length + 1 },
          { label: 'Live Markets', value: liveMarkets.length + 1 },
          { label: 'Resolved', value: resolvedMarkets.length },
        ].map(stat => (
          <div key={stat.label} className="card text-center py-4">
            <div className="text-2xl font-bold text-white">{stat.value}</div>
            <div className="text-slate-500 text-sm">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-stellar-400" />
          All Markets
        </h2>
        <button
          onClick={refetch}
          disabled={loading}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors
                     text-sm bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-rose-900/20 border border-rose-800
                        rounded-xl p-4 mb-6 text-rose-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">Failed to load markets</p>
            <p className="text-sm text-rose-500">{error}</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && markets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin mb-3" />
          <p>Loading markets from Stellar...</p>
        </div>
      )}

      {/* Empty */}
      {!loading && markets.length === 0 && !error && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-slate-300 font-semibold text-lg mb-2">No on-chain markets yet</h3>
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
        <Section title="⏳ Awaiting Resolution">
          <MarketGrid markets={pendingMarkets} />
        </Section>
      )}
      {resolvedMarkets.length > 0 && (
        <Section title="✅ Resolved Markets">
          <MarketGrid markets={resolvedMarkets} />
        </Section>
      )}

      {/* Bet modal */}
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
      <h3 className="text-slate-300 font-medium mb-4">{title}</h3>
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
