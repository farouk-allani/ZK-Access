import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useWallet, queryMapping } from '../context/WalletContext'
import { Lock, Plus, Search, ArrowRight, AlertTriangle, ExternalLink, RefreshCw } from 'lucide-react'
import type { GateConfig } from '../types'
import { WalletMultiButton } from '@provablehq/aleo-wallet-adaptor-react-ui'

function parseGateConfig(raw: string, gateId: string): GateConfig | null {
  try {
    const cleaned = raw.replace(/\s/g, '')
    const getVal = (key: string) => {
      const match = cleaned.match(new RegExp(`${key}:([^,}]+)`))
      return match ? match[1].trim() : ''
    }
    return {
      gateId,
      minAge: parseInt(getVal('min_age').replace('u8', '')) || 0,
      requireKyc: getVal('require_kyc') === 'true',
      requireNotRestricted: getVal('require_not_restricted') === 'true',
      requireAccredited: getVal('require_accredited') === 'true',
      active: getVal('active') !== 'false',
    }
  } catch {
    return null
  }
}

// Known gate IDs are stored in localStorage for discovery
function getKnownGateIds(): string[] {
  try {
    const stored = localStorage.getItem('zkaccess_gate_ids')
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function addKnownGateId(gateId: string) {
  const ids = getKnownGateIds()
  if (!ids.includes(gateId)) {
    ids.push(gateId)
    localStorage.setItem('zkaccess_gate_ids', JSON.stringify(ids))
  }
}

function parseU64(raw: string | null): number {
  if (!raw) return 0
  const value = parseInt(raw.replace('u64', '').trim(), 10)
  return Number.isFinite(value) && value > 0 ? value : 0
}

const DEFI_TEMPLATES = [
  {
    name: 'OFAC-Compliant DEX',
    desc: 'Standard DeFi compliance — KYC verified, not in restricted countries',
    minAge: 18,
    requireKyc: true,
    requireNotRestricted: true,
    requireAccredited: false,
    color: 'var(--color-sky)',
  },
  {
    name: 'SEC Accredited Pool',
    desc: 'Investment DAOs & lending pools requiring accredited investor status',
    minAge: 18,
    requireKyc: true,
    requireNotRestricted: true,
    requireAccredited: true,
    color: 'var(--color-amber)',
  },
  {
    name: 'Age-Gated DeFi',
    desc: 'Financial products requiring minimum age verification (21+)',
    minAge: 21,
    requireKyc: true,
    requireNotRestricted: false,
    requireAccredited: false,
    color: 'var(--color-coral)',
  },
  {
    name: 'Global KYC Gate',
    desc: 'Basic KYC-only gate — identity verified, open to all countries',
    minAge: 0,
    requireKyc: true,
    requireNotRestricted: false,
    requireAccredited: false,
    color: 'var(--color-mint)',
  },
]

type Section = 'browse' | 'create'

export default function Gates() {
  const { connected, executeTransition, addToast } = useWallet()
  const [section, setSection] = useState<Section>('browse')
  const [gates, setGates] = useState<GateConfig[]>([])
  const [loadingGates, setLoadingGates] = useState(false)
  const [lookupId, setLookupId] = useState('')
  const [lookupResult, setLookupResult] = useState<GateConfig | null>(null)
  const [lookingUp, setLookingUp] = useState(false)

  // Create gate form
  const [creating, setCreating] = useState(false)
  const [txId, setTxId] = useState<string | null>(null)
  const [explorerTxId, setExplorerTxId] = useState<string | null>(null)
  const [form, setForm] = useState({
    minAge: 0,
    requireKyc: false,
    requireNotRestricted: false,
    requireAccredited: false,
  })

  const fetchKnownGates = async () => {
    setLoadingGates(true)
    const discoveredIds = new Set<string>(getKnownGateIds())

    // Fetch gate counter to know how many gates exist on-chain.
    const gateCounterRaw = await queryMapping('gate_counter', '0u8')
    const gateCount = parseU64(gateCounterRaw)
    const maxLoad = Math.min(gateCount, 200)

    // Fetch all gate IDs in parallel instead of sequentially.
    if (maxLoad > 0) {
      const indexPromises = Array.from({ length: maxLoad }, (_, i) =>
        queryMapping('gate_index', `${i}u64`)
      )
      const indexResults = await Promise.all(indexPromises)

      for (const gateIdRaw of indexResults) {
        if (!gateIdRaw || gateIdRaw === 'null') continue
        const normalized = gateIdRaw.endsWith('field') ? gateIdRaw : `${gateIdRaw}field`
        discoveredIds.add(normalized)
        addKnownGateId(normalized)
      }
    }

    // Fetch all gate configs in parallel.
    const ids = Array.from(discoveredIds)
    const configPromises = ids.map(id => {
      const key = id.endsWith('field') ? id : `${id}field`
      return queryMapping('gates', key).then(result => {
        if (result && result !== 'null') return parseGateConfig(result, id)
        return null
      })
    })
    const configs = (await Promise.all(configPromises)).filter((c): c is GateConfig => c !== null)

    setGates(configs)
    setLoadingGates(false)
  }

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchKnownGates()
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [])

  const handleLookup = async () => {
    if (!lookupId.trim()) return
    setLookingUp(true)
    setLookupResult(null)

    const key = lookupId.trim().endsWith('field') ? lookupId.trim() : `${lookupId.trim()}field`
    const result = await queryMapping('gates', key)

    if (result && result !== 'null') {
      const normalizedGateId = key.endsWith('field') ? key : `${key}field`
      const parsed = parseGateConfig(result, normalizedGateId)
      setLookupResult(parsed)
      if (parsed) {
        addKnownGateId(normalizedGateId)
      }
    } else {
      addToast('Gate not found', 'error')
    }
    setLookingUp(false)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!connected) return

    setCreating(true)
    setTxId(null)
    setExplorerTxId(null)

    const inputs = [
      `${form.minAge}u8`,
      `${form.requireKyc}`,
      `${form.requireNotRestricted}`,
      `${form.requireAccredited}`,
    ]

    const result = await executeTransition('create_gate', inputs)
    setTxId(result?.id ?? null)
    setExplorerTxId(result?.explorerId ?? null)
    setCreating(false)

    if (result?.id) {
      // Poll for the new gate to appear on-chain (indexing takes ~10-30s).
      if (pollRef.current) clearInterval(pollRef.current)
      const prevCount = gates.length
      pollRef.current = setInterval(async () => {
        await fetchKnownGates()
        const counterRaw = await queryMapping('gate_counter', '0u8')
        const count = parseU64(counterRaw)
        if (count > prevCount && pollRef.current) {
          clearInterval(pollRef.current)
          pollRef.current = null
        }
      }, 8_000)
      // Stop polling after 2 minutes regardless.
      setTimeout(() => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null } }, 120_000)
    }
  }

  if (!connected) {
    return (
      <div className="page-enter max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="brut-card-static bg-white p-10">
          <AlertTriangle size={48} strokeWidth={2.5} className="mx-auto mb-4" style={{ color: 'var(--color-amber)' }} />
          <h2 className="text-2xl font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Wallet Not Connected</h2>
          <p className="mb-6" style={{ color: '#6b7280' }}>Connect your wallet to create and browse access gates.</p>
          <WalletMultiButton className="wallet-adapter-btn-override" />
        </div>
      </div>
    )
  }

  if (txId) {
    return (
      <div className="page-enter max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="brut-card-static p-10" style={{ background: 'var(--color-mint)' }}>
          <div
            className="w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.4)', border: '3px solid var(--color-ink)' }}
          >
            <Lock size={36} strokeWidth={2.5} />
          </div>
          <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>
            Gate Created!
          </h2>
          <p className="mb-4 text-sm" style={{ opacity: 0.8 }}>
            Your access gate has been submitted to the Aleo network.
            Once confirmed, users can prove they meet your requirements using this gate.
          </p>
          {explorerTxId ? (
            <a
              href={`https://testnet.aleoscan.io/transaction?id=${explorerTxId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="brut-btn mb-6 inline-flex"
              style={{ background: 'white', fontSize: '0.85rem' }}
            >
              View on AleoScan <ExternalLink size={14} />
            </a>
          ) : (
            <p className="text-xs mb-6" style={{ opacity: 0.7 }}>
              On-chain transaction ID is not available from wallet response yet.
            </p>
          )}
          <p className="text-xs font-mono mb-6" style={{ opacity: 0.5, wordBreak: 'break-all' }}>
            TX: {txId}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => { setTxId(null); setExplorerTxId(null) }}
              className="brut-btn"
              style={{ background: 'white' }}
            >
              Create Another Gate
            </button>
            <button
              onClick={() => { setTxId(null); setSection('browse'); void fetchKnownGates() }}
              className="brut-btn"
              style={{ background: 'var(--color-amber)' }}
            >
              Browse Gates
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="page-enter max-w-3xl mx-auto px-4 py-12">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
          ZK-Gates
        </h1>
        <p style={{ color: '#6b7280' }}>
          Access gates define requirements that users must privately prove to gain access. Create gates for your dApp or browse existing ones.
        </p>
      </div>

      {/* Section Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setSection('browse')}
          className="brut-btn"
          style={{
            background: section === 'browse' ? 'var(--color-mint)' : 'white',
          }}
        >
          <Search size={16} /> Browse Gates
        </button>
        <button
          onClick={() => setSection('create')}
          className="brut-btn"
          style={{
            background: section === 'create' ? 'var(--color-purple)' : 'white',
            color: section === 'create' ? 'white' : 'var(--color-ink)',
          }}
        >
          <Plus size={16} /> Create Gate
        </button>
      </div>

      {section === 'browse' && (
        <div className="space-y-6">
          {/* Lookup */}
          <div className="brut-card-static bg-white p-6 sm:p-8">
            <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>
              Look Up a Gate
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                className="brut-input flex-1"
                placeholder="Enter gate ID (field value)"
                value={lookupId}
                onChange={e => setLookupId(e.target.value)}
              />
              <button
                onClick={handleLookup}
                disabled={lookingUp || !lookupId.trim()}
                className="brut-btn"
                style={{ background: lookingUp ? '#d1d5db' : 'var(--color-sky)', whiteSpace: 'nowrap' }}
              >
                {lookingUp ? 'Looking up...' : 'Search'}
              </button>
            </div>

            {lookupResult && (
              <div className="mt-4 p-4 rounded-xl" style={{ background: lookupResult.active ? 'var(--color-mint)' : '#fee2e2', border: '3px solid var(--color-ink)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                    Gate Found
                  </h4>
                  <span className="brut-badge text-xs" style={{ background: lookupResult.active ? 'var(--color-lime)' : 'var(--color-coral)' }}>
                    {lookupResult.active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </div>
                <p className="text-xs font-mono mb-3" style={{ opacity: 0.7 }}>ID: {lookupResult.gateId}</p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {lookupResult.minAge > 0 && <span className="brut-badge text-xs" style={{ background: 'var(--color-coral)' }}>Age {'>'} = {lookupResult.minAge}</span>}
                  {lookupResult.requireKyc && <span className="brut-badge text-xs" style={{ background: 'var(--color-purple)', color: 'white' }}>KYC Required</span>}
                  {lookupResult.requireNotRestricted && <span className="brut-badge text-xs" style={{ background: 'var(--color-sky)' }}>Country Check</span>}
                  {lookupResult.requireAccredited && <span className="brut-badge text-xs" style={{ background: 'var(--color-amber)' }}>Accredited</span>}
                  {!lookupResult.minAge && !lookupResult.requireKyc && !lookupResult.requireNotRestricted && !lookupResult.requireAccredited && (
                    <span className="text-xs" style={{ color: '#6b7280' }}>No requirements (open gate)</span>
                  )}
                </div>
                <Link
                  to="/prove"
                  className="brut-btn w-full"
                  style={{ background: lookupResult.active ? 'var(--color-lime)' : '#e5e7eb' }}
                >
                  Pass This Gate <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>

          {/* Known Gates */}
          <div className="brut-card-static bg-white p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)' }}>
                Known Gates
              </h3>
              <button
                onClick={fetchKnownGates}
                disabled={loadingGates}
                className="brut-btn text-xs"
                style={{ background: 'white', padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
              >
                <RefreshCw size={12} className={loadingGates ? 'animate-spin' : ''} /> Refresh
              </button>
            </div>

            {gates.length > 0 ? (
              <div className="space-y-4">
                {gates.map((gate, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl"
                    style={{
                      border: '3px solid var(--color-ink)',
                      background: gate.active ? 'white' : '#f9fafb',
                      opacity: gate.active ? 1 : 0.6,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Lock size={16} />
                        <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-heading)' }}>
                          Gate
                        </span>
                      </div>
                      <span className="brut-badge text-xs" style={{ background: gate.active ? 'var(--color-lime)' : 'var(--color-coral)', fontSize: '0.65rem' }}>
                        {gate.active ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </div>
                    <p className="text-xs font-mono mb-2" style={{ opacity: 0.6 }}>ID: {gate.gateId}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {gate.minAge > 0 && <span className="brut-badge text-xs" style={{ background: 'var(--color-coral)', fontSize: '0.65rem' }}>Age {'>'} = {gate.minAge}</span>}
                      {gate.requireKyc && <span className="brut-badge text-xs" style={{ background: 'var(--color-purple)', color: 'white', fontSize: '0.65rem' }}>KYC</span>}
                      {gate.requireNotRestricted && <span className="brut-badge text-xs" style={{ background: 'var(--color-sky)', fontSize: '0.65rem' }}>Country</span>}
                      {gate.requireAccredited && <span className="brut-badge text-xs" style={{ background: 'var(--color-amber)', fontSize: '0.65rem' }}>Accredited</span>}
                    </div>
                    {gate.active && (
                      <Link to="/prove" className="brut-btn text-xs w-full" style={{ background: 'var(--color-lime)', fontSize: '0.8rem' }}>
                        Pass Gate <ArrowRight size={14} />
                      </Link>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Lock size={32} className="mx-auto mb-3" style={{ color: '#d1d5db' }} />
                <p className="text-sm" style={{ color: '#6b7280' }}>
                  {loadingGates ? 'Loading gates...' : 'No known gates yet. Create one or look up a gate ID.'}
                </p>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="brut-card-static p-6" style={{ background: 'var(--color-sky)', opacity: 0.9 }}>
            <h4 className="font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>What are ZK-Gates?</h4>
            <div className="text-sm space-y-1" style={{ opacity: 0.85 }}>
              <p>Gates are on-chain access requirements. Any service or dApp can create a gate specifying what users must prove.</p>
              <p>Users pass gates by proving their credential meets the requirements — without revealing any personal data.</p>
              <p>Example: A DeFi protocol creates a gate requiring Age 18+, KYC, and not restricted country. Users prove all three privately.</p>
            </div>
          </div>
        </div>
      )}

      {section === 'create' && (
        <form onSubmit={handleCreate} className="space-y-6">
          {/* DeFi Compliance Templates */}
          <div className="brut-card-static bg-white p-6 sm:p-8">
            <h3 className="text-lg font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
              DeFi Compliance Templates
            </h3>
            <p className="text-xs mb-4" style={{ color: '#6b7280' }}>
              Pre-configured gates for common DeFi regulatory requirements. Click to auto-fill.
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {DEFI_TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  type="button"
                  onClick={() => setForm({
                    minAge: tpl.minAge,
                    requireKyc: tpl.requireKyc,
                    requireNotRestricted: tpl.requireNotRestricted,
                    requireAccredited: tpl.requireAccredited,
                  })}
                  className="text-left p-3 rounded-xl transition-all"
                  style={{ border: '2px solid var(--color-ink)', background: tpl.color }}
                >
                  <div className="font-bold text-sm" style={{ fontFamily: 'var(--font-heading)' }}>{tpl.name}</div>
                  <div className="text-xs mt-1" style={{ opacity: 0.8 }}>{tpl.desc}</div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tpl.minAge > 0 && <span className="brut-badge text-xs" style={{ background: 'rgba(255,255,255,0.6)', fontSize: '0.6rem' }}>{tpl.minAge}+</span>}
                    {tpl.requireKyc && <span className="brut-badge text-xs" style={{ background: 'rgba(255,255,255,0.6)', fontSize: '0.6rem' }}>KYC</span>}
                    {tpl.requireNotRestricted && <span className="brut-badge text-xs" style={{ background: 'rgba(255,255,255,0.6)', fontSize: '0.6rem' }}>OFAC</span>}
                    {tpl.requireAccredited && <span className="brut-badge text-xs" style={{ background: 'rgba(255,255,255,0.6)', fontSize: '0.6rem' }}>SEC</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="brut-card-static bg-white p-6 sm:p-8">
            <h3 className="text-lg font-bold mb-6" style={{ fontFamily: 'var(--font-heading)' }}>
              Gate Requirements
            </h3>
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>
                  Minimum Age (0 = not required)
                </label>
                <input
                  type="number"
                  className="brut-input"
                  min={0}
                  max={150}
                  value={form.minAge}
                  onChange={e => setForm(f => ({ ...f, minAge: parseInt(e.target.value) || 0 }))}
                  style={{ maxWidth: '200px' }}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Require KYC</label>
                  <p className="text-xs" style={{ color: '#9ca3af' }}>Users must have KYC verification</p>
                </div>
                <button
                  type="button"
                  className={`brut-toggle ${form.requireKyc ? 'active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, requireKyc: !f.requireKyc }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Require Country Check</label>
                  <p className="text-xs" style={{ color: '#9ca3af' }}>Users must not be in restricted countries</p>
                </div>
                <button
                  type="button"
                  className={`brut-toggle ${form.requireNotRestricted ? 'active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, requireNotRestricted: !f.requireNotRestricted }))}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>Require Accredited Investor</label>
                  <p className="text-xs" style={{ color: '#9ca3af' }}>Users must be accredited investors</p>
                </div>
                <button
                  type="button"
                  className={`brut-toggle ${form.requireAccredited ? 'active' : ''}`}
                  onClick={() => setForm(f => ({ ...f, requireAccredited: !f.requireAccredited }))}
                />
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="brut-card-static p-6" style={{ background: 'var(--color-mint)' }}>
            <h4 className="font-bold mb-3" style={{ fontFamily: 'var(--font-heading)' }}>Gate Preview</h4>
            <div className="flex flex-wrap gap-2">
              {form.minAge > 0 && <span className="brut-badge text-xs" style={{ background: 'var(--color-coral)' }}>Age {'>'} = {form.minAge}</span>}
              {form.requireKyc && <span className="brut-badge text-xs" style={{ background: 'var(--color-purple)', color: 'white' }}>KYC Required</span>}
              {form.requireNotRestricted && <span className="brut-badge text-xs" style={{ background: 'var(--color-sky)' }}>Country Check</span>}
              {form.requireAccredited && <span className="brut-badge text-xs" style={{ background: 'var(--color-amber)' }}>Accredited Investor</span>}
              {form.minAge === 0 && !form.requireKyc && !form.requireNotRestricted && !form.requireAccredited && (
                <span className="text-xs" style={{ color: '#6b7280' }}>No requirements set — anyone can pass this gate</span>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={creating}
            className={`brut-btn brut-btn-lg w-full ${creating ? 'brut-pulse' : ''}`}
            style={{ background: creating ? '#d1d5db' : 'var(--color-purple)', color: 'white' }}
          >
            {creating ? <>Submitting to Aleo...</> : <>Create Gate <Lock size={20} strokeWidth={2.5} /></>}
          </button>
        </form>
      )}
    </div>
  )
}
