// ── Market Detail Page ────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft, Clock, TrendingUp, CheckCircle, XCircle,
  Loader2, AlertCircle, Trophy, Coins,
} from 'lucide-react'
import toast from 'react-hot-toast'
import {
  SorobanRpc, Contract, TransactionBuilder, BASE_FEE,
  Account, scValToNative,
} from '@stellar/stellar-sdk'
import { WalletState } from '../hooks/useWallet'
import { useXlmBalance } from '../hooks/useXlmBalance'
import { RPC_URL, NETWORK_PASSPHRASE, formatXLM, parseXLM } from '../config'
import { placeBet, claimReward } from '../lib/stellar'
import { MarketInfo } from '../hooks/useMarkets'

const DUMMY = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN'

interface MarketPageProps {
  wallet: WalletState
}

export function MarketPage({ wallet }: MarketPageProps) {
  const { address } = useParams<{ address: string }>()
  const [market, setMarket] = useState<MarketInfo | null>(null)
  const [userBet, setUserBet] = useState<{ prediction: boolean; amount: bigint } | null>(null)
  const [hasClaimed, setHasClaimed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [betAmount, setBetAmount] = useState('')
  const [txLoading, setTxLoading] = useState(false)

  const { balance, xlmBalance, refetch: refetchBalance } = useXlmBalance(wallet.publicKey)

  useEffect(() => {
    if (!address) return
    fetchMarketData()
    const interval = setInterval(fetchMarketData, 15_000)
    return () => clearInterval(interval)
  }, [address, wallet.publicKey])

  async function fetchMarketData() {
    if (!address) return
    try {
      const server = new SorobanRpc.Server(RPC_URL)
      const contract = new Contract(address)
      const account = new Account(DUMMY, '0')

      const infoTx = new TransactionBuilder(account, {
        fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE,
      }).addOperation(contract.call('get_market_info')).setTimeout(30).build()

      const infoSim = await server.simulateTransaction(infoTx)
      if (SorobanRpc.Api.isSimulationSuccess(infoSim) && infoSim.result?.retval) {
        const native = scValToNative(infoSim.result.retval) as Record<string, unknown>
        setMarket({
          address: address!,
          question: native.question as string,
          deadline: Number(native.deadline),
          totalYesBets: BigInt(String(native.total_yes_bets ?? 0)),
          totalNoBets: BigInt(String(native.total_no_bets ?? 0)),
          resolved: Boolean(native.resolved),
          outcome: Boolean(native.outcome),
          tokenAddress: String(native.token_address ?? ''),
        })
      }

      if (wallet.publicKey) {
        const { Address } = await import('@stellar/stellar-sdk')

        const betTx = new TransactionBuilder(account, {
          fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE,
        }).addOperation(
          contract.call('get_user_bet', Address.fromString(wallet.publicKey).toScVal()),
        ).setTimeout(30).build()

        const betSim = await server.simulateTransaction(betTx)
        if (SorobanRpc.Api.isSimulationSuccess(betSim) && betSim.result?.retval) {
          const betNative = scValToNative(betSim.result.retval) as Record<string, unknown> | null
          if (betNative) {
            setUserBet({
              prediction: Boolean(betNative.prediction),
              amount: BigInt(String(betNative.amount ?? 0)),
            })
          }
        }

        const claimTx = new TransactionBuilder(account, {
          fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE,
        }).addOperation(
          contract.call('has_claimed', Address.fromString(wallet.publicKey).toScVal()),
        ).setTimeout(30).build()

        const claimSim = await server.simulateTransaction(claimTx)
        if (SorobanRpc.Api.isSimulationSuccess(claimSim) && claimSim.result?.retval) {
          setHasClaimed(Boolean(scValToNative(claimSim.result.retval)))
        }
      }
    } catch (err) {
      console.error('fetchMarketData error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleBet(prediction: boolean) {
    if (!wallet.connected || !address) { toast.error('Connect your wallet first'); return }
    if (!betAmount || parseFloat(betAmount) <= 0) { toast.error('Enter a valid amount'); return }

    const amount = parseXLM(betAmount)
    if (amount > balance) { toast.error('Insufficient XLM balance'); return }

    setTxLoading(true)
    try {
      toast.loading('Placing bet...', { id: 'bet' })
      const hash = await placeBet(wallet.publicKey!, address, prediction, amount, wallet.signTx)
      toast.success(`Bet placed! TX: ${hash.slice(0, 8)}...`, { id: 'bet' })
      setBetAmount('')
      await fetchMarketData()
      await refetchBalance()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Transaction failed', { id: 'bet' })
    } finally {
      setTxLoading(false)
    }
  }

  async function handleClaim() {
    if (!wallet.connected || !address) return
    setTxLoading(true)
    try {
      toast.loading('Claiming reward...', { id: 'claim' })
      const hash = await claimReward(wallet.publicKey!, address, wallet.signTx)
      toast.success(`Reward claimed! TX: ${hash.slice(0, 8)}...`, { id: 'claim' })
      await fetchMarketData()
      await refetchBalance()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Claim failed', { id: 'claim' })
    } finally {
      setTxLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-stellar-400" />
      </div>
    )
  }

  if (!market) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-rose-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Market not found</h2>
        <Link to="/" className="btn-primary inline-flex items-center gap-2 mt-4">
          <ArrowLeft className="w-4 h-4" /> Back to Markets
        </Link>
      </div>
    )
  }

  const totalPool  = market.totalYesBets + market.totalNoBets
  const yesPercent = totalPool > 0n ? Number((market.totalYesBets * 100n) / totalPool) : 50
  const isExpired  = Date.now() / 1000 > market.deadline
  const canBet     = wallet.connected && !isExpired && !market.resolved && !userBet
  const canClaim   = wallet.connected && market.resolved && userBet
                     && userBet.prediction === market.outcome && !hasClaimed

  let estimatedReward = 0n
  if (userBet && totalPool > 0n) {
    const winPool = userBet.prediction ? market.totalYesBets : market.totalNoBets
    if (winPool > 0n) estimatedReward = (userBet.amount * totalPool) / winPool
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-white
                              transition-colors text-sm mb-6">
        <ArrowLeft className="w-4 h-4" /> All Markets
      </Link>

      {/* Market header */}
      <div className="card mb-6">
        <div className="flex items-start justify-between mb-4">
          <MarketStatusBadge resolved={market.resolved} outcome={market.outcome} expired={isExpired} />
          <div className="flex items-center gap-1 text-slate-500 text-sm">
            <Clock className="w-4 h-4" />
            <span>{getTimeLeft(market.deadline)}</span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-6 leading-snug">{market.question}</h1>

        {/* YES/NO bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-emerald-400 font-semibold">YES {yesPercent}%</span>
            <span className="text-rose-400 font-semibold">NO {100 - yesPercent}%</span>
          </div>
          <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full
                            transition-all duration-700"
                 style={{ width: `${yesPercent}%` }} />
          </div>
        </div>

        {/* Pool stats */}
        <div className="grid grid-cols-3 gap-4">
          <Stat label="YES Pool"   value={`${formatXLM(market.totalYesBets)} XLM`} color="emerald" />
          <Stat label="NO Pool"    value={`${formatXLM(market.totalNoBets)} XLM`}  color="rose" />
          <Stat label="Total Pool" value={`${formatXLM(totalPool)} XLM`}           color="stellar" />
        </div>
      </div>

      {/* User bet */}
      {userBet && (
        <div className="card mb-6 border-stellar-800 bg-stellar-900/20">
          <div className="flex items-center gap-2 mb-3">
            <Coins className="w-5 h-5 text-stellar-400" />
            <h3 className="font-semibold text-white">Your Bet</h3>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className={`font-bold text-lg ${userBet.prediction ? 'text-emerald-400' : 'text-rose-400'}`}>
                {userBet.prediction ? 'YES' : 'NO'}
              </span>
              <span className="text-slate-400 ml-2 flex items-center gap-1 inline-flex">
                <span>⭐</span>{formatXLM(userBet.amount)} XLM
              </span>
            </div>
            {market.resolved && (
              <div className="text-right">
                <div className="text-slate-500 text-xs">Potential reward</div>
                <div className="text-stellar-400 font-semibold flex items-center gap-1 justify-end">
                  <span>⭐</span>{formatXLM(estimatedReward)} XLM
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Claim */}
      {canClaim && (
        <div className="card mb-6 border-emerald-800 bg-emerald-900/20">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-emerald-400 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-white">You won!</h3>
              <p className="text-slate-400 text-sm">
                Claim your reward of{' '}
                <span className="text-emerald-400 font-medium flex items-center gap-1 inline-flex">
                  <span>⭐</span>{formatXLM(estimatedReward)} XLM
                </span>
              </p>
            </div>
            <button onClick={handleClaim} disabled={txLoading} className="btn-yes flex items-center gap-2">
              {txLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />}
              Claim
            </button>
          </div>
        </div>
      )}

      {hasClaimed && (
        <div className="card mb-6 border-slate-700 bg-slate-800/50 text-center py-4">
          <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
          <p className="text-slate-300 font-medium">Reward claimed successfully!</p>
        </div>
      )}

      {/* Bet form */}
      {canBet && (
        <div className="card">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-stellar-400" />
            Place Your Bet
          </h3>

          <div className="mb-4">
            <label className="block text-slate-400 text-sm mb-2">
              Amount (XLM)
              <span className="ml-2 text-slate-500 flex items-center gap-1 inline-flex">
                <span>⭐</span> Balance: <span className="text-white font-semibold ml-1">{xlmBalance} XLM</span>
              </span>
            </label>
            <div className="relative">
              <input
                type="number"
                value={betAmount}
                onChange={e => setBetAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.1"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3
                           text-white placeholder-slate-600 pr-24
                           focus:outline-none focus:border-stellar-500 focus:ring-1 focus:ring-stellar-500"
              />
              <div className="absolute right-14 top-1/2 -translate-y-1/2 text-stellar-400
                              font-semibold text-sm flex items-center gap-1 pointer-events-none">
                <span>⭐</span><span>XLM</span>
              </div>
              <button
                onClick={() => setBetAmount(formatXLM(balance))}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stellar-400
                           hover:text-stellar-300 font-bold bg-stellar-900/40 px-1.5 py-0.5 rounded"
              >
                MAX
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => handleBet(true)} disabled={txLoading || !betAmount}
                    className="btn-yes flex items-center justify-center gap-2 py-3">
              {txLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              Bet YES
            </button>
            <button onClick={() => handleBet(false)} disabled={txLoading || !betAmount}
                    className="btn-no flex items-center justify-center gap-2 py-3">
              {txLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
              Bet NO
            </button>
          </div>
        </div>
      )}

      {!wallet.connected && !market.resolved && !isExpired && (
        <div className="card text-center py-8">
          <p className="text-slate-400 mb-4">Connect your wallet to place a bet</p>
          <button onClick={wallet.connect} className="btn-primary">Connect Freighter Wallet</button>
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-slate-600 text-xs font-mono">Contract: {market.address}</p>
      </div>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: 'emerald' | 'rose' | 'stellar' }) {
  const c = { emerald: 'text-emerald-400', rose: 'text-rose-400', stellar: 'text-stellar-400' }
  return (
    <div className="bg-slate-800/50 rounded-lg p-3 text-center">
      <div className={`font-semibold text-sm ${c[color]}`}>{value}</div>
      <div className="text-slate-500 text-xs mt-0.5">{label}</div>
    </div>
  )
}

function MarketStatusBadge({ resolved, outcome, expired }: { resolved: boolean; outcome: boolean; expired: boolean }) {
  if (resolved) return outcome
    ? <span className="badge bg-emerald-900/50 text-emerald-400 border border-emerald-800 text-sm px-3 py-1">
        <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> YES Won
      </span>
    : <span className="badge bg-rose-900/50 text-rose-400 border border-rose-800 text-sm px-3 py-1">
        <XCircle className="w-3.5 h-3.5 mr-1.5" /> NO Won
      </span>
  if (expired) return (
    <span className="badge bg-amber-900/50 text-amber-400 border border-amber-800 text-sm px-3 py-1">
      ⏳ Awaiting Result
    </span>
  )
  return (
    <span className="badge bg-stellar-900/50 text-stellar-400 border border-stellar-800 text-sm px-3 py-1">
      <span className="w-2 h-2 bg-stellar-400 rounded-full mr-1.5 animate-pulse inline-block" />
      Live
    </span>
  )
}

function getTimeLeft(deadline: number): string {
  const diff = deadline - Math.floor(Date.now() / 1000)
  if (diff <= 0) return 'Market closed'
  const d = Math.floor(diff / 86400), h = Math.floor((diff % 86400) / 3600), m = Math.floor((diff % 3600) / 60)
  if (d > 0) return `${d}d ${h}h remaining`
  if (h > 0) return `${h}h ${m}m remaining`
  return `${m}m remaining`
}
