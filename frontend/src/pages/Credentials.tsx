import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useWallet, queryMapping, ALEO_API } from '../context/WalletContext'
import { COUNTRY_NAMES } from '../types'
import type { ParsedCredential } from '../types'
import { ShieldCheck, MapPin, User, ArrowRight, AlertTriangle, FileCheck, RefreshCw, ExternalLink, Clock, Ban } from 'lucide-react'
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui'

function parsePlaintext(plaintext: string): Record<string, string> {
  const fields: Record<string, string> = {}
  // Match "key: value.private" or "key: value.public" lines in Aleo record plaintext
  const regex = /(\w+):\s*(.+?)\.(?:private|public)/g
  let match
  while ((match = regex.exec(plaintext)) !== null) {
    fields[match[1]] = match[2].trim()
  }
  return fields
}

function parseRecord(record: Record<string, unknown>): ParsedCredential | null {
  try {
    // Shield wallet returns data in recordPlaintext string; other adapters use data object
    const plaintext = record.recordPlaintext as string | undefined
    const data = plaintext
      ? parsePlaintext(plaintext)
      : (record.data || record) as Record<string, string>

    const parseBool = (value: unknown) => String(value ?? '').toLowerCase().includes('true')
    const parseNum = (value: unknown, suffix: string) => parseInt(String(value || '0').replace(suffix, '')) || 0

    return {
      raw: record,
      owner: String(data.owner || ''),
      issuer: String(data.issuer || ''),
      credentialId: String(data.credential_id || '0field').replace('field', ''),
      age: parseNum(data.age, 'u8'),
      countryCode: parseNum(data.country_code, 'u16'),
      kycPassed: parseBool(data.kyc_passed),
      accreditedInvestor: parseBool(data.accredited_investor),
      issuedAt: parseNum(data.issued_at, 'u32'),
      expiresAt: parseNum(data.expires_at, 'u32'),
    }
  } catch {
    return null
  }
}

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
    return marker.includes('credential') && !marker.includes('access') && !marker.includes('token')
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

export default function Credentials() {
  const { connected, getRecords, transactions } = useWallet()
  const [records, setRecords] = useState<ParsedCredential[]>([])
  const [revokedMap, setRevokedMap] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)
  const [currentBlock, setCurrentBlock] = useState<number | null>(null)

  const fetchCurrentBlock = async () => {
    try {
      const res = await fetch(`${ALEO_API}/block/height/latest`)
      if (res.ok) {
        const height = parseInt(await res.text())
        if (!isNaN(height)) setCurrentBlock(height)
      }
    } catch { /* ignore */ }
  }

  const checkRevocation = async (credentials: ParsedCredential[]) => {
    const map: Record<string, boolean> = {}
    for (const cred of credentials) {
      if (cred.credentialId && cred.credentialId !== '0') {
        const result = await queryMapping('revoked_credentials', `${cred.credentialId}field`)
        map[cred.credentialId] = result === 'true'
      }
    }
    setRevokedMap(map)
  }

  const fetchRecords = async () => {
    setLoading(true)
    try {
      const raw = await getRecords()
      console.log('[credentials] Raw records from wallet:', JSON.stringify(raw, null, 2))
      const credentials = raw
        .filter(r => isCredentialRecord(r as Record<string, unknown>))
        .map(r => parseRecord(r as Record<string, unknown>))
        .filter((c): c is ParsedCredential => c !== null)
      setRecords(credentials)
      checkRevocation(credentials)
    } catch {
      setRecords([])
    }
    setFetched(true)
    setLoading(false)
  }

  useEffect(() => {
    if (connected) {
      fetchRecords()
      fetchCurrentBlock()
    }
  }, [connected])

  const isExpired = (cred: ParsedCredential) => {
    if (!currentBlock || !cred.expiresAt) return false
    return currentBlock > cred.expiresAt
  }

  const isRevoked = (cred: ParsedCredential) => revokedMap[cred.credentialId] === true

  const recentIssueTxs = transactions.filter(t => t.functionName === 'issue_credential').slice(0, 5)

  if (!connected) {
    return (
      <div className="page-enter max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="brut-card-static bg-white p-10">
          <AlertTriangle size={48} strokeWidth={2.5} className="mx-auto mb-4" style={{ color: 'var(--color-amber)' }} />
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Wallet Not Connected</h2>
          <p className="mb-6" style={{ color: '#6b7280' }}>Connect your wallet to view your credentials.</p>
          <WalletMultiButton className="wallet-adapter-btn-override" />
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter max-w-5xl mx-auto px-4 py-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
            My Credentials
          </h1>
          <p style={{ color: '#6b7280' }}>
            Encrypted credential records in your wallet. Only you can see this data.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { fetchRecords(); fetchCurrentBlock() }}
            disabled={loading}
            className={`brut-btn ${loading ? 'brut-pulse' : ''}`}
            style={{ background: 'white' }}
          >
            <RefreshCw size={16} strokeWidth={2.5} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <Link to="/prove" className="brut-btn" style={{ background: 'var(--color-purple)', color: 'white' }}>
            Generate Proof <ArrowRight size={18} strokeWidth={2.5} />
          </Link>
        </div>
      </div>

      {records.length > 0 ? (
        <div className="grid md:grid-cols-2 gap-6">
          {records.map((cred, i) => {
            const expired = isExpired(cred)
            const revoked = isRevoked(cred)
            const statusColor = revoked ? 'var(--color-coral)' : expired ? 'var(--color-amber)' : 'var(--color-lime)'
            const statusLabel = revoked ? 'REVOKED' : expired ? 'EXPIRED' : 'ACTIVE'

            return (
              <div key={i} className="brut-card-static bg-white overflow-hidden" style={{ opacity: revoked ? 0.6 : 1 }}>
                <div className="p-4 flex items-center justify-between" style={{ background: 'var(--color-purple)', borderBottom: '3px solid var(--color-ink)' }}>
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={20} strokeWidth={2.5} />
                    <span className="font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Credential</span>
                  </div>
                  <span className="brut-badge" style={{ background: statusColor, fontSize: '0.7rem' }}>
                    {statusLabel}
                  </span>
                </div>
                <div className="p-6 space-y-4">
                  {/* Credential ID */}
                  {cred.credentialId && cred.credentialId !== '0' && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: '#6b7280' }}>ID</span>
                      <span className="text-xs font-mono" style={{ color: '#6b7280' }}>
                        {cred.credentialId.length > 16 ? `${cred.credentialId.slice(0, 8)}...${cred.credentialId.slice(-8)}` : cred.credentialId}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <User size={16} strokeWidth={2.5} style={{ color: '#6b7280' }} />
                      <span className="text-sm font-medium" style={{ color: '#6b7280' }}>Age</span>
                    </div>
                    <span className="font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{cred.age}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin size={16} strokeWidth={2.5} style={{ color: '#6b7280' }} />
                      <span className="text-sm font-medium" style={{ color: '#6b7280' }}>Country</span>
                    </div>
                    <span className="font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                      {COUNTRY_NAMES[cred.countryCode] || cred.countryCode}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: '#6b7280' }}>KYC Verified</span>
                    <span className="brut-badge text-xs" style={{ background: cred.kycPassed ? 'var(--color-lime)' : 'var(--color-coral)' }}>
                      {cred.kycPassed ? 'PASSED' : 'FAILED'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: '#6b7280' }}>Accredited Investor</span>
                    <span className="brut-badge text-xs" style={{ background: cred.accreditedInvestor ? 'var(--color-lime)' : '#e5e7eb' }}>
                      {cred.accreditedInvestor ? 'YES' : 'NO'}
                    </span>
                  </div>
                  {/* Expiration */}
                  {cred.expiresAt > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Clock size={16} strokeWidth={2.5} style={{ color: '#6b7280' }} />
                        <span className="text-sm font-medium" style={{ color: '#6b7280' }}>Expires</span>
                      </div>
                      <span className="text-xs font-mono" style={{ color: expired ? 'var(--color-coral)' : '#6b7280' }}>
                        Block #{cred.expiresAt.toLocaleString()}
                        {currentBlock && !expired && ` (~${Math.max(0, cred.expiresAt - currentBlock).toLocaleString()} blocks left)`}
                      </span>
                    </div>
                  )}
                  {/* Revocation warning */}
                  {revoked && (
                    <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#fef2f2', border: '2px solid var(--color-coral)' }}>
                      <Ban size={16} style={{ color: 'var(--color-coral)' }} />
                      <span className="text-xs font-semibold" style={{ color: 'var(--color-coral)' }}>
                        This credential has been revoked and can no longer generate proofs.
                      </span>
                    </div>
                  )}
                </div>
                <div className="px-6 pb-6">
                  <Link
                    to="/prove"
                    className="brut-btn w-full"
                    style={{
                      background: revoked || expired ? '#e5e7eb' : 'var(--color-lime)',
                      pointerEvents: revoked || expired ? 'none' : 'auto',
                      color: revoked || expired ? '#9ca3af' : 'var(--color-ink)',
                    }}
                  >
                    {revoked ? 'Revoked' : expired ? 'Expired' : <>Generate Proof <ArrowRight size={16} strokeWidth={2.5} /></>}
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      ) : fetched ? (
        <div className="space-y-6">
          <div className="brut-card-static bg-white p-10 text-center">
            <FileCheck size={48} strokeWidth={2.5} className="mx-auto mb-4" style={{ color: '#d1d5db' }} />
            <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              No Credentials Found
            </h2>
            <p className="mb-2" style={{ color: '#6b7280' }}>
              No credential records found in your wallet. Issue one first, then wait for the transaction to confirm.
            </p>
            <p className="text-xs mb-6" style={{ color: '#9ca3af' }}>
              Transactions typically confirm in 30-60 seconds. Click "Refresh" to check again.
            </p>
            <Link to="/issue" className="brut-btn brut-btn-lg" style={{ background: 'var(--color-coral)' }}>
              Issue a Credential <ArrowRight size={18} strokeWidth={2.5} />
            </Link>
          </div>

          {recentIssueTxs.length > 0 && (
            <div className="brut-card-static bg-white p-6">
              <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
                Recent Issue Transactions
              </h3>
              <div className="space-y-3">
                {recentIssueTxs.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between p-3 rounded-xl" style={{ background: '#f9fafb', border: '2px solid #e5e7eb' }}>
                    <div>
                      <p className="text-xs font-mono" style={{ wordBreak: 'break-all' }}>{tx.id.slice(0, 24)}...</p>
                      <p className="text-xs" style={{ color: '#9ca3af' }}>{new Date(tx.timestamp).toLocaleString()}</p>
                    </div>
                    {tx.explorerId && (
                      <a
                        href={`https://testnet.aleoscan.io/transaction?id=${tx.explorerId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="brut-btn text-xs"
                        style={{ background: 'var(--color-sky)', padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                      >
                        <ExternalLink size={12} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <RefreshCw size={32} className="mx-auto mb-4 animate-spin" style={{ color: '#9ca3af' }} />
          <p style={{ color: '#6b7280' }}>Loading records from your wallet...</p>
        </div>
      )}
    </div>
  )
}
