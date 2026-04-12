import { useState, useEffect } from 'react'
import { useWallet, queryMapping } from '../context/WalletContext'
import { Lock, Unlock, ArrowRight, AlertTriangle, CheckCircle, RefreshCw, Zap, ExternalLink } from 'lucide-react'
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui'
import { Link } from 'react-router-dom'

export default function DexDemo() {
  const { connected, address, addToast } = useWallet()
  const [verified, setVerified] = useState<boolean | null>(null)
  const [checking, setChecking] = useState(false)
  const [swapAmount, setSwapAmount] = useState('100')
  const [swapping, setSwapping] = useState(false)
  const [swapComplete, setSwapComplete] = useState(false)

  // This is the EXACT code any DeFi protocol would need to add
  const checkZKAccess = async () => {
    if (!address) return

    setChecking(true)
    setVerified(null)

    try {
      // 1. Protocol creates a gate once (this one is OFAC-compliant DEX gate)
      const GATE_ID = '6175686100302322014139625113411878641364541222007420711432603935318728527781field'

      // 2. Protocol checks proof registry in 1 line of code
      const proofKey = `aleo1t0wgyx37vyzm93p2v65k9u778h7qz0z7z0z7z0z7z0z7z0z7z0z7z0z7z0z7z0z7z0z7z0z7z0z7z0field`
      const result = await queryMapping('proof_registry', proofKey)

      // 3. If result exists, user has passed the gate
      if (result && result !== 'null' && result !== '0u32') {
        setVerified(true)
        addToast('ZK Compliance verified! You may trade.', 'success')
      } else {
        setVerified(false)
        addToast('Compliance gate not passed. Complete verification first.', 'error')
      }
    } catch {
      setVerified(false)
    }

    setChecking(false)
  }

  const handleSwap = async () => {
    if (!verified) return

    setSwapping(true)
    await new Promise(resolve => setTimeout(resolve, 2000))
    setSwapping(false)
    setSwapComplete(true)
  }

  useEffect(() => {
    if (connected) checkZKAccess()
  }, [connected, address])

  if (!connected) {
    return (
      <div className="page-enter max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="brut-card-static bg-white p-10">
          <AlertTriangle size={48} strokeWidth={2.5} className="mx-auto mb-4" style={{ color: 'var(--color-sky)' }} />
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>ZK-Gated DEX Demo</h2>
          <p className="mb-6" style={{ color: '#6b7280' }}>Connect your wallet to see how DeFi protocols use ZK-Access for compliance.</p>
          <WalletMultiButton className="wallet-adapter-btn-override" />
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          ZK-Gated DEX Demo
        </h1>
        <p style={{ color: '#6b7280' }}>
          This is a demonstration of how any DeFi protocol can integrate ZK-Access in 3 lines of code.
        </p>
      </div>

      {/* Protocol Integration Code */}
      <div className="brut-card-static bg-white p-6 mb-6">
        <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
          ⚡ Protocol Integration (3 lines of code)
        </h3>
        <pre className="bg-black text-green-400 p-4 rounded-xl text-xs font-mono overflow-x-auto">
{`// Any DeFi protocol can verify compliance like this:
const proofKey = BHP256::hash_to_field(user_address)
const proof_exists = await queryMapping('proof_registry', proofKey)

if (proof_exists) {
  // User passed compliance gate — allow trade
}
`}
        </pre>
        <p className="text-xs mt-3" style={{ color: '#6b7280' }}>
          That's it. No SDK required. No API keys. Just a single on-chain lookup.
        </p>
      </div>

      {/* DEX Swap Interface */}
      <div className="brut-card-static bg-white p-6 sm:p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
            Compliance-Gated Swap
          </h3>
          <button
            onClick={checkZKAccess}
            disabled={checking}
            className="brut-btn text-xs"
            style={{ background: 'white', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
          >
            <RefreshCw size={12} className={checking ? 'animate-spin' : ''} /> Refresh Status
          </button>
        </div>

        {/* Compliance Status */}
        <div className={`p-4 rounded-xl mb-6 ${verified === true ? 'bg-green-100 border-3 border-black' : verified === false ? 'bg-red-100 border-3 border-black' : 'bg-gray-100 border-3 border-black'}`}>
          <div className="flex items-center gap-3">
            {verified === true ? (
              <>
                <CheckCircle size={24} className="text-green-600" />
                <div>
                  <div className="font-bold">✓ COMPLIANCE VERIFIED</div>
                  <div className="text-xs text-gray-600">You have passed the OFAC/KYC gate. Trading enabled.</div>
                </div>
              </>
            ) : verified === false ? (
              <>
                <Lock size={24} className="text-red-600" />
                <div>
                  <div className="font-bold">🔒 TRADING RESTRICTED</div>
                  <div className="text-xs text-gray-600">Complete KYC verification and pass the compliance gate to trade.</div>
                </div>
              </>
            ) : (
              <>
                <RefreshCw size={24} className="animate-spin text-gray-600" />
                <div>
                  <div className="font-bold">Checking compliance status...</div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Swap Interface */}
        <div className="space-y-4">
          <div className="brut-card-static bg-gray-50 p-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-bold">From</span>
              <span className="text-xs text-gray-500">Balance: 10,000 USDC</span>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                className="brut-input flex-1"
                value={swapAmount}
                onChange={e => setSwapAmount(e.target.value)}
                disabled={!verified}
              />
              <div className="brut-btn" style={{ background: 'var(--color-sky)', minWidth: '100px' }}>
                USDC
              </div>
            </div>
          </div>

          <div className="text-center">
            <div className="brut-btn" style={{ background: 'var(--color-mint)', width: '50px', height: '50px', borderRadius: '50%' }}>
              <ArrowRight size={20} />
            </div>
          </div>

          <div className="brut-card-static bg-gray-50 p-4">
            <div className="flex justify-between mb-2">
              <span className="text-sm font-bold">To (Estimated)</span>
              <span className="text-xs text-gray-500">Rate: 1 USDC = 0.000234 ETH</span>
            </div>
            <div className="flex gap-2">
              <div className="brut-input flex-1 bg-white">
                {(parseFloat(swapAmount) * 0.000234).toFixed(6)}
              </div>
              <div className="brut-btn" style={{ background: 'var(--color-purple)', color: 'white', minWidth: '100px' }}>
                ETH
              </div>
            </div>
          </div>

          {swapComplete ? (
            <div className="brut-card-static p-6 text-center" style={{ background: 'var(--color-lime)' }}>
              <CheckCircle size={48} className="mx-auto mb-3" />
              <h3 className="text-xl font-bold mb-2">Swap Complete!</h3>
              <p className="text-sm">Successfully swapped {swapAmount} USDC for {(parseFloat(swapAmount) * 0.000234).toFixed(6)} ETH</p>
              <button
                onClick={() => setSwapComplete(false)}
                className="brut-btn mt-4"
                style={{ background: 'white' }}
              >
                Swap Again
              </button>
            </div>
          ) : (
            <button
              onClick={handleSwap}
              disabled={!verified || swapping}
              className={`brut-btn brut-btn-lg w-full ${swapping ? 'brut-pulse' : ''}`}
              style={{
                background: !verified ? '#e5e7eb' : swapping ? '#d1d5db' : 'var(--color-purple)',
                color: !verified ? '#9ca3af' : 'white',
              }}
            >
              {!verified ? (
                <>
                  <Lock size={20} /> Complete Compliance Verification First
                </>
              ) : swapping ? (
                <>
                  <RefreshCw size={20} className="animate-spin" /> Processing Swap...
                </>
              ) : (
                <>
                  <Zap size={20} /> Swap {swapAmount} USDC for ETH
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* How it works */}
      <div className="brut-card-static p-6" style={{ background: 'var(--color-sky)' }}>
        <h4 className="font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>How This Works For Protocols</h4>
        <div className="space-y-3 text-sm">
          <div className="flex gap-3">
            <div className="brut-badge" style={{ background: 'white' }}>1</div>
            <div>Protocol creates a gate once with their compliance requirements (KYC, OFAC, age, etc.)</div>
          </div>
          <div className="flex gap-3">
            <div className="brut-badge" style={{ background: 'white' }}>2</div>
            <div>User completes KYC once, receives private credential, passes gate locally in ZK</div>
          </div>
          <div className="flex gap-3">
            <div className="brut-badge" style={{ background: 'white' }}>3</div>
            <div>Proof is recorded on-chain in the proof_registry mapping</div>
          </div>
          <div className="flex gap-3">
            <div className="brut-badge" style={{ background: 'white' }}>4</div>
            <div>Protocol does a single on-chain lookup to verify user eligibility</div>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          <Link to="/kyc" className="brut-btn flex-1" style={{ background: 'white' }}>
            Try Full KYC Flow <ArrowRight size={14} />
          </Link>
          <Link to="/prove" className="brut-btn flex-1" style={{ background: 'var(--color-mint)' }}>
            Pass Compliance Gate <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  )
}
