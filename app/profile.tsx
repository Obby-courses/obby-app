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
import { palette, spacing, typography } from '../lib/theme'

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
                    headerTitleStyle: { ...typography.body, fontSize: 18, fontWeight: '800' },
                    headerShadowVisible: false,
                    headerLeft: () => null,
                    headerBackVisible: false,
                }}
            />

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: 150 }]}>
                <View style={styles.header}>
                    <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={50} color={palette.gray} />
                    </View>
                    <Text style={styles.name}>
                        {profile?.full_name || 'Utente Obby'}
                    </Text>
                    <Text style={styles.email}>{user?.email}</Text>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account</Text>

                    <TouchableOpacity style={styles.menuItem} onPress={handleSignOut} activeOpacity={0.7}>
                        <View style={[styles.iconContainer, { backgroundColor: '#FFEEF0' }]}>
                            <Ionicons name="log-out" size={20} color="#FF4444" />
                        </View>
                        <Text style={[styles.menuText, { color: '#FF4444', fontWeight: '700' }]}>Esci dall'account</Text>
                        <Ionicons name="chevron-forward" size={20} color={palette.gray} />
                    </TouchableOpacity>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>App</Text>
                    <View style={styles.menuItem}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="shield-checkmark" size={20} color={palette.black} />
                        </View>
                        <Text style={styles.menuText}>Privacy & Sicurezza (RLS Attiva)</Text>
                    </View>
                    <View style={styles.menuItem}>
                        <View style={styles.iconContainer}>
                            <Ionicons name="information-circle" size={20} color={palette.black} />
                        </View>
                        <Text style={styles.menuText}>Versione 1.1.0</Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: palette.white,
    },
    content: {
        padding: spacing.lg,
    },
    header: {
        alignItems: 'center',
        marginVertical: spacing.xl,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: palette.lightGray,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
        borderWidth: 2,
        borderColor: palette.border,
    },
    name: {
        ...typography.title,
        fontSize: 28,
    },
    email: {
        ...typography.body,
        fontSize: 16,
        color: palette.gray,
        marginTop: 4,
    },
    section: {
        marginTop: spacing.xl,
    },
    sectionTitle: {
        ...typography.label,
        fontSize: 12,
        letterSpacing: 2,
        marginBottom: spacing.md,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 16,
        backgroundColor: palette.lightGray,
        borderRadius: 24,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: palette.border,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: palette.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    menuText: {
        flex: 1,
        ...typography.body,
        fontSize: 16,
    },
})

