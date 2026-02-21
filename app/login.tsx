import { Stack, useRouter } from 'expo-router'
import React, { useEffect, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Animated,
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

    // Fade-in animation on mount
    const fadeAnim = useRef(new Animated.Value(0)).current
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 450,
            useNativeDriver: true,
        }).start()
    }, [])

    // Re-animation when switching modes
    const formFade = useRef(new Animated.Value(1)).current
    const toggleMode = () => {
        Animated.sequence([
            Animated.timing(formFade, { toValue: 0, duration: 150, useNativeDriver: true }),
            Animated.timing(formFade, { toValue: 1, duration: 250, useNativeDriver: true }),
        ]).start()
        setIsRegistering(!isRegistering)
    }

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
            <Animated.View style={[{ flex: 1 }, { opacity: fadeAnim }]}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <Text style={styles.eyebrow}>OBBY</Text>
                        <Text style={styles.title}>
                            {isRegistering ? 'Crea Account' : 'Bentornato'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {isRegistering
                                ? 'Inizia il tuo percorso di apprendimento'
                                : 'Accedi per continuare i tuoi corsi'}
                        </Text>
                    </View>

                    <Animated.View style={[styles.form, { opacity: formFade }]}>
                        {isRegistering && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>NOME COMPLETO</Text>
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
                            <Text style={styles.label}>EMAIL</Text>
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
                            <Text style={styles.label}>PASSWORD</Text>
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
                            <TouchableOpacity onPress={toggleMode}>
                                <Text style={styles.link}>
                                    {isRegistering ? 'Accedi' : 'Registrati'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </ScrollView>
            </Animated.View>
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
    eyebrow: {
        ...typography.label,
        fontSize: 11,
        letterSpacing: 4,
        color: palette.gray,
        marginBottom: 8,
    },
    title: {
        ...typography.title,
        fontSize: 42,
        marginBottom: 8,
        lineHeight: 48,
    },
    subtitle: {
        ...typography.body,
        color: palette.gray,
        fontSize: 17,
        lineHeight: 24,
    },
    form: {
        width: '100%',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        ...typography.label,
        fontSize: 11,
        letterSpacing: 2,
        marginBottom: 10,
        color: '#64748B',
    },
    input: {
        backgroundColor: '#F8FAFC',
        borderRadius: 20,
        paddingVertical: 18,
        paddingHorizontal: 22,
        fontSize: 16,
        color: palette.black,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        fontWeight: '600',
    },
    button: {
        backgroundColor: palette.black,
        paddingVertical: 20,
        borderRadius: 20,
        alignItems: 'center',
        marginTop: 20,
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 6,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: palette.white,
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 2,
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
        fontWeight: '900',
        fontSize: 15,
    },
});



