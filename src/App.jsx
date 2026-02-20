import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import ItemDetail from './pages/ItemDetail'
import Meetings from './pages/Meetings'
import MeetingRoom from './pages/MeetingRoom'

function ProtectedRoute({ children }) {
    const { user, loading } = useAuth()
    if (loading) return <div className="loading-screen"><div className="spinner" /></div>
    if (!user) return <Navigate to="/login" replace />
    return children
}

export default function App() {
    const { user } = useAuth()

    return (
        <div className="app-layout">
            {user && <Sidebar />}
            <main className="main-content">
                <Routes>
                    <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
                    <Route
                        path="/"
                        element={<ProtectedRoute><Dashboard /></ProtectedRoute>}
                    />
                    <Route
                        path="/profile"
                        element={<ProtectedRoute><Profile /></ProtectedRoute>}
                    />
                    <Route
                        path="/item/:id"
                        element={<ProtectedRoute><ItemDetail /></ProtectedRoute>}
                    />
                    <Route
                        path="/meetings"
                        element={<ProtectedRoute><Meetings /></ProtectedRoute>}
                    />
                    <Route
                        path="/meeting/new"
                        element={<ProtectedRoute><MeetingRoom /></ProtectedRoute>}
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
        </div>
    )
}
