import { useNavigate } from 'react-router-dom'
import {
    FileText, CheckSquare, Image, Bookmark, Share2, ChevronRight,
} from 'lucide-react'
import './ItemCard.css'

const TYPE_ICONS = {
    note: FileText,
    todo: CheckSquare,
    media: Image,
    bookmark: Bookmark,
    meeting: FileText,
}

const TYPE_COLORS = {
    note: '#FF9500',
    todo: '#34C759',
    media: '#FF2D55',
    bookmark: '#007AFF',
    meeting: '#AF52DE',
}

export default function ItemCard({ item, isLast }) {
    const navigate = useNavigate()
    const Icon = TYPE_ICONS[item.type] || FileText

    /* Todo progress */
    let todoProgress = null
    if (item.type === 'todo' && item.body?.todos?.length) {
        const done = item.body.todos.filter((t) => t.done).length
        const total = item.body.todos.length
        todoProgress = { done, total, pct: Math.round((done / total) * 100) }
    }

    /* Note preview */
    let notePreview = ''
    if (item.type === 'note' && item.body?.html) {
        notePreview = item.body.html.replace(/<[^>]+>/g, '').slice(0, 80)
    }

    const dateStr = new Date(item.updated_at).toLocaleDateString(undefined, {
        month: 'short', day: 'numeric',
    })

    return (
        <div
            className={`item-cell ${isLast ? 'last' : ''}`}
            onClick={() => navigate(`/item/${item.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && navigate(`/item/${item.id}`)}
            id={`item-card-${item.id}`}
        >
            <div className="cell-icon" style={{ background: TYPE_COLORS[item.type] }}>
                <Icon size={16} color="white" />
            </div>

            <div className="cell-content">
                <div className="cell-top">
                    <span className="cell-title">{item.title}</span>
                    {item._permission && <Share2 size={14} className="cell-shared-icon" />}
                </div>
                <div className="cell-bottom">
                    {todoProgress ? (
                        <span className="cell-detail">{todoProgress.done}/{todoProgress.total} tasks · {dateStr}</span>
                    ) : notePreview ? (
                        <span className="cell-detail">{notePreview} · {dateStr}</span>
                    ) : (
                        <span className="cell-detail">{dateStr}</span>
                    )}
                </div>
            </div>

            <ChevronRight size={16} className="cell-chevron" />
        </div>
    )
}
