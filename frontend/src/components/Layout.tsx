import type { ReactNode } from 'react'
import Navbar from './Navbar'
import ToastContainer from './ToastContainer'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--color-cream)' }}>
      <Navbar />
      <main className="flex-1">
        {children}
      </main>
      <footer
        className="py-6 px-4 text-center"
        style={{
          borderTopWidth: '3px',
          borderTopStyle: 'solid',
          borderColor: 'var(--color-ink)',
          fontFamily: 'var(--font-heading)',
          fontSize: '0.875rem',
          fontWeight: 600,
        }}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Built on Aleo — Zero-Knowledge by Default</span>
          <span style={{ color: '#6b7280' }}>ZK-Access v2.0</span>
        </div>
      </footer>
      <ToastContainer />
    </div>
  )
}
