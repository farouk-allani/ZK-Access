import {
  BaseAleoWalletAdapter,
  WalletConnectionError,
  WalletNotConnectedError,
  scopePollingDetectionStrategy,
} from '@provablehq/aleo-wallet-adaptor-core'
import { WalletReadyState, WalletDecryptPermission } from '@provablehq/aleo-wallet-standard'
import { Network } from '@provablehq/aleo-types'
import type { Account, TransactionOptions } from '@provablehq/aleo-types'

// Leo Wallet browser extension interface
interface LeoWalletAPI {
  connect(
    decryptPermission: string,
    network: string,
    programs?: string[],
  ): Promise<{ publicKey: string }>
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

declare global {
  interface Window {
    leoWallet?: LeoWalletAPI
  }
}

const LEO_WALLET_ICON =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHJ4PSI2IiBmaWxsPSIjNkE0NUZGN0UiLz48cGF0aCBkPSJNMTYgNkM5LjM3IDYgNCA5LjM3IDQgMTZzNS4zNyAxMCAxMiAxMCAxMC01LjM3IDEwLTEwUzIyLjYzIDYgMTYgNnptMCAxNmMtMy4zMSAwLTYtMi42OS02LTZzMi42OS02IDYtNiA2IDIuNjkgNiA2LTIuNjkgNi02IDZ6IiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg=='

export class LeoWalletAdapter extends BaseAleoWalletAdapter {
  name = 'Leo Wallet' as ReturnType<typeof String>
  url = 'https://leo.app'
  icon = LEO_WALLET_ICON
  _readyState: WalletReadyState = WalletReadyState.NOT_DETECTED
  network: Network = Network.TESTNET
  decryptPermission: WalletDecryptPermission = WalletDecryptPermission.UponRequest

  constructor() {
    super()

    if (typeof window !== 'undefined') {
      // Check immediately
      if (window.leoWallet) {
        this._readyState = WalletReadyState.INSTALLED
      }

      // Poll for extension injection (extensions load asynchronously)
      scopePollingDetectionStrategy(() => {
        if (window.leoWallet) {
          this.readyState = WalletReadyState.INSTALLED
          return true
        }
        return false
      })
    }
  }

  override async connect(
    network: Network,
    decryptPermission: WalletDecryptPermission,
    programs?: string[],
  ): Promise<Account> {
    if (!window.leoWallet) {
      throw new WalletConnectionError(
        'Leo Wallet extension not found. Please install it from https://leo.app',
      )
    }

    this.network = network
    this.decryptPermission = decryptPermission

    const result = await window.leoWallet.connect(
      decryptPermission as string,
      network as string,
      programs,
    )

    const account: Account = { address: result.publicKey }
    this.account = account
    this.emit('connect', account)
    return account
  }

  override async disconnect(): Promise<void> {
    if (window.leoWallet) {
      await window.leoWallet.disconnect()
    }
    this.account = undefined
    this.emit('disconnect')
  }

  override async executeTransaction(
    options: TransactionOptions,
  ): Promise<{ transactionId: string }> {
    if (!this.account) throw new WalletNotConnectedError()
    if (!window.leoWallet) throw new WalletNotConnectedError()

    const raw = await window.leoWallet.requestExecution({
      programId: options.program,
      functionName: options.function,
      inputs: options.inputs,
      fee: options.fee,
      privateFee: options.privateFee ?? false,
    })

    // Leo Wallet may return a string txId or an object
    if (typeof raw === 'string') {
      return { transactionId: raw }
    }
    return raw
  }

  override async requestRecords(program: string): Promise<unknown[]> {
    if (!this.account) throw new WalletNotConnectedError()
    if (!window.leoWallet) throw new WalletNotConnectedError()
    return window.leoWallet.requestRecords(program)
  }
}
