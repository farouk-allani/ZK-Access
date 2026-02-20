import { useWallet, PROGRAM_ID } from '../context/WalletContext'
import { ExternalLink, Clock, FileCheck, Zap, Send } from 'lucide-react'

const FN_LABELS: Record<string, { label: string; color: string; icon: typeof Send }> = {
  issue_credential: { label: 'Issue Credential', color: 'var(--color-coral)', icon: Send },
  prove_age: { label: 'Prove Age', color: 'var(--color-purple)', icon: Zap },
  prove_kyc: { label: 'Prove KYC', color: 'var(--color-purple)', icon: Zap },
  prove_country: { label: 'Prove Country', color: 'var(--color-sky)', icon: Zap },
  prove_accredited: { label: 'Prove Accredited', color: 'var(--color-amber)', icon: Zap },
}

export default function Verify() {
  const { transactions } = useWallet()

  return (
    <div className="page-enter max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          Activity
        </h1>
        <p style={{ color: '#6b7280' }}>
          All your ZK-Access transactions on the Aleo network. Click any transaction to verify it on AleoScan.
        </p>
      </div>

      {/* Program Info */}
      <div className="brut-card-static p-6 mb-6" style={{ background: 'var(--color-mint)' }}>
        <h4 className="font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>Program on Aleo</h4>
        <div className="text-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium">Program ID:</span>
            <a
              href={`https://testnet.aleoscan.io/program?id=${PROGRAM_ID}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm flex items-center gap-1 hover:opacity-70"
            >
              {PROGRAM_ID} <ExternalLink size={12} />
            </a>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-medium">Network:</span>
            <span>Aleo Testnet</span>
          </div>
        </div>
      </div>

      {transactions.length > 0 ? (
        <div className="space-y-4">
          {transactions.map(tx => {
            const meta = FN_LABELS[tx.functionName] || { label: tx.functionName, color: '#e5e7eb', icon: FileCheck }
            const Icon = meta.icon
            return (
              <a
                key={tx.id}
                href={`https://testnet.aleoscan.io/transaction?id=${tx.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="brut-card bg-white overflow-hidden no-underline block"
              >
                <div className="flex items-center gap-4 p-5">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: meta.color, border: '2px solid var(--color-ink)' }}
                  >
                    <Icon size={20} strokeWidth={2.5} color="var(--color-ink)" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                        {meta.label}
                      </span>
                      <span className="brut-badge text-xs" style={{ background: meta.color, fontSize: '0.65rem' }}>
                        {tx.status}
                      </span>
                    </div>
                    <p className="text-xs font-mono truncate" style={{ color: '#6b7280' }}>
                      {tx.id}
                    </p>
                    <div className="flex items-center gap-1 mt-1">
                      <Clock size={10} style={{ color: '#9ca3af' }} />
                      <span className="text-xs" style={{ color: '#9ca3af' }}>
                        {new Date(tx.timestamp).toLocaleString()}
                      </span>
                      <ExternalLink size={10} style={{ color: '#9ca3af', marginLeft: '0.25rem' }} />
                    </div>
                  </div>
                </div>
              </a>
            )
          })}
        </div>
      ) : (
        <div className="brut-card-static bg-white p-10 text-center">
          <FileCheck size={48} strokeWidth={2.5} className="mx-auto mb-4" style={{ color: '#d1d5db' }} />
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
            No Transactions Yet
          </h2>
          <p style={{ color: '#6b7280' }}>
            Issue a credential or generate a proof to see your transaction history here.
          </p>
        </div>
      )}
    </div>
  )
}
