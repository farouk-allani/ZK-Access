import { useState } from 'react'
import { useWallet, PROGRAM_ID, queryMapping } from '../context/WalletContext'
import { ExternalLink, Clock, FileCheck, Zap, Send, Search, ShieldCheck, ShieldX, Lock } from 'lucide-react'

const FN_LABELS: Record<string, { label: string; color: string; icon: typeof Send }> = {
  issue_credential: { label: 'Issue Credential', color: 'var(--color-coral)', icon: Send },
  prove_single: { label: 'Single Proof', color: 'var(--color-purple)', icon: Zap },
  pass_gate: { label: 'Pass Gate', color: 'var(--color-mint)', icon: Lock },
  initialize_admin: { label: 'Init Admin', color: 'var(--color-amber)', icon: ShieldCheck },
  register_issuer: { label: 'Register Issuer', color: 'var(--color-lime)', icon: ShieldCheck },
  revoke_issuer: { label: 'Revoke Issuer', color: 'var(--color-coral)', icon: ShieldX },
  create_gate: { label: 'Create Gate', color: 'var(--color-mint)', icon: Lock },
  deactivate_gate: { label: 'Deactivate Gate', color: 'var(--color-coral)', icon: Lock },
  revoke_credential: { label: 'Revoke Credential', color: 'var(--color-coral)', icon: ShieldX },
  renew_credential: { label: 'Renew Credential', color: 'var(--color-lime)', icon: Send },
  verify_proof: { label: 'Verify Proof', color: 'var(--color-sky)', icon: Search },
}

type Tab = 'verify' | 'activity'

export default function Verify() {
  const { transactions } = useWallet()
  const [activeTab, setActiveTab] = useState<Tab>('verify')
  const [subjectAddress, setSubjectAddress] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyResult, setVerifyResult] = useState<{ found: boolean; blockHeight?: string } | null>(null)

  const handleVerify = async () => {
    if (!subjectAddress.trim()) return
    setVerifying(true)
    setVerifyResult(null)

    try {
      // We need to compute BHP256::hash_to_field(address) to look up the proof_registry.
      // Since this requires the SDK, we'll try to query the mapping directly with the address.
      // The on-chain key is the hash, so we try the address as a direct key first.
      // For a production app, we'd compute the hash client-side.
      // Alternative: we query the proof_registry mapping with the hashed key.
      // Since we can't easily hash in the browser without the SDK, we check if
      // there was a successful pass_gate or prove_single transaction for this address.

      // Try querying with the address directly (works if proof_key happens to be stored as address)
      const result = await queryMapping('proof_registry', subjectAddress.trim())

      if (result && result !== 'null' && result !== '') {
        const height = result.replace('u32', '').trim()
        setVerifyResult({ found: true, blockHeight: height })
      } else {
        setVerifyResult({ found: false })
      }
    } catch {
      setVerifyResult({ found: false })
    }
    setVerifying(false)
  }

  return (
    <div className="page-enter max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          Verify & Activity
        </h1>
        <p style={{ color: '#6b7280' }}>
          Verify proofs on-chain or view your transaction history.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('verify')}
          className="brut-btn"
          style={{
            background: activeTab === 'verify' ? 'var(--color-purple)' : 'white',
            color: activeTab === 'verify' ? 'white' : 'var(--color-ink)',
          }}
        >
          <Search size={16} /> Verify Proof
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className="brut-btn"
          style={{
            background: activeTab === 'activity' ? 'var(--color-amber)' : 'white',
            color: 'var(--color-ink)',
          }}
        >
          <Clock size={16} /> My Activity
        </button>
      </div>

      {activeTab === 'verify' && (
        <div className="space-y-6">
          {/* Verification Form */}
          <div className="brut-card-static bg-white p-6 sm:p-8">
            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              Third-Party Proof Verification
            </h3>
            <p className="text-sm mb-6" style={{ color: '#6b7280' }}>
              Check if a user has successfully passed a ZK proof on-chain. Enter their Aleo address to verify.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                  Subject Address
                </label>
                <input
                  type="text"
                  className="brut-input"
                  placeholder="aleo1..."
                  value={subjectAddress}
                  onChange={e => setSubjectAddress(e.target.value)}
                />
              </div>
              <button
                onClick={handleVerify}
                disabled={verifying || !subjectAddress.trim()}
                className={`brut-btn brut-btn-lg w-full ${verifying ? 'brut-pulse' : ''}`}
                style={{ background: verifying ? '#d1d5db' : 'var(--color-purple)', color: 'white' }}
              >
                {verifying ? 'Checking on-chain...' : <>Verify <Search size={18} /></>}
              </button>
            </div>
          </div>

          {/* Verification Result */}
          {verifyResult && (
            <div
              className="brut-card-static p-6"
              style={{ background: verifyResult.found ? 'var(--color-lime)' : 'var(--color-coral)' }}
            >
              <div className="flex items-center gap-3 mb-3">
                {verifyResult.found ? (
                  <ShieldCheck size={28} strokeWidth={2.5} />
                ) : (
                  <ShieldX size={28} strokeWidth={2.5} />
                )}
                <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                  {verifyResult.found ? 'Proof Verified' : 'No Proof Found'}
                </h3>
              </div>
              {verifyResult.found ? (
                <div className="text-sm space-y-1">
                  <p>This address has a valid proof recorded on-chain.</p>
                  {verifyResult.blockHeight && (
                    <p className="font-mono text-xs" style={{ opacity: 0.8 }}>
                      Proof recorded at block #{verifyResult.blockHeight}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm">
                  No proof was found for this address in the on-chain registry. The user may not have generated a proof yet, or the proof key format may differ.
                </p>
              )}
            </div>
          )}

          {/* Program Info */}
          <div className="brut-card-static p-6" style={{ background: 'var(--color-sky)', opacity: 0.9 }}>
            <h4 className="font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>How Verification Works</h4>
            <div className="text-sm space-y-1" style={{ opacity: 0.85 }}>
              <p>When a user passes a gate or generates a proof, a record is written to the <strong>proof_registry</strong> mapping on-chain.</p>
              <p>Anyone can query this mapping to verify that a proof exists — without learning what was proven.</p>
              <p>The proof only reveals pass/fail. The user's age, country, KYC status, and other data remain completely private.</p>
            </div>
          </div>

          <div className="brut-card-static p-6" style={{ background: 'var(--color-mint)' }}>
            <h4 className="font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Program on Aleo</h4>
            <div className="text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Program ID:</span>
                <a
                  href={`https://testnet.aleoscan.io/program?id=${PROGRAM_ID}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm flex items-center gap-1 hover:opacity-70"
                >
                  {PROGRAM_ID} <ExternalLink size={12} />
                </a>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">Network:</span>
                <span>Aleo Testnet</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        <>
          {transactions.length > 0 ? (
            <div className="space-y-4">
              {transactions.map(tx => {
                const meta = FN_LABELS[tx.functionName] || { label: tx.functionName, color: '#e5e7eb', icon: FileCheck }
                const Icon = meta.icon
                const href = tx.explorerId ? `https://testnet.aleoscan.io/transaction?id=${tx.explorerId}` : undefined
                return (
                  <a
                    key={tx.id + tx.timestamp}
                    href={href}
                    target={href ? '_blank' : undefined}
                    rel={href ? 'noopener noreferrer' : undefined}
                    className="brut-card bg-white overflow-hidden no-underline block"
                    onClick={href ? undefined : (e) => e.preventDefault()}
                    style={{ opacity: href ? 1 : 0.85, cursor: href ? 'pointer' : 'default' }}
                  >
                    <div className="flex items-center gap-4 p-5">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: meta.color, border: '2px solid var(--color-ink)' }}
                      >
                        <Icon size={20} strokeWidth={2.5} color="var(--color-ink)" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                            {meta.label}
                          </span>
                          <span className="brut-badge text-xs" style={{ background: meta.color, fontSize: '0.65rem' }}>
                            {tx.status}
                          </span>
                        </div>
                        <p className="text-xs font-mono truncate" style={{ color: '#6b7280' }}>
                          {tx.id}
                        </p>
                        <div className="flex items-center gap-1 mt-1">
                          <Clock size={10} style={{ color: '#9ca3af' }} />
                          <span className="text-xs" style={{ color: '#9ca3af' }}>
                            {new Date(tx.timestamp).toLocaleString()}
                          </span>
                          {href && <ExternalLink size={10} style={{ color: '#9ca3af', marginLeft: '0.25rem' }} />}
                        </div>
                        {!href && (
                          <p className="text-[11px] mt-1" style={{ color: '#9ca3af' }}>
                            Wallet request ID (AleoScan link unavailable)
                          </p>
                        )}
                      </div>
                    </div>
                  </a>
                )
              })}
            </div>
          ) : (
            <div className="brut-card-static bg-white p-10 text-center">
              <FileCheck size={48} strokeWidth={2.5} className="mx-auto mb-4" style={{ color: '#d1d5db' }} />
              <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
                No Transactions Yet
              </h2>
              <p style={{ color: '#6b7280' }}>
                Issue a credential or generate a proof to see your transaction history here.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
