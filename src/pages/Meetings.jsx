import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { isSpeechSupported } from '../lib/meetingService'
import { Mic, ChevronRight, Plus, AlertCircle } from 'lucide-react'
import './Meetings.css'

export default function Meetings() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [meetings, setMeetings] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (user) fetchMeetings()
    }, [user])

    async function fetchMeetings() {
        // Fetch all notes, then filter for ones with _meeting flag
        const { data } = await supabase
            .from('items')
            .select('*')
            .eq('user_id', user.id)
            .eq('type', 'note')
            .order('updated_at', { ascending: false })
        const meetingItems = (data || []).filter(item => item.body?._meeting === true)
        setMeetings(meetingItems)
        setLoading(false)
    }

    const supported = isSpeechSupported()

    return (
        <div className="meetings-page">
            <div className="navbar">
                <h1 className="navbar-title">Meetings</h1>
            </div>

            {!supported && (
                <div className="meetings-banner">
                    <AlertCircle size={18} />
                    <span>Speech recognition not supported in this browser. Try Chrome or Safari.</span>
                </div>
            )}

            <div className="grouped-list">
                <div className="group-section">
                    <div className="group-header">Recent Meetings</div>
                    {loading ? (
                        <div className="loading-screen"><div className="spinner" /></div>
                    ) : meetings.length === 0 ? (
                        <div className="empty-state">
                            <Mic size={48} />
                            <p>No meetings yet.<br />Tap + to start a new session.</p>
                        </div>
                    ) : (
                        <div className="group-card">
                            {meetings.map((m, i) => (
                                <div
                                    key={m.id}
                                    className="group-row"
                                    onClick={() => navigate(`/item/${m.id}`)}
                                >
                                    <div className="row-icon" style={{ background: '#AF52DE' }}>
                                        <Mic size={16} color="white" />
                                    </div>
                                    <div className="row-content">
                                        <div className="row-title">{m.title}</div>
                                        <div className="row-subtitle">
                                            {new Date(m.updated_at).toLocaleDateString(undefined, {
                                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                            })}
                                        </div>
                                    </div>
                                    <ChevronRight size={16} className="row-chevron" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {supported && (
                <button
                    className="fab"
                    onClick={() => navigate('/meeting/new')}
                    aria-label="New meeting"
                >
                    <Plus size={24} strokeWidth={2.5} />
                </button>
            )}
        </div>
    )
}
