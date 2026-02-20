import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext({})

export const useAuth = () => useContext(AuthContext)

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null)
    const [profile, setProfile] = useState(null)
    const [loading, setLoading] = useState(true)

    /* ---- fetch profile helper ---- */
    async function fetchProfile(userId) {
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single()
        setProfile(data)
    }

    /* ---- auth state listener ---- */
    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            const u = session?.user ?? null
            setUser(u)
            if (u) fetchProfile(u.id)
            setLoading(false)
        })

        // Listen for changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            const u = session?.user ?? null
            setUser(u)
            if (u) fetchProfile(u.id)
            else setProfile(null)
        })

        return () => subscription.unsubscribe()
    }, [])

    /* ---- auth actions ---- */
    async function signUp(email, password, displayName) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: { display_name: displayName } },
        })
        return { data, error }
    }

    async function signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })
        return { data, error }
    }

    async function signOut() {
        await supabase.auth.signOut()
        setUser(null)
        setProfile(null)
    }

    async function updateProfile(updates) {
        if (!user) return
        const { error } = await supabase
            .from('profiles')
            .update(updates)
            .eq('id', user.id)
        if (!error) setProfile((p) => ({ ...p, ...updates }))
        return { error }
    }

    return (
        <AuthContext.Provider
            value={{ user, profile, loading, signUp, signIn, signOut, updateProfile }}
        >
            {children}
        </AuthContext.Provider>
    )
}
