import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { X, FileText, CheckSquare, Image, Bookmark, Upload, PenTool } from 'lucide-react'
import './CreateItemModal.css'

const TYPES = [
    { value: 'note', label: 'Note', icon: FileText, color: '#FF9500' },
    { value: 'todo', label: 'To-Do', icon: CheckSquare, color: '#34C759' },
    { value: 'media', label: 'Media', icon: Image, color: '#FF2D55' },
    { value: 'bookmark', label: 'Bookmark', icon: Bookmark, color: '#007AFF' },
    { value: 'whiteboard', label: 'Whiteboard', icon: PenTool, color: '#AF52DE' },
]

export default function CreateItemModal({ onClose, onCreated }) {
    const { user } = useAuth()
    const [type, setType] = useState('note')
    const [title, setTitle] = useState('')
    const [bookmarkUrl, setBookmarkUrl] = useState('')
    const [file, setFile] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState('')

    async function handleCreate(e) {
        e.preventDefault()
        if (!title.trim()) { setError('Title is required'); return }
        setError('')
        setUploading(true)

        let mediaUrl = ''
        if (type === 'media' && file) {
            const ext = file.name.split('.').pop()
            const path = `${user.id}/${Date.now()}.${ext}`
            const { error: uploadErr } = await supabase.storage.from('media').upload(path, file)
            if (uploadErr) { setError(uploadErr.message); setUploading(false); return }
            const { data: urlData } = supabase.storage.from('media').getPublicUrl(path)
            mediaUrl = urlData.publicUrl
        }

        const newItem = {
            user_id: user.id, type, title: title.trim(),
            body: type === 'note' ? { html: '' } : type === 'todo' ? { todos: [] } : type === 'whiteboard' ? { elements: [] } : {},
            media_url: mediaUrl,
            bookmark_url: type === 'bookmark' ? bookmarkUrl : '',
        }

        const { error: insertErr } = await supabase.from('items').insert(newItem)
        setUploading(false)
        if (insertErr) { setError(insertErr.message); return }
        onCreated()
    }

    return (
        <>
            <div className="sheet-overlay" onClick={onClose} />
            <div className="sheet" onClick={(e) => e.stopPropagation()}>
                <div className="sheet-handle" />
                <div className="sheet-header">
                    <button className="btn-text" onClick={onClose}>Cancel</button>
                    <span className="sheet-title">New Item</span>
                    <button
                        className="btn-text"
                        onClick={handleCreate}
                        disabled={uploading}
                        type="button"
                    >
                        {uploading ? 'Creating…' : 'Create'}
                    </button>
                </div>

                <div className="sheet-body">
                    {/* Type selector */}
                    <div className="type-grid">
                        {TYPES.map((t) => {
                            const Icon = t.icon
                            return (
                                <button
                                    key={t.value}
                                    className={`type-option ${type === t.value ? 'selected' : ''}`}
                                    onClick={() => setType(t.value)}
                                    type="button"
                                >
                                    <div className="type-icon" style={{ background: t.color }}>
                                        <Icon size={20} color="white" />
                                    </div>
                                    <span>{t.label}</span>
                                </button>
                            )
                        })}
                    </div>

                    <form onSubmit={handleCreate} className="create-form">
                        <input
                            className="apple-input"
                            placeholder="Title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                            autoFocus
                        />

                        {type === 'bookmark' && (
                            <input
                                className="apple-input"
                                type="url"
                                placeholder="https://example.com"
                                value={bookmarkUrl}
                                onChange={(e) => setBookmarkUrl(e.target.value)}
                                required
                            />
                        )}

                        {type === 'media' && (
                            <label className="file-upload">
                                <Upload size={18} />
                                <span>{file ? file.name : 'Choose image or video…'}</span>
                                <input
                                    type="file"
                                    accept="image/*,video/*"
                                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                                    hidden
                                />
                            </label>
                        )}

                        {error && <p className="form-error">{error}</p>}
                    </form>
                </div>
            </div>
        </>
    )
}
