import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { Search, CheckCircle, XCircle, ShieldCheck, AlertTriangle } from 'lucide-react'

export default function Verify() {
  const { proofs, addToast } = useWallet()
  const [searchParams] = useSearchParams()
  const [proofId, setProofId] = useState('')
  const [loading, setLoading] = useState(false)
  const [verified, setVerified] = useState<boolean | null>(null)
  const [verifiedProof, setVerifiedProof] = useState<typeof proofs[0] | null>(null)

  useEffect(() => {
    const id = searchParams.get('proof')
    if (id) setProofId(id)
  }, [searchParams])

  const handleVerify = async () => {
    if (!proofId.trim()) {
      addToast('Please enter a proof ID', 'error')
      return
    }

    setLoading(true)
    setVerified(null)
    setVerifiedProof(null)

    // Simulate on-chain verification
    await new Promise(r => setTimeout(r, 2000))

    const proof = proofs.find(p => p.id === proofId.trim())
    if (proof) {
      setVerified(proof.result)
      setVerifiedProof(proof)
      addToast(proof.result ? 'Proof verified successfully!' : 'Proof is valid but claim is FALSE', proof.result ? 'success' : 'error')
    } else {
      setVerified(false)
      addToast('Proof not found', 'error')
    }

    setLoading(false)
  }

  const PROOF_TYPE_LABELS: Record<string, string> = {
    age: 'Age Minimum',
    kyc: 'KYC Status',
    country: 'Country Check',
    accredited: 'Accredited Investor',
    composite: 'Composite (Age + KYC + Country)',
  }

  return (
    <div className="page-enter max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          Verify Proof
        </h1>
        <p style={{ color: '#6b7280' }}>
          Verify a zero-knowledge proof. You'll learn only whether the claim is true or false — nothing about the underlying data.
        </p>
      </div>

      {/* Input */}
      <div className="brut-card-static bg-white p-6 sm:p-8 mb-6">
        <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
          Enter Proof ID
        </h3>
        <div className="flex gap-3">
          <input
            type="text"
            className="brut-input flex-1"
            placeholder="Paste proof ID here..."
            value={proofId}
            onChange={e => setProofId(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleVerify()}
          />
          <button
            onClick={handleVerify}
            disabled={loading}
            className={`brut-btn shrink-0 ${loading ? 'brut-pulse' : ''}`}
            style={{ background: loading ? '#d1d5db' : 'var(--color-amber)' }}
          >
            {loading ? '...' : <><Search size={18} strokeWidth={2.5} /> Verify</>}
          </button>
        </div>

        {/* Quick select from existing proofs */}
        {proofs.length > 0 && (
          <div className="mt-5">
            <label className="block text-xs font-semibold mb-2" style={{ fontFamily: 'var(--font-heading)', color: '#9ca3af' }}>
              Or select a recent proof:
            </label>
            <div className="flex flex-wrap gap-2">
              {proofs.slice(-5).reverse().map(p => (
                <button
                  key={p.id}
                  onClick={() => setProofId(p.id)}
                  className="text-xs rounded-lg px-3 py-1.5 font-mono transition-all"
                  style={{
                    border: proofId === p.id ? '2px solid var(--color-ink)' : '2px solid #e5e7eb',
                    background: proofId === p.id ? 'var(--color-amber)' : 'white',
                    boxShadow: proofId === p.id ? '2px 2px 0 0 var(--color-ink)' : 'none',
                  }}
                >
                  {p.id.slice(0, 10)}...
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div
        className="brut-card-static p-6 mb-6"
        style={{ background: 'var(--color-purple)', color: 'white' }}
      >
        <h4 className="font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>How verification works</h4>
        <div className="text-sm space-y-1" style={{ opacity: 0.9 }}>
          <p>1. The verifier submits the proof ID to the Aleo network</p>
          <p>2. The ZK-SNARK proof is verified cryptographically by the protocol</p>
          <p>3. The verifier learns ONLY the boolean result (true/false)</p>
          <p>4. No personal data, no credential contents, no identity — just the answer</p>
        </div>
      </div>

      {/* Result */}
      {verified !== null && (
        <div
          className="brut-card-static overflow-hidden"
          style={{ background: verified ? 'var(--color-lime)' : 'var(--color-coral)' }}
        >
          <div className="p-8 text-center">
            <div
              className="w-24 h-24 rounded-2xl mx-auto mb-6 flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.3)', border: '3px solid var(--color-ink)' }}
            >
              {verified ? (
                <CheckCircle size={48} strokeWidth={2.5} />
              ) : (
                <XCircle size={48} strokeWidth={2.5} />
              )}
            </div>

            <h3 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
              {verified ? 'Claim: TRUE' : verifiedProof ? 'Claim: FALSE' : 'Proof Not Found'}
            </h3>

            {verifiedProof ? (
              <>
                <p className="text-sm mb-6" style={{ opacity: 0.8 }}>
                  {verified
                    ? 'The ZK-SNARK proof is cryptographically valid. The claim has been verified as TRUE.'
                    : 'The proof is valid, but the underlying credential did not satisfy the claim.'
                  }
                </p>

                <div
                  className="bg-white/30 rounded-xl p-5 text-left text-sm space-y-3 max-w-md mx-auto"
                  style={{ border: '2px solid var(--color-ink)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck size={18} strokeWidth={2.5} />
                    <span className="font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Verification Details</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Proof Type:</span>
                    <span className="font-semibold">{PROOF_TYPE_LABELS[verifiedProof.proofType]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-medium">Result:</span>
                    <span className="font-bold">{verified ? 'TRUE' : 'FALSE'}</span>
                  </div>
                  {verifiedProof.params.minimumAge != null && (
                    <div className="flex justify-between">
                      <span className="font-medium">Min Age Param:</span>
                      <span className="font-semibold">{String(verifiedProof.params.minimumAge as number)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="font-medium">Generated:</span>
                    <span className="text-xs">{new Date(verifiedProof.generatedAt).toLocaleString()}</span>
                  </div>
                  <div className="pt-3" style={{ borderTop: '2px dashed rgba(0,0,0,0.15)' }}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={14} strokeWidth={2.5} className="shrink-0 mt-0.5" />
                      <p className="text-xs" style={{ opacity: 0.7 }}>
                        The verifier has NO access to: age, country, KYC data, identity, or any credential contents.
                        Only the boolean result above was disclosed.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm" style={{ opacity: 0.8 }}>
                No proof was found with this ID. Make sure you're using a valid proof ID from a generated proof.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
