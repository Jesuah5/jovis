import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export default function WhiteboardIndex() {
    const { user } = useAuth()
    const navigate = useNavigate()

    useEffect(() => {
        if (!user) return

        async function findOrCreateWhiteboard() {
            // Find the most recent whiteboard for the user
            const { data, error } = await supabase
                .from('items')
                .select('id')
                .eq('user_id', user.id)
                .eq('type', 'whiteboard')
                .order('updated_at', { ascending: false })
                .limit(1)

            if (!error && data && data.length > 0) {
                // Redirect to the existing whiteboard
                navigate(`/whiteboard/${data[0].id}`, { replace: true })
            } else {
                // Create a new whiteboard
                const newItem = {
                    user_id: user.id,
                    type: 'whiteboard',
                    title: 'Untitled Whiteboard',
                    body: { elements: [] },
                }
                const { data: insertData, error: insertErr } = await supabase
                    .from('items')
                    .insert(newItem)
                    .select()
                    .single()

                if (!insertErr && insertData) {
                    navigate(`/whiteboard/${insertData.id}`, { replace: true })
                } else {
                    console.error("Failed to create whiteboard", insertErr)
                    navigate('/', { replace: true }) // fallback to home
                }
            }
        }

        findOrCreateWhiteboard()
    }, [user, navigate])

    // Render a loading state while deciding
    return (
        <div className="loading-screen">
            <div className="spinner" />
        </div>
    )
}
