// ── App Root ──────────────────────────────────────────────────────────────────

import { Routes, Route } from 'react-router-dom'
import { useWallet } from './hooks/useWallet'
import { Navbar } from './components/Navbar'
import { HomePage } from './pages/HomePage'
import { MarketPage } from './pages/MarketPage'
import { CreateMarketPage } from './pages/CreateMarketPage'

export default function App() {
  const wallet = useWallet()

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar wallet={wallet} />
      <main>
        <Routes>
          <Route path="/" element={<HomePage wallet={wallet} />} />
          <Route path="/market/:address" element={<MarketPage wallet={wallet} />} />
          <Route path="/create" element={<CreateMarketPage wallet={wallet} />} />
        </Routes>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 mt-16 py-8 text-center text-slate-600 text-sm">
        <p>
          Stellar Prediction Market · Built on{' '}
          <a
            href="https://stellar.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-stellar-500 hover:text-stellar-400"
          >
            Stellar Soroban
          </a>
        </p>
      </footer>
    </div>
  )
}
