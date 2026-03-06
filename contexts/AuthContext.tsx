import { Session, User } from '@supabase/supabase-js'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type Profile = {
    id: string
    username: string | null
    full_name: string | null
    avatar_url: string | null
    website: string | null
    updated_at: string
    primary_language: string
    secondary_languages: string[]
    tools: string[]
}

type AuthContextType = {
    session: Session | null
    user: User | null
    profile: Profile | null
    loading: boolean
    refreshProfile: () => Promise<void>
    signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
    session: null,
    user: null,
    profile: null,
    loading: true,
    refreshProfile: async () => { },
    signOut: async () => { },
})

export function useAuth() {
    return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<Profile | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        console.log('🔐 [Auth] AuthProvider montato, avvio getSession...')

        // Timeout di sicurezza: dopo 8 secondi forza loading=false
        const timeout = setTimeout(() => {
            console.error('⏱️ [Auth] TIMEOUT! getSession non ha risposto in 8s → forzo loading=false')
            setLoading(false)
        }, 8000)

        // Check active sessions and sets the user
        supabase.auth.getSession().then(({ data: { session }, error }) => {
            clearTimeout(timeout)
            console.log('✅ [Auth] getSession risposta ricevuta:', {
                hasSession: !!session,
                userId: session?.user?.id ?? 'nessuno',
                error: error?.message ?? null
            })
            setSession(session)
            setUser(session?.user ?? null)
            if (session?.user) {
                console.log('👤 [Auth] Utente trovato, fetch del profilo...')
                fetchProfile(session.user.id)
            } else {
                console.log('🔓 [Auth] Nessuna sessione → redirect a /login')
                setLoading(false)
            }
        }).catch((err) => {
            clearTimeout(timeout)
            console.error('❌ [Auth] getSession ERRORE:', err)
            setLoading(false)
        })

        // Listen for changes on auth state
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            console.log('🔄 [Auth] onAuthStateChange evento:', _event, '| userId:', session?.user?.id ?? 'nessuno')
            setSession(session)
            setUser(session?.user ?? null)

            if (session?.user) {
                fetchProfile(session.user.id)
            } else {
                setProfile(null)
                setLoading(false)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const fetchProfile = async (userId: string) => {
        console.log('📋 [Auth] fetchProfile per userId:', userId)
        try {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            if (error && error.code !== 'PGRST116') {
                console.warn('⚠️ [Auth] fetchProfile errore:', error.message, '| code:', error.code)
            }

            if (data) {
                console.log('✅ [Auth] Profilo caricato:', data.full_name ?? data.username ?? 'n/a')
                setProfile(data)
            } else {
                console.warn('⚠️ [Auth] Profilo non trovato per userId:', userId)
            }
        } catch (error) {
            console.error('❌ [Auth] fetchProfile ECCEZIONE:', error)
        } finally {
            console.log('🏁 [Auth] fetchProfile completato → loading=false')
            setLoading(false)
        }
    }

    const signOut = async () => {
        await supabase.auth.signOut()
        // State updates are handled by onAuthStateChange
    }

    const refreshProfile = async () => {
        if (user) {
            await fetchProfile(user.id)
        }
    }

    const value = {
        session,
        user,
        profile,
        loading,
        refreshProfile,
        signOut,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
