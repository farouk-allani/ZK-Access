import { useState } from 'react'
import { useWallet } from '../context/WalletContext'
import { Link } from 'react-router-dom'
import { Send, ArrowRight, AlertTriangle } from 'lucide-react'
import { COUNTRY_NAMES, RESTRICTED_COUNTRIES } from '../types'

export default function Issue() {
  const { connected, connect, address, issueCredential } = useWallet()
  const [loading, setLoading] = useState(false)
  const [issued, setIssued] = useState(false)
  const [form, setForm] = useState({
    owner: '',
    age: 25,
    countryCode: 840,
    kycPassed: true,
    accreditedInvestor: false,
    riskScore: 15,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!connected) return

    setLoading(true)
    // Simulate on-chain execution delay
    await new Promise(r => setTimeout(r, 2000))

    issueCredential({
      owner: form.owner || address!,
      age: form.age,
      countryCode: form.countryCode,
      kycPassed: form.kycPassed,
      accreditedInvestor: form.accreditedInvestor,
      riskScore: form.riskScore,
    })

    setLoading(false)
    setIssued(true)
  }

  if (!connected) {
    return (
      <div className="page-enter max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="brut-card-static bg-white p-10">
          <AlertTriangle size={48} strokeWidth={2.5} className="mx-auto mb-4" style={{ color: 'var(--color-amber)' }} />
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
            Wallet Not Connected
          </h2>
          <p className="mb-6" style={{ color: '#6b7280' }}>
            Connect your Aleo wallet to issue credentials.
          </p>
          <button
            onClick={connect}
            className="brut-btn brut-btn-lg"
            style={{ background: 'var(--color-lime)' }}
          >
            Connect Wallet
          </button>
        </div>
      </div>
    )
  }

  if (issued) {
    return (
      <div className="page-enter max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="brut-card-static p-10" style={{ background: 'var(--color-lime)' }}>
          <div
            className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.4)', border: '3px solid var(--color-ink)' }}
          >
            <Send size={36} strokeWidth={2.5} />
          </div>
          <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
            Credential Issued!
          </h2>
          <p className="mb-2 text-sm" style={{ opacity: 0.8 }}>
            An encrypted credential record has been created. Only the owner's viewing key can decrypt it.
          </p>
          <p className="mb-8 text-sm font-mono" style={{ opacity: 0.6, wordBreak: 'break-all' }}>
            Owner: {form.owner || address}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/credentials" className="brut-btn" style={{ background: 'white' }}>
              View Credentials <ArrowRight size={18} strokeWidth={2.5} />
            </Link>
            <button
              onClick={() => setIssued(false)}
              className="brut-btn"
              style={{ background: 'var(--color-amber)' }}
            >
              Issue Another
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          Issue Credential
        </h1>
        <p style={{ color: '#6b7280' }}>
          As an issuer, create an encrypted credential record for a user. The credential is owned by the recipient — only they can use it.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="brut-card-static bg-white p-6 sm:p-8 mb-6">
          <h3 className="text-lg font-bold mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            Recipient & Identity
          </h3>

          <div className="space-y-5">
            {/* Owner Address */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                Recipient Address
              </label>
              <input
                type="text"
                className="brut-input"
                placeholder={address || 'aleo1...'}
                value={form.owner}
                onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}
              />
              <p className="text-xs mt-1" style={{ color: '#9ca3af' }}>
                Leave empty to issue to yourself (for demo)
              </p>
            </div>

            {/* Age */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                Age
              </label>
              <input
                type="number"
                className="brut-input"
                min={1}
                max={150}
                value={form.age}
                onChange={e => setForm(f => ({ ...f, age: parseInt(e.target.value) || 0 }))}
              />
            </div>

            {/* Country */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                Country
              </label>
              <select
                className="brut-select"
                value={form.countryCode}
                onChange={e => setForm(f => ({ ...f, countryCode: parseInt(e.target.value) }))}
              >
                {Object.entries(COUNTRY_NAMES).map(([code, name]) => (
                  <option key={code} value={code}>
                    {name} ({code}) {RESTRICTED_COUNTRIES.includes(parseInt(code)) ? '- RESTRICTED' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Risk Score */}
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                Risk Score (0-100)
              </label>
              <input
                type="number"
                className="brut-input"
                min={0}
                max={100}
                value={form.riskScore}
                onChange={e => setForm(f => ({ ...f, riskScore: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
        </div>

        <div className="brut-card-static bg-white p-6 sm:p-8 mb-8">
          <h3 className="text-lg font-bold mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
            Verification Status
          </h3>

          <div className="space-y-5">
            {/* KYC Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                  KYC Verified
                </label>
                <p className="text-xs" style={{ color: '#9ca3af' }}>Identity has been verified by a KYC provider</p>
              </div>
              <button
                type="button"
                className={`brut-toggle ${form.kycPassed ? 'active' : ''}`}
                onClick={() => setForm(f => ({ ...f, kycPassed: !f.kycPassed }))}
              />
            </div>

            {/* Accredited Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                  Accredited Investor
                </label>
                <p className="text-xs" style={{ color: '#9ca3af' }}>Meets accredited investor requirements</p>
              </div>
              <button
                type="button"
                className={`brut-toggle ${form.accreditedInvestor ? 'active' : ''}`}
                onClick={() => setForm(f => ({ ...f, accreditedInvestor: !f.accreditedInvestor }))}
              />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div
          className="brut-card-static p-6 mb-8"
          style={{ background: 'var(--color-sky)', opacity: 0.9 }}
        >
          <h4 className="font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>What happens next?</h4>
          <ul className="text-sm space-y-1" style={{ opacity: 0.85 }}>
            <li>1. A credential record is created, encrypted with the owner's viewing key</li>
            <li>2. Only the owner can decrypt and read the credential data</li>
            <li>3. The owner can generate ZK proofs from this credential any number of times</li>
            <li>4. Each proof reveals only a boolean result — never the underlying data</li>
          </ul>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`brut-btn brut-btn-lg w-full ${loading ? 'brut-pulse' : ''}`}
          style={{ background: loading ? '#d1d5db' : 'var(--color-coral)' }}
        >
          {loading ? (
            <>Executing on Aleo...</>
          ) : (
            <>Issue Credential <Send size={20} strokeWidth={2.5} /></>
          )}
        </button>
      </form>
    </div>
  )
}
