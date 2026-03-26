import { Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import { AppProvider } from './context/WalletContext'

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001'

function BackendWarmup() {
  useEffect(() => {
    fetch(`${BACKEND_URL}/api/health`).catch(() => {})
  }, [])
  return null
}
import Layout from './components/Layout'
import Home from './pages/Home'
import Issue from './pages/Issue'
import Credentials from './pages/Credentials'
import Prove from './pages/Prove'
import Verify from './pages/Verify'
import Gates from './pages/Gates'
import Admin from './pages/Admin'
import KYC from './pages/KYC'

export default function App() {
  return (
    <AppProvider>
      <BackendWarmup />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/kyc" element={<KYC />} />
          <Route path="/issue" element={<Issue />} />
          <Route path="/credentials" element={<Credentials />} />
          <Route path="/prove" element={<Prove />} />
          <Route path="/verify" element={<Verify />} />
          <Route path="/gates" element={<Gates />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </Layout>
    </AppProvider>
  )
}
