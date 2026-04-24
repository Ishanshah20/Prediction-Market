// ── Premium Navbar with custom logo ──────────────────────────────────────────

import { Link, useLocation } from 'react-router-dom'
import { Wallet, LogOut, Loader2, Copy, Check, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { WalletState } from '../hooks/useWallet'
import { useXlmBalance } from '../hooks/useXlmBalance'
import toast from 'react-hot-toast'

interface NavbarProps { wallet: WalletState }

export function Navbar({ wallet }: NavbarProps) {
  const { xlmBalance } = useXlmBalance(wallet.publicKey)
  const [copied, setCopied] = useState(false)
  const location = useLocation()

  const shortAddress = wallet.publicKey
    ? `${wallet.publicKey.slice(0, 4)}...${wallet.publicKey.slice(-4)}`
    : null

  function copyAddress() {
    if (!wallet.publicKey) return
    navigator.clipboard.writeText(wallet.publicKey)
    setCopied(true)
    toast.success('Address copied!')
    setTimeout(() => setCopied(false), 2000)
  }

  const navLinks = [
    { to: '/', label: 'Markets' },
    { to: '/create', label: 'Create' },
    { to: '/oracle', label: 'Oracle', badge: 'NEW' },
  ]

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-800/50"
         style={{ background: 'rgba(5,10,20,0.85)', backdropFilter: 'blur(20px)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="relative">
              <img src="/logo.svg" alt="PredictStar" className="w-9 h-9 group-hover:animate-float" />
              <div className="absolute inset-0 rounded-full bg-stellar-400/20 blur-md
                              group-hover:bg-stellar-400/40 transition-all" />
            </div>
            <div className="hidden sm:block">
              <div className="font-black text-lg tracking-tight">
                <span className="text-white">Predict</span>
                <span className="text-transparent bg-clip-text bg-gradient-to-r
                                 from-stellar-400 to-oracle-400">Star</span>
              </div>
              <div className="text-[9px] text-slate-500 font-medium tracking-widest uppercase -mt-0.5">
                Stellar Oracle Markets
              </div>
            </div>
          </Link>

          {/* Nav links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link key={link.to} to={link.to}
                className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm
                            font-medium transition-all duration-200
                  ${location.pathname === link.to
                    ? 'text-white bg-stellar-500/10 border border-stellar-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
                {link.label}
                {link.badge && (
                  <span className="bg-oracle-500 text-white text-[9px] font-bold
                                   px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                    {link.badge}
                  </span>
                )}
              </Link>
            ))}
          </div>

          {/* Wallet */}
          <div className="flex items-center gap-2">
            {wallet.connected ? (
              <>
                {/* XLM balance */}
                <div className="hidden sm:flex items-center gap-2 glass px-3 py-1.5 rounded-xl">
                  <img src="/logo.svg" alt="" className="w-4 h-4" />
                  <span className="text-sm font-bold text-white">{xlmBalance}</span>
                  <span className="text-stellar-400 text-xs font-bold">XLM</span>
                </div>

                {/* Address */}
                <button onClick={copyAddress}
                  className="flex items-center gap-2 glass px-3 py-1.5 rounded-xl
                             hover:border-stellar-700/50 transition-all group">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  <span className="text-sm text-slate-300 font-mono">{shortAddress}</span>
                  {copied
                    ? <Check className="w-3.5 h-3.5 text-emerald-400" />
                    : <Copy className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400" />
                  }
                </button>

                <button onClick={wallet.disconnect}
                  className="p-2 text-slate-500 hover:text-rose-400 transition-colors
                             rounded-xl hover:bg-rose-500/10"
                  title="Disconnect">
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button onClick={wallet.connect} disabled={wallet.connecting}
                className="btn-primary flex items-center gap-2 text-sm">
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
                        border-t border-slate-800/40 text-xs">
          <div className="flex items-center gap-1.5">
            <img src="/logo.svg" alt="" className="w-3.5 h-3.5" />
            <span className="text-white font-bold">{xlmBalance} XLM</span>
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
