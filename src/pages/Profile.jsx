import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { supabase } from '../lib/supabaseClient'
import {
    getProviderKey, setProviderKey, hasProviderKey,
    getPreferredProvider, setPreferredProvider, getProviders,
} from '../lib/aiService'
import {
    Check, Eye, EyeOff, ExternalLink, Sun, Moon, Monitor,
} from 'lucide-react'
import './Profile.css'

/* ============================================================
   Brand-accurate AI Provider SVG Icons
   ============================================================ */

// Google Gemini — gradient sparkle star
function GeminiIcon({ size = 24 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
            <defs>
                <linearGradient id="gemGrad" x1="0" y1="0" x2="28" y2="28">
                    <stop offset="0%" stopColor="#4285F4" />
                    <stop offset="50%" stopColor="#9B72CB" />
                    <stop offset="100%" stopColor="#D96570" />
                </linearGradient>
            </defs>
            <rect width="28" height="28" rx="6" fill="#131314" />
            <path d="M14 4C14 10.5 10.5 14 4 14C10.5 14 14 17.5 14 24C14 17.5 17.5 14 24 14C17.5 14 14 10.5 14 4Z"
                fill="url(#gemGrad)" />
        </svg>
    )
}

// Groq — orange bolt on dark
function GroqIcon({ size = 24 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="6" fill="#1A1A2E" />
            <path d="M14 5C14 5 9 12.5 9 16C9 18.76 11.24 21 14 21C16.76 21 19 18.76 19 16C19 12.5 14 5 14 5Z"
                fill="#F55036" />
            <circle cx="14" cy="16" r="2.5" fill="#1A1A2E" />
        </svg>
    )
}

// Mistral — orange and black stripes (Le Chat style)
function MistralIcon({ size = 24 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="6" fill="#EEEEEE" />
            <rect x="5" y="6" width="4" height="4" fill="#000" />
            <rect x="19" y="6" width="4" height="4" fill="#000" />
            <rect x="5" y="12" width="4" height="4" fill="#F7D046" />
            <rect x="12" y="12" width="4" height="4" fill="#F7D046" />
            <rect x="19" y="12" width="4" height="4" fill="#F7D046" />
            <rect x="5" y="18" width="4" height="4" fill="#FF7000" />
            <rect x="12" y="18" width="4" height="4" fill="#FF7000" />
            <rect x="19" y="18" width="4" height="4" fill="#FF7000" />
        </svg>
    )
}

// Cohere — coral C on dark green
function CohereIcon({ size = 24 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 28 28" fill="none">
            <rect width="28" height="28" rx="6" fill="#39594D" />
            <path d="M17 10.5C15.8 9.2 14 8.5 12.2 8.5C8.5 8.5 5.5 11.5 5.5 15.2C5.5 18.9 8.5 21.9 12.2 21.9C14 21.9 15.8 21.2 17 19.9"
                stroke="#D18EE2" strokeWidth="3" strokeLinecap="round" fill="none" />
        </svg>
    )
}

const AI_ICONS = { gemini: GeminiIcon, groq: GroqIcon, mistral: MistralIcon, cohere: CohereIcon }

/* ============================================================
   Appearance Options
   ============================================================ */
const THEME_OPTIONS = [
    { id: 'light', label: 'Light', icon: Sun },
    { id: 'dark', label: 'Dark', icon: Moon },
]

/* ============================================================
   Settings Page
   ============================================================ */
export default function Profile() {
    const { user, profile, updateProfile } = useAuth()
    const { mode: themeMode, setMode: setThemeMode } = useTheme()

    const [displayName, setDisplayName] = useState(profile?.display_name || '')
    const [email] = useState(user?.email || '')
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)

    const providers = getProviders()
    const [preferred, setPreferred] = useState(getPreferredProvider())
    const [keys, setKeys] = useState({})
    const [showKey, setShowKey] = useState({})
    const [editingKey, setEditingKey] = useState(null)
    const [keyDraft, setKeyDraft] = useState('')

    useEffect(() => {
        const initial = {}
        Object.keys(providers).forEach(id => { initial[id] = getProviderKey(id) })
        setKeys(initial)
    }, [])

    useEffect(() => {
        if (profile?.display_name) setDisplayName(profile.display_name)
    }, [profile])

    async function handleSaveProfile() {
        setSaving(true)
        const { error } = await updateProfile({ display_name: displayName })
        if (!error) {
            setSaved(true)
            setTimeout(() => setSaved(false), 2000)
        }
        setSaving(false)
    }

    function selectProvider(id) {
        setPreferred(id)
        setPreferredProvider(id)
    }

    function startEditKey(id) {
        setEditingKey(id)
        setKeyDraft(keys[id] || '')
    }

    function saveKey(id) {
        setProviderKey(id, keyDraft)
        setKeys(prev => ({ ...prev, [id]: keyDraft }))
        setEditingKey(null)
    }

    return (
        <div className="profile-page">
            <div className="navbar">
                <h1 className="navbar-title">Settings</h1>
            </div>

            <div className="grouped-list">
                {/* ---- Profile Card ---- */}
                <div className="group-section">
                    <div className="profile-header-card">
                        <div className="profile-avatar-large">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="" />
                            ) : (
                                <span>{(profile?.display_name || '?')[0].toUpperCase()}</span>
                            )}
                        </div>
                        <div>
                            <div className="profile-name-display">{profile?.display_name || 'User'}</div>
                            <div className="profile-email-display">{email}</div>
                        </div>
                    </div>
                </div>

                {/* ---- Edit Profile ---- */}
                <div className="group-section">
                    <div className="group-header">Profile</div>
                    <div className="group-card">
                        <div className="settings-row">
                            <label>Display Name</label>
                            <input
                                className="settings-inline-input"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Your name"
                            />
                        </div>
                        <div className="settings-row">
                            <label>Email</label>
                            <span className="settings-value-text">{email}</span>
                        </div>
                    </div>

                    <button
                        className="btn-primary profile-save-btn"
                        onClick={handleSaveProfile}
                        disabled={saving}
                    >
                        {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>

                {/* ---- Appearance ---- */}
                <div className="group-section">
                    <div className="group-header">Appearance</div>
                    <div className="group-card">
                        <div className="appearance-toggle">
                            {THEME_OPTIONS.map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    className={`theme-btn ${themeMode === id ? 'active' : ''}`}
                                    onClick={() => setThemeMode(id)}
                                >
                                    <Icon size={20} strokeWidth={themeMode === id ? 2.2 : 1.5} />
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ---- AI Provider ---- */}
                <div className="group-section">
                    <div className="group-header">AI Provider</div>
                    <div className="group-card">
                        <div
                            className={`settings-row provider-row ${preferred === 'auto' ? 'selected' : ''}`}
                            onClick={() => selectProvider('auto')}
                        >
                            <div className="provider-icon auto-icon">
                                <svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                                    <path d="M13 2L4.09 12.69a1 1 0 00.76 1.65H11v5.66a1 1 0 001.84.55L21.91 10.31a1 1 0 00-.76-1.65H13V2.34A1 1 0 0013 2z" fill="currentColor" />
                                </svg>
                            </div>
                            <div className="provider-info">
                                <span className="provider-label">Auto (Best Available)</span>
                            </div>
                            {preferred === 'auto' && <Check size={18} className="check-icon" />}
                        </div>

                        {Object.entries(providers).map(([id, p]) => {
                            const BrandIcon = AI_ICONS[id]
                            return (
                                <div
                                    key={id}
                                    className={`settings-row provider-row ${preferred === id ? 'selected' : ''}`}
                                    onClick={() => selectProvider(id)}
                                >
                                    <div className="provider-icon-brand">
                                        <BrandIcon size={30} />
                                    </div>
                                    <div className="provider-info">
                                        <span className="provider-label">{p.label}</span>
                                        {hasProviderKey(id) && (
                                            <span className="provider-configured">Configured</span>
                                        )}
                                    </div>
                                    {preferred === id && <Check size={18} className="check-icon" />}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* ---- API Keys ---- */}
                <div className="group-section">
                    <div className="group-header">API Keys</div>
                    <div className="group-card">
                        {Object.entries(providers).map(([id, p]) => {
                            const BrandIcon = AI_ICONS[id]
                            const isEditing = editingKey === id
                            return (
                                <div key={id} className="settings-row key-row">
                                    <div className="key-row-left">
                                        <div className="provider-icon-brand small">
                                            <BrandIcon size={22} />
                                        </div>
                                        <span className="key-label">{p.name}</span>
                                    </div>

                                    {isEditing ? (
                                        <div className="key-edit-group">
                                            <input
                                                className="key-input"
                                                type="text"
                                                value={keyDraft}
                                                onChange={(e) => setKeyDraft(e.target.value)}
                                                placeholder={`${p.name} API key`}
                                                autoFocus
                                            />
                                            <button className="btn-text" onClick={() => saveKey(id)}>Save</button>
                                            <button className="btn-text secondary" onClick={() => setEditingKey(null)}>Cancel</button>
                                        </div>
                                    ) : (
                                        <div className="key-display-group">
                                            {keys[id] ? (
                                                <>
                                                    <span className="key-masked">
                                                        {showKey[id] ? keys[id] : '••••••••' + keys[id].slice(-4)}
                                                    </span>
                                                    <button
                                                        className="icon-btn-sm"
                                                        onClick={(e) => { e.stopPropagation(); setShowKey(prev => ({ ...prev, [id]: !prev[id] })) }}
                                                    >
                                                        {showKey[id] ? <EyeOff size={15} /> : <Eye size={15} />}
                                                    </button>
                                                </>
                                            ) : (
                                                <span className="key-not-set">Not set</span>
                                            )}
                                            <button className="btn-text" onClick={() => startEditKey(id)}>
                                                {keys[id] ? 'Edit' : 'Add'}
                                            </button>
                                            {p.getKeyUrl && (
                                                <a href={p.getKeyUrl} target="_blank" rel="noreferrer" className="icon-btn-sm">
                                                    <ExternalLink size={14} />
                                                </a>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                    <p className="group-footer-text">Keys are stored locally on your device only.</p>
                </div>
            </div>
        </div>
    )
}
