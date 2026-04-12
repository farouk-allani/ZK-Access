import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Shield, FileCheck, Eye, Lock, ArrowRight, Fingerprint, Zap, Search, ShieldCheck } from 'lucide-react'
import { queryMapping, useWallet } from '../context/WalletContext'
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui'

const FEATURES = [
  {
    title: 'ZK-Gated DEX Demo',
    desc: 'Live working demo of a DeFi DEX using compliance gates. Shows exactly how protocols integrate ZK-Access in 3 lines of code.',
    color: 'var(--color-lime)',
    icon: Zap,
    link: '/dex-demo',
  },
  {
    title: 'Protocol Compliance Gates',
    desc: 'DeFi protocols define requirements — 18+, KYC, jurisdiction, accredited status. Users pass gates with ZK proofs. Protocols see approved/denied only.',
    color: 'var(--color-sky)',
    icon: ShieldCheck,
    link: '/gates',
  },
  {
    title: 'Real KYC via Sumsub',
    desc: 'Government ID scanning, liveness detection, sanctions screening. Production KYC used by Binance, MoonPay, Bybit — embedded directly in the app.',
    color: 'var(--color-coral)',
    icon: FileCheck,
    link: '/kyc',
  },
  {
    title: 'Encrypted Credentials',
    desc: 'KYC-verified data becomes an encrypted on-chain credential. Only the user can decrypt it. Reusable across any integrated protocol.',
    color: 'var(--color-mint)',
    icon: Lock,
    link: '/credentials',
  },
  {
    title: 'Prove Without Revealing',
    desc: 'Generate zero-knowledge proofs that reveal only pass/fail. Your age, country, and identity never appear on-chain — not to the protocol, not to anyone.',
    color: 'var(--color-purple)',
    icon: Eye,
    link: '/prove',
  },
]

const STEPS = [
  {
    num: '01',
    title: 'User Verifies with Sumsub',
    desc: 'User completes real KYC through Sumsub — government ID scan, liveness check, sanctions screening. Verified data (age, country, KYC status) is extracted securely.',
    icon: Fingerprint,
    color: 'var(--color-sky)',
  },
  {
    num: '02',
    title: 'Encrypted Credential Issued',
    desc: 'Verified KYC data becomes an encrypted credential on Aleo. Only the user can decrypt it. Has expiration and revocation. No personal data stored on-chain.',
    icon: Shield,
    color: 'var(--color-mint)',
  },
  {
    num: '03',
    title: 'Protocol Gates with ZK Proofs',
    desc: 'DeFi protocols define compliance gates. Users pass them with zero-knowledge proofs — the protocol learns only "approved" or "denied", never the user\'s data.',
    icon: Lock,
    color: 'var(--color-purple)',
  },
]

const STATS = [
  { label: 'Transitions', value: '12' },
  { label: 'Mappings', value: '8' },
  { label: 'KYC Provider', value: 'Sumsub' },
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
            ZK Compliance
            <br />
            <span style={{ color: 'var(--color-coral)' }}>Infrastructure.</span>
          </h1>
          <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-10" style={{ color: '#4b5563' }}>
            A plug-in compliance layer for DeFi protocols. Enforce KYC, OFAC, age, and accredited-investor gates — protocols get a boolean, users keep their privacy.
          </p>
           <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
             {connected ? (
               <Link
                 to="/dex-demo"
                 className="brut-btn brut-btn-lg"
                 style={{ background: 'var(--color-mint)', color: 'var(--color-ink)' }}
               >
                 Try DEX Demo <Zap size={20} strokeWidth={2.5} />
               </Link>
             ) : (
               <WalletMultiButton className="wallet-adapter-btn-override wallet-adapter-btn-hero" />
             )}
             <Link
               to="/gates"
               className="brut-btn brut-btn-lg"
               style={{ background: 'white' }}
             >
               Explore DeFi Gates <ArrowRight size={20} strokeWidth={2.5} />
             </Link>
             <Link
               to="/kyc"
               className="brut-btn brut-btn-lg"
               style={{ background: 'var(--color-coral)', color: 'var(--color-ink)' }}
             >
               Verify with Sumsub
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
              <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>COMPLIANCE INFRASTRUCTURE</span>
              <span style={{ color: 'var(--color-coral)' }}>&#9670;</span>
              <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>ZK GATES</span>
              <span style={{ color: 'var(--color-lime)' }}>&#9670;</span>
              <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>REAL KYC</span>
              <span style={{ color: 'var(--color-amber)' }}>&#9670;</span>
              <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>OFAC COMPLIANCE</span>
              <span style={{ color: 'var(--color-purple)' }}>&#9670;</span>
              <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>PROVE WITHOUT REVEALING</span>
              <span style={{ color: 'var(--color-sky)' }}>&#9670;</span>
              <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>8 MAPPINGS</span>
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
          A complete compliance layer for DeFi. KYC, gate, prove, verify — all with zero knowledge.
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
          How It Works
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
            { title: 'OFAC-Compliant DEX', desc: 'Block restricted jurisdictions without collecting user data. Protocols enforce OFAC compliance — users prove they\'re not in a sanctioned country without revealing where they live.', icon: Shield, color: 'var(--color-coral)' },
            { title: 'SEC Accredited Pools', desc: 'Lending protocols and investment DAOs require accredited investors. Users prove eligibility via Sumsub KYC — no income documents shared on-chain.', icon: Search, color: 'var(--color-sky)' },
            { title: 'Age-Gated Finance', desc: 'Financial products requiring 18+ or 21+ access. Real age verification via government ID, proven on-chain with zero knowledge. No birthdates stored.', icon: Lock, color: 'var(--color-amber)' },
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
            Ready to add compliance to your protocol?
          </h2>
          <p className="mb-8" style={{ color: '#9ca3af', maxWidth: '500px', margin: '0 auto 2rem' }}>
            One function call. Zero user data exposed. DeFi compliance without the liability.
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
