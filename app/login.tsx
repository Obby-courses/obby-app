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

    // Language preferences (registration only)
    // 'it' is ALWAYS the primary language (fixed system default)
    // 'en' is ALWAYS in secondary languages as mandatory fallback
    const PRIMARY_LANGUAGE = 'it'
    const MANDATORY_FALLBACK = 'en'
    const ADDITIONAL_LANGUAGES = [
        { code: 'es', label: 'Español', flag: '🇪🇸' },
        { code: 'fr', label: 'Français', flag: '🇫🇷' },
        { code: 'de', label: 'Deutsch', flag: '🇩🇪' },
        { code: 'pt', label: 'Português', flag: '🇵🇹' },
    ]
    // secondaryLanguages always includes 'en' as mandatory fallback
    const [additionalLanguages, setAdditionalLanguages] = useState<string[]>([])
    const secondaryLanguages = [MANDATORY_FALLBACK, ...additionalLanguages]

    const toggleAdditional = (code: string) => {
        setAdditionalLanguages(prev =>
            prev.includes(code) ? prev.filter(l => l !== code) : [...prev, code]
        )
    }

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
                    primary_language: PRIMARY_LANGUAGE,
                    secondary_languages: secondaryLanguages,
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

                        {isRegistering && (
                            <View style={styles.inputGroup}>
                                <Text style={styles.label}>LINGUE RISORSE AGGIUNTIVE</Text>
                                <Text style={[styles.label, { letterSpacing: 0, fontSize: 12, textTransform: 'none', marginBottom: 8 }]}>
                                    Italiano (principale) e Inglese (fallback) sono sempre inclusi
                                </Text>
                                {/* Fixed language chips: IT primary + EN fallback */}
                                <View style={styles.langGrid}>
                                    <View style={[styles.langChip, styles.langChipPinned]}>
                                        <Text style={styles.langChipTextActive}>🇮🇹 Italiano</Text>
                                    </View>
                                    <View style={[styles.langChip, styles.langChipSecondary]}>
                                        <Text style={styles.langChipTextActive}>🇬🇧 English</Text>
                                    </View>
                                </View>
                                {/* Optional additional languages */}
                                {ADDITIONAL_LANGUAGES.length > 0 && (
                                    <Text style={[styles.label, { letterSpacing: 0, fontSize: 12, textTransform: 'none', marginTop: 8, marginBottom: 6 }]}>
                                        Aggiungi altre lingue (opzionale):
                                    </Text>
                                )}
                                <View style={styles.langGrid}>
                                    {ADDITIONAL_LANGUAGES.map(lang => {
                                        const isSelected = additionalLanguages.includes(lang.code)
                                        return (
                                            <TouchableOpacity
                                                key={lang.code}
                                                onPress={() => toggleAdditional(lang.code)}
                                                style={[styles.langChip, isSelected && styles.langChipSecondary]}
                                            >
                                                <Text style={[styles.langChipText, isSelected && styles.langChipTextActive]}>
                                                    {lang.flag} {lang.label}
                                                </Text>
                                            </TouchableOpacity>
                                        )
                                    })}
                                </View>
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
    langChipActive: {
        backgroundColor: palette.black,
        borderColor: palette.black,
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
});



