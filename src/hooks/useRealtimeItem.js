import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * Subscribe to realtime changes on a single item row.
 * @param {string} itemId - the item UUID
 * @param {(payload: any) => void} onChange - called with the Realtime payload on UPDATE
 */
export function useRealtimeItem(itemId, onChange) {
    const onChangeRef = useRef(onChange)
    onChangeRef.current = onChange

    useEffect(() => {
        if (!itemId) return

        const channel = supabase
            .channel(`item-${itemId}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'items',
                    filter: `id=eq.${itemId}`,
                },
                (payload) => {
                    onChangeRef.current(payload)
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [itemId])
}
