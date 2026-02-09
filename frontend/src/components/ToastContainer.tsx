import { useWallet } from '../context/WalletContext'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

const TOAST_COLORS = {
  success: 'var(--color-lime)',
  error: 'var(--color-coral)',
  info: 'var(--color-sky)',
}

const TOAST_ICONS = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
}

export default function ToastContainer() {
  const { toasts, removeToast } = useWallet()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-3">
      {toasts.map(toast => {
        const Icon = TOAST_ICONS[toast.type]
        return (
          <div
            key={toast.id}
            className="brut-toast flex items-center gap-3"
            style={{ background: TOAST_COLORS[toast.type], maxWidth: '400px' }}
          >
            <Icon size={20} strokeWidth={2.5} />
            <span className="flex-1">{toast.message}</span>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 rounded-lg hover:bg-black/10 transition-colors"
            >
              <X size={16} strokeWidth={2.5} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
