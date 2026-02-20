import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Mail, Lock, User } from 'lucide-react'
import './Login.css'

export default function Login() {
    const { signIn, signUp } = useAuth()
    const [isSignUp, setIsSignUp] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [displayName, setDisplayName] = useState('')
    const [error, setError] = useState('')
    const [successMsg, setSuccessMsg] = useState('')
    const [submitting, setSubmitting] = useState(false)

    async function handleSubmit(e) {
        e.preventDefault()
        setError('')
        setSuccessMsg('')
        setSubmitting(true)

        if (isSignUp) {
            const { error: err } = await signUp(email, password, displayName)
            if (err) setError(err.message)
            else setSuccessMsg('Check your email to confirm your account!')
        } else {
            const { error: err } = await signIn(email, password)
            if (err) setError(err.message)
        }

        setSubmitting(false)
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <img src="/app-icon.png" alt="Jovis" className="app-icon-img" />
                    <h1 className="app-name">Jovis</h1>
                    <p className="login-subtitle">
                        {isSignUp ? 'Create your account' : 'Welcome back'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    {isSignUp && (
                        <div className="input-wrapper">
                            <User size={18} className="input-icon" />
                            <input
                                id="display-name"
                                className="apple-input with-icon"
                                type="text"
                                placeholder="Display name"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                required
                            />
                        </div>
                    )}

                    <div className="input-wrapper">
                        <Mail size={18} className="input-icon" />
                        <input
                            id="email"
                            className="apple-input with-icon"
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="input-wrapper">
                        <Lock size={18} className="input-icon" />
                        <input
                            id="password"
                            className="apple-input with-icon"
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            minLength={6}
                        />
                    </div>

                    {error && <p className="form-error">{error}</p>}
                    {successMsg && <p className="form-success">{successMsg}</p>}

                    <button type="submit" className="btn-primary" disabled={submitting}>
                        {submitting ? 'Please wait…' : isSignUp ? 'Create Account' : 'Sign In'}
                    </button>
                </form>

                <p className="toggle-auth">
                    {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                    <button
                        type="button"
                        className="btn-text"
                        onClick={() => { setIsSignUp(!isSignUp); setError(''); setSuccessMsg('') }}
                    >
                        {isSignUp ? 'Sign In' : 'Sign Up'}
                    </button>
                </p>
            </div>
        </div>
    )
}
