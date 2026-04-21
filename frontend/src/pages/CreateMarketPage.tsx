// ── Create Market Page ────────────────────────────────────────────────────────

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Loader2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { WalletState } from '../hooks/useWallet'
import { createMarket } from '../lib/stellar'
import { FACTORY_CONTRACT_ID } from '../config'

interface CreateMarketPageProps {
  wallet: WalletState
}

export function CreateMarketPage({ wallet }: CreateMarketPageProps) {
  const navigate = useNavigate()
  const [question, setQuestion] = useState('')
  const [deadlineDate, setDeadlineDate] = useState('')
  const [deadlineTime, setDeadlineTime] = useState('12:00')
  const [loading, setLoading] = useState(false)

  const minDate = new Date(Date.now() + 3600_000).toISOString().split('T')[0]

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!wallet.connected) {
      toast.error('Connect your wallet first')
      return
    }
    if (!FACTORY_CONTRACT_ID) {
      toast.error('Factory contract not configured. Deploy contracts first.')
      return
    }
    if (!question.trim()) {
      toast.error('Enter a question')
      return
    }
    if (!deadlineDate) {
      toast.error('Select a deadline')
      return
    }

    const deadlineUnix = Math.floor(
      new Date(`${deadlineDate}T${deadlineTime}:00`).getTime() / 1000,
    )
    if (deadlineUnix <= Date.now() / 1000) {
      toast.error('Deadline must be in the future')
      return
    }

    setLoading(true)
    try {
      toast.loading('Creating market...', { id: 'create' })
      await createMarket(
        wallet.publicKey!,
        FACTORY_CONTRACT_ID,
        question.trim(),
        deadlineUnix,
        wallet.signTx,
      )
      toast.success('Market created!', { id: 'create' })
      navigate('/')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to create market'
      toast.error(msg, { id: 'create' })
    } finally {
      setLoading(false)
    }
  }

  if (!wallet.connected) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-white mb-2">Wallet Required</h2>
        <p className="text-slate-400 mb-6">Connect your Freighter wallet to create a market.</p>
        <button onClick={wallet.connect} className="btn-primary">
          Connect Wallet
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 sm:px-6 py-8">
      <Link
        to="/"
        className="inline-flex items-center gap-2 text-slate-400 hover:text-white
                   transition-colors text-sm mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className="card">
        <h1 className="text-2xl font-bold text-white mb-2">Create Prediction Market</h1>
        <p className="text-slate-400 text-sm mb-6">
          Ask a YES/NO question. Users bet XLM on the outcome.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Question */}
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-2">
              Question *
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Will XLM reach $1 by end of 2025?"
              rows={3}
              maxLength={200}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3
                         text-white placeholder-slate-600 focus:outline-none focus:border-stellar-500
                         focus:ring-1 focus:ring-stellar-500 resize-none"
            />
            <div className="text-right text-slate-600 text-xs mt-1">
              {question.length}/200
            </div>
          </div>

          {/* Deadline */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Deadline Date *
              </label>
              <input
                type="date"
                value={deadlineDate}
                min={minDate}
                onChange={(e) => setDeadlineDate(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3
                           text-white focus:outline-none focus:border-stellar-500
                           focus:ring-1 focus:ring-stellar-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-2">
                Time (UTC)
              </label>
              <input
                type="time"
                value={deadlineTime}
                onChange={(e) => setDeadlineTime(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-3
                           text-white focus:outline-none focus:border-stellar-500
                           focus:ring-1 focus:ring-stellar-500"
              />
            </div>
          </div>

          {/* Info box */}
          <div className="bg-stellar-900/20 border border-stellar-800 rounded-lg p-4 text-sm
                          text-stellar-300">
            <p className="font-medium mb-1">How it works:</p>
            <ul className="text-stellar-400 space-y-1 text-xs">
              <li>• Users bet XLM on YES or NO</li>
              <li>• After deadline, you declare the result</li>
              <li>• Winners split the total pool proportionally</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading || !question.trim() || !deadlineDate}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Plus className="w-5 h-5" />
            )}
            {loading ? 'Creating...' : 'Create Market'}
          </button>
        </form>
      </div>
    </div>
  )
}
