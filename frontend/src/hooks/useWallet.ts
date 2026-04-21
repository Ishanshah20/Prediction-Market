// ── Freighter Wallet Hook ─────────────────────────────────────────────────────
// Uses window.freighter injected by the Freighter browser extension

import { useState, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { NETWORK_PASSPHRASE } from '../config'

// Freighter injects window.freighter
declare global {
  interface Window {
    freighter?: {
      isConnected: () => Promise<boolean>
      getPublicKey: () => Promise<string>
      signTransaction: (xdr: string, opts?: { networkPassphrase?: string }) => Promise<string>
      requestAccess: () => Promise<string>
      getNetworkDetails: () => Promise<{ networkPassphrase: string; network: string }>
    }
  }
}

export interface WalletState {
  connected: boolean
  publicKey: string | null
  connecting: boolean
  connect: () => Promise<void>
  disconnect: () => void
  signTx: (xdr: string) => Promise<string>
}

export function useWallet(): WalletState {
  const [connected, setConnected] = useState(false)
  const [publicKey, setPublicKey] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)

  // Auto-reconnect on load
  useEffect(() => {
    const tryAuto = async () => {
      try {
        if (!window.freighter) return
        const ok = await window.freighter.isConnected()
        if (ok) {
          const pk = await window.freighter.getPublicKey()
          if (pk) { setPublicKey(pk); setConnected(true) }
        }
      } catch { /* not connected */ }
    }
    tryAuto()
  }, [])

  const connect = useCallback(async () => {
    setConnecting(true)
    try {
      if (!window.freighter) {
        toast.error('Freighter not found — install it from freighter.app')
        return
      }
      const pk = await window.freighter.requestAccess()
      const details = await window.freighter.getNetworkDetails()
      if (details.networkPassphrase !== NETWORK_PASSPHRASE) {
        toast.error('Switch Freighter to Stellar Testnet')
        return
      }
      setPublicKey(pk)
      setConnected(true)
      toast.success('Wallet connected!')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Connection failed')
    } finally {
      setConnecting(false)
    }
  }, [])

  const disconnect = useCallback(() => {
    setPublicKey(null)
    setConnected(false)
    toast.success('Disconnected')
  }, [])

  const signTx = useCallback(async (xdr: string): Promise<string> => {
    if (!window.freighter) throw new Error('Freighter not available')
    return window.freighter.signTransaction(xdr, { networkPassphrase: NETWORK_PASSPHRASE })
  }, [])

  return { connected, publicKey, connecting, connect, disconnect, signTx }
}
