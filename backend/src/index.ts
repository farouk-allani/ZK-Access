import express from 'express'
import cors from 'cors'
import { config } from './config.js'
import { SumsubService } from './services/fractal.js'
import { AleoService } from './services/aleo.js'
import { store } from './store.js'

const app = express()
const sumsub = new SumsubService()
const aleo = new AleoService()

app.use(cors({ origin: config.frontendUrl, credentials: true }))
app.use(express.json())
app.use(express.text({ type: 'application/json' })) // for webhook signature verification

// ─── Health ──────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    provider: 'sumsub',
    program: config.aleo.programId,
    autoIssue: !!config.aleo.issuerPrivateKey,
  })
})

// ─── Debug: list available Sumsub levels ─────────────────────────────
app.get('/api/debug/levels', async (_req, res) => {
  try {
    const levels = await sumsub.listLevels()
    res.json(levels)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

// ─── Generate Sumsub WebSDK Access Token ─────────────────────────────
// Frontend calls this to get a token, then initializes the embedded SDK widget.
app.post('/api/kyc/token', async (req, res) => {
  const { wallet } = req.body
  if (!wallet) {
    res.status(400).json({ error: 'wallet address required' })
    return
  }

  try {
    // Use wallet address as external user ID
    const tokenData = await sumsub.generateAccessToken(wallet)
    store.create(wallet)
    console.log(`[sumsub] Access token generated for ${wallet.slice(0, 12)}...`)

    res.json({
      token: tokenData.token,
      userId: tokenData.userId,
    })
  } catch (err) {
    console.error('[sumsub] Token generation failed:', err)
    res.status(500).json({ error: 'Failed to generate verification token' })
  }
})

// ─── Check KYC Verification Status ──────────────────────────────────
app.get('/api/kyc/status', (req, res) => {
  const wallet = req.query.wallet as string
  if (!wallet) {
    res.status(400).json({ error: 'wallet address required' })
    return
  }

  const record = store.get(wallet)
  if (!record) {
    res.json({ status: 'none' })
    return
  }

  res.json({
    status: record.status,
    verificationData: record.verificationData,
    credentialTxId: record.credentialTxId,
    updatedAt: record.updatedAt,
  })
})

// ─── Sumsub Webhook (verification result callbacks) ──────────────────
app.post('/api/webhook/sumsub', async (req, res) => {
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body)
  const signature = req.headers['x-payload-digest'] as string || ''

  // Verify webhook signature
  if (config.sumsub.webhookSecret && !sumsub.verifyWebhookSignature(rawBody, signature)) {
    console.warn('[webhook] Invalid signature')
    res.status(401).json({ error: 'Invalid signature' })
    return
  }

  const payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const { type, applicantId, externalUserId, reviewResult, reviewStatus } = payload

  console.log(`[webhook] ${type}: applicant=${applicantId}, user=${externalUserId}, status=${reviewStatus}`)

  if (type === 'applicantReviewed' && externalUserId) {
    const walletAddress = externalUserId
    const isApproved = reviewResult?.reviewAnswer === 'GREEN'

    if (isApproved) {
      try {
        // Fetch full applicant data to extract age, country, etc.
        const applicantData = await sumsub.getApplicantData(applicantId)
        const verificationData = sumsub.extractVerificationData(applicantData, 'completed')

        store.update(walletAddress, {
          fractalUserId: applicantId,
          status: 'verified',
          verificationData,
        })

        console.log(`[webhook] Verified: ${walletAddress.slice(0, 12)}...`, verificationData)

        // Auto-issue credential if private key configured
        if (config.aleo.issuerPrivateKey) {
          try {
            const txId = await aleo.issueCredential({
              recipient: walletAddress,
              ...verificationData,
            })
            store.update(walletAddress, {
              status: 'credential_issued',
              credentialTxId: txId,
            })
            console.log(`[webhook] Auto-issued credential: ${txId}`)
          } catch (err) {
            console.warn('[webhook] Auto-issuance failed:', err)
          }
        }
      } catch (err) {
        console.error('[webhook] Failed to process approval:', err)
        store.update(walletAddress, {
          status: 'verified',
          verificationData: { age: 0, countryCode: 0, kycPassed: true, accreditedInvestor: false },
        })
      }
    } else {
      store.update(walletAddress, { status: 'failed' })
    }
  }

  res.json({ received: true })
})

// ─── Manual check applicant status (polling fallback) ────────────────
app.post('/api/kyc/check', async (req, res) => {
  const { wallet, applicantId } = req.body
  if (!wallet || !applicantId) {
    res.status(400).json({ error: 'wallet and applicantId required' })
    return
  }

  try {
    const applicantData = await sumsub.getApplicantData(applicantId)

    // Debug: log raw Sumsub response to find correct field names
    console.log('[check] Raw Sumsub data:', JSON.stringify(applicantData, null, 2))

    const reviewAnswer = applicantData.reviewResult?.reviewAnswer
    const reviewStatus = applicantData.review?.reviewStatus || applicantData.reviewStatus
    const isApproved = reviewAnswer === 'GREEN' || reviewStatus === 'completed'

    if (isApproved) {
      const verificationData = sumsub.extractVerificationData(applicantData, 'completed')

      store.update(wallet, {
        fractalUserId: applicantId,
        status: 'verified',
        verificationData,
      })

      res.json({ status: 'verified', verificationData })
    } else {
      const status = reviewStatus === 'pending' || reviewStatus === 'queued' || reviewStatus === 'onHold' ? 'pending' : 'failed'
      store.update(wallet, { status: status as 'pending' | 'failed' })
      res.json({ status, reviewStatus })
    }
  } catch (err) {
    console.error('[check] Status check failed:', err)
    res.status(500).json({ error: 'Failed to check verification status' })
  }
})

// ─── Get verified data for manual credential issuance ────────────────
app.post('/api/kyc/issue', async (req, res) => {
  const { wallet } = req.body
  if (!wallet) {
    res.status(400).json({ error: 'wallet address required' })
    return
  }

  const record = store.get(wallet)
  if (!record) {
    res.status(404).json({ error: 'No verification found for this wallet' })
    return
  }

  if (record.status === 'credential_issued') {
    res.json({ status: 'already_issued', credentialTxId: record.credentialTxId })
    return
  }

  if (!record.verificationData?.kycPassed) {
    res.status(400).json({ error: 'KYC not yet verified' })
    return
  }

  res.json({
    status: 'ready_to_issue',
    verificationData: record.verificationData,
    inputs: {
      recipient: wallet,
      age: `${record.verificationData.age}u8`,
      countryCode: `${record.verificationData.countryCode}u16`,
      kycPassed: record.verificationData.kycPassed.toString(),
      accreditedInvestor: record.verificationData.accreditedInvestor.toString(),
    },
  })
})

// ─── Generate ZK Proof via CLI (wallet cannot consume records) ───────
app.post('/api/prove', async (req, res) => {
  const { recordPlaintext, claimType, minAge = 0 } = req.body
  if (!recordPlaintext || !claimType) {
    res.status(400).json({ error: 'recordPlaintext and claimType required' })
    return
  }
  if (!config.aleo.issuerPrivateKey) {
    res.status(503).json({ error: 'Issuer private key not configured' })
    return
  }

  try {
    console.log(`[prove] Generating proof: claimType=${claimType}, minAge=${minAge}`)
    const txId = await aleo.proveCredential({ recordPlaintext, claimType: Number(claimType), minAge: Number(minAge) })
    console.log(`[prove] Proof confirmed on-chain: ${txId}`)
    res.json({ status: 'confirmed', txId })
  } catch (err) {
    const msg = String(err)
    console.error('[prove] Failed:', msg)
    if (msg.includes('already exists in the ledger')) {
      res.status(400).json({ error: 'This credential has already been used (spent). Please select a different credential from your wallet.' })
    } else if (msg.includes('expires_at') || msg.includes('expired')) {
      res.status(400).json({ error: 'This credential has expired. Please issue a new credential first.' })
    } else {
      res.status(500).json({ error: 'Proof generation failed. ' + msg.slice(0, 200) })
    }
  }
})

// ─── Pending Verifications (issuer dashboard) ────────────────────────
app.get('/api/kyc/pending', (_req, res) => {
  const all = store.getAll()
  const verified = all.filter(r => r.status === 'verified' && r.verificationData?.kycPassed)
  res.json({
    count: verified.length,
    records: verified.map(r => ({
      wallet: r.walletAddress,
      verificationData: r.verificationData,
      verifiedAt: r.updatedAt,
    })),
  })
})

// ─── Start Server ────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(``)
  console.log(`  ZK-Access KYC Bridge`)
  console.log(`  ─────────────────────────────────────`)
  console.log(`  Port:        ${config.port}`)
  console.log(`  Provider:    Sumsub`)
  console.log(`  Program:     ${config.aleo.programId}`)
  console.log(`  Frontend:    ${config.frontendUrl}`)
  console.log(`  Auto-issue:  ${config.aleo.issuerPrivateKey ? 'ENABLED' : 'disabled (manual mode)'}`)
  console.log(`  Webhook:     ${config.sumsub.webhookSecret ? 'CONFIGURED' : 'no secret (skip verification)'}`)
  console.log(`  ─────────────────────────────────────`)
  console.log(`  Endpoints:`)
  console.log(`    GET  /api/health`)
  console.log(`    POST /api/kyc/token         — generate Sumsub WebSDK token`)
  console.log(`    GET  /api/kyc/status         — check verification status`)
  console.log(`    POST /api/kyc/check          — poll applicant status`)
  console.log(`    POST /api/kyc/issue          — get verified data for issuance`)
  console.log(`    POST /api/webhook/sumsub     — Sumsub webhook receiver`)
  console.log(`    GET  /api/kyc/pending         — list pending verifications`)
  console.log(``)
})
