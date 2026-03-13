import {
  BaseAleoWalletAdapter,
  WalletConnectionError,
  WalletNotConnectedError,
  scopePollingDetectionStrategy,
} from '@provablehq/aleo-wallet-adaptor-core'
import type { StandardWallet, WalletName } from '@provablehq/aleo-wallet-standard'
import { WalletReadyState, WalletDecryptPermission } from '@provablehq/aleo-wallet-standard'
import { Network } from '@provablehq/aleo-types'
import type { Account, TransactionOptions } from '@provablehq/aleo-types'

// Shield Wallet implements the StandardWallet features interface
interface ShieldWalletStandard {
  features: Record<string, unknown>
  [key: string]: unknown
}

// Shield Wallet direct API (fallback if standard interface is not available)
interface ShieldWalletDirect {
  publicKey?: string
  permission?: string
  network?: string
  connect(
    decryptPermission: string,
    network: string,
  ): Promise<{ publicKey: string } | void>
  disconnect(): Promise<void>
  requestRecordPlaintexts?(program: string): Promise<unknown[] | { records?: unknown[] }>
  requestRecords(program: string): Promise<unknown[] | { records?: unknown[] }>
  requestTransaction?(transaction: {
    address: string
    chainId: string
    transitions: Array<{
      program: string
      functionName: string
      inputs: unknown[]
    }>
    fee?: number
    feePrivate?: boolean
  }): Promise<{ transactionId: string } | string>
  requestExecution?(transaction: {
    address: string
    chainId: string
    transitions: Array<{
      program: string
      functionName: string
      inputs: unknown[]
    }>
    fee?: number
    feePrivate?: boolean
  }): Promise<{ transactionId: string } | string>
}

type ShieldWalletAPI = ShieldWalletStandard | ShieldWalletDirect

declare global {
  interface Window {
    shield?: ShieldWalletAPI
    shieldWallet?: ShieldWalletAPI
  }
}

function toShieldNetwork(network: Network): string {
  switch (network) {
    case Network.MAINNET:
      return 'mainnet'
    case Network.TESTNET:
    case Network.CANARY:
      return 'testnetbeta'
    default:
      return 'testnetbeta'
  }
}

function isStandardWallet(w: ShieldWalletAPI): w is ShieldWalletStandard {
  return 'features' in w && w.features != null && typeof w.features === 'object'
}

function parseInput(input: string): unknown {
  const trimmed = input.trim()
  if (!trimmed) return input
  if (!(trimmed.startsWith('{') || trimmed.startsWith('['))) return input
  try {
    return JSON.parse(trimmed)
  } catch {
    return input
  }
}

function getShieldWallet(): ShieldWalletAPI | undefined {
  if (typeof window === 'undefined') return undefined
  return window.shieldWallet ?? window.shield
}

const SHIELD_WALLET_ICON =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI2IiBmaWxsPSIjMUIxQjFCIi8+PHBhdGggZD0iTTE2IDRMMjYgOFYxNEMyNiAyMC42MyAyMS43OSAyNi40NyAxNiAyOEMxMC4yMSAyNi40NyA2IDIwLjYzIDYgMTRWOEwxNiA0WiIgc3Ryb2tlPSIjMDBGRjg4IiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz48cGF0aCBkPSJNMTIgMTZMMTQuNSAxOC41TDIwIDEzIiBzdHJva2U9IiMwMEZGODgiIHN0cm9rZS13aWR0aD0iMiIgZmlsbD0ibm9uZSIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+PC9zdmc+'

export class ShieldWalletAdapter extends BaseAleoWalletAdapter {
  name = 'Shield Wallet' as WalletName<string>
  url = 'https://aleo.org/shield/'
  icon = SHIELD_WALLET_ICON
  _readyState: WalletReadyState = WalletReadyState.NOT_DETECTED
  network: Network = Network.TESTNET
  decryptPermission: WalletDecryptPermission = WalletDecryptPermission.UponRequest

  constructor() {
    super()

    if (typeof window !== 'undefined') {
      const detected = getShieldWallet()
      if (detected) {
        this._initFromExtension(detected)
        this._readyState = WalletReadyState.INSTALLED
      }

      scopePollingDetectionStrategy(() => {
        const polled = getShieldWallet()
        if (polled) {
          this._initFromExtension(polled)
          this.readyState = WalletReadyState.INSTALLED
          return true
        }
        return false
      })
    }
  }

  private _initFromExtension(wallet: ShieldWalletAPI) {
    if (isStandardWallet(wallet)) {
      this._wallet = wallet as unknown as StandardWallet
    }
  }

  // ─── Connection ────────────────────────────────────────────────────────────

  override async connect(
    network: Network,
    decryptPermission: WalletDecryptPermission,
    programs?: string[],
  ): Promise<Account> {
    const wallet = getShieldWallet()
    if (!wallet) {
      throw new WalletConnectionError(
        'Shield Wallet extension not found. Please install it from https://aleo.org/shield/',
      )
    }

    this.network = network
    this.decryptPermission = decryptPermission

    // StandardWallet interface — delegate to BaseAleoWalletAdapter
    if (isStandardWallet(wallet)) {
      try {
        return await super.connect(network, decryptPermission, programs)
      } catch (error: unknown) {
        const raw = error instanceof Error ? error : new Error(String(error))
        throw new WalletConnectionError(raw.message || 'Shield Wallet connection failed')
      }
    }

    // Direct API fallback
    const direct = wallet as ShieldWalletDirect
    let result: { publicKey: string } | void
    try {
      result = await direct.connect(decryptPermission as string, toShieldNetwork(network))
    } catch (error: unknown) {
      const raw = error instanceof Error ? error : new Error(String(error))
      throw new WalletConnectionError(raw.message || 'Shield Wallet connection failed')
    }

    const address = (result as { publicKey?: string })?.publicKey ?? direct.publicKey ?? ''
    if (!address) throw new WalletConnectionError('Shield Wallet did not return an address')

    const account: Account = { address }
    this.account = account
    this.emit('connect', account)
    return account
  }

  override async disconnect(): Promise<void> {
    const wallet = getShieldWallet()

    if (wallet && isStandardWallet(wallet)) {
      return super.disconnect()
    }

    if (wallet) {
      await (wallet as ShieldWalletDirect).disconnect()
    }
    this.account = undefined
    this.emit('disconnect')
  }

  // ─── Transactions ──────────────────────────────────────────────────────────

  override async executeTransaction(
    options: TransactionOptions,
  ): Promise<{ transactionId: string }> {
    const wallet = getShieldWallet()
    if (!this.account || !wallet) throw new WalletNotConnectedError()

    if (isStandardWallet(wallet)) {
      return super.executeTransaction(options)
    }

    const program = (options as TransactionOptions & { programId?: string }).program
      ?? (options as TransactionOptions & { programId?: string }).programId
    const functionName = (options as TransactionOptions & { functionName?: string }).function
      ?? (options as TransactionOptions & { functionName?: string }).functionName

    if (!program || !functionName) {
      throw new WalletConnectionError('Missing program/function for Shield transaction request')
    }

    const direct = wallet as ShieldWalletDirect
    const chainId = toShieldNetwork(this.network)
    const parsedInputs = options.inputs.map(input => parseInput(input))
    const txRequest = {
      address: this.account.address,
      chainId,
      transitions: [
        {
          program,
          functionName,
          inputs: parsedInputs,
        },
      ],
      fee: options.fee,
      feePrivate: options.privateFee ?? false,
    }

    const raw = direct.requestTransaction
      ? await direct.requestTransaction(txRequest)
      : await direct.requestExecution?.(txRequest)

    if (!raw) {
      throw new WalletConnectionError('Shield Wallet did not return a transaction id')
    }

    return typeof raw === 'string' ? { transactionId: raw } : raw
  }

  // ─── Records ───────────────────────────────────────────────────────────────

  override async requestRecords(program: string, includePlaintext: boolean): Promise<unknown[]> {
    const wallet = getShieldWallet()
    if (!this.account || !wallet) throw new WalletNotConnectedError()

    if (isStandardWallet(wallet)) {
      return super.requestRecords(program, includePlaintext)
    }

    const direct = wallet as ShieldWalletDirect
    const response = includePlaintext && direct.requestRecordPlaintexts
      ? await direct.requestRecordPlaintexts(program)
      : await direct.requestRecords(program)
    if (Array.isArray(response)) {
      return response
    }
    if (response && typeof response === 'object' && Array.isArray(response.records)) {
      return response.records
    }
    return []
  }
}
