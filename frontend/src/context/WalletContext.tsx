import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { useWallet as useAdapterWallet } from '@provablehq/aleo-wallet-adaptor-react'
import type { Toast, TxRecord } from '../types'

export const PROGRAM_ID = 'zkaccess_v2.aleo'
const DEFAULT_FEE = 100_000

function extractRecordInput(record: unknown): string | null {
  if (typeof record === 'string') {
    const trimmed = record.trim()
    return trimmed.length > 0 ? trimmed : null
  }

  if (!record || typeof record !== 'object') {
    return null
  }

  const source = record as Record<string, unknown>
  const candidates = [
    source.record,
    source.ciphertext,
    source.cipher_text,
    source.plaintext,
    source.value,
    source.raw,
  ]

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate
    }
  }

  return null
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36)
}

interface AppContextType {
  toasts: Toast[]
  addToast: (message: string, type: Toast['type']) => void
  removeToast: (id: string) => void
  transactions: TxRecord[]
  addTransaction: (tx: TxRecord) => void
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [transactions, setTransactions] = useState<TxRecord[]>(() => {
    try {
      const stored = localStorage.getItem('zkaccess_txs')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  })

  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = generateId()
    setToasts(prev => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const addTransaction = useCallback((tx: TxRecord) => {
    setTransactions(prev => {
      const updated = [tx, ...prev].slice(0, 50)
      localStorage.setItem('zkaccess_txs', JSON.stringify(updated))
      return updated
    })
  }, [])

  return (
    <AppContext.Provider value={{ toasts, addToast, removeToast, transactions, addTransaction }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}

export function useWallet() {
  const adapter = useAdapterWallet()
  const app = useApp()

  const executeTransition = useCallback(async (
    functionName: string,
    inputs: string[],
    fee = DEFAULT_FEE,
  ): Promise<string | null> => {
    if (!adapter.connected) {
      app.addToast('Wallet not connected', 'error')
      return null
    }

    try {
      const result = await adapter.executeTransaction({
        program: PROGRAM_ID,
        function: functionName,
        inputs,
        fee,
      })

      const txId = result?.transactionId || ''

      app.addTransaction({
        id: txId,
        functionName,
        timestamp: Date.now(),
        status: 'submitted',
      })

      app.addToast('Transaction submitted!', 'success')
      return txId
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Transaction failed'
      app.addToast(msg, 'error')
      return null
    }
  }, [adapter.connected, adapter.executeTransaction, app])

  const getRecords = useCallback(async (): Promise<Record<string, unknown>[]> => {
    if (!adapter.connected) return []
    let plaintextRecords: unknown[] = []
    let spendableRecords: unknown[] = []

    try {
      plaintextRecords = await adapter.requestRecords(PROGRAM_ID, true)
    } catch {
      plaintextRecords = []
    }

    try {
      spendableRecords = await adapter.requestRecords(PROGRAM_ID, false)
    } catch {
      spendableRecords = []
    }

    if (plaintextRecords.length === 0 && spendableRecords.length === 0) {
      return []
    }

    const spendableById = new Map<string, string>()
    for (const item of spendableRecords) {
      const payload = extractRecordInput(item)
      if (!payload || !item || typeof item !== 'object') continue
      const id = (item as Record<string, unknown>).id
      if (typeof id === 'string' && id.trim().length > 0) {
        spendableById.set(id, payload)
      }
    }

    const baseRecords = plaintextRecords.length > 0 ? plaintextRecords : spendableRecords

    return baseRecords.map((item, index) => {
      const fallbackPayload = extractRecordInput(spendableRecords[index])

      if (!item || typeof item !== 'object') {
        const asString = extractRecordInput(item)
        return {
          record: asString ?? String(item),
          __recordInput: fallbackPayload ?? asString,
        } as Record<string, unknown>
      }

      const source = item as Record<string, unknown>
      const id = typeof source.id === 'string' ? source.id : ''
      const fromId = id ? spendableById.get(id) : null
      const fromSelf = extractRecordInput(source)
      const recordInput = fromId ?? fallbackPayload ?? fromSelf

      return {
        ...source,
        __recordInput: recordInput,
      }
    })
  }, [adapter.connected, adapter.requestRecords])

  return {
    address: adapter.address || null,
    connected: adapter.connected,
    connecting: adapter.connecting,

    toasts: app.toasts,
    addToast: app.addToast,
    removeToast: app.removeToast,

    transactions: app.transactions,
    executeTransition,
    getRecords,
  }
}
