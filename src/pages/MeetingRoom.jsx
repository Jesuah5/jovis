import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { createMeetingRecorder, isSpeechSupported } from '../lib/meetingService'
import { summarizeMeeting, hasAnyAIKey } from '../lib/aiService'
import {
    ChevronLeft, Mic, MicOff, Pause, Play, Square,
    Wand2, Save, FileText, ListChecks, CheckCircle2,
    Plus, ChevronRight,
} from 'lucide-react'
import './MeetingRoom.css'

export default function MeetingRoom() {
    const navigate = useNavigate()
    const { user } = useAuth()
    const recorderRef = useRef(null)

    const [title, setTitle] = useState('')
    const [status, setStatus] = useState('idle') // idle | listening | paused | stopped | error
    const [transcript, setTranscript] = useState('')
    const [liveText, setLiveText] = useState('')
    const [duration, setDuration] = useState(0)
    const [summary, setSummary] = useState('')
    const [actionItems, setActionItems] = useState([])
    const [keyDecisions, setKeyDecisions] = useState([])
    const [discussionPoints, setDiscussionPoints] = useState([])
    const [summarizing, setSummarizing] = useState(false)
    const [saving, setSaving] = useState(false)
    const [saved, setSaved] = useState(false)
    const [savedItems, setSavedItems] = useState({})
    const [audioBlob, setAudioBlob] = useState(null)

    const timerRef = useRef(null)

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
            recorderRef.current?.stop()
        }
    }, [])

    function startRecording() {
        const recorder = createMeetingRecorder({
            onTranscript: (text, isFinal) => {
                if (isFinal) setTranscript(text)
                setLiveText(text)
            },
            onStatusChange: (s) => setStatus(s),
            onError: (err) => console.error(err),
        })
        recorderRef.current = recorder
        recorder.start()
        setDuration(0)
        timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
    }

    async function stopRecording() {
        if (timerRef.current) clearInterval(timerRef.current)
        const result = await recorderRef.current?.stop()
        if (result?.transcript) setTranscript(result.transcript)
        if (result?.audioBlob) setAudioBlob(result.audioBlob)
        setStatus('stopped')
    }

    function togglePause() {
        if (status === 'paused') {
            recorderRef.current?.resume()
            timerRef.current = setInterval(() => setDuration(d => d + 1), 1000)
        } else {
            recorderRef.current?.pause()
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }

    // ---- Parse MOM sections from AI response ----
    function parseMOMSections(text) {
        const sections = { summary: '', actions: [], decisions: [], discussion: [] }

        const summaryMatch = text.match(/## Summary\s*\n([\s\S]*?)(?=\n## |$)/i)
        if (summaryMatch) sections.summary = summaryMatch[1].trim()

        const actionsMatch = text.match(/## Action Items\s*\n([\s\S]*?)(?=\n## |$)/i)
        if (actionsMatch) {
            sections.actions = actionsMatch[1]
                .split('\n')
                .map(l => l.replace(/^[-*]\s*(\[[ x]\]\s*)?/, '').trim())
                .filter(l => l.length > 0)
        }

        const decisionsMatch = text.match(/## Key Decisions\s*\n([\s\S]*?)(?=\n## |$)/i)
        if (decisionsMatch) {
            sections.decisions = decisionsMatch[1]
                .split('\n')
                .map(l => l.replace(/^[-*]\s*/, '').trim())
                .filter(l => l.length > 0)
        }

        const discussionMatch = text.match(/## Discussion Points\s*\n([\s\S]*?)(?=\n## |$)/i)
        if (discussionMatch) {
            sections.discussion = discussionMatch[1]
                .split('\n')
                .map(l => l.replace(/^[-*]\s*/, '').trim())
                .filter(l => l.length > 0)
        }

        return sections
    }

    async function handleSummarize() {
        if (!transcript.trim()) return
        setSummarizing(true)
        try {
            const { text } = await summarizeMeeting(transcript)
            const sections = parseMOMSections(text)
            setSummary(sections.summary || text)
            setActionItems(sections.actions)
            setKeyDecisions(sections.decisions)
            setDiscussionPoints(sections.discussion)
        } catch (err) {
            setSummary(`Error: ${err.message}`)
        }
        setSummarizing(false)
    }

    // ---- Save action item as a new to-do ----
    async function saveAsTodo(item, index) {
        const { error } = await supabase.from('items').insert({
            user_id: user.id,
            type: 'todo',
            title: item.length > 60 ? item.substring(0, 60) + '…' : item,
            body: { todos: [{ text: item, done: false }] },
        })
        if (!error) {
            setSavedItems(prev => ({ ...prev, [`todo-${index}`]: true }))
        }
    }

    // ---- Save summary + action items as a new note ----
    async function saveAsNote() {
        const meetingTitle = title.trim() || `Meeting — ${new Date().toLocaleDateString()}`
        const htmlParts = [
            `<h2>Minutes of Meeting: ${meetingTitle}</h2>`,
            `<p><em>${new Date().toLocaleString()}</em></p>`,
            `<h3>Summary</h3><p>${summary.replace(/\n/g, '<br/>')}</p>`,
            keyDecisions.length > 0 ? `<h3>Key Decisions</h3><ul>${keyDecisions.map(d => `<li>${d}</li>`).join('')}</ul>` : '',
            actionItems.length > 0 ? `<h3>Action Items</h3><ul>${actionItems.map(a => `<li>${a}</li>`).join('')}</ul>` : '',
            discussionPoints.length > 0 ? `<h3>Discussion Points</h3><ul>${discussionPoints.map(p => `<li>${p}</li>`).join('')}</ul>` : '',
        ].filter(Boolean).join('')

        const { error } = await supabase.from('items').insert({
            user_id: user.id,
            type: 'note',
            title: `MOM: ${meetingTitle}`,
            body: { html: htmlParts },
        })

        if (!error) {
            setSavedItems(prev => ({ ...prev, 'note': true }))
        }
    }

    // ---- Save all action items as todos at once ----
    async function saveAllAsTodos() {
        const todosBody = actionItems.map(a => ({ text: a, done: false }))
        const meetingTitle = title.trim() || `Meeting — ${new Date().toLocaleDateString()}`

        const { error } = await supabase.from('items').insert({
            user_id: user.id,
            type: 'todo',
            title: `Action Items: ${meetingTitle}`,
            body: { todos: todosBody },
        })

        if (!error) {
            setSavedItems(prev => ({ ...prev, 'all-todos': true }))
        }
    }

    async function handleSaveMeeting() {
        if (!transcript.trim()) return
        setSaving(true)

        const meetingTitle = title.trim() || `Meeting — ${new Date().toLocaleDateString()}`

        // Upload audio if available
        let audioUrl = ''
        if (audioBlob) {
            const fileName = `meetings/${user.id}/${Date.now()}.webm`
            const { data: uploadData, error: uploadErr } = await supabase.storage
                .from('media')
                .upload(fileName, audioBlob, { contentType: audioBlob.type })
            if (!uploadErr && uploadData) {
                const { data: urlData } = supabase.storage.from('media').getPublicUrl(fileName)
                audioUrl = urlData?.publicUrl || ''
            }
        }

        // Build HTML body for the note
        const htmlParts = [
            `<h2>${meetingTitle}</h2>`,
            `<p><em>${new Date().toLocaleString()} • ${formatTime(duration)}</em></p>`,
            audioUrl ? `<p><strong>🎙 Recording:</strong> <a href="${audioUrl}" target="_blank">Play Audio</a></p>` : '',
            `<h3>Transcript</h3><p>${transcript.replace(/\n/g, '<br/>')}</p>`,
            summary ? `<h3>Summary</h3><p>${summary.replace(/\n/g, '<br/>')}</p>` : '',
            keyDecisions.length > 0 ? `<h3>Key Decisions</h3><ul>${keyDecisions.map(d => `<li>${d}</li>`).join('')}</ul>` : '',
            actionItems.length > 0 ? `<h3>Action Items</h3><ul>${actionItems.map(a => `<li>${a}</li>`).join('')}</ul>` : '',
            discussionPoints.length > 0 ? `<h3>Discussion Points</h3><ul>${discussionPoints.map(p => `<li>${p}</li>`).join('')}</ul>` : '',
        ].filter(Boolean).join('')

        const { error } = await supabase.from('items').insert({
            user_id: user.id,
            type: 'note',
            title: meetingTitle,
            body: { html: htmlParts.filter(Boolean).join(''), _meeting: true },
            media_url: audioUrl,
        })

        setSaving(false)
        if (error) {
            alert('Failed to save: ' + error.message)
        } else {
            setSaved(true)
            setTimeout(() => navigate('/meetings'), 800)
        }
    }

    function formatTime(s) {
        const m = Math.floor(s / 60)
        const sec = s % 60
        return `${m}:${sec < 10 ? '0' : ''}${sec}`
    }

    const isRecording = status === 'listening' || status === 'paused'
    const hasTranscript = transcript.trim().length > 0
    const hasMOM = summary || actionItems.length > 0

    return (
        <div className="meeting-room">
            <div className="navbar-compact">
                <button className="navbar-back" onClick={() => navigate('/meetings')}>
                    <ChevronLeft size={24} />
                    <span>Meetings</span>
                </button>
            </div>

            <div className="meeting-content">
                {/* Title */}
                <input
                    className="meeting-title-input"
                    placeholder="Meeting Title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />

                {/* Timer + Controls */}
                <div className="meeting-timer-section">
                    <div className={`timer-display ${isRecording ? 'recording' : ''}`}>
                        {formatTime(duration)}
                    </div>

                    <div className="meeting-controls">
                        {status === 'idle' && (
                            <button className="record-btn" onClick={startRecording}>
                                <Mic size={28} />
                                <span>Start Recording</span>
                            </button>
                        )}

                        {isRecording && (
                            <>
                                <button className="control-btn" onClick={togglePause}>
                                    {status === 'paused' ? <Play size={24} /> : <Pause size={24} />}
                                </button>
                                <button className="control-btn stop" onClick={stopRecording}>
                                    <Square size={20} fill="white" />
                                </button>
                            </>
                        )}
                    </div>

                    {status === 'listening' && (
                        <div className="listening-indicator">
                            <span className="pulse-dot" />
                            Listening…
                        </div>
                    )}
                    {status === 'paused' && (
                        <div className="listening-indicator paused">
                            Paused
                        </div>
                    )}
                </div>

                {/* Live transcript */}
                {(liveText || hasTranscript) && (
                    <div className="mom-section">
                        <h3 className="mom-section-title">Transcript</h3>
                        <div className="mom-card">
                            <p className="transcript-text">{liveText || transcript}</p>
                        </div>
                    </div>
                )}

                {/* ---- Post-recording actions (always visible after stop) ---- */}
                {status === 'stopped' && hasTranscript && (
                    <div className="post-actions">
                        {/* Generate MOM - only if AI key available and not yet generated */}
                        {hasAnyAIKey() && !hasMOM && (
                            <button
                                className="btn-primary generate-mom-btn"
                                onClick={handleSummarize}
                                disabled={summarizing}
                            >
                                <Wand2 size={18} />
                                {summarizing ? 'Generating MOM…' : 'Generate Minutes of Meeting'}
                            </button>
                        )}

                        {/* Save Meeting - compact button */}
                        <button
                            className="btn-primary save-compact-btn"
                            onClick={handleSaveMeeting}
                            disabled={saving || saved}
                        >
                            <Save size={16} />
                            {saved ? 'Saved ✓' : saving ? 'Saving…' : 'Save as Note'}
                        </button>
                    </div>
                )}

                {/* ---- MOM: Summary ---- */}
                {summary && (
                    <div className="mom-section">
                        <h3 className="mom-section-title">Summary</h3>
                        <div className="mom-card">
                            <p>{summary}</p>
                        </div>
                    </div>
                )}

                {/* ---- MOM: Key Decisions ---- */}
                {keyDecisions.length > 0 && (
                    <div className="mom-section">
                        <h3 className="mom-section-title">Key Decisions</h3>
                        <div className="mom-card">
                            {keyDecisions.map((d, i) => (
                                <div key={i} className="mom-item">
                                    <span className="mom-bullet decision">●</span>
                                    <span>{d}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ---- MOM: Action Items ---- */}
                {actionItems.length > 0 && (
                    <div className="mom-section">
                        <div className="mom-section-header">
                            <h3 className="mom-section-title">Action Items</h3>
                            <button
                                className="btn-text mom-save-all"
                                onClick={saveAllAsTodos}
                                disabled={savedItems['all-todos']}
                            >
                                {savedItems['all-todos'] ? (
                                    <><CheckCircle2 size={15} /> Saved</>
                                ) : (
                                    <><ListChecks size={15} /> Save All as To-Do</>
                                )}
                            </button>
                        </div>
                        <div className="mom-card">
                            {actionItems.map((item, i) => (
                                <div key={i} className="mom-item action-item">
                                    <span className="mom-bullet action">○</span>
                                    <span className="action-text">{item}</span>
                                    <button
                                        className="action-save-btn"
                                        onClick={() => saveAsTodo(item, i)}
                                        disabled={savedItems[`todo-${i}`]}
                                        title="Add to To-Do"
                                    >
                                        {savedItems[`todo-${i}`] ? (
                                            <CheckCircle2 size={16} color="var(--success)" />
                                        ) : (
                                            <Plus size={16} />
                                        )}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ---- MOM: Discussion Points ---- */}
                {discussionPoints.length > 0 && (
                    <div className="mom-section">
                        <h3 className="mom-section-title">Discussion Points</h3>
                        <div className="mom-card">
                            {discussionPoints.map((p, i) => (
                                <div key={i} className="mom-item">
                                    <span className="mom-bullet discuss">▸</span>
                                    <span>{p}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ---- Save as Note (only after MOM) ---- */}
                {hasMOM && !savedItems['note'] && (
                    <div className="post-actions">
                        <button
                            className="btn-text save-note-btn"
                            onClick={saveAsNote}
                        >
                            <FileText size={15} />
                            Save MOM as Note
                        </button>
                    </div>
                )}
                {savedItems['note'] && (
                    <div className="post-actions">
                        <span className="saved-feedback"><CheckCircle2 size={15} color="var(--success)" /> Saved as Note</span>
                    </div>
                )}
            </div>
        </div>
    )
}
