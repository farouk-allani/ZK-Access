import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useWallet, ALEO_API } from '../context/WalletContext'
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui'
import {
  ShieldCheck, AlertTriangle, ExternalLink,
  ArrowRight, Loader2, CheckCircle, XCircle, Clock, Fingerprint,
} from 'lucide-react'
import { COUNTRY_NAMES } from '../types'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

interface VerificationData {
  age: number
  countryCode: number
  kycPassed: boolean
  accreditedInvestor: boolean
}

interface KycStatus {
  status: 'none' | 'pending' | 'verified' | 'failed' | 'credential_issued'
  verificationData?: VerificationData
  credentialTxId?: string
}

export default function KYC() {
  const { connected, address, executeTransition } = useWallet()
  const [searchParams] = useSearchParams()
  const [kycStatus, setKycStatus] = useState<KycStatus>({ status: 'none' })
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null)
  const [issuing, setIssuing] = useState(false)
  const [issueTxId, setIssueTxId] = useState<string | null>(null)
  const [issueExplorerTxId, setIssueExplorerTxId] = useState<string | null>(null)
  const [sdkLoading, setSdkLoading] = useState(false)
  const [sdkReady, setSdkReady] = useState(false)
  const sdkContainerRef = useRef<HTMLDivElement>(null)
  const sdkInstanceRef = useRef<unknown>(null)

  // Check backend health
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/health`)
      .then(r => r.ok ? setBackendOnline(true) : setBackendOnline(false))
      .catch(() => setBackendOnline(false))
  }, [])

  // Force-check verification status from Sumsub (calls /api/kyc/check then /api/kyc/status)
  const forceCheckStatus = useCallback(async () => {
    if (!address) return
    try {
      // Tell backend to query Sumsub directly and update store
      await fetch(`${BACKEND_URL}/api/kyc/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: address, applicantId: address }),
      })
    } catch { /* ignore */ }
    // Now read updated status from store
    try {
      const res = await fetch(`${BACKEND_URL}/api/kyc/status?wallet=${address}`)
      if (res.ok) {
        const data = await res.json()
        setKycStatus(data)
      }
    } catch { /* ignore */ }
  }, [address])

  // Simple status check (just reads store, no Sumsub query)
  const checkStatus = useCallback(async () => {
    if (!address) return
    try {
      const res = await fetch(`${BACKEND_URL}/api/kyc/status?wallet=${address}`)
      if (res.ok) {
        const data = await res.json()
        setKycStatus(data)
      }
    } catch { /* ignore */ }
  }, [address])

  useEffect(() => {
    if (!address) return
    checkStatus()
  }, [address, checkStatus])

  // Auto-poll Sumsub when SDK is active and not yet verified
  useEffect(() => {
    if (!sdkReady || !address) return
    if (kycStatus.status === 'verified' || kycStatus.status === 'credential_issued') return

    const interval = setInterval(forceCheckStatus, 5000)
    return () => clearInterval(interval)
  }, [sdkReady, address, kycStatus.status, forceCheckStatus])

  // Launch Sumsub WebSDK
  const launchVerification = async () => {
    if (!address || !sdkContainerRef.current) return
    setSdkLoading(true)

    try {
      // Get access token from our backend
      const tokenRes = await fetch(`${BACKEND_URL}/api/kyc/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: address }),
      })

      if (!tokenRes.ok) throw new Error('Failed to get verification token')
      const { token, userId: applicantUserId } = await tokenRes.json()

      // Load Sumsub WebSDK script dynamically
      if (!document.getElementById('sumsub-websdk')) {
        const script = document.createElement('script')
        script.id = 'sumsub-websdk'
        script.src = 'https://static.sumsub.com/idensic/static/sns-websdk-builder.js'
        script.async = true
        document.head.appendChild(script)
        await new Promise<void>((resolve, reject) => {
          script.onload = () => resolve()
          script.onerror = () => reject(new Error('Failed to load Sumsub SDK'))
        })
      }

      // Initialize the SDK widget
      const snsWebSdkInstance = (window as any).snsWebSdk
        .init(token, () => {
          // Token expiration handler — request a new token
          return fetch(`${BACKEND_URL}/api/kyc/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wallet: address }),
          })
            .then(r => r.json())
            .then(data => data.token)
        })
        .withConf({
          lang: 'en',
          theme: 'light',
        })
        .withOptions({ addViewportTag: false, adaptIframeHeight: true })
        .on('idCheck.onStepCompleted', (payload: any) => {
          console.log('[sumsub] Step completed:', payload)
        })
        .on('idCheck.onError', (error: any) => {
          console.error('[sumsub] Error:', error)
        })
        .on('idCheck.applicantStatus', async (payload: any) => {
          console.log('[sumsub] Applicant status:', payload)
          // Use applicantId from event payload (Sumsub internal ID), fall back to token userId
          const resolvedApplicantId = payload?.applicantId || applicantUserId
          if (payload?.reviewStatus === 'completed' && payload?.reviewResult?.reviewAnswer === 'GREEN') {
            // Tell backend to fetch verification data from Sumsub and update store
            try {
              await fetch(`${BACKEND_URL}/api/kyc/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wallet: address, applicantId: resolvedApplicantId }),
              })
            } catch (e) {
              console.warn('[sumsub] Check call failed:', e)
            }
            setTimeout(checkStatus, 1000)
            setTimeout(checkStatus, 3000)
          }
        })
        .build()

      // Mount the SDK widget
      snsWebSdkInstance.launch(sdkContainerRef.current)
      sdkInstanceRef.current = snsWebSdkInstance
      setSdkReady(true)
    } catch (err) {
      console.error('[sumsub] Launch failed:', err)
    } finally {
      setSdkLoading(false)
    }
  }

  // Manual credential issuance using verified KYC data
  const handleManualIssue = async () => {
    if (!address || !kycStatus.verificationData) return
    setIssuing(true)

    try {
      const heightRes = await fetch(`${ALEO_API}/block/height/latest`)
      const currentHeight = await heightRes.json()

      const { age, countryCode, kycPassed, accreditedInvestor } = kycStatus.verificationData
      const inputs = [
        address,
        `${age}u8`,
        `${countryCode}u16`,
        kycPassed.toString(),
        accreditedInvestor.toString(),
        '43200u32',
        `${currentHeight}u32`,
      ]

      const result = await executeTransition('issue_credential', inputs)
      if (result) {
        setIssueTxId(result.id)
        setIssueExplorerTxId(result.explorerId ?? null)
      }
    } finally {
      setIssuing(false)
    }
  }

  // Not connected
  if (!connected) {
    return (
      <div className="page-enter max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="brut-card-static bg-white p-10">
          <AlertTriangle size={48} strokeWidth={2.5} className="mx-auto mb-4" style={{ color: 'var(--color-amber)' }} />
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Wallet Not Connected</h2>
          <p className="mb-6" style={{ color: '#6b7280' }}>Connect your wallet to verify your identity with Sumsub.</p>
          <WalletMultiButton className="wallet-adapter-btn-override" />
        </div>
      </div>
    )
  }

  // Credential issued success screen
  if (issueTxId) {
    return (
      <div className="page-enter max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="brut-card-static p-10" style={{ background: 'var(--color-mint)' }}>
          <div
            className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.4)', border: '3px solid var(--color-ink)' }}
          >
            <ShieldCheck size={36} strokeWidth={2.5} />
          </div>
          <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
            Credential Issued!
          </h2>
          <p className="mb-2 text-sm" style={{ opacity: 0.8 }}>
            Your KYC-verified credential has been issued on the Aleo network.
            You can now pass DeFi compliance gates privately.
          </p>
          <p className="text-xs mb-4" style={{ opacity: 0.6 }}>
            Verified by Sumsub &mdash; credential data encrypted in your wallet.
          </p>
          {issueExplorerTxId && (
            <a
              href={`https://testnet.aleoscan.io/transaction?id=${issueExplorerTxId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="brut-btn mb-6 inline-flex"
              style={{ background: 'white', fontSize: '0.85rem' }}
            >
              View on AleoScan <ExternalLink size={14} />
            </a>
          )}
          <p className="text-xs font-mono mb-6" style={{ opacity: 0.5, wordBreak: 'break-all' }}>
            TX: {issueTxId}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/credentials" className="brut-btn" style={{ background: 'white' }}>
              View Credentials
            </Link>
            <Link to="/gates" className="brut-btn" style={{ background: 'var(--color-amber)' }}>
              Pass a Gate <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const isVerified = kycStatus.status === 'verified' || kycStatus.status === 'credential_issued'
  const isPending = kycStatus.status === 'pending'
  const isFailed = kycStatus.status === 'failed'

  return (
    <div className="page-enter max-w-3xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center"
            style={{ background: 'var(--color-sky)', border: '3px solid var(--color-ink)' }}
          >
            <Fingerprint size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
              Identity Verification
            </h1>
            <p className="text-sm" style={{ color: '#6b7280' }}>
              Powered by Sumsub — production KYC for DeFi compliance
            </p>
          </div>
        </div>
      </div>

      {/* Backend Status */}
      {backendOnline === false && (
        <div className="brut-card-static p-4 mb-6" style={{ background: '#fee2e2', border: '3px solid var(--color-ink)' }}>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <XCircle size={18} style={{ color: 'var(--color-coral)' }} />
            KYC Bridge backend is offline. Start it with <code className="text-xs bg-white px-2 py-1 rounded" style={{ border: '2px solid var(--color-ink)' }}>cd backend && npm run dev</code>
          </div>
        </div>
      )}

      {/* Pipeline visualization */}
      <div className="brut-card-static p-6 mb-6" style={{ background: 'var(--color-cream)' }}>
        <h3 className="text-sm font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
          How It Works — Real KYC to Private Credentials
        </h3>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          {[
            { step: '1', label: 'Sumsub KYC', sub: 'ID scan + liveness', color: 'var(--color-sky)', done: isVerified },
            { step: '2', label: 'Data Extract', sub: 'Age, country, status', color: 'var(--color-purple)', done: isVerified },
            { step: '3', label: 'Aleo Credential', sub: 'Encrypted on-chain', color: 'var(--color-mint)', done: kycStatus.status === 'credential_issued' },
            { step: '4', label: 'Pass Gates', sub: 'ZK proof, no data leak', color: 'var(--color-amber)', done: false },
          ].map((s, i) => (
            <div key={i} className="relative">
              <div
                className="rounded-xl p-3 mb-1"
                style={{
                  background: s.done ? s.color : 'white',
                  border: '2px solid var(--color-ink)',
                  opacity: s.done ? 1 : 0.6,
                }}
              >
                <div className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>{s.step}</div>
                <div className="font-semibold" style={{ fontFamily: 'var(--font-heading)', fontSize: '0.7rem' }}>{s.label}</div>
              </div>
              <div style={{ fontSize: '0.65rem', color: '#6b7280' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Step 1: Connect Wallet */}
      <div className="brut-card-static bg-white p-6 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--color-lime)', border: '2px solid var(--color-ink)' }}
            >
              <CheckCircle size={20} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Step 1: Wallet Connected</h3>
              <p className="text-xs font-mono" style={{ color: '#6b7280' }}>
                {address?.slice(0, 16)}...{address?.slice(-8)}
              </p>
            </div>
          </div>
          <span className="brut-badge text-xs" style={{ background: 'var(--color-lime)' }}>Done</span>
        </div>
      </div>

      {/* Step 2: KYC Verification */}
      <div className="brut-card-static bg-white p-6 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: isVerified ? 'var(--color-lime)' : isPending ? 'var(--color-amber)' : 'var(--color-sky)',
              border: '2px solid var(--color-ink)',
            }}
          >
            {isVerified ? <CheckCircle size={20} strokeWidth={2.5} /> :
             isPending ? <Clock size={20} strokeWidth={2.5} /> :
             <ShieldCheck size={20} strokeWidth={2.5} />}
          </div>
          <div>
            <h3 className="font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Step 2: Verify Your Identity</h3>
            <p className="text-xs" style={{ color: '#6b7280' }}>
              {isVerified ? 'Identity verified by Sumsub' :
               isPending ? 'Verification in progress...' :
               isFailed ? 'Verification failed — try again' :
               'Real KYC — ID document + liveness check'}
            </p>
          </div>
        </div>

        {isVerified && kycStatus.verificationData ? (
          <div className="rounded-xl p-4" style={{ background: 'var(--color-mint)', border: '2px solid var(--color-ink)' }}>
            <div className="flex items-center justify-between mb-3">
              <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                Verified by Sumsub
              </span>
              <span className="brut-badge text-xs" style={{ background: 'var(--color-lime)' }}>APPROVED</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-xs font-semibold" style={{ color: '#6b7280' }}>Age</div>
                <div className="font-bold">{kycStatus.verificationData.age}</div>
              </div>
              <div>
                <div className="text-xs font-semibold" style={{ color: '#6b7280' }}>Country</div>
                <div className="font-bold">
                  {COUNTRY_NAMES[kycStatus.verificationData.countryCode] || `Code: ${kycStatus.verificationData.countryCode}`}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold" style={{ color: '#6b7280' }}>KYC Status</div>
                <div className="font-bold">
                  {kycStatus.verificationData.kycPassed ? 'Passed' : 'Pending'}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold" style={{ color: '#6b7280' }}>Accredited</div>
                <div className="font-bold">
                  {kycStatus.verificationData.accreditedInvestor ? 'Yes' : 'No'}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Info box — hidden once SDK is launched */}
            {!sdkReady && (
              <div className="rounded-xl p-4 mb-4" style={{ background: 'var(--color-cream)', border: '2px dashed var(--color-ink)' }}>
                <p className="text-sm mb-2 font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Sumsub will verify:</p>
                <ul className="text-xs space-y-1" style={{ color: '#4b5563' }}>
                  <li>Government-issued ID document (passport, driver's license, ID card)</li>
                  <li>Liveness detection (selfie match with document photo)</li>
                  <li>Age & country extraction from document</li>
                  <li>Sanctions & PEP screening</li>
                </ul>
                <p className="text-xs mt-3" style={{ color: '#9ca3af' }}>
                  In sandbox mode, Sumsub provides test documents and auto-approves verifications.
                </p>
              </div>
            )}

            {/* Persistent SDK container — never unmounted so the iframe survives re-renders */}
            <div
              ref={sdkContainerRef}
              id="sumsub-websdk-container"
              className="rounded-xl overflow-hidden mb-3"
              style={{
                border: sdkReady ? '2px solid var(--color-ink)' : 'none',
                minHeight: sdkReady ? '500px' : '0',
              }}
            />

            {sdkReady && (
              <div className="text-center space-y-2">
                <p className="text-xs" style={{ color: '#9ca3af' }}>
                  Complete the verification steps above. In sandbox mode, use test documents.
                </p>
                <button
                  onClick={forceCheckStatus}
                  className="brut-btn text-xs"
                  style={{ background: 'var(--color-amber)' }}
                >
                  <CheckCircle size={14} /> I completed verification — check status
                </button>
              </div>
            )}

            {!sdkReady && (
              <button
                onClick={launchVerification}
                disabled={sdkLoading || backendOnline === false}
                className={`brut-btn brut-btn-lg w-full ${sdkLoading ? 'brut-pulse' : ''}`}
                style={{
                  background: sdkLoading ? '#d1d5db' : 'var(--color-sky)',
                  color: 'var(--color-ink)',
                }}
              >
                {sdkLoading ? (
                  <><Loader2 size={20} className="animate-spin" /> Loading Sumsub KYC...</>
                ) : (
                  <><ShieldCheck size={20} strokeWidth={2.5} /> Start Identity Verification</>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Step 3: Credential Issuance */}
      <div className="brut-card-static bg-white p-6 mb-4">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: kycStatus.status === 'credential_issued' ? 'var(--color-lime)' : '#e5e7eb',
              border: '2px solid var(--color-ink)',
            }}
          >
            {kycStatus.status === 'credential_issued' ?
              <CheckCircle size={20} strokeWidth={2.5} /> :
              <ShieldCheck size={20} strokeWidth={2.5} />}
          </div>
          <div>
            <h3 className="font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Step 3: On-Chain Credential</h3>
            <p className="text-xs" style={{ color: '#6b7280' }}>
              {kycStatus.status === 'credential_issued'
                ? 'Encrypted credential issued on Aleo'
                : 'Credential will be issued after KYC verification'}
            </p>
          </div>
        </div>

        {kycStatus.status === 'credential_issued' && kycStatus.credentialTxId ? (
          <div className="rounded-xl p-4" style={{ background: 'var(--color-lime)', border: '2px solid var(--color-ink)' }}>
            <p className="text-sm font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              Credential Issued On-Chain
            </p>
            <p className="text-xs font-mono mb-3" style={{ opacity: 0.7, wordBreak: 'break-all' }}>
              TX: {kycStatus.credentialTxId}
            </p>
            <div className="flex gap-2">
              <Link to="/credentials" className="brut-btn text-xs" style={{ background: 'white' }}>
                View Credentials
              </Link>
              <Link to="/gates" className="brut-btn text-xs" style={{ background: 'var(--color-amber)' }}>
                Pass a Gate <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        ) : isVerified ? (
          <div>
            <p className="text-sm mb-3" style={{ color: '#4b5563' }}>
              Your identity is verified. Issue your encrypted credential on the Aleo network.
              The credential contains your verified data but only you can decrypt it.
            </p>
            <button
              onClick={handleManualIssue}
              disabled={issuing}
              className={`brut-btn brut-btn-lg w-full ${issuing ? 'brut-pulse' : ''}`}
              style={{ background: issuing ? '#d1d5db' : 'var(--color-mint)' }}
            >
              {issuing ? (
                <><Loader2 size={20} className="animate-spin" /> Issuing credential on Aleo...</>
              ) : (
                <><ShieldCheck size={20} strokeWidth={2.5} /> Issue Credential from KYC Data</>
              )}
            </button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm" style={{ color: '#9ca3af' }}>
              Complete Step 2 first to receive your credential.
            </p>
          </div>
        )}
      </div>

      {/* Privacy Assurance */}
      <div className="brut-card-static p-6" style={{ background: 'var(--color-purple)', color: 'white' }}>
        <h4 className="font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Your Privacy is Protected</h4>
        <div className="text-sm space-y-1" style={{ opacity: 0.9 }}>
          <p>Sumsub verifies your identity in their secure environment (SOC2 & ISO 27001 certified).</p>
          <p>Only boolean results (age, KYC pass/fail) are extracted — no documents stored by us.</p>
          <p>Your credential is encrypted on Aleo — only you can decrypt it.</p>
          <p>When you pass gates, zero-knowledge proofs reveal nothing except pass/fail.</p>
        </div>
      </div>
    </div>
  )
}
