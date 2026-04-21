// ── Navbar ────────────────────────────────────────────────────────────────────

import { Link } from 'react-router-dom'
import { Wallet, TrendingUp, LogOut, Loader2, Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { WalletState } from '../hooks/useWallet'
import { useXlmBalance } from '../hooks/useXlmBalance'
import toast from 'react-hot-toast'

interface NavbarProps {
  wallet: WalletState
}

export function Navbar({ wallet }: NavbarProps) {
  const { xlmBalance } = useXlmBalance(wallet.publicKey)
  const [copied, setCopied] = useState(false)

  const shortAddress = wallet.publicKey
    ? `${wallet.publicKey.slice(0, 5)}...${wallet.publicKey.slice(-5)}`
    : null

  function copyAddress() {
    if (!wallet.publicKey) return
    navigator.clipboard.writeText(wallet.publicKey)
    setCopied(true)
    toast.success('Address copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <nav className="sticky top-0 z-50 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group flex-shrink-0">
            <div className="w-8 h-8 bg-stellar-500 rounded-lg flex items-center justify-center
                            group-hover:bg-stellar-400 transition-colors">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-white hidden sm:block">
              Stellar Predict
            </span>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/"
              className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
              Markets
            </Link>
            <Link to="/create"
              className="text-slate-400 hover:text-white transition-colors text-sm font-medium">
              Create Market
            </Link>
          </div>

          {/* Wallet */}
          <div className="flex items-center gap-2">
            {wallet.connected ? (
              <>
                {/* XLM balance pill */}
                <div className="hidden sm:flex items-center gap-1.5
                                bg-stellar-900/40 border border-stellar-700/50
                                rounded-lg px-3 py-1.5">
                  <span className="text-base leading-none">⭐</span>
                  <span className="text-sm font-bold text-white">{xlmBalance}</span>
                  <span className="text-stellar-400 text-xs font-semibold">XLM</span>
                </div>

                {/* Address + copy */}
                <button
                  onClick={copyAddress}
                  className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/50
                             rounded-lg px-3 py-1.5 hover:border-slate-500 transition-colors group"
                >
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-sm text-slate-300 font-mono">{shortAddress}</span>
                  {copied
                    ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                    : <Copy className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                  }
                </button>

                {/* Disconnect */}
                <button
                  onClick={wallet.disconnect}
                  className="p-2 text-slate-500 hover:text-rose-400 transition-colors
                             rounded-lg hover:bg-slate-800"
                  title="Disconnect"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={wallet.connect}
                disabled={wallet.connecting}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                {wallet.connecting
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <Wallet className="w-4 h-4" />
                }
                {wallet.connecting ? 'Connecting...' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile wallet bar */}
      {wallet.connected && (
        <div className="sm:hidden flex items-center justify-between px-4 py-2
                        bg-slate-900/60 border-t border-slate-800/60 text-xs">
          <div className="flex items-center gap-1.5">
            <span>⭐</span>
            <span className="text-white font-bold">{xlmBalance}</span>
            <span className="text-stellar-400 font-semibold">XLM</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-slate-400 font-mono">{shortAddress}</span>
          </div>
        </div>
      )}
    </nav>
  )
}
