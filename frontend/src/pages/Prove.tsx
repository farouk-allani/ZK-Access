import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { Zap, ArrowRight, AlertTriangle, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react'
import type { ProofType } from '../types'
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui'

const PROOF_TYPES: { value: ProofType; label: string; desc: string; color: string; fn: string }[] = [
  { value: 'age', label: 'Age Minimum', desc: 'Prove you meet a minimum age requirement', color: 'var(--color-coral)', fn: 'prove_age' },
  { value: 'kyc', label: 'KYC Status', desc: 'Prove your identity has been KYC verified', color: 'var(--color-purple)', fn: 'prove_kyc' },
  { value: 'country', label: 'Country Check', desc: 'Prove you are not in a restricted country', color: 'var(--color-sky)', fn: 'prove_country' },
  { value: 'accredited', label: 'Accredited Investor', desc: 'Prove accredited investor status', color: 'var(--color-amber)', fn: 'prove_accredited' },
]

function isCredentialRecord(record: Record<string, unknown>): boolean {
  const candidates = [
    record.recordName,
    record.type,
    (record.data as Record<string, unknown> | undefined)?.recordName,
    (record.data as Record<string, unknown> | undefined)?.type,
  ]
  const marker = candidates
    .filter((value): value is string => typeof value === 'string')
    .join(' ')
    .toLowerCase()

  if (marker) {
    return marker.includes('credential') && !marker.includes('proof')
  }

  const data = (record.data || record) as Record<string, unknown>
  return (
    'owner' in data
    && 'issuer' in data
    && 'age' in data
    && 'country_code' in data
    && 'kyc_passed' in data
    && 'accredited_investor' in data
  )
}

function toRecordInput(record: Record<string, unknown> | string): string | null {
  if (typeof record === 'string') {
    return record
  }

  const walletNativeInput = record.__recordInput
  if (typeof walletNativeInput === 'string' && walletNativeInput.trim().length > 0) {
    return walletNativeInput
  }

  const recordObjectInput = {
    id: typeof record.id === 'string' ? record.id : undefined,
    owner: typeof record.owner === 'string' ? record.owner : undefined,
    program_id: typeof record.program_id === 'string' ? record.program_id : undefined,
    spent: typeof record.spent === 'boolean' ? record.spent : undefined,
    recordName: typeof record.recordName === 'string' ? record.recordName : undefined,
    data: record.data && typeof record.data === 'object' ? record.data : undefined,
  }

  if (recordObjectInput.id && recordObjectInput.program_id && recordObjectInput.data) {
    return JSON.stringify(recordObjectInput)
  }

  const unwrapValue = (value: unknown): unknown => {
    if (value && typeof value === 'object') {
      const candidate = value as Record<string, unknown>
      if ('value' in candidate) return unwrapValue(candidate.value)
      if ('plaintext' in candidate) return unwrapValue(candidate.plaintext)
      if ('text' in candidate) return unwrapValue(candidate.text)
    }
    return value
  }

  const toAleoLiteral = (value: unknown, fallbackSuffix?: string): string => {
    const resolved = unwrapValue(value)

    if (typeof resolved === 'string') {
      const trimmed = resolved.trim()
      if (!trimmed) return ''

      if (fallbackSuffix && /^\d+$/.test(trimmed)) {
        return `${trimmed}${fallbackSuffix}`
      }
      return trimmed
    }

    if (typeof resolved === 'boolean') {
      return resolved ? 'true' : 'false'
    }

    if (typeof resolved === 'number') {
      const base = String(Math.trunc(resolved))
      return fallbackSuffix ? `${base}${fallbackSuffix}` : base
    }

    return ''
  }

  const ensureVisibility = (value: string, defaultVisibility: 'private' | 'public' = 'private'): string => {
    if (!value) return value
    if (value.endsWith('.private') || value.endsWith('.public')) return value
    return `${value}.${defaultVisibility}`
  }

  const getField = (source: Record<string, unknown>, key: string): unknown => {
    const variants = [
      key,
      `${key}.private`,
      `${key}.public`,
      `${key}_private`,
      `${key}_public`,
    ]

    for (const variant of variants) {
      if (variant in source) return source[variant]
    }

    const nested = source.data
    if (nested && typeof nested === 'object') {
      const nestedSource = nested as Record<string, unknown>
      for (const variant of variants) {
        if (variant in nestedSource) return nestedSource[variant]
      }
    }

    return undefined
  }

  const directCandidates = [
    record.record,
    record.plaintext,
    record.value,
    (record.data as Record<string, unknown> | undefined)?.record,
    (record.data as Record<string, unknown> | undefined)?.plaintext,
  ]

  for (const candidate of directCandidates) {
    if (typeof candidate === 'string' && candidate.trim().length > 0) {
      return candidate
    }
  }

  const data = (record.data || record) as Record<string, unknown>
  const source = record as Record<string, unknown>
  const ownerRaw = toAleoLiteral(getField(data, 'owner') ?? getField(source, 'owner'))
  const owner = ensureVisibility(ownerRaw, 'private')
  const issuer = ensureVisibility(toAleoLiteral(getField(data, 'issuer') ?? getField(source, 'issuer')), 'private')
  const age = toAleoLiteral(getField(data, 'age') ?? getField(source, 'age'), 'u8')
  const countryCode = toAleoLiteral(getField(data, 'country_code') ?? getField(source, 'country_code'), 'u16')
  const kycPassed = toAleoLiteral(getField(data, 'kyc_passed') ?? getField(source, 'kyc_passed'))
  const accreditedInvestor = toAleoLiteral(getField(data, 'accredited_investor') ?? getField(source, 'accredited_investor'))
  const nonce = toAleoLiteral(
    getField(data, '_nonce')
      ?? getField(data, 'nonce')
      ?? getField(source, '_nonce')
      ?? getField(source, 'nonce'),
  )

  if (!owner || !issuer || !age || !countryCode || !kycPassed || !accreditedInvestor) {
    return null
  }

  const nonceSegment = nonce ? `, _nonce: ${nonce}` : ''
  return `{ owner: ${owner}, issuer: ${issuer}, age: ${age}, country_code: ${countryCode}, kyc_passed: ${kycPassed}, accredited_investor: ${accreditedInvestor}${nonceSegment} }`
}

export default function Prove() {
  const { connected, getRecords, executeTransition, addToast } = useWallet()
  const [proofType, setProofType] = useState<ProofType>('age')
  const [minimumAge, setMinimumAge] = useState(18)
  const [loading, setLoading] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)
  const [records, setRecords] = useState<Record<string, unknown>[]>([])
  const [selectedRecord, setSelectedRecord] = useState<number>(-1)
  const [fetchingRecords, setFetchingRecords] = useState(false)

  const selectedRecordRaw = selectedRecord >= 0 ? records[selectedRecord] : null
  const selectedRecordInputDebug = selectedRecordRaw ? toRecordInput(selectedRecordRaw) : null
  const selectedRecordDebug = (() => {
    if (!selectedRecordRaw) return null
    try {
      return JSON.stringify(selectedRecordRaw, null, 2)
    } catch {
      return String(selectedRecordRaw)
    }
  })()

  const fetchRecords = async () => {
    setFetchingRecords(true)
    try {
      const raw = await getRecords()
      const credentials = raw.filter(r => isCredentialRecord(r as Record<string, unknown>))
      setRecords(credentials)
      if (credentials.length > 0 && selectedRecord === -1) {
        setSelectedRecord(0)
      }
    } catch {
      setRecords([])
    }
    setFetchingRecords(false)
  }

  useEffect(() => {
    if (connected) fetchRecords()
  }, [connected])

  const handleGenerate = async () => {
    if (selectedRecord < 0 || !records[selectedRecord]) {
      addToast('Please select a credential record', 'error')
      return
    }

    setLoading(true)
    setTxId(null)

    const record = records[selectedRecord]
    const proofConfig = PROOF_TYPES.find(p => p.value === proofType)!

    const recordStr = toRecordInput(record)
    if (!recordStr) {
      addToast('Selected credential format is not supported by wallet', 'error')
      setLoading(false)
      return
    }
    let inputs: string[]
    if (proofType === 'age') {
      inputs = [recordStr, `${minimumAge}u8`]
    } else {
      inputs = [recordStr]
    }

    const result = await executeTransition(proofConfig.fn, inputs)
    setTxId(result)
    setLoading(false)
  }

  if (!connected) {
    return (
      <div className="page-enter max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="brut-card-static bg-white p-10">
          <AlertTriangle size={48} strokeWidth={2.5} className="mx-auto mb-4" style={{ color: 'var(--color-amber)' }} />
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Wallet Not Connected</h2>
          <p className="mb-6" style={{ color: '#6b7280' }}>Connect your wallet to generate proofs.</p>
          <WalletMultiButton className="wallet-adapter-btn-override" />
        </div>
      </div>
    )
  }

  if (txId) {
    return (
      <div className="page-enter max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="brut-card-static overflow-hidden" style={{ background: 'var(--color-lime)' }}>
          <div className="p-8 text-center">
            <CheckCircle size={56} strokeWidth={2.5} className="mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              Proof Submitted!
            </h3>
            <p className="text-sm mb-6" style={{ opacity: 0.8 }}>
              Your proof transaction has been submitted to the Aleo network.
              The credential has been consumed and a new instance returned to your wallet.
            </p>
            <a
              href={`https://testnet.aleoscan.io/transaction?id=${txId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="brut-btn mb-4 inline-flex"
              style={{ background: 'white', fontSize: '0.85rem' }}
            >
              View on AleoScan <ExternalLink size={14} />
            </a>
            <p className="text-xs font-mono mb-6" style={{ opacity: 0.5, wordBreak: 'break-all' }}>
              TX: {txId}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => { setTxId(null); fetchRecords() }}
                className="brut-btn"
                style={{ background: 'white' }}
              >
                Generate Another Proof
              </button>
              <Link to="/verify" className="brut-btn" style={{ background: 'var(--color-amber)' }}>
                View Activity <ArrowRight size={16} strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          Generate Proof
        </h1>
        <p style={{ color: '#6b7280' }}>
          Create a zero-knowledge proof from your credential. The proof reveals only a boolean result — never the underlying data.
        </p>
      </div>

      {/* Select Credential */}
      <div className="brut-card-static bg-white p-6 sm:p-8 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            1. Select Credential
          </h3>
          <button
            onClick={fetchRecords}
            disabled={fetchingRecords}
            className="brut-btn text-xs"
            style={{ background: 'white', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
          >
            <RefreshCw size={12} className={fetchingRecords ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
        {records.length > 0 ? (
          <div className="space-y-3">
            {records.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedRecord(i)}
                className="w-full text-left rounded-xl p-4 transition-all"
                style={{
                  border: selectedRecord === i ? '3px solid var(--color-ink)' : '3px solid #e5e7eb',
                  boxShadow: selectedRecord === i ? '4px 4px 0 0 var(--color-ink)' : 'none',
                  background: selectedRecord === i ? 'var(--color-mint)' : 'white',
                }}
              >
                <div className="font-bold text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                  Credential #{i + 1}
                </div>
                <div className="text-xs mt-1" style={{ opacity: 0.7 }}>
                  On-chain record from your wallet
                </div>
              </button>
            ))}

            {/* {import.meta.env.DEV && selectedRecordDebug && (
              <div className="rounded-xl p-4 mt-2" style={{ border: '2px dashed var(--color-ink)', background: '#f9fafb' }}>
                <div className="font-bold text-xs mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                  Selected Record Debug (DEV only)
                </div>
                <pre className="text-xs overflow-auto" style={{ maxHeight: '240px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {selectedRecordDebug}
                </pre>
                <div className="font-bold text-xs mt-3 mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                  Computed Input Sent To Wallet (DEV only)
                </div>
                <pre className="text-xs overflow-auto" style={{ maxHeight: '200px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {typeof selectedRecordInputDebug === 'string'
                    ? selectedRecordInputDebug
                    : selectedRecordInputDebug === null
                      ? 'null'
                      : JSON.stringify(selectedRecordInputDebug, null, 2)}
                </pre>
              </div>
            )} */}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm mb-3" style={{ color: '#6b7280' }}>
              {fetchingRecords ? 'Loading records...' : 'No credential records found in your wallet.'}
            </p>
            {!fetchingRecords && (
              <Link to="/issue" className="brut-btn text-sm" style={{ background: 'var(--color-coral)' }}>
                Issue a Credential First <ArrowRight size={14} />
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Select Proof Type */}
      <div className="brut-card-static bg-white p-6 sm:p-8 mb-6">
        <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
          2. Select Proof Type
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {PROOF_TYPES.map(pt => (
            <button
              key={pt.value}
              type="button"
              onClick={() => setProofType(pt.value)}
              className="text-left rounded-xl p-4 transition-all"
              style={{
                border: proofType === pt.value ? '3px solid var(--color-ink)' : '3px solid #e5e7eb',
                boxShadow: proofType === pt.value ? '4px 4px 0 0 var(--color-ink)' : 'none',
                background: proofType === pt.value ? pt.color : 'white',
              }}
            >
              <div className="font-bold text-sm" style={{ fontFamily: 'var(--font-heading)' }}>{pt.label}</div>
              <div className="text-xs mt-1" style={{ opacity: 0.7 }}>{pt.desc}</div>
            </button>
          ))}
        </div>

        {proofType === 'age' && (
          <div className="mt-5">
            <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              Minimum Age Requirement
            </label>
            <input
              type="number"
              className="brut-input"
              value={minimumAge}
              min={1}
              max={150}
              onChange={e => setMinimumAge(parseInt(e.target.value) || 18)}
              style={{ maxWidth: '200px' }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="brut-card-static p-6 mb-6" style={{ background: 'var(--color-sky)', opacity: 0.9 }}>
        <h4 className="font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>What gets revealed?</h4>
        <div className="text-sm space-y-1" style={{ opacity: 0.85 }}>
          <p><strong>Revealed:</strong> Boolean result (pass/fail) only</p>
          <p><strong>Hidden:</strong> Your age, country, identity, credential contents — everything else</p>
          <p><strong>How:</strong> The credential record is consumed and a new instance is returned to you.</p>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={loading || records.length === 0}
        className={`brut-btn brut-btn-lg w-full mb-8 ${loading ? 'brut-pulse' : ''}`}
        style={{
          background: loading ? '#d1d5db' : records.length === 0 ? '#e5e7eb' : 'var(--color-purple)',
          color: records.length === 0 ? '#9ca3af' : 'white',
        }}
      >
        {loading ? <>Submitting to Aleo...</> : <>Generate Proof <Zap size={20} strokeWidth={2.5} /></>}
      </button>
    </div>
  )
}
