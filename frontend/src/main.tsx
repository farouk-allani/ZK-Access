import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AleoWalletProvider } from '@provablehq/aleo-wallet-adaptor-react'
import { WalletModalProvider } from '@provablehq/aleo-wallet-adaptor-react-ui'
import { DecryptPermission } from '@provablehq/aleo-wallet-adaptor-core'
import { Network } from '@provablehq/aleo-types'
import '@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css'
import './index.css'
import App from './App'
import { LeoWalletAdapter } from './adapters/LeoWalletAdapter'

const wallets = [new LeoWalletAdapter()]

function Root() {
  return (
    <AleoWalletProvider
      wallets={wallets}
      decryptPermission={DecryptPermission.UponRequest}
      network={Network.TESTNET}
      programs={['zkaccess_v2.aleo']}
      autoConnect
    >
      <WalletModalProvider network={Network.TESTNET}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </WalletModalProvider>
    </AleoWalletProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>
)
