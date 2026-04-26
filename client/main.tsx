import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import AuthGate from './AuthGate'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate>{(user, signOut) => <App user={user} signOut={signOut} />}</AuthGate>
  </StrictMode>,
)
