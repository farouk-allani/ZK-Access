import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Shield, FileCheck, Eye, Lock, ArrowRight, Fingerprint, CheckCircle, Zap, Search } from 'lucide-react'
import { queryMapping, useWallet } from '../context/WalletContext'
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui'

const FEATURES = [
  {
    title: 'Issue Credentials',
    desc: 'Authorized issuers create encrypted credential records with expiration. Only the owner can decrypt them.',
    color: 'var(--color-coral)',
    icon: FileCheck,
    link: '/issue',
  },
  {
    title: 'ZK-Gated Access',
    desc: 'Create access gates with custom requirements. Users prove eligibility without revealing personal data.',
    color: 'var(--color-mint)',
    icon: Lock,
    link: '/gates',
  },
  {
    title: 'Prove Privately',
    desc: 'Generate proofs that reveal only pass/fail. Your age, country, and identity stay hidden.',
    color: 'var(--color-purple)',
    icon: Eye,
    link: '/prove',
  },
  {
    title: 'Verify On-Chain',
    desc: 'Third parties verify proofs from the on-chain registry. No trust required — just cryptography.',
    color: 'var(--color-lime)',
    icon: CheckCircle,
    link: '/verify',
  },
]

const STEPS = [
  {
    num: '01',
    title: 'Get a Credential',
    desc: 'An authorized issuer creates an encrypted credential in your wallet. It contains your claims (age, KYC, country) but only you can see them. Credentials have an expiration and can be revoked.',
    icon: Fingerprint,
    color: 'var(--color-sky)',
  },
  {
    num: '02',
    title: 'Pass a Gate',
    desc: 'Services define access gates with requirements (18+, KYC, not restricted). You prove your credential meets them — all at once, privately. Your data never leaves your wallet.',
    icon: Lock,
    color: 'var(--color-mint)',
  },
  {
    num: '03',
    title: 'Verified On-Chain',
    desc: 'The proof is recorded on the Aleo network. Anyone can verify it happened, but nobody can see your private data. Composable, trustless, private.',
    icon: Shield,
    color: 'var(--color-purple)',
  },
]

const STATS = [
  { label: 'Transitions', value: '12' },
  { label: 'Mappings', value: '7' },
  { label: 'Privacy', value: '100%' },
]

export default function Home() {
  const { connected, address, isAdmin, adminChecked } = useWallet()
  const [preflightLoading, setPreflightLoading] = useState(false)
  const [adminInitialized, setAdminInitialized] = useState<boolean | null>(null)
  const [issuerAuthorized, setIssuerAuthorized] = useState<boolean | null>(null)
  const [gateCounter, setGateCounter] = useState<string | null>(null)

  const runPreflightChecks = useCallback(async () => {
    setPreflightLoading(true)
    try {
      const [adminValue, gateCount, issuerValue] = await Promise.all([
        queryMapping('admin', '0u8'),
        queryMapping('gate_counter', '0u8'),
        address ? queryMapping('authorized_issuers', address) : Promise.resolve(null),
      ])

      setAdminInitialized(!!adminValue)
      setGateCounter(gateCount)
      setIssuerAuthorized(address ? issuerValue === 'true' : null)
    } finally {
      setPreflightLoading(false)
    }
  }, [address])

  useEffect(() => {
    runPreflightChecks()
  }, [runPreflightChecks])

  return (
    <div className="page-enter">
      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20">
        <div className="text-center">
          <div
            className="brut-badge inline-flex mb-6"
            style={{ background: 'var(--color-amber)', fontSize: '0.9rem', padding: '0.4rem 1rem' }}
          >
            Live on Aleo Testnet
          </div>
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight mb-6"
            style={{ fontFamily: 'var(--font-heading)' }}
          >
            ZK-Gated Access
            <br />
            <span style={{ color: 'var(--color-coral)' }}>Control Protocol.</span>
          </h1>
          <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-10" style={{ color: '#4b5563' }}>
            Privacy-preserving access control on Aleo.
            Issue credentials, create access gates, prove eligibility —
            without ever exposing personal data.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {connected ? (
              <Link
                to="/gates"
                className="brut-btn brut-btn-lg"
                style={{ background: 'var(--color-coral)', color: 'var(--color-ink)' }}
              >
                Explore Gates <ArrowRight size={20} strokeWidth={2.5} />
              </Link>
            ) : (
              <WalletMultiButton className="wallet-adapter-btn-override wallet-adapter-btn-hero" />
            )}
            <Link
              to="/prove"
              className="brut-btn brut-btn-lg"
              style={{ background: 'white' }}
            >
              Generate Proof <Zap size={20} strokeWidth={2.5} />
            </Link>
          </div>
          {/* Stats */}
          <div className="flex justify-center gap-6 mt-10">
            {STATS.map(stat => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{stat.value}</div>
                <div className="text-xs" style={{ color: '#6b7280' }}>{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="brut-card-static bg-white max-w-3xl mx-auto mt-10 p-5 text-left">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                Judge Preflight Checks
              </h3>
              <button
                type="button"
                onClick={runPreflightChecks}
                disabled={preflightLoading}
                className="brut-btn"
                style={{ background: preflightLoading ? '#d1d5db' : 'var(--color-sky)', fontSize: '0.8rem' }}
              >
                {preflightLoading ? 'Checking...' : 'Refresh Checks'}
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-xl" style={{ border: '2px solid var(--color-ink)', background: connected ? 'var(--color-lime)' : '#fee2e2' }}>
                <div className="font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Wallet Connected</div>
                <div>{connected && address ? `${address.slice(0, 10)}...${address.slice(-6)}` : 'Connect wallet'}</div>
              </div>

              <div className="p-3 rounded-xl" style={{ border: '2px solid var(--color-ink)', background: adminInitialized ? 'var(--color-lime)' : '#fee2e2' }}>
                <div className="font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Admin Initialized</div>
                <div>
                  {preflightLoading ? 'Checking...' : adminInitialized ? 'Yes' : 'No (run initialize_admin)'}
                </div>
              </div>

              <div className="p-3 rounded-xl" style={{ border: '2px solid var(--color-ink)', background: issuerAuthorized ? 'var(--color-lime)' : '#fee2e2' }}>
                <div className="font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Your Issuer Status</div>
                <div>
                  {!connected
                    ? 'Connect wallet to check'
                    : preflightLoading
                      ? 'Checking...'
                      : issuerAuthorized
                        ? 'Authorized issuer'
                        : 'Not authorized (register_issuer)'}
                </div>
              </div>

              <div className="p-3 rounded-xl" style={{ border: '2px solid var(--color-ink)', background: 'var(--color-cream)' }}>
                <div className="font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Gates Created</div>
                <div>{preflightLoading ? 'Checking...' : gateCounter ?? '0u64'}</div>
              </div>
            </div>

            <p className="text-xs mt-3" style={{ color: '#6b7280' }}>
              Admin UI visibility is now derived from on-chain admin mapping.
              {adminChecked ? ' Navbar status is synced.' : ' Syncing admin status...'}
              {!isAdmin && connected ? ' If this wallet should be admin, switch to the admin wallet.' : ''}
            </p>
          </div>
        </div>
      </section>

      {/* Marquee */}
      <section
        className="py-4 overflow-hidden"
        style={{
          borderTopWidth: '3px',
          borderBottomWidth: '3px',
          borderStyle: 'solid',
          borderColor: 'var(--color-ink)',
          background: 'var(--color-ink)',
          color: 'var(--color-cream)',
        }}
      >
        <div className="marquee-track flex items-center gap-8 whitespace-nowrap" style={{ width: 'max-content' }}>
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center gap-8">
              <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>ZK-GATED ACCESS</span>
              <span style={{ color: 'var(--color-coral)' }}>&#9670;</span>
              <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>PRIVACY BY DEFAULT</span>
              <span style={{ color: 'var(--color-lime)' }}>&#9670;</span>
              <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>ACCESS CONTROL PROTOCOL</span>
              <span style={{ color: 'var(--color-amber)' }}>&#9670;</span>
              <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>ALEO BLOCKCHAIN</span>
              <span style={{ color: 'var(--color-purple)' }}>&#9670;</span>
              <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>ENCRYPTED RECORDS</span>
              <span style={{ color: 'var(--color-sky)' }}>&#9670;</span>
              <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>7 MAPPINGS</span>
              <span style={{ color: 'var(--color-pink)' }}>&#9670;</span>
              <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>12 TRANSITIONS</span>
              <span style={{ color: 'var(--color-mint)' }}>&#9670;</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
          What You Can Do
        </h2>
        <p className="text-center mb-12" style={{ color: '#6b7280', maxWidth: '600px', margin: '0 auto 3rem' }}>
          A complete access control protocol. Issue, gate, prove, verify — all with zero knowledge.
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {FEATURES.map((feat) => {
            const Icon = feat.icon
            return (
              <Link
                key={feat.title}
                to={feat.link}
                className="brut-card overflow-hidden no-underline"
                style={{ background: feat.color }}
              >
                <div className="p-6">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: 'rgba(255,255,255,0.3)', border: '2px solid var(--color-ink)' }}
                  >
                    <Icon size={24} strokeWidth={2.5} color="var(--color-ink)" />
                  </div>
                  <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-ink)' }}>
                    {feat.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--color-ink)', opacity: 0.8 }}>
                    {feat.desc}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      {/* Steps Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12" style={{ fontFamily: 'var(--font-heading)' }}>
          Three Steps to Privacy
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {STEPS.map((step) => {
            const Icon = step.icon
            return (
              <div key={step.num} className="brut-card-static overflow-hidden bg-white">
                <div className="p-2">
                  <div
                    className="rounded-xl p-6"
                    style={{ background: step.color }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span
                        className="text-4xl font-bold"
                        style={{ fontFamily: 'var(--font-heading)', opacity: 0.3 }}
                      >
                        {step.num}
                      </span>
                      <Icon size={32} strokeWidth={2.5} color="var(--color-ink)" />
                    </div>
                    <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                      {step.title}
                    </h3>
                  </div>
                </div>
                <div className="px-6 pb-6 pt-4">
                  <p className="text-sm leading-relaxed" style={{ color: '#4b5563' }}>
                    {step.desc}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Use Cases */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-12" style={{ fontFamily: 'var(--font-heading)' }}>
          Use Cases
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { title: 'DeFi Access Control', desc: 'Lending protocols require accredited investors. Users prove eligibility privately — no KYC documents shared.', icon: Shield, color: 'var(--color-coral)' },
            { title: 'Token-Gated Content', desc: 'Gate premium content behind age verification or membership proofs. Users prove access rights without doxxing.', icon: Lock, color: 'var(--color-amber)' },
            { title: 'Compliance Without Exposure', desc: 'Meet regulatory requirements through selective disclosure. Prove jurisdiction compliance without revealing location.', icon: Search, color: 'var(--color-sky)' },
          ].map(uc => (
            <div key={uc.title} className="brut-card-static bg-white p-6">
              <uc.icon size={28} strokeWidth={2.5} style={{ color: uc.color }} className="mb-3" />
              <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{uc.title}</h3>
              <p className="text-sm" style={{ color: '#6b7280' }}>{uc.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="mx-4 sm:mx-8 mb-12 rounded-3xl overflow-hidden"
        style={{
          background: 'var(--color-ink)',
          border: '3px solid var(--color-ink)',
        }}
      >
        <div className="max-w-4xl mx-auto px-8 py-16 text-center">
          <h2
            className="text-3xl sm:text-4xl font-bold mb-4"
            style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-cream)' }}
          >
            Ready to prove without revealing?
          </h2>
          <p className="mb-8" style={{ color: '#9ca3af', maxWidth: '500px', margin: '0 auto 2rem' }}>
            Connect your wallet and experience zero-knowledge access control on Aleo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {connected ? (
              <Link
                to="/gates"
                className="brut-btn brut-btn-lg"
                style={{ background: 'var(--color-coral)', color: 'var(--color-ink)' }}
              >
                Create a Gate <Lock size={20} strokeWidth={2.5} />
              </Link>
            ) : (
              <WalletMultiButton className="wallet-adapter-btn-override wallet-adapter-btn-hero" />
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
