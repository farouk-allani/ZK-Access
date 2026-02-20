import { Link, useLocation } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useState } from 'react'
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui'
import { useWallet } from '../context/WalletContext'

const NAV_LINKS = [
  { to: '/', label: 'Home' },
  { to: '/issue', label: 'Issue' },
  { to: '/credentials', label: 'Credentials' },
  { to: '/prove', label: 'Prove' },
  { to: '/verify', label: 'Activity' },
]

export default function Navbar() {
  const { connected, address } = useWallet()
  const location = useLocation()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav className="bg-cream border-b-3 border-ink sticky top-0 z-50" style={{ borderBottomWidth: '3px', borderColor: 'var(--color-ink)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 no-underline">
            <div className="w-12 h-10 rounded-xl overflow-hidden" >
              <img src="/logo-mark-cyber.svg" alt="ZK-Access logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-heading text-xl font-bold text-ink" style={{ fontFamily: 'var(--font-heading)' }}>
              ZK-Access
            </span>
          </Link>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className="px-4 py-2 rounded-xl font-semibold text-sm no-underline transition-colors"
                style={{
                  fontFamily: 'var(--font-heading)',
                  color: 'var(--color-ink)',
                  background: location.pathname === link.to ? 'var(--color-amber)' : 'transparent',
                  border: location.pathname === link.to ? '2px solid var(--color-ink)' : '2px solid transparent',
                }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Wallet button */}
          <div className="flex items-center gap-3">
            {connected && address && (
              <div
                className="brut-badge hidden sm:inline-flex"
                style={{ background: 'var(--color-mint)', fontSize: '0.75rem' }}
              >
                <div className="w-2 h-2 rounded-full bg-ink" />
                {address.slice(0, 8)}...{address.slice(-4)}
              </div>
            )}
            <WalletMultiButton className="wallet-adapter-btn-override" />

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 rounded-xl"
              style={{ border: '2px solid var(--color-ink)' }}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t-3 px-4 pb-4 pt-2" style={{ borderTopWidth: '3px', borderColor: 'var(--color-ink)' }}>
          {NAV_LINKS.map(link => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-3 rounded-xl font-semibold text-sm no-underline mb-1"
              style={{
                fontFamily: 'var(--font-heading)',
                color: 'var(--color-ink)',
                background: location.pathname === link.to ? 'var(--color-amber)' : 'transparent',
                border: location.pathname === link.to ? '2px solid var(--color-ink)' : '2px solid transparent',
              }}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}
