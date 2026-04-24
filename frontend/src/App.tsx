// ── App Root ──────────────────────────────────────────────────────────────────

import { Routes, Route } from 'react-router-dom'
import { useWallet } from './hooks/useWallet'
import { Navbar } from './components/Navbar'
import { HomePage } from './pages/HomePage'
import { MarketPage } from './pages/MarketPage'
import { CreateMarketPage } from './pages/CreateMarketPage'
import { OraclePage } from './pages/OraclePage'

export default function App() {
  const wallet = useWallet()

  return (
    <div className="min-h-screen">
      <Navbar wallet={wallet} />
      <main>
        <Routes>
          <Route path="/"        element={<HomePage wallet={wallet} />} />
          <Route path="/market/:address" element={<MarketPage wallet={wallet} />} />
          <Route path="/create"  element={<CreateMarketPage wallet={wallet} />} />
          <Route path="/oracle"  element={<OraclePage />} />
        </Routes>
      </main>

      <footer className="border-t border-slate-800/40 mt-20 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2.5">
              <img src="/logo.svg" alt="PredictStar" className="w-7 h-7" />
              <div>
                <span className="font-black text-white">Predict</span>
                <span className="font-black text-transparent bg-clip-text
                                 bg-gradient-to-r from-stellar-400 to-oracle-400">Star</span>
                <div className="text-[9px] text-slate-600 uppercase tracking-widest">
                  Stellar Oracle Markets
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-600">
              <a href="https://stellar.org/soroban" target="_blank" rel="noopener noreferrer"
                 className="hover:text-stellar-400 transition-colors">Soroban</a>
              <a href="https://freighter.app" target="_blank" rel="noopener noreferrer"
                 className="hover:text-stellar-400 transition-colors">Freighter</a>
              <a href="https://stellar.expert/explorer/testnet" target="_blank" rel="noopener noreferrer"
                 className="hover:text-stellar-400 transition-colors">Explorer</a>
            </div>
            <div className="text-xs text-slate-700">
              Contracts on Stellar Testnet · Oracle-verified outcomes
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
