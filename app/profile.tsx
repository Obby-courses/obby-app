import { Ionicons } from '@expo/vector-icons'
import { Stack, useRouter } from 'expo-router'
import React from 'react'
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../contexts/AuthContext'
import { colors, layout, spacing } from '../lib/theme'

export default function ProfileScreen() {
    const { user, profile, signOut, loading } = useAuth()
    const router = useRouter()
    const insets = useSafeAreaInsets()

    const handleSignOut = () => {
        Alert.alert('Logout', 'Sei sicuro di voler uscire?', [
            { text: 'Annulla', style: 'cancel' },
            {
                text: 'Esci',
                style: 'destructive',
                onPress: async () => {
                    await signOut()
                    router.replace('/login')
                },
            },
        ])
    }

    if (loading) return null

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    headerShown: true,
                    title: 'Profilo',
                    headerTitleStyle: { color: colors.textPrimary },
                    headerShadowVisible: false,
                    headerLeft: () => (
                        <TouchableOpacity onPress={() => router.back()}>
                            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                        </TouchableOpacity>
                    ),
                }}
            />

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 120 }]}>
                <View style={styles.header}>
                    <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={50} color={colors.mutedText} />
                    </View>
                    <Text style={styles.name}>
                        {profile?.full_name || 'Utente Obby'}
                    </Text>
                    <Text style={styles.email}>{user?.email}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>


                    <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
                        <View style={[styles.iconContainer, { backgroundColor: '#FFEEF0' }]}>
                            <Ionicons name="log-out" size={20} color="#FF4444" />
                        </View>
                        <Text style={[styles.menuText, { color: '#FF4444' }]}>Esci dall'account</Text>
                        <Ionicons name="chevron-forward" size={20} color={colors.mutedText} />
                    </TouchableOpacity>

                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>App</Text>
                    <View style={styles.menuItem}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="shield-checkmark" size={20} color={colors.textPrimary} />
                        </View>
                        <Text style={styles.menuText}>Privacy & Sicurezza (RLS Attiva)</Text>
                    </View>
                    <View style={styles.menuItem}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="information-circle" size={20} color={colors.textPrimary} />
                        </View>
                        <Text style={styles.menuText}>Versione 1.0.7</Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    content: {
        padding: layout.screenPadding,
    },
    header: {
        alignItems: 'center',
        marginVertical: spacing.xl,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    email: {
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: 4,
    },
    section: {
        marginTop: spacing.xl,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.mutedText,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.md,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.card,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    menuText: {
        flex: 1,
        fontSize: 16,
        color: colors.textPrimary,
    },
})
