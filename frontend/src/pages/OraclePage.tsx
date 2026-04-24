// ── Oracle Dashboard Page ─────────────────────────────────────────────────────

import { Shield, CheckCircle, Clock, AlertTriangle, Users, Zap, ExternalLink } from 'lucide-react'

const ORACLE_STEPS = [
  {
    step: '01',
    title: 'Market Deadline Passes',
    desc: 'After the betting deadline, the market enters resolution phase.',
    icon: Clock,
    color: 'stellar',
  },
  {
    step: '02',
    title: 'Proposer Submits Outcome',
    desc: 'Anyone can propose the outcome by posting a 10 XLM bond. Starts the 2-hour dispute window.',
    icon: Zap,
    color: 'amber',
  },
  {
    step: '03',
    title: 'Dispute Window (2 hours)',
    desc: 'Any staker can challenge the proposal by posting an equal bond. If no dispute, outcome is finalised.',
    icon: AlertTriangle,
    color: 'rose',
  },
  {
    step: '04',
    title: 'Arbitration Committee',
    desc: 'If disputed, 3 committee members vote. Majority wins. Loser forfeits their bond.',
    icon: Users,
    color: 'oracle',
  },
  {
    step: '05',
    title: 'Market Resolved',
    desc: 'Final outcome is written on-chain. Winners can claim proportional rewards.',
    icon: CheckCircle,
    color: 'emerald',
  },
]

const MOCK_REQUESTS = [
  {
    id: 1,
    question: 'Will India beat Pakistan in ICC Champions Trophy 2025?',
    state: 'Settled',
    outcome: true,
    proposer: 'GBZQ...25YLU',
    bond: '10 XLM',
    disputed: false,
    time: '2h ago',
  },
  {
    id: 2,
    question: 'Will XLM reach $1 by end of 2025?',
    state: 'Pending',
    outcome: null,
    proposer: 'G3xK...f9aB',
    bond: '10 XLM',
    disputed: false,
    time: '45m ago',
  },
  {
    id: 3,
    question: 'Will Bitcoin ETF inflows exceed $5B in Q2 2025?',
    state: 'Disputed',
    outcome: null,
    proposer: 'HBQR...2mNc',
    bond: '50 XLM',
    disputed: true,
    time: '1h ago',
  },
]

const STATE_STYLES: Record<string, string> = {
  Settled:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  Pending:  'bg-amber-500/10 text-amber-400 border-amber-500/20',
  Disputed: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
}

export function OraclePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">

      {/* Hero */}
      <div className="text-center mb-12">
        <div className="oracle-badge mx-auto mb-4 w-fit">
          <Shield className="w-4 h-4" />
          Optimistic Oracle — UMA-style
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-4">
          Trustless{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-oracle-400 to-stellar-400">
            Resolution
          </span>
        </h1>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto">
          Every market outcome is verified by an on-chain optimistic oracle with
          economic dispute incentives — no trusted admin required.
        </p>
      </div>

      {/* How it works */}
      <div className="card-oracle mb-10">
        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5 text-oracle-400" />
          How the Oracle Works
        </h2>
        <div className="space-y-4">
          {ORACLE_STEPS.map((s, i) => {
            const Icon = s.icon
            const colors: Record<string, string> = {
              stellar: 'text-stellar-400 bg-stellar-400/10 border-stellar-400/20',
              amber:   'text-amber-400 bg-amber-400/10 border-amber-400/20',
              rose:    'text-rose-400 bg-rose-400/10 border-rose-400/20',
              oracle:  'text-oracle-400 bg-oracle-400/10 border-oracle-400/20',
              emerald: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
            }
            return (
              <div key={i} className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-10 h-10 rounded-xl border flex items-center
                                 justify-center ${colors[s.color]}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-slate-600 text-xs font-mono font-bold">{s.step}</span>
                    <span className="text-white font-semibold">{s.title}</span>
                  </div>
                  <p className="text-slate-400 text-sm">{s.desc}</p>
                </div>
                {i < ORACLE_STEPS.length - 1 && (
                  <div className="absolute left-[2.75rem] mt-10 w-px h-4 bg-slate-800" />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Security model */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {[
          {
            title: 'Economic Security',
            desc: 'Proposers and disputers post bonds. Wrong answers lose their stake.',
            icon: '🔒',
            color: 'border-stellar-800/40',
          },
          {
            title: 'Dispute Window',
            desc: '2-hour window for anyone to challenge incorrect outcomes.',
            icon: '⏱️',
            color: 'border-amber-800/30',
          },
          {
            title: 'Committee Arbitration',
            desc: '3-member committee resolves disputes by majority vote.',
            icon: '⚖️',
            color: 'border-oracle-800/30',
          },
        ].map(item => (
          <div key={item.title}
               className={`glass p-5 rounded-2xl border ${item.color}`}>
            <div className="text-3xl mb-3">{item.icon}</div>
            <div className="font-bold text-white mb-1">{item.title}</div>
            <div className="text-slate-400 text-sm">{item.desc}</div>
          </div>
        ))}
      </div>

      {/* Live oracle requests */}
      <div className="card">
        <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          Oracle Requests
          <span className="text-xs text-slate-500 font-normal ml-1">(demo data)</span>
        </h2>
        <div className="space-y-3">
          {MOCK_REQUESTS.map(req => (
            <div key={req.id}
                 className="flex items-center gap-4 p-4 rounded-xl bg-slate-900/50
                            border border-slate-800/40 hover:border-slate-700/60 transition-colors">
              <div className="text-slate-600 font-mono text-sm font-bold w-6">#{req.id}</div>
              <div className="flex-1 min-w-0">
                <div className="text-slate-200 text-sm font-medium truncate">{req.question}</div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span>Proposer: <span className="font-mono">{req.proposer}</span></span>
                  <span>Bond: {req.bond}</span>
                  <span>{req.time}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {req.disputed && (
                  <span className="badge bg-rose-500/10 text-rose-400 border border-rose-500/20">
                    <AlertTriangle className="w-3 h-3" /> Disputed
                  </span>
                )}
                <span className={`badge border ${STATE_STYLES[req.state]}`}>
                  {req.state}
                </span>
                {req.outcome !== null && (
                  <span className={`badge border ${req.outcome
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                    {req.outcome ? 'YES' : 'NO'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contract link */}
      <div className="mt-6 text-center">
        <a href="https://stellar.expert/explorer/testnet"
           target="_blank" rel="noopener noreferrer"
           className="inline-flex items-center gap-2 text-slate-500 hover:text-stellar-400
                      transition-colors text-sm">
          <ExternalLink className="w-4 h-4" />
          View on Stellar Explorer
        </a>
      </div>
    </div>
  )
}
