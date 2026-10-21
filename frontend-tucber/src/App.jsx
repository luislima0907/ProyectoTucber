import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import { AuthForm } from './components/AuthForm'
import { Dashboard } from './pages/Dashboard'

function MainContent() {
    const { user, loading } = useAuth()
    if (loading) return <main className="loading-screen" role="status">Abriendo TUCBER…</main>
    return user ? <Dashboard /> : <AuthForm />
}

export default function App() {
    return <AuthProvider><MainContent /></AuthProvider>
}
