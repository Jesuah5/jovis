import { useEffect, useState, Suspense, lazy } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { useRealtimeItem } from '../hooks/useRealtimeItem'
import ShareModal from '../components/ShareModal'
import AIAssistant from '../components/AIAssistant'
import { hasAnyAIKey } from '../lib/aiService'
const ReactQuill = lazy(() => import('react-quill'))
import 'react-quill/dist/quill.snow.css'
import {
    ChevronLeft, Share2, Trash2, Save, Check, Wand2,
    Square, CheckSquare, Plus, ExternalLink,
} from 'lucide-react'
import './ItemDetail.css'

export default function ItemDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const [item, setItem] = useState(null)
    const [loading, setLoading] = useState(true)
    const [saveStatus, setSaveStatus] = useState('idle')
    const [showShare, setShowShare] = useState(false)
    const [confirmDelete, setConfirmDelete] = useState(false)
    const [showAI, setShowAI] = useState(false)
    const [title, setTitle] = useState('')

    const [richBody, setRichBody] = useState('')
    const [todos, setTodos] = useState([])
    const [newTodo, setNewTodo] = useState('')
    const [bookmarkUrl, setBookmarkUrl] = useState('')

    async function fetchItem() {
        const { data, error } = await supabase
            .from('items')
            .select('*')
            .eq('id', id)
            .single()
        if (error || !data) { navigate('/'); return }
        setItem(data)
        setTitle(data.title)
        if (data.type === 'note') setRichBody(data.body?.html || '')
        if (data.type === 'todo') setTodos(data.body?.todos || [])
        if (data.type === 'bookmark') setBookmarkUrl(data.bookmark_url || '')
        setLoading(false)
    }

    useEffect(() => { fetchItem() }, [id])

    useRealtimeItem(id, (payload) => {
        const updated = payload.new
        setItem(updated)
        setTitle(updated.title)
        if (updated.type === 'note') setRichBody(updated.body?.html || '')
        if (updated.type === 'todo') setTodos(updated.body?.todos || [])
        if (updated.type === 'bookmark') setBookmarkUrl(updated.bookmark_url || '')
    })

    const isOwner = item?.user_id === user?.id

    async function handleSave() {
        setSaveStatus('saving')
        const updates = { title }
        if (item.type === 'note') updates.body = { html: richBody }
        if (item.type === 'todo') updates.body = { todos }
        if (item.type === 'bookmark') updates.bookmark_url = bookmarkUrl

        const { error } = await supabase.from('items').update(updates).eq('id', id)
        if (error) { console.error(error); setSaveStatus('idle'); return }
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
    }

    function toggleTodo(idx) {
        const next = todos.map((t, i) => i === idx ? { ...t, done: !t.done } : t)
        setTodos(next)
        supabase.from('items').update({ body: { todos: next } }).eq('id', id)
    }

    function addTodo() {
        if (!newTodo.trim()) return
        const next = [...todos, { text: newTodo.trim(), done: false }]
        setTodos(next)
        setNewTodo('')
        supabase.from('items').update({ body: { todos: next } }).eq('id', id)
    }

    function removeTodo(idx) {
        const next = todos.filter((_, i) => i !== idx)
        setTodos(next)
        supabase.from('items').update({ body: { todos: next } }).eq('id', id)
    }

    async function handleDelete() {
        const { error } = await supabase.from('items').delete().eq('id', id)
        if (error) { alert('Failed to delete'); setConfirmDelete(false); return }
        navigate('/')
    }

    function getContentForAI() {
        const parts = [`Title: ${title}`, `Type: ${item.type}`]
        if (item.type === 'note') {
            const div = document.createElement('div')
            div.innerHTML = richBody
            parts.push(`Content: ${div.textContent || ''}`)
        }
        if (item.type === 'todo') {
            parts.push('To-do items:')
            todos.forEach(t => parts.push(`${t.done ? '[x]' : '[ ]'} ${t.text}`))
        }
        if (item.type === 'bookmark') parts.push(`Bookmark URL: ${bookmarkUrl}`)
        return parts.join('\n')
    }

    function handleAIInsert(text) {
        if (item.type === 'note') {
            // Convert markdown-style AI output to clean HTML
            const html = text
                .split('\n')
                .map(line => {
                    line = line.trim()
                    if (!line) return ''
                    if (line.startsWith('### ')) return `<h4>${line.slice(4)}</h4>`
                    if (line.startsWith('## ')) return `<h3>${line.slice(3)}</h3>`
                    if (line.startsWith('# ')) return `<h2>${line.slice(2)}</h2>`
                    if (line.startsWith('- [ ] ')) return `<p>☐ ${line.slice(6)}</p>`
                    if (line.startsWith('- [x] ')) return `<p>☑ ${line.slice(6)}</p>`
                    if (line.startsWith('- ')) return `<p>• ${line.slice(2)}</p>`
                    // Bold/italic
                    line = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    line = line.replace(/\*(.+?)\*/g, '<em>$1</em>')
                    return `<p>${line}</p>`
                })
                .filter(Boolean)
                .join('')
            setRichBody(prev => prev + '<hr/>' + html)
        }
    }

    if (loading) return <div className="loading-screen"><div className="spinner" /></div>

    return (
        <div className="item-detail">
            {/* Apple-style compact navbar */}
            <div className="navbar-compact">
                <button className="navbar-back" onClick={() => navigate('/')}>
                    <ChevronLeft size={24} />
                    <span>Back</span>
                </button>
                <div className="nav-actions">
                    <button className={`icon-btn ${showAI ? 'active' : ''}`} onClick={() => setShowAI(v => !v)} aria-label="AI">
                        <Wand2 size={20} />
                    </button>
                    <button className="icon-btn" onClick={() => setShowShare(true)} aria-label="Share">
                        <Share2 size={20} />
                    </button>
                    {isOwner && (
                        <button className="icon-btn danger" onClick={() => setConfirmDelete(true)} aria-label="Delete">
                            <Trash2 size={20} />
                        </button>
                    )}
                </div>
            </div>

            {/* Centered delete confirmation modal */}
            {confirmDelete && (
                <div className="delete-modal-overlay" onClick={() => setConfirmDelete(false)}>
                    <div className="delete-modal" onClick={e => e.stopPropagation()}>
                        <div className="delete-modal-icon"><Trash2 size={28} /></div>
                        <h3>Delete this item?</h3>
                        <p>This action cannot be undone.</p>
                        <div className="delete-modal-actions">
                            <button className="delete-modal-btn cancel" onClick={() => setConfirmDelete(false)}>Cancel</button>
                            <button className="delete-modal-btn destructive" onClick={handleDelete}>Delete</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="detail-body">
                <div className="detail-card">
                    <span className={`type-label ${item.type}`}>{item.type}</span>

                    <input
                        className="detail-title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Title"
                    />

                    {item.type === 'note' && (
                        <Suspense fallback={<div className="loading-screen"><div className="spinner" /></div>}>
                            <ReactQuill theme="snow" value={richBody} onChange={setRichBody} className="rich-editor" />
                        </Suspense>
                    )}

                    {item.type === 'todo' && (
                        <div className="todo-list">
                            {todos.map((t, i) => (
                                <div key={i} className={`todo-item ${t.done ? 'done' : ''}`}>
                                    <button className="todo-check" onClick={() => toggleTodo(i)}>
                                        {t.done ? <CheckSquare size={20} /> : <Square size={20} />}
                                    </button>
                                    <span className="todo-text">{t.text}</span>
                                    <button className="todo-remove" onClick={() => removeTodo(i)}>×</button>
                                </div>
                            ))}
                            <div className="todo-add">
                                <input
                                    className="apple-input"
                                    placeholder="Add a task…"
                                    value={newTodo}
                                    onChange={(e) => setNewTodo(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                                />
                                <button className="icon-btn" onClick={addTodo}><Plus size={20} /></button>
                            </div>
                        </div>
                    )}

                    {item.type === 'media' && item.media_url && (
                        <div className="media-preview">
                            {item.media_url.match(/\.(mp4|webm|ogg)$/i) ? (
                                <video src={item.media_url} controls className="media-video" />
                            ) : (
                                <img src={item.media_url} alt={item.title} className="media-image" />
                            )}
                        </div>
                    )}

                    {item.type === 'bookmark' && (
                        <div className="bookmark-section">
                            <input
                                className="apple-input"
                                type="url"
                                placeholder="https://example.com"
                                value={bookmarkUrl}
                                onChange={(e) => setBookmarkUrl(e.target.value)}
                            />
                            {bookmarkUrl && (
                                <a href={bookmarkUrl} target="_blank" rel="noopener noreferrer" className="bookmark-link">
                                    <ExternalLink size={16} /> Open link
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Inline AI side panel */}
            {showAI && (
                <AIAssistant
                    content={getContentForAI()}
                    onClose={() => setShowAI(false)}
                    onInsert={item.type === 'note' ? handleAIInsert : undefined}
                />
            )}

            {/* Floating save button — bottom right */}
            <button
                className={`save-float ${saveStatus === 'saved' ? 'save-success' : ''}`}
                onClick={handleSave}
                disabled={saveStatus === 'saving'}
            >
                {saveStatus === 'saving' && <>Saving…</>}
                {saveStatus === 'saved' && <><Check size={16} /> Saved</>}
                {saveStatus === 'idle' && <><Save size={16} /> Save</>}
            </button>

            {showShare && <ShareModal itemId={id} onClose={() => setShowShare(false)} />}
        </div>
    )
}
