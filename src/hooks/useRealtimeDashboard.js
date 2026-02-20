import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Subscribe to realtime changes on items & shared_items tables so the
 * dashboard auto-refreshes when items are created, updated, or shared.
 * @param {string} userId - current user ID
 * @param {() => void} refetch - function to re-fetch dashboard data
 */
export function useRealtimeDashboard(userId, refetch) {
    const refetchRef = useRef(refetch)
    refetchRef.current = refetch

    useEffect(() => {
        if (!userId) return

        const channel = supabase
            .channel('dashboard-changes')
            // Listen for any change to items owned by the user
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'items',
                    filter: `user_id=eq.${userId}`,
                },
                () => refetchRef.current()
            )
            // Listen for new shares given to this user
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'shared_items',
                    filter: `shared_with_user_id=eq.${userId}`,
                },
                () => refetchRef.current()
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId])
}
