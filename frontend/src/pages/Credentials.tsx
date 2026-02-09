import { Link } from 'react-router-dom'
import { useWallet } from '../context/WalletContext'
import { COUNTRY_NAMES } from '../types'
import { ShieldCheck, Clock, MapPin, User, ArrowRight, AlertTriangle, FileCheck } from 'lucide-react'

export default function Credentials() {
  const { connected, connect, credentials } = useWallet()

  if (!connected) {
    return (
      <div className="page-enter max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="brut-card-static bg-white p-10">
          <AlertTriangle size={48} strokeWidth={2.5} className="mx-auto mb-4" style={{ color: 'var(--color-amber)' }} />
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
            Wallet Not Connected
          </h2>
          <p className="mb-6" style={{ color: '#6b7280' }}>
            Connect your wallet to view your credentials.
          </p>
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
          <FileCheck size={48} strokeWidth={2.5} className="mx-auto mb-4" style={{ color: '#d1d5db' }} />
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
            No Credentials Yet
          </h2>
          <p className="mb-6" style={{ color: '#6b7280' }}>
            You don't have any credentials. Get one issued to start generating proofs.
          </p>
          <Link to="/issue" className="brut-btn brut-btn-lg" style={{ background: 'var(--color-coral)' }}>
            Issue a Credential <ArrowRight size={18} strokeWidth={2.5} />
          </Link>
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
        <Link to="/prove" className="brut-btn" style={{ background: 'var(--color-purple)', color: 'white' }}>
          Generate Proof <ArrowRight size={18} strokeWidth={2.5} />
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {credentials.map((cred) => (
          <div key={cred.id} className="brut-card-static bg-white overflow-hidden">
            {/* Header */}
            <div className="p-4 flex items-center justify-between" style={{ background: 'var(--color-purple)', borderBottom: '3px solid var(--color-ink)' }}>
              <div className="flex items-center gap-2">
                <ShieldCheck size={20} strokeWidth={2.5} />
                <span className="font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                  Credential
                </span>
              </div>
              <span className="brut-badge" style={{ background: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}>
                {cred.id.slice(0, 8)}
              </span>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Age */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User size={16} strokeWidth={2.5} style={{ color: '#6b7280' }} />
                  <span className="text-sm font-medium" style={{ color: '#6b7280' }}>Age</span>
                </div>
                <span className="font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{cred.age}</span>
              </div>

              {/* Country */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin size={16} strokeWidth={2.5} style={{ color: '#6b7280' }} />
                  <span className="text-sm font-medium" style={{ color: '#6b7280' }}>Country</span>
                </div>
                <span className="font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                  {COUNTRY_NAMES[cred.countryCode] || cred.countryCode}
                </span>
              </div>

              {/* KYC */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: '#6b7280' }}>KYC Verified</span>
                <span
                  className="brut-badge text-xs"
                  style={{ background: cred.kycPassed ? 'var(--color-lime)' : 'var(--color-coral)' }}
                >
                  {cred.kycPassed ? 'PASSED' : 'FAILED'}
                </span>
              </div>

              {/* Accredited */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: '#6b7280' }}>Accredited Investor</span>
                <span
                  className="brut-badge text-xs"
                  style={{ background: cred.accreditedInvestor ? 'var(--color-lime)' : '#e5e7eb' }}
                >
                  {cred.accreditedInvestor ? 'YES' : 'NO'}
                </span>
              </div>

              {/* Risk Score */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium" style={{ color: '#6b7280' }}>Risk Score</span>
                <span className="font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                  {cred.riskScore}/100
                </span>
              </div>

              {/* Dates */}
              <div
                className="pt-4 flex items-center gap-2 text-xs"
                style={{ borderTop: '2px dashed #e5e7eb', color: '#9ca3af' }}
              >
                <Clock size={12} strokeWidth={2.5} />
                Issued {new Date(cred.issuedAt).toLocaleDateString()} &middot; Expires {new Date(cred.expiresAt).toLocaleDateString()}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              <Link
                to={`/prove?credential=${cred.id}`}
                className="brut-btn w-full"
                style={{ background: 'var(--color-lime)' }}
              >
                Generate Proof <ArrowRight size={16} strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
