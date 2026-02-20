import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import ItemCard from '../components/ItemCard'
import CreateItemModal from '../components/CreateItemModal'
import { useRealtimeDashboard } from '../hooks/useRealtimeDashboard'
import { Plus } from 'lucide-react'
import './Dashboard.css'

export default function Dashboard() {
    const { user } = useAuth()
    const [myItems, setMyItems] = useState([])
    const [sharedItems, setSharedItems] = useState([])
    const [activeTab, setActiveTab] = useState('mine')
    const [showCreate, setShowCreate] = useState(false)
    const [loading, setLoading] = useState(true)

    async function fetchItems() {
        setLoading(true)

        const { data: mine } = await supabase
            .from('items')
            .select('*')
            .eq('user_id', user.id)
            .order('updated_at', { ascending: false })

        // Filter out meetings (they appear on Meetings page)
        const nonMeetings = (mine || []).filter(item => !item.body?._meeting)

        const { data: shares } = await supabase
            .from('shared_items')
            .select('item_id, permission, items(*)')
            .eq('shared_with_user_id', user.id)
            .order('created_at', { ascending: false })

        setMyItems(nonMeetings)
        setSharedItems(
            (shares || [])
                .filter((s) => s.items)
                .map((s) => ({ ...s.items, _permission: s.permission }))
        )
        setLoading(false)
    }

    useEffect(() => {
        if (user) fetchItems()
    }, [user])

    useRealtimeDashboard(user?.id, fetchItems)

    function handleCreated() {
        setShowCreate(false)
        fetchItems()
    }

    const items = activeTab === 'mine' ? myItems : sharedItems

    return (
        <div className="dashboard">
            {/* Apple-style large title + segmented control */}
            <div className="navbar">
                <h1 className="navbar-title">Home</h1>
                <div className="segmented-control dashboard-tabs">
                    <button
                        className={`segment ${activeTab === 'mine' ? 'active' : ''}`}
                        onClick={() => setActiveTab('mine')}
                    >
                        My Items ({myItems.length})
                    </button>
                    <button
                        className={`segment ${activeTab === 'shared' ? 'active' : ''}`}
                        onClick={() => setActiveTab('shared')}
                    >
                        Shared ({sharedItems.length})
                    </button>
                </div>
            </div>

            <div className="dashboard-body">
                {loading ? (
                    <div className="loading-screen"><div className="spinner" /></div>
                ) : items.length === 0 ? (
                    <div className="empty-state">
                        <p>{activeTab === 'mine' ? 'No items yet — create your first one!' : 'Nothing shared with you yet.'}</p>
                    </div>
                ) : (
                    <div className="items-list">
                        <div className="group-card">
                            {items.map((item, i) => (
                                <ItemCard key={item.id} item={item} isLast={i === items.length - 1} />
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* FAB — Apple style */}
            <button
                className="fab"
                onClick={() => setShowCreate(true)}
                aria-label="Create new item"
                id="create-item-btn"
            >
                <Plus size={24} strokeWidth={2.5} />
            </button>

            {showCreate && (
                <CreateItemModal
                    onClose={() => setShowCreate(false)}
                    onCreated={handleCreated}
                />
            )}
        </div>
    )
}
