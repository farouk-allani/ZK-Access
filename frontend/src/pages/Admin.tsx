import { useState } from 'react'
import { useWallet, queryMapping } from '../context/WalletContext'
import { ShieldCheck, ShieldX, UserPlus, UserMinus, Search, AlertTriangle, Ban, CheckCircle } from 'lucide-react'
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui'

export default function Admin() {
  const { connected, isAdmin, executeTransition, addToast } = useWallet()

  // Register issuer
  const [registerAddress, setRegisterAddress] = useState('')
  const [registering, setRegistering] = useState(false)

  // Revoke issuer
  const [revokeAddress, setRevokeAddress] = useState('')
  const [revoking, setRevoking] = useState(false)

  // Check issuer
  const [checkAddress, setCheckAddress] = useState('')
  const [checking, setChecking] = useState(false)
  const [checkResult, setCheckResult] = useState<boolean | null>(null)

  // Revoke credential
  const [credentialId, setCredentialId] = useState('')
  const [revokingCred, setRevokingCred] = useState(false)

  // Initialize admin
  const [initializing, setInitializing] = useState(false)

  const handleRegisterIssuer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!registerAddress.trim()) return
    setRegistering(true)
    const result = await executeTransition('register_issuer', [registerAddress.trim()])
    if (result) addToast('Issuer registration submitted', 'success')
    setRegistering(false)
    setRegisterAddress('')
  }

  const handleRevokeIssuer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!revokeAddress.trim()) return
    setRevoking(true)
    const result = await executeTransition('revoke_issuer', [revokeAddress.trim()])
    if (result) addToast('Issuer revocation submitted', 'success')
    setRevoking(false)
    setRevokeAddress('')
  }

  const handleCheckIssuer = async () => {
    if (!checkAddress.trim()) return
    setChecking(true)
    setCheckResult(null)
    const result = await queryMapping('authorized_issuers', checkAddress.trim())
    setCheckResult(result === 'true')
    setChecking(false)
  }

  const handleRevokeCredential = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!credentialId.trim()) return
    setRevokingCred(true)
    const key = credentialId.trim().endsWith('field') ? credentialId.trim() : `${credentialId.trim()}field`
    const result = await executeTransition('revoke_credential', [key])
    if (result) addToast('Credential revocation submitted', 'success')
    setRevokingCred(false)
    setCredentialId('')
  }

  const handleInitializeAdmin = async () => {
    setInitializing(true)
    const result = await executeTransition('initialize_admin', [])
    if (result) addToast('Admin initialization submitted', 'success')
    setInitializing(false)
  }

  if (!connected) {
    return (
      <div className="page-enter max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="brut-card-static bg-white p-10">
          <AlertTriangle size={48} strokeWidth={2.5} className="mx-auto mb-4" style={{ color: 'var(--color-amber)' }} />
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Wallet Not Connected</h2>
          <p className="mb-6" style={{ color: '#6b7280' }}>Connect your wallet to access admin functions.</p>
          <WalletMultiButton className="wallet-adapter-btn-override" />
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          Admin Panel
        </h1>
        <p style={{ color: '#6b7280' }}>
          Manage authorized issuers and credential revocations. {!isAdmin && 'Note: Admin functions require the admin wallet.'}
        </p>
      </div>

      {/* Admin Warning */}
      {!isAdmin && (
        <div className="brut-card-static p-4 mb-6 flex items-center gap-3" style={{ background: 'var(--color-amber)' }}>
          <AlertTriangle size={20} strokeWidth={2.5} />
          <div>
            <span className="text-sm font-semibold block" style={{ fontFamily: 'var(--font-heading)' }}>
              Not the admin wallet
            </span>
            <span className="text-xs" style={{ opacity: 0.8 }}>
              Admin transactions will be submitted but will fail on-chain unless you are the registered admin.
            </span>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Initialize Admin */}
        <div className="brut-card-static bg-white p-6 sm:p-8">
          <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
            Initialize Admin
          </h3>
          <p className="text-sm mb-4" style={{ color: '#6b7280' }}>
            Call this once after deploying the program to set yourself as admin. Can only be called once.
          </p>
          <button
            onClick={handleInitializeAdmin}
            disabled={initializing}
            className={`brut-btn ${initializing ? 'brut-pulse' : ''}`}
            style={{ background: initializing ? '#d1d5db' : 'var(--color-amber)' }}
          >
            {initializing ? 'Submitting...' : <>Initialize Admin <ShieldCheck size={18} /></>}
          </button>
        </div>

        {/* Register Issuer */}
        <div className="brut-card-static bg-white p-6 sm:p-8">
          <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            Register Issuer
          </h3>
          <form onSubmit={handleRegisterIssuer} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                Issuer Address
              </label>
              <input
                type="text"
                className="brut-input"
                placeholder="aleo1..."
                value={registerAddress}
                onChange={e => setRegisterAddress(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={registering || !registerAddress.trim()}
              className={`brut-btn ${registering ? 'brut-pulse' : ''}`}
              style={{ background: registering ? '#d1d5db' : 'var(--color-lime)' }}
            >
              {registering ? 'Submitting...' : <>Register <UserPlus size={18} /></>}
            </button>
          </form>
        </div>

        {/* Revoke Issuer */}
        <div className="brut-card-static bg-white p-6 sm:p-8">
          <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            Revoke Issuer
          </h3>
          <form onSubmit={handleRevokeIssuer} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                Issuer Address
              </label>
              <input
                type="text"
                className="brut-input"
                placeholder="aleo1..."
                value={revokeAddress}
                onChange={e => setRevokeAddress(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={revoking || !revokeAddress.trim()}
              className={`brut-btn ${revoking ? 'brut-pulse' : ''}`}
              style={{ background: revoking ? '#d1d5db' : 'var(--color-coral)' }}
            >
              {revoking ? 'Submitting...' : <>Revoke <UserMinus size={18} /></>}
            </button>
          </form>
        </div>

        {/* Check Issuer */}
        <div className="brut-card-static bg-white p-6 sm:p-8">
          <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            Check Issuer Status
          </h3>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                className="brut-input flex-1"
                placeholder="aleo1..."
                value={checkAddress}
                onChange={e => { setCheckAddress(e.target.value); setCheckResult(null) }}
              />
              <button
                onClick={handleCheckIssuer}
                disabled={checking || !checkAddress.trim()}
                className="brut-btn"
                style={{ background: checking ? '#d1d5db' : 'var(--color-sky)', whiteSpace: 'nowrap' }}
              >
                {checking ? '...' : <><Search size={16} /> Check</>}
              </button>
            </div>
            {checkResult !== null && (
              <div
                className="flex items-center gap-2 p-3 rounded-xl"
                style={{
                  background: checkResult ? 'var(--color-lime)' : '#fee2e2',
                  border: '2px solid var(--color-ink)',
                }}
              >
                {checkResult ? <CheckCircle size={18} /> : <ShieldX size={18} />}
                <span className="text-sm font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>
                  {checkResult ? 'Authorized Issuer' : 'Not Authorized'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Revoke Credential */}
        <div className="brut-card-static bg-white p-6 sm:p-8">
          <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
            Revoke Credential
          </h3>
          <p className="text-sm mb-4" style={{ color: '#6b7280' }}>
            Revoke a credential by its ID. Revoked credentials can no longer generate proofs.
          </p>
          <form onSubmit={handleRevokeCredential} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                Credential ID (field)
              </label>
              <input
                type="text"
                className="brut-input"
                placeholder="Enter credential ID field value"
                value={credentialId}
                onChange={e => setCredentialId(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={revokingCred || !credentialId.trim()}
              className={`brut-btn ${revokingCred ? 'brut-pulse' : ''}`}
              style={{ background: revokingCred ? '#d1d5db' : 'var(--color-coral)' }}
            >
              {revokingCred ? 'Submitting...' : <>Revoke Credential <Ban size={18} /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
