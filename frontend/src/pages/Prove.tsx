import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { Zap, ArrowRight, AlertTriangle, CheckCircle, XCircle, Copy } from 'lucide-react'
import type { Proof, ProofType } from '../types'

const PROOF_TYPES: { value: ProofType; label: string; desc: string; color: string }[] = [
  { value: 'age', label: 'Age Minimum', desc: 'Prove you meet a minimum age requirement', color: 'var(--color-coral)' },
  { value: 'kyc', label: 'KYC Status', desc: 'Prove your identity has been KYC verified', color: 'var(--color-purple)' },
  { value: 'country', label: 'Country Check', desc: 'Prove you are not in a restricted country', color: 'var(--color-sky)' },
  { value: 'accredited', label: 'Accredited Investor', desc: 'Prove accredited investor status', color: 'var(--color-amber)' },
  { value: 'composite', label: 'Composite Proof', desc: 'Prove age + KYC + country in one proof', color: 'var(--color-mint)' },
]

export default function Prove() {
  const { connected, connect, credentials, generateProof, addToast } = useWallet()
  const [searchParams] = useSearchParams()
  const [selectedCred, setSelectedCred] = useState('')
  const [proofType, setProofType] = useState<ProofType>('age')
  const [minimumAge, setMinimumAge] = useState(18)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Proof | null>(null)

  useEffect(() => {
    const credId = searchParams.get('credential')
    if (credId) setSelectedCred(credId)
  }, [searchParams])

  const handleGenerate = async () => {
    if (!selectedCred) {
      addToast('Please select a credential', 'error')
      return
    }

    setLoading(true)
    setResult(null)
    // Simulate ZK proof generation time
    await new Promise(r => setTimeout(r, 2500))

    const params: Record<string, unknown> = {}
    if (proofType === 'age' || proofType === 'composite') {
      params.minimumAge = minimumAge
    }

    const proof = generateProof(selectedCred, proofType, params)
    setResult(proof)
    setLoading(false)
  }

  const copyProofId = () => {
    if (result) {
      navigator.clipboard.writeText(result.id)
      addToast('Proof ID copied to clipboard!', 'info')
    }
  }

  if (!connected) {
    return (
      <div className="page-enter max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="brut-card-static bg-white p-10">
          <AlertTriangle size={48} strokeWidth={2.5} className="mx-auto mb-4" style={{ color: 'var(--color-amber)' }} />
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Wallet Not Connected</h2>
          <p className="mb-6" style={{ color: '#6b7280' }}>Connect your wallet to generate proofs.</p>
          <button onClick={connect} className="brut-btn brut-btn-lg" style={{ background: 'var(--color-lime)' }}>
            Connect Wallet
          </button>
        </div>
      </div>
    )
  }

  if (credentials.length === 0) {
    return (
      <div className="page-enter max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="brut-card-static bg-white p-10">
          <Zap size={48} strokeWidth={2.5} className="mx-auto mb-4" style={{ color: '#d1d5db' }} />
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>No Credentials</h2>
          <p className="mb-6" style={{ color: '#6b7280' }}>You need a credential before generating proofs.</p>
          <Link to="/issue" className="brut-btn brut-btn-lg" style={{ background: 'var(--color-coral)' }}>
            Issue a Credential <ArrowRight size={18} strokeWidth={2.5} />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          Generate ZK Proof
        </h1>
        <p style={{ color: '#6b7280' }}>
          Create a zero-knowledge proof from your credential. The proof reveals only a boolean result — never the underlying data.
        </p>
      </div>

      {/* Select Credential */}
      <div className="brut-card-static bg-white p-6 sm:p-8 mb-6">
        <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
          1. Select Credential
        </h3>
        <select
          className="brut-select"
          value={selectedCred}
          onChange={e => setSelectedCred(e.target.value)}
        >
          <option value="">Choose a credential...</option>
          {credentials.map(c => (
            <option key={c.id} value={c.id}>
              Credential {c.id.slice(0, 8)} — Age: {c.age}, KYC: {c.kycPassed ? 'Yes' : 'No'}
            </option>
          ))}
        </select>
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

        {/* Age parameter */}
        {(proofType === 'age' || proofType === 'composite') && (
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
      <div
        className="brut-card-static p-6 mb-6"
        style={{ background: 'var(--color-sky)', opacity: 0.9 }}
      >
        <h4 className="font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>What gets revealed?</h4>
        <div className="text-sm space-y-1" style={{ opacity: 0.85 }}>
          <p><strong>Revealed:</strong> Boolean result (pass/fail) only</p>
          <p><strong>Hidden:</strong> Your age, country, identity, credential contents — everything else</p>
          <p><strong>How:</strong> Proof is generated locally. The credential record is consumed and re-issued to you.</p>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={loading || !selectedCred}
        className={`brut-btn brut-btn-lg w-full mb-8 ${loading ? 'brut-pulse' : ''}`}
        style={{
          background: loading ? '#d1d5db' : !selectedCred ? '#e5e7eb' : 'var(--color-purple)',
          color: !selectedCred ? '#9ca3af' : 'white',
        }}
      >
        {loading ? (
          <>Generating ZK-SNARK Proof...</>
        ) : (
          <>Generate Proof <Zap size={20} strokeWidth={2.5} /></>
        )}
      </button>

      {/* Result */}
      {result && (
        <div
          className="brut-card-static overflow-hidden"
          style={{ background: result.result ? 'var(--color-lime)' : 'var(--color-coral)' }}
        >
          <div className="p-8 text-center">
            {result.result ? (
              <CheckCircle size={56} strokeWidth={2.5} className="mx-auto mb-4" />
            ) : (
              <XCircle size={56} strokeWidth={2.5} className="mx-auto mb-4" />
            )}
            <h3 className="text-2xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              Proof: {result.result ? 'VALID' : 'INVALID'}
            </h3>
            <p className="text-sm mb-6" style={{ opacity: 0.8 }}>
              {result.result
                ? 'The ZK proof has been generated. The verifier will learn only that this claim is TRUE.'
                : 'The claim could not be satisfied. The credential data does not meet the requirements.'
              }
            </p>

            <div className="bg-white/30 rounded-xl p-4 text-left text-sm space-y-2 mb-6" style={{ border: '2px solid var(--color-ink)' }}>
              <div className="flex justify-between">
                <span className="font-semibold">Proof ID:</span>
                <button onClick={copyProofId} className="flex items-center gap-1 font-mono text-xs hover:opacity-70">
                  {result.id.slice(0, 12)}... <Copy size={12} />
                </button>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Type:</span>
                <span>{PROOF_TYPES.find(p => p.value === result.proofType)?.label}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Generated:</span>
                <span>{new Date(result.generatedAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">Nonce:</span>
                <span className="font-mono text-xs">{result.nonce.slice(0, 12)}...</span>
              </div>
            </div>

            <Link
              to={`/verify?proof=${result.id}`}
              className="brut-btn"
              style={{ background: 'white' }}
            >
              Verify This Proof <ArrowRight size={16} strokeWidth={2.5} />
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
