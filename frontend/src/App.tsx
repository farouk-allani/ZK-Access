import { Routes, Route } from 'react-router-dom'
import { AppProvider } from './context/WalletContext'
import Layout from './components/Layout'
import Home from './pages/Home'
import Issue from './pages/Issue'
import Credentials from './pages/Credentials'
import Prove from './pages/Prove'
import Verify from './pages/Verify'
import Gates from './pages/Gates'
import Admin from './pages/Admin'

export default function App() {
  return (
    <AppProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
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
