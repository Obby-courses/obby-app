import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Stack, useRouter } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import {
    Animated,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { palette, spacing, typography } from '../lib/theme'

const PRIMARY_LANGUAGE = 'it'
const MANDATORY_FALLBACK = 'en'

// Additional optional languages (everything except IT and EN)
const ADDITIONAL_LANGUAGES = [
    { code: 'es', label: 'Español', flag: '🇪🇸' },
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
    { code: 'pt', label: 'Português', flag: '🇵🇹' },
]

export default function ProfileScreen() {
    const { user, profile, signOut, loading, refreshProfile } = useAuth()
    const router = useRouter()
    const insets = useSafeAreaInsets()

    // Additional optional languages state (excludes IT primary and EN mandatory fallback)
    const getInitialAdditional = (langs: string[]) =>
        langs.filter(l => l !== PRIMARY_LANGUAGE && l !== MANDATORY_FALLBACK)

    const [additionalLanguages, setAdditionalLanguages] = useState<string[]>(
        getInitialAdditional(profile?.secondary_languages || [])
    )
    const [saving, setSaving] = useState(false)
    const [langChanged, setLangChanged] = useState(false)

    // Sync when profile loads
    useEffect(() => {
        if (profile) {
            setAdditionalLanguages(getInitialAdditional(profile.secondary_languages || []))
        }
    }, [profile])

    const toggleAdditional = (code: string) => {
        setAdditionalLanguages(prev =>
            prev.includes(code) ? prev.filter(l => l !== code) : [...prev, code]
        )
        setLangChanged(true)
    }

    async function saveLanguages() {
        if (!user) return
        setSaving(true)
        // Always save IT as primary, always include EN in secondary
        const finalSecondary = [MANDATORY_FALLBACK, ...additionalLanguages.filter(l => l !== MANDATORY_FALLBACK)]
        const { error } = await supabase
            .from('profiles')
            .update({ primary_language: PRIMARY_LANGUAGE, secondary_languages: finalSecondary })
            .eq('id', user.id)
        if (!error) {
            await refreshProfile()
            setLangChanged(false)
        }
        setSaving(false)
    }

    // Fade-in animation on mount
    const fadeAnim = useRef(new Animated.Value(0)).current
    React.useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
        }).start()
    }, [])

    const handleSignOut = () => {
        Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
        }).start(() => {
            signOut().then(() => router.replace('/login'))
        })
    }

    if (loading) return null

    const initials = profile?.full_name
        ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
        : (user?.email?.[0] || '?').toUpperCase()


    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <Stack.Screen options={{ headerShown: false }} />

            {/* HERO HEADER */}
            <LinearGradient
                colors={['#1A1A2E', '#16213E']}
                style={[styles.hero, { paddingTop: insets.top + spacing.lg }]}
            >
                <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{initials}</Text>
                </View>
                <Text style={styles.heroName}>{profile?.full_name || 'Utente Obby'}</Text>
                <Text style={styles.heroEmail}>{user?.email}</Text>
            </LinearGradient>

            {/* CONTENT */}
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
                showsVerticalScrollIndicator={false}
            >
                {/* LANGUAGE SETTINGS */}
                <Text style={styles.sectionTitle}>Lingue Risorse</Text>

                {/* Language Info Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconContainer, { backgroundColor: '#F0FDF4' }]}>
                            <Ionicons name="globe-outline" size={20} color="#16A34A" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.cardTitle}>Lingue per le risorse</Text>
                            <Text style={styles.cardSub}>Italiano e Inglese sono sempre inclusi come base</Text>
                        </View>
                    </View>

                    {/* Fixed: Primary + Mandatory fallback */}
                    <Text style={[styles.cardSub, { fontWeight: '700', color: '#64748B', marginBottom: 6 }]}>Sempre attive:</Text>
                    <View style={styles.langGrid}>
                        <View style={[styles.langChip, styles.langChipPrimary]}>
                            <Text style={styles.langChipTextActive}>🇮🇹 Italiano</Text>
                        </View>
                        <View style={[styles.langChip, styles.langChipSecondary]}>
                            <Text style={styles.langChipTextActive}>🇬🇧 English</Text>
                        </View>
                    </View>

                    {/* Optional additional languages */}
                    <Text style={[styles.cardSub, { fontWeight: '700', color: '#64748B', marginTop: 10, marginBottom: 6 }]}>Lingue aggiuntive (opzionale):</Text>
                    <View style={styles.langGrid}>
                        {ADDITIONAL_LANGUAGES.map(lang => {
                            const isSelected = additionalLanguages.includes(lang.code)
                            return (
                                <Pressable
                                    key={lang.code}
                                    onPress={() => toggleAdditional(lang.code)}
                                    style={[styles.langChip, isSelected && styles.langChipSecondary]}
                                >
                                    <Text style={[styles.langChipText, isSelected && styles.langChipTextActive]}>
                                        {lang.flag} {lang.label}
                                    </Text>
                                </Pressable>
                            )
                        })}
                    </View>
                    {langChanged && (
                        <Pressable
                            onPress={saveLanguages}
                            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                            disabled={saving}
                        >
                            <Text style={styles.saveBtnText}>{saving ? 'Salvataggio...' : 'Salva Lingue'}</Text>
                        </Pressable>
                    )}
                </View>

                {/* ACCOUNT */}
                <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>Account</Text>
                <Pressable style={styles.menuItem} onPress={handleSignOut}>
                    <View style={[styles.iconContainer, { backgroundColor: '#FFF0F0' }]}>
                        <Ionicons name="log-out" size={20} color="#EF4444" />
                    </View>
                    <Text style={[styles.menuText, { color: '#EF4444' }]}>Esci dall'account</Text>
                    <Ionicons name="chevron-forward" size={18} color={palette.gray} />
                </Pressable>

                <Text style={[styles.sectionTitle, { marginTop: spacing.xl }]}>App</Text>
                <View style={styles.menuItem}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="shield-checkmark" size={20} color={palette.black} />
                    </View>
                    <Text style={styles.menuText}>Privacy & Sicurezza</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>RLS</Text>
                    </View>
                </View>
                <View style={styles.menuItem}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="information-circle" size={20} color={palette.black} />
                    </View>
                    <Text style={styles.menuText}>Versione</Text>
                    <Text style={styles.menuSubText}>1.1.0</Text>
                </View>
            </ScrollView>
        </Animated.View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    hero: {
        alignItems: 'center',
        paddingBottom: spacing.xl,
        paddingHorizontal: spacing.lg,
    },
    avatarCircle: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    avatarText: {
        fontSize: 34,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    heroName: {
        ...typography.title,
        fontSize: 26,
        color: '#FFFFFF',
        marginBottom: 4,
    },
    heroEmail: {
        ...typography.body,
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
    },
    content: {
        padding: spacing.lg,
    },
    sectionTitle: {
        ...typography.label,
        fontSize: 11,
        letterSpacing: 2,
        color: '#94A3B8',
        marginBottom: spacing.md,
        marginTop: spacing.sm,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
        gap: 14,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    cardTitle: {
        ...typography.body,
        fontSize: 15,
        fontWeight: '700',
        color: palette.black,
    },
    cardSub: {
        ...typography.body,
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    langGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    langChip: {
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
    },
    langChipPrimary: {
        backgroundColor: '#1D4ED8',
        borderColor: '#1D4ED8',
    },
    langChipSecondary: {
        backgroundColor: '#334155',
        borderColor: '#334155',
    },
    langChipPinned: {
        backgroundColor: '#1D4ED8',
        borderColor: '#1D4ED8',
    },
    langChipText: {
        fontSize: 13,
        fontWeight: '700',
        color: palette.black,
    },
    langChipTextActive: {
        color: palette.white,
    },
    saveBtn: {
        backgroundColor: palette.black,
        paddingVertical: 12,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 4,
    },
    saveBtnText: {
        color: palette.white,
        fontWeight: '800',
        fontSize: 14,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 2,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    menuText: {
        flex: 1,
        ...typography.body,
        fontSize: 16,
        fontWeight: '600',
        color: palette.black,
    },
    menuSubText: {
        ...typography.body,
        fontSize: 14,
        color: '#94A3B8',
        fontWeight: '600',
    },
    badge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#166534',
    },
})
