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

// New Leo Wallet: implements the StandardWallet features interface
interface LeoWalletStandard {
  features: Record<string, unknown>
  [key: string]: unknown
}

// Leo Wallet direct API (new order: network first, matching @provablehq framework)
interface LeoWalletDirect {
  // State properties (populated after connect)
  publicKey?: string
  permission?: string
  network?: string
  appName?: string
  // Methods (on prototype)
  connect(
    decryptPermission: string,
    network: string,
  ): Promise<{ publicKey: string } | void>
  disconnect(): Promise<void>
  requestRecords(program: string): Promise<unknown[]>
  requestExecution(options: {
    programId: string
    functionName: string
    inputs: string[]
    fee?: number
    privateFee?: boolean
  }): Promise<{ transactionId: string } | string>
}

type LeoWalletAPI = LeoWalletStandard | LeoWalletDirect

declare global {
  interface Window {
    leoWallet?: LeoWalletAPI
    leo?: LeoWalletAPI
  }
}

function toLeoNetwork(network: Network): string {
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

function mapConnectError(error: unknown, network: Network): WalletConnectionError {
  const raw = error instanceof Error ? error : new Error(String(error))
  const text = `${raw.name} ${raw.message}`.toUpperCase()
  const targetNetwork = toLeoNetwork(network)

  if (text.includes('NETWORK_NOT_GRANTED') || text.includes('NOTGRANTEDALEOWALLETERROR')) {
    return new WalletConnectionError(
      `Leo Wallet has not granted this app access on ${targetNetwork}. Open Leo Wallet, switch to ${targetNetwork}, then reconnect and approve the permission prompt.`,
    )
  }

  if (text.includes('INVALID_PARAMS') || text.includes('INVALIDPARAMSALEOWALLETERROR')) {
    return new WalletConnectionError(
      `Leo Wallet rejected connection parameters. Ensure the wallet is on ${targetNetwork} and reconnect.`,
    )
  }

  return new WalletConnectionError(raw.message || 'Connection failed')
}

function isStandardWallet(w: LeoWalletAPI): w is LeoWalletStandard {
  return 'features' in w && w.features != null && typeof w.features === 'object'
}

const LEO_WALLET_ICON =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI2IiBmaWxsPSIjNkE0NUZGN0UiLz48cGF0aCBkPSJNMTYgNkM5LjM3IDYgNCA5LjM3IDQgMTZzNS4zNyAxMCAxMiAxMCAxMC01LjM3IDEwLTEwUzIyLjYzIDYgMTYgNnptMCAxNmMtMy4zMSAwLTYtMi42OS02LTZzMi42OS02IDYtNiA2IDIuNjkgNiA2LTIuNjkgNi02IDZ6IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg=='

export class LeoWalletAdapter extends BaseAleoWalletAdapter {
  name = 'Leo Wallet' as WalletName<string>
  url = 'https://leo.app'
  icon = LEO_WALLET_ICON
  _readyState: WalletReadyState = WalletReadyState.NOT_DETECTED
  network: Network = Network.TESTNET
  decryptPermission: WalletDecryptPermission = WalletDecryptPermission.UponRequest

  constructor() {
    super()

    if (typeof window !== 'undefined') {
      const detectedWallet = window.leoWallet ?? window.leo
      if (detectedWallet) {
        this._initFromExtension(detectedWallet)
        this._readyState = WalletReadyState.INSTALLED
      }

      scopePollingDetectionStrategy(() => {
        const pollingWallet = window.leoWallet ?? window.leo
        if (pollingWallet) {
          this._initFromExtension(pollingWallet)
          this.readyState = WalletReadyState.INSTALLED
          return true
        }
        return false
      })
    }
  }

  /** If Leo Wallet implements the new StandardWallet interface, wire it up so
   *  BaseAleoWalletAdapter can delegate all calls via this._wallet.features. */
  private _initFromExtension(leo: LeoWalletAPI) {
    if (isStandardWallet(leo)) {
      this._wallet = leo as unknown as StandardWallet
    }
  }

  // ─── Connection ────────────────────────────────────────────────────────────

  override async connect(
    network: Network,
    decryptPermission: WalletDecryptPermission,
    programs?: string[],
  ): Promise<Account> {
    const leo = window.leoWallet ?? window.leo
    if (!leo) {
      throw new WalletConnectionError(
        'Leo Wallet extension not found. Please install it from https://leo.app',
      )
    }

    this.network = network
    this.decryptPermission = decryptPermission

    // New Leo Wallet: delegate to BaseAleoWalletAdapter → this._wallet.features["standard:connect"]
    if (isStandardWallet(leo)) {
      try {
        return await super.connect(network, decryptPermission, programs)
      } catch (error: unknown) {
        throw mapConnectError(error, network)
      }
    }

    // Direct Leo Wallet API — do NOT pass programs; Leo Wallet validates them on-chain
    // and will reject with INVALID_PARAMS if the program isn't deployed yet.
    const direct = leo as LeoWalletDirect
    let result: { publicKey: string } | void
    try {
      result = await direct.connect(decryptPermission as string, toLeoNetwork(network))
    } catch (error: unknown) {
      throw mapConnectError(error, network)
    }

    // Leo Wallet may return {publicKey} or set window.leoWallet.publicKey as a state property
    const address = (result as { publicKey?: string })?.publicKey ?? direct.publicKey ?? ''
    if (!address) throw new WalletConnectionError('Leo Wallet did not return an address')

    const account: Account = { address }
    this.account = account
    this.emit('connect', account)
    return account
  }

  override async disconnect(): Promise<void> {
    const leo = window.leoWallet ?? window.leo

    if (leo && isStandardWallet(leo)) {
      return super.disconnect()
    }

    if (leo) {
      await (leo as LeoWalletDirect).disconnect()
    }
    this.account = undefined
    this.emit('disconnect')
  }

  // ─── Transactions ──────────────────────────────────────────────────────────

  override async executeTransaction(
    options: TransactionOptions,
  ): Promise<{ transactionId: string }> {
    const leo = window.leoWallet ?? window.leo
    if (!this.account || !leo) throw new WalletNotConnectedError()

    if (isStandardWallet(leo)) {
      return super.executeTransaction(options)
    }

    const raw = await (leo as LeoWalletDirect).requestExecution({
      programId: options.program,
      functionName: options.function,
      inputs: options.inputs,
      fee: options.fee,
      privateFee: options.privateFee ?? false,
    })

    return typeof raw === 'string' ? { transactionId: raw } : raw
  }

  // ─── Records ───────────────────────────────────────────────────────────────

  override async requestRecords(program: string, includePlaintext: boolean): Promise<unknown[]> {
    const leo = window.leoWallet ?? window.leo
    if (!this.account || !leo) throw new WalletNotConnectedError()

    if (isStandardWallet(leo)) {
      return super.requestRecords(program, includePlaintext)
    }

    return (leo as LeoWalletDirect).requestRecords(program)
  }
}
