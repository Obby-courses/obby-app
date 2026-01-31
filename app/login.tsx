import { Stack, useRouter } from 'expo-router'
import React, { useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native'
import { supabase } from '../lib/supabase'
import { colors, layout, radius, spacing } from '../lib/theme'

export default function LoginScreen() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [isRegistering, setIsRegistering] = useState(false)
    const [fullName, setFullName] = useState('')

    async function signInWithEmail() {
        setLoading(true)
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        })

        if (error) {
            Alert.alert('Errore Login', error.message)
            setLoading(false)
        } else {
            // Login successful, auth state change will handle navigation/context updates
            setLoading(false)
            router.replace('/')
        }
    }

    async function signUpWithEmail() {
        setLoading(true)
        const {
            data: { session },
            error,
        } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    full_name: fullName,
                },
            },
        })

        if (error) {
            Alert.alert('Errore Registrazione', error.message)
            setLoading(false)
            return
        }

        if (!session) {
            Alert.alert('Controlla la tua email', 'Ti abbiamo inviato un link di conferma!')
            setIsRegistering(false) // Switch back to login or stay here
        } else {
            router.replace('/')
        }
        setLoading(false)
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                <View style={styles.header}>
                    <Text style={styles.title}>
                        {isRegistering ? 'Crea Account' : 'Bentornato'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {isRegistering
                            ? 'Inizia il tuo percorso di apprendimento'
                            : 'Accedi per continuare i tuoi corsi'}
                    </Text>
                </View>

                <View style={styles.form}>
                    {isRegistering && (
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nome Completo</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Mario Rossi"
                                placeholderTextColor={colors.mutedText}
                                value={fullName}
                                onChangeText={setFullName}
                                autoCapitalize="words"
                            />
                        </View>
                    )}

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Email</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="tuo@email.com"
                            placeholderTextColor={colors.mutedText}
                            value={email}
                            onChangeText={setEmail}
                            autoCapitalize="none"
                            keyboardType="email-address"
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>Password</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="••••••••"
                            placeholderTextColor={colors.mutedText}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        disabled={loading}
                        onPress={isRegistering ? signUpWithEmail : signInWithEmail}
                    >
                        {loading ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.buttonText}>
                                {isRegistering ? 'Registrati' : 'Accedi'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>
                            {isRegistering ? 'Hai già un account?' : 'Non hai un account?'}
                        </Text>
                        <TouchableOpacity onPress={() => setIsRegistering(!isRegistering)}>
                            <Text style={styles.link}>
                                {isRegistering ? 'Accedi' : 'Registrati'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        padding: layout.screenPadding,
        justifyContent: 'center',
    },
    backButton: {
        marginBottom: spacing.lg,
        alignSelf: 'flex-start',
    },
    header: {
        marginBottom: spacing.xl,
    },
    title: {
        fontSize: 32,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
    },
    form: {
        width: '100%',
    },
    inputGroup: {
        marginBottom: spacing.md,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    input: {
        backgroundColor: colors.card,
        borderRadius: radius.md,
        paddingVertical: 12, // slightly taller
        paddingHorizontal: spacing.md,
        fontSize: 16,
        color: colors.textPrimary,
        borderWidth: 1,
        borderColor: colors.border,
    },
    button: {
        backgroundColor: colors.primaryButton,
        paddingVertical: 16,
        borderRadius: radius.md,
        alignItems: 'center',
        marginTop: spacing.md,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: spacing.xl,
        gap: spacing.xs,
    },
    footerText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    link: {
        color: colors.textPrimary, // Or an accent color if defined
        fontWeight: 'bold',
        fontSize: 14,
    },
});


