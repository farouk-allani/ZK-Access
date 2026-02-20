import { Link } from 'react-router-dom'
import { Shield, FileCheck, Eye, Lock, ArrowRight, Fingerprint, CheckCircle, Zap } from 'lucide-react'
import { useWallet } from '../context/WalletContext'
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui'

const FEATURES = [
  {
    title: 'Issue Credentials',
    desc: 'Issuers create encrypted credential records. Only the owner can decrypt and use them.',
    color: 'var(--color-coral)',
    icon: FileCheck,
    link: '/issue',
  },
  {
    title: 'Prove Privately',
    desc: 'Generate proofs that reveal only a boolean result. Your data stays hidden.',
    color: 'var(--color-purple)',
    icon: Eye,
    link: '/prove',
  },
  {
    title: 'Verify On-Chain',
    desc: 'Every proof is a real Aleo transaction. Verify it on AleoScan.',
    color: 'var(--color-lime)',
    icon: CheckCircle,
    link: '/verify',
  },
  {
    title: 'Full Privacy',
    desc: 'Powered by Aleo. Execution is local, records are encrypted, privacy is the default.',
    color: 'var(--color-amber)',
    icon: Lock,
    link: '/',
  },
]

const STEPS = [
  {
    num: '01',
    title: 'Get a Credential',
    desc: 'A trusted issuer creates an encrypted credential record in your wallet. It contains your claims (age, KYC status, country) but only you can see them.',
    icon: Fingerprint,
    color: 'var(--color-sky)',
  },
  {
    num: '02',
    title: 'Generate a Proof',
    desc: 'Prove a claim like "I am 18+" without revealing your actual age. The credential is consumed and returned to you so you can reuse it.',
    icon: Zap,
    color: 'var(--color-purple)',
  },
  {
    num: '03',
    title: 'Done — On-Chain',
    desc: 'The transaction is recorded on the Aleo network. Anyone can verify the proof happened, but nobody can see your private data.',
    icon: Shield,
    color: 'var(--color-mint)',
  },
]

export default function Home() {
  const { connected } = useWallet()

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
            Prove Who You Are.
            <br />
            <span style={{ color: 'var(--color-coral)' }}>Reveal Nothing.</span>
          </h1>
          <p className="text-lg sm:text-xl max-w-2xl mx-auto mb-10" style={{ color: '#4b5563' }}>
            Privacy-preserving identity verification on Aleo.
            Issue credentials, generate zero-knowledge proofs, and verify claims —
            without ever exposing personal data.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {connected ? (
              <Link
                to="/issue"
                className="brut-btn brut-btn-lg"
                style={{ background: 'var(--color-coral)', color: 'var(--color-ink)' }}
              >
                Start Issuing <ArrowRight size={20} strokeWidth={2.5} />
              </Link>
            ) : (
              <WalletMultiButton className="wallet-adapter-btn-override wallet-adapter-btn-hero" />
            )}
            <Link
              to="/credentials"
              className="brut-btn brut-btn-lg"
              style={{ background: 'white' }}
            >
              View Credentials
            </Link>
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
              <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>ZERO KNOWLEDGE</span>
              <span style={{ color: 'var(--color-coral)' }}>&#9670;</span>
              <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>PRIVACY BY DEFAULT</span>
              <span style={{ color: 'var(--color-lime)' }}>&#9670;</span>
              <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>SELECTIVE DISCLOSURE</span>
              <span style={{ color: 'var(--color-amber)' }}>&#9670;</span>
              <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>ALEO BLOCKCHAIN</span>
              <span style={{ color: 'var(--color-purple)' }}>&#9670;</span>
              <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>ENCRYPTED RECORDS</span>
              <span style={{ color: 'var(--color-sky)' }}>&#9670;</span>
              <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>LOCAL EXECUTION</span>
              <span style={{ color: 'var(--color-pink)' }}>&#9670;</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl sm:text-4xl font-bold text-center mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
          How It Works
        </h2>
        <p className="text-center mb-12" style={{ color: '#6b7280', maxWidth: '600px', margin: '0 auto 3rem' }}>
          One credential. Unlimited proofs. Complete privacy.
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
            Connect your Leo Wallet and experience zero-knowledge identity verification on Aleo.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {connected ? (
              <Link
                to="/credentials"
                className="brut-btn brut-btn-lg"
                style={{ background: 'var(--color-coral)', color: 'var(--color-ink)' }}
              >
                View My Credentials <ArrowRight size={20} strokeWidth={2.5} />
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
