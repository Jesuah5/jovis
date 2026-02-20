import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { X, UserPlus, Trash2 } from 'lucide-react'
import './ShareModal.css'

export default function ShareModal({ itemId, onClose }) {
    const [email, setEmail] = useState('')
    const [permission, setPermission] = useState('edit')
    const [sharedUsers, setSharedUsers] = useState([])
    const [error, setError] = useState('')
    const [success, setSuccess] = useState('')
    const [loading, setLoading] = useState(false)

    async function fetchShares() {
        const { data } = await supabase
            .from('shared_items')
            .select('id, permission, shared_with_user_id, profiles:shared_with_user_id(email, display_name)')
            .eq('item_id', itemId)
        setSharedUsers(data || [])
    }

    useEffect(() => { fetchShares() }, [itemId])

    async function handleShare(e) {
        e.preventDefault()
        setError(''); setSuccess(''); setLoading(true)

        const { data: profileData, error: lookupErr } = await supabase
            .from('profiles')
            .select('id, display_name')
            .eq('email', email.trim().toLowerCase())
            .single()

        if (lookupErr || !profileData) {
            setError('No user found with that email.')
            setLoading(false); return
        }

        const { error: insertErr } = await supabase
            .from('shared_items')
            .insert({ item_id: itemId, shared_with_user_id: profileData.id, permission })

        if (insertErr) {
            if (insertErr.code === '23505') setError('Already shared with this user.')
            else setError(insertErr.message)
        } else {
            setSuccess(`Shared with ${profileData.display_name || email}!`)
            setEmail('')
            fetchShares()
        }
        setLoading(false)
    }

    async function handleUnshare(shareId) {
        await supabase.from('shared_items').delete().eq('id', shareId)
        fetchShares()
    }

    return (
        <>
            <div className="sheet-overlay" onClick={onClose} />
            <div className="sheet share-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="sheet-handle" />
                <div className="sheet-header">
                    <button className="btn-text" onClick={onClose}>Done</button>
                    <span className="sheet-title">Share</span>
                    <div style={{ width: 50 }} />
                </div>

                <div className="sheet-body">
                    <form onSubmit={handleShare} className="share-form">
                        <input
                            className="apple-input"
                            type="email"
                            placeholder="Colleague's email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <div className="share-row">
                            <select
                                className="apple-input perm-select"
                                value={permission}
                                onChange={(e) => setPermission(e.target.value)}
                            >
                                <option value="edit">Can Edit</option>
                                <option value="view">View Only</option>
                            </select>
                            <button type="submit" className="btn-secondary" disabled={loading}>
                                <UserPlus size={16} /> {loading ? 'Sharing…' : 'Share'}
                            </button>
                        </div>

                        {error && <p className="form-error">{error}</p>}
                        {success && <p className="form-success">{success}</p>}
                    </form>

                    {sharedUsers.length > 0 && (
                        <div className="shared-list">
                            <h4 className="group-header">Shared With</h4>
                            <div className="group-card">
                                {sharedUsers.map((s) => (
                                    <div key={s.id} className="group-row">
                                        <div className="row-content">
                                            <div className="row-title">
                                                {s.profiles?.display_name || s.profiles?.email || 'Unknown'}
                                            </div>
                                            <div className="row-subtitle">{s.permission}</div>
                                        </div>
                                        <button className="icon-btn danger" onClick={() => handleUnshare(s.id)}>
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
