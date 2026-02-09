import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import type { Credential, Proof, Toast } from '../types'

function generateAddress(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = 'aleo1'
  for (let i = 0; i < 58; i++) {
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
}

interface WalletContextType {
  address: string | null
  connected: boolean
  credentials: Credential[]
  proofs: Proof[]
  toasts: Toast[]
  connect: () => void
  disconnect: () => void
  issueCredential: (data: Omit<Credential, 'id' | 'issuer' | 'issuedAt' | 'expiresAt'>) => void
  generateProof: (credentialId: string, proofType: Proof['proofType'], params: Record<string, unknown>) => Proof | null
  addToast: (message: string, type: Toast['type']) => void
  removeToast: (id: string) => void
}

const WalletContext = createContext<WalletContextType | null>(null)

const STORAGE_KEY = 'zkaccess_wallet'

interface StoredState {
  address: string
  credentials: Credential[]
  proofs: Proof[]
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null)
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [proofs, setProofs] = useState<Proof[]>([])
  const [toasts, setToasts] = useState<Toast[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const data: StoredState = JSON.parse(stored)
        setAddress(data.address)
        setCredentials(data.credentials || [])
        setProofs(data.proofs || [])
      }
    } catch {
      // ignore
    }
  }, [])

  // Save to localStorage on changes
  useEffect(() => {
    if (address) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ address, credentials, proofs }))
    }
  }, [address, credentials, proofs])

  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = generateId()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 3500)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const connect = useCallback(() => {
    const addr = generateAddress()
    setAddress(addr)
    addToast('Wallet connected!', 'success')
  }, [addToast])

  const disconnect = useCallback(() => {
    setAddress(null)
    setCredentials([])
    setProofs([])
    localStorage.removeItem(STORAGE_KEY)
    addToast('Wallet disconnected', 'info')
  }, [addToast])

  const issueCredential = useCallback((data: Omit<Credential, 'id' | 'issuer' | 'issuedAt' | 'expiresAt'>) => {
    if (!address) return
    const cred: Credential = {
      ...data,
      id: generateId(),
      issuer: address,
      issuedAt: Date.now(),
      expiresAt: Date.now() + 365 * 24 * 60 * 60 * 1000,
    }
    setCredentials(prev => [...prev, cred])
    addToast('Credential issued successfully!', 'success')
  }, [address, addToast])

  const generateProof = useCallback((credentialId: string, proofType: Proof['proofType'], params: Record<string, unknown>): Proof | null => {
    const cred = credentials.find(c => c.id === credentialId)
    if (!cred || !address) return null

    let result = false
    switch (proofType) {
      case 'age':
        result = cred.age >= (params.minimumAge as number || 18)
        break
      case 'kyc':
        result = cred.kycPassed
        break
      case 'country': {
        const restricted = [408, 364, 760, 192]
        result = !restricted.includes(cred.countryCode)
        break
      }
      case 'accredited':
        result = cred.accreditedInvestor
        break
      case 'composite':
        result = cred.age >= (params.minimumAge as number || 18)
          && cred.kycPassed
          && ![408, 364, 760, 192].includes(cred.countryCode)
        break
    }

    const proof: Proof = {
      id: generateId(),
      credentialId,
      proofType,
      result,
      params,
      generatedAt: Date.now(),
      nonce: generateId(),
      owner: address,
    }

    setProofs(prev => [...prev, proof])
    addToast(result ? 'Proof generated - VALID' : 'Proof generated - INVALID', result ? 'success' : 'error')
    return proof
  }, [credentials, address, addToast])

  return (
    <WalletContext.Provider value={{
      address,
      connected: !!address,
      credentials,
      proofs,
      toasts,
      connect,
      disconnect,
      issueCredential,
      generateProof,
      addToast,
      removeToast,
    }}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const ctx = useContext(WalletContext)
  if (!ctx) throw new Error('useWallet must be used within WalletProvider')
  return ctx
}
