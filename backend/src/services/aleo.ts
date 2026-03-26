import { config } from '../config.js'
import type { VerificationData } from '../store.js'
import { execFile } from 'child_process'
import { promisify } from 'util'
import path from 'path'

const execFileAsync = promisify(execFile)

export class AleoService {
  private apiBase: string

  constructor() {
    this.apiBase = `${config.aleo.apiEndpoint}/${config.aleo.network}`
  }

  async getCurrentBlockHeight(): Promise<number> {
    const res = await fetch(`${this.apiBase}/block/height/latest`)
    if (!res.ok) throw new Error(`Failed to fetch block height: ${res.status}`)
    return res.json() as Promise<number>
  }

  async queryMapping(mappingName: string, key: string): Promise<string | null> {
    try {
      const res = await fetch(
        `${this.apiBase}/program/${config.aleo.programId}/mapping/${mappingName}/${key}`
      )
      if (!res.ok) return null
      const value = await res.text()
      return value.replace(/^"|"$/g, '').trim()
    } catch {
      return null
    }
  }

  // Uses Leo CLI to execute prove_single or pass_gate (record-consuming transitions).
  // Shell wallet cannot broadcast these — the CLI handles state path lookup automatically.
  async proveCredential(params: {
    recordPlaintext: string  // Full Aleo record plaintext string from wallet
    claimType: number        // 1=age, 2=kyc, 3=country, 4=accredited
    minAge?: number
  }): Promise<string> {
    if (!config.aleo.issuerPrivateKey) {
      throw new Error('ALEO_ISSUER_PRIVATE_KEY not configured')
    }

    const { recordPlaintext, claimType, minAge = 0 } = params
    const leoProjectDir = path.resolve(process.cwd(), '../zkaccess')

    const { stdout, stderr } = await execFileAsync('leo', [
      'execute', 'prove_single',
      recordPlaintext,
      `${claimType}u8`,
      `${minAge}u8`,
      '--private-key', config.aleo.issuerPrivateKey,
      '--network', config.aleo.network,
      '--endpoint', config.aleo.apiEndpoint,
      '--yes', '--broadcast',
    ], {
      cwd: leoProjectDir,
      timeout: 300_000,
      maxBuffer: 10 * 1024 * 1024,
    })

    console.log('[aleo] prove_single stdout:', stdout.slice(-500))
    if (stderr) console.warn('[aleo] prove_single stderr:', stderr.slice(-200))

    const txMatch = stdout.match(/transaction ID: '(at1[a-z0-9]+)'/)
    if (!txMatch) throw new Error(`prove_single succeeded but no TX ID found in output:\n${stdout.slice(-300)}`)
    return txMatch[1]
  }

  async issueCredential(params: {
    recipient: string
  } & VerificationData): Promise<string> {
    if (!config.aleo.issuerPrivateKey) {
      throw new Error('ALEO_ISSUER_PRIVATE_KEY not configured — use manual issuance mode')
    }

    const currentHeight = await this.getCurrentBlockHeight()

    const inputs = [
      params.recipient,
      `${params.age}u8`,
      `${params.countryCode}u16`,
      params.kycPassed.toString(),
      params.accreditedInvestor.toString(),
      '43200u32', // 30-day validity
      `${currentHeight}u32`,
    ]

    // Try @provablehq/sdk for automated on-chain execution.
    // The SDK is optional — install it with: npm install @provablehq/sdk
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sdk = await import(/* webpackIgnore: true */ '@provablehq/sdk' as string) as Record<string, any>
      const account = new sdk.Account({ privateKey: config.aleo.issuerPrivateKey })
      const networkClient = new sdk.AleoNetworkClient(this.apiBase)
      const keyProvider = new sdk.AleoKeyProvider()
      keyProvider.useCache(true)
      const recordProvider = new sdk.NetworkRecordProvider(account, networkClient)

      const programManager = new sdk.ProgramManager(this.apiBase, keyProvider, recordProvider)
      programManager.setAccount(account)

      const txId = await programManager.execute({
        programName: config.aleo.programId,
        functionName: 'issue_credential',
        inputs,
        fee: 0.5,
        privateFee: false,
      })

      const result = typeof txId === 'string' ? txId : String(txId)
      console.log(`[aleo] Credential issued on-chain: ${result}`)
      return result
    } catch (sdkError) {
      console.warn('[aleo] SDK auto-issuance unavailable:', sdkError)
      console.log(`[aleo] Inputs for manual issue_credential:`, inputs)
      throw new Error(
        `Auto-issuance unavailable. Use manual issuance with inputs: ${JSON.stringify(inputs)}`
      )
    }
  }
}
