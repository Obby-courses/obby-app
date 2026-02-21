import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { Stack, useRouter } from 'expo-router'
import React, { useRef } from 'react'
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
import { palette, spacing, typography } from '../lib/theme'

export default function ProfileScreen() {
    const { user, profile, signOut, loading } = useAuth()
    const router = useRouter()
    const insets = useSafeAreaInsets()

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
                <Text style={styles.sectionTitle}>Account</Text>
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
