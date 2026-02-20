import { useState } from 'react'
import { askAI, hasAnyAIKey, getPreferredProvider, PROVIDERS } from '../lib/aiService'
import { X, Wand2, FileText, List, Lightbulb, ArrowUp, Copy, Plus, PenTool } from 'lucide-react'
import './AIAssistant.css'

const ACTIONS = [
    { id: 'summarize', label: 'Summarize', icon: FileText, color: '#007AFF' },
    { id: 'expand', label: 'Expand', icon: PenTool, color: '#34C759' },
    { id: 'improve', label: 'Improve', icon: Wand2, color: '#FF9500' },
    { id: 'extract_todos', label: 'To-Dos', icon: List, color: '#AF52DE' },
    { id: 'brainstorm', label: 'Ideas', icon: Lightbulb, color: '#FF2D55' },
    { id: 'explain', label: 'Explain', icon: FileText, color: '#5AC8FA' },
]

const PROMPTS = {
    summarize: 'Summarize the following content concisely:',
    expand: 'Expand and elaborate on the following content with more detail:',
    improve: 'Improve the writing quality, fix grammar, and make this more polished:',
    extract_todos: 'Extract actionable to-do items from this content. Format as a bulleted list with "- [ ]" for each item:',
    brainstorm: 'Based on this content, brainstorm 5-7 related ideas or next steps:',
    explain: 'Explain the key concepts in this content in simple terms:',
}

export default function AIAssistant({ content, onClose, onInsert }) {
    const [messages, setMessages] = useState([])
    const [customPrompt, setCustomPrompt] = useState('')
    const [loading, setLoading] = useState(false)

    const hasKey = hasAnyAIKey()
    const preferred = getPreferredProvider()

    async function runAction(actionId, prompt) {
        setLoading(true)
        setMessages(prev => [...prev, { role: 'user', text: PROMPTS[actionId] ? ACTIONS.find(a => a.id === actionId)?.label : prompt }])

        try {
            const { text, provider } = await askAI(prompt, content, actionId)
            setMessages(prev => [...prev, { role: 'ai', text, provider }])
        } catch (err) {
            setMessages(prev => [...prev, { role: 'ai', text: `Error: ${err.message}`, isError: true }])
        }
        setLoading(false)
    }

    function handleCustom(e) {
        e.preventDefault()
        if (!customPrompt.trim()) return
        runAction('custom', customPrompt.trim())
        setCustomPrompt('')
    }

    function copyText(text) {
        navigator.clipboard.writeText(text)
    }

    return (
        <div className="ai-sheet">
            <div className="sheet-handle" />
            <div className="sheet-header">
                <button className="btn-text" onClick={onClose}>Done</button>
                <span className="sheet-title">
                    <Wand2 size={16} /> AI
                </span>
                <span className="ai-mode-label">
                    {preferred === 'auto' ? 'Auto' : PROVIDERS[preferred]?.name}
                </span>
            </div>

            <div className="ai-body">
                {!hasKey ? (
                    <div className="ai-no-key">
                        <div className="no-key-icon">
                            <Wand2 size={32} />
                        </div>
                        <h3>API Key Required</h3>
                        <p>Go to <strong>Settings</strong> and add at least one AI API key.</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="ai-actions">
                        <p className="ai-actions-hint">Choose an action or type a custom prompt</p>
                        <div className="action-grid">
                            {ACTIONS.map(({ id, label, icon: Icon, color }, index) => (
                                <button
                                    key={id}
                                    className="action-btn"
                                    onClick={() => runAction(id, PROMPTS[id])}
                                    disabled={loading}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div className="action-icon" style={{ background: color }}>
                                        <Icon size={18} color="white" />
                                    </div>
                                    <span>{label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="ai-messages">
                        {messages.map((msg, i) => (
                            <div key={i} className={`ai-msg ${msg.role}`}>
                                {msg.role === 'ai' && msg.provider && (
                                    <span className="provider-tag">{msg.provider}</span>
                                )}
                                <div className="msg-text">{msg.text}</div>
                                {msg.role === 'ai' && !msg.isError && (
                                    <div className="msg-actions">
                                        <button className="btn-text" onClick={() => copyText(msg.text)}>
                                            <Copy size={14} /> Copy
                                        </button>
                                        {onInsert && (
                                            <button className="btn-text" onClick={() => onInsert(msg.text)}>
                                                <Plus size={14} /> Insert
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        {loading && (
                            <div className="ai-msg ai typing">
                                <div className="typing-dots">
                                    <span /><span /><span />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {hasKey && (
                <form className="ai-input-bar" onSubmit={handleCustom}>
                    <input
                        className="ai-text-input"
                        value={customPrompt}
                        onChange={(e) => setCustomPrompt(e.target.value)}
                        placeholder="Ask anything…"
                        disabled={loading}
                    />
                    <button type="submit" className="ai-send-btn" disabled={loading || !customPrompt.trim()}>
                        <ArrowUp size={18} />
                    </button>
                </form>
            )}
        </div>
    )
}
