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
import { palette, spacing, typography } from '../lib/theme'

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
            setIsRegistering(false)
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
                showsVerticalScrollIndicator={false}
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
                                placeholderTextColor={palette.gray}
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
                            placeholderTextColor={palette.gray}
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
                            placeholderTextColor={palette.gray}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.button, loading && styles.buttonDisabled]}
                        disabled={loading}
                        activeOpacity={0.8}
                        onPress={isRegistering ? signUpWithEmail : signInWithEmail}
                    >
                        {loading ? (
                            <ActivityIndicator color={palette.white} />
                        ) : (
                            <Text style={styles.buttonText}>
                                {isRegistering ? 'REGISTRATI' : 'ACCEDI'}
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
        backgroundColor: palette.white,
    },
    scrollContent: {
        flexGrow: 1,
        padding: spacing.lg,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 40,
    },
    title: {
        ...typography.title,
        fontSize: 40,
        marginBottom: 8,
    },
    subtitle: {
        ...typography.body,
        color: palette.gray,
        fontSize: 18,
    },
    form: {
        width: '100%',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        ...typography.label,
        fontSize: 12,
        letterSpacing: 2,
        marginBottom: 8,
    },
    input: {
        backgroundColor: palette.lightGray,
        borderRadius: 24,
        paddingVertical: 16,
        paddingHorizontal: 24,
        fontSize: 16,
        color: palette.black,
        borderWidth: 2,
        borderColor: palette.border,
        fontWeight: '600',
    },
    button: {
        backgroundColor: palette.black,
        paddingVertical: 18,
        borderRadius: 30,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonDisabled: {
        opacity: 0.6,
    },
    buttonText: {
        color: palette.white,
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 30,
        gap: 8,
    },
    footerText: {
        ...typography.body,
        color: palette.gray,
        fontSize: 15,
    },
    link: {
        ...typography.body,
        color: palette.black,
        fontWeight: '800',
        fontSize: 15,
    },
});



