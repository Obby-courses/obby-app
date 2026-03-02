import { Ionicons } from '@expo/vector-icons'
import React, { useCallback, useRef, useState } from 'react'
import {
    Animated,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { palette, spacing, typography } from '../lib/theme'

/* ==================== TYPES ==================== */

export type ToolQuestion = {
    tool_name: string
    tool_type: 'software' | 'hardware' | 'physical' | 'account'
    question: string
    why_needed: string
    affects_phases_from: number
    free_alternative: string | null
}

export type ToolAssessmentResult = {
    availableTools: string[]
    missingTools: string[]
    toolStrategy: 'adapt' | 'include_setup' | 'none'
    perToolStrategy: Record<string, 'adapt' | 'include_setup'>
}

type ToolAssessmentProps = {
    toolQuestions: ToolQuestion[]
    onComplete: (result: ToolAssessmentResult) => void
}

type ToolAnswer = 'yes' | 'no' | null
type ToolMissingStrategy = 'adapt' | 'include_setup' | null

const TOOL_TYPE_ICONS: Record<string, string> = {
    software: 'laptop-outline',
    hardware: 'hardware-chip-outline',
    physical: 'cube-outline',
    account: 'card-outline',
}

/* ==================== COMPONENT ==================== */

export default function ToolAssessment({ toolQuestions, onComplete }: ToolAssessmentProps) {
    const insets = useSafeAreaInsets()
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<string, ToolAnswer>>({})
    const [strategies, setStrategies] = useState<Record<string, ToolMissingStrategy>>({})
    const [showStrategyPicker, setShowStrategyPicker] = useState(false)

    const fadeAnim = useRef(new Animated.Value(1)).current
    const slideAnim = useRef(new Animated.Value(0)).current

    const currentTool = toolQuestions[currentIndex]
    const progress = (currentIndex + 1) / toolQuestions.length

    const animateTransition = useCallback((callback: () => void) => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: -30, duration: 180, useNativeDriver: true }),
        ]).start(() => {
            callback()
            slideAnim.setValue(30)
            Animated.parallel([
                Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
                Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
            ]).start()
        })
    }, [fadeAnim, slideAnim])

    const finalize = useCallback((
        finalAnswers: Record<string, ToolAnswer>,
        finalStrategies: Record<string, ToolMissingStrategy>
    ) => {
        const availableTools: string[] = []
        const missingTools: string[] = []
        const perToolStrategy: Record<string, 'adapt' | 'include_setup'> = {}

        for (const tool of toolQuestions) {
            if (finalAnswers[tool.tool_name] === 'yes') {
                availableTools.push(tool.tool_name)
            } else {
                missingTools.push(tool.tool_name)
                const strat = finalStrategies[tool.tool_name] || 'adapt'
                perToolStrategy[tool.tool_name] = strat
            }
        }

        // Pick dominant strategy (if mixed, default to 'adapt' as safer)
        const stratValues = Object.values(perToolStrategy)
        const toolStrategy = missingTools.length === 0
            ? 'none'
            : stratValues.every(s => s === 'include_setup') ? 'include_setup' : 'adapt'

        onComplete({ availableTools, missingTools, toolStrategy: toolStrategy as any, perToolStrategy })
    }, [toolQuestions, onComplete])

    const handleAnswer = useCallback((hasIt: boolean) => {
        const newAnswers = { ...answers, [currentTool.tool_name]: hasIt ? 'yes' : 'no' as ToolAnswer }
        setAnswers(newAnswers)

        if (!hasIt) {
            // Show strategy picker before moving on
            setShowStrategyPicker(true)
        } else {
            goToNext(newAnswers, strategies)
        }
    }, [currentTool, answers, strategies])

    const handleStrategyPick = useCallback((strategy: 'adapt' | 'include_setup') => {
        const newStrategies = { ...strategies, [currentTool.tool_name]: strategy }
        setStrategies(newStrategies)
        setShowStrategyPicker(false)
        goToNext(answers, newStrategies)
    }, [currentTool, answers, strategies])

    const goToNext = useCallback((
        currentAnswers: Record<string, ToolAnswer>,
        currentStrategies: Record<string, ToolMissingStrategy>
    ) => {
        if (currentIndex < toolQuestions.length - 1) {
            animateTransition(() => setCurrentIndex(i => i + 1))
        } else {
            finalize(currentAnswers, currentStrategies)
        }
    }, [currentIndex, toolQuestions.length, animateTransition, finalize])

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Progress Bar */}
            <View style={styles.progressWrapper}>
                <View style={styles.progressBarBase}>
                    <Animated.View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
                </View>
                <Text style={styles.progressLabel}>
                    Strumento {currentIndex + 1} di {toolQuestions.length}
                </Text>
            </View>

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>🔧 Attrezzatura</Text>
                <Text style={styles.headerSub}>
                    Verifichiamo gli strumenti necessari per questo corso
                </Text>
            </View>

            {/* Question Card */}
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View
                    style={[
                        styles.questionCard,
                        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }
                    ]}
                >
                    {/* Tool Type Icon */}
                    <View style={styles.toolTypeRow}>
                        <View style={styles.toolTypePill}>
                            <Ionicons
                                name={TOOL_TYPE_ICONS[currentTool.tool_type] as any}
                                size={14}
                                color="#6366F1"
                            />
                            <Text style={styles.toolTypeText}>
                                {currentTool.tool_type === 'software' ? 'Software' :
                                    currentTool.tool_type === 'hardware' ? 'Hardware' :
                                        currentTool.tool_type === 'physical' ? 'Materiale' : 'Account'}
                            </Text>
                        </View>
                        <Text style={styles.toolName}>{currentTool.tool_name}</Text>
                    </View>

                    {/* Question */}
                    <Text style={styles.questionText}>{currentTool.question}</Text>

                    {/* Why needed */}
                    <View style={styles.whyBox}>
                        <Ionicons name="information-circle-outline" size={16} color="#94A3B8" />
                        <Text style={styles.whyText}>{currentTool.why_needed}</Text>
                    </View>
                </Animated.View>

                {/* Strategy Picker — appears when user says NO */}
                {showStrategyPicker && (
                    <Animated.View style={[styles.strategyCard, { opacity: fadeAnim }]}>
                        <Text style={styles.strategyTitle}>
                            Come vuoi procedere senza <Text style={{ fontWeight: '900' }}>{currentTool.tool_name}</Text>?
                        </Text>
                        {currentTool.free_alternative && (
                            <View style={styles.alternativeBadge}>
                                <Ionicons name="sparkles-outline" size={14} color="#16A34A" />
                                <Text style={styles.alternativeText}>
                                    Alternativa gratuita: <Text style={{ fontWeight: '700' }}>{currentTool.free_alternative}</Text>
                                </Text>
                            </View>
                        )}
                        <Pressable
                            style={[styles.strategyBtn, styles.strategyBtnAdapt]}
                            onPress={() => handleStrategyPick('adapt')}
                        >
                            <Ionicons name="shuffle-outline" size={22} color="#1D4ED8" />
                            <View style={styles.strategyBtnText}>
                                <Text style={[styles.strategyBtnTitle, { color: '#1D4ED8' }]}>
                                    Adatta il corso
                                </Text>
                                <Text style={styles.strategyBtnSub}>
                                    Usa strumenti alternativi gratuiti, evita {currentTool.tool_name}
                                </Text>
                            </View>
                        </Pressable>
                        <Pressable
                            style={[styles.strategyBtn, styles.strategyBtnSetup]}
                            onPress={() => handleStrategyPick('include_setup')}
                        >
                            <Ionicons name="download-outline" size={22} color="#7C3AED" />
                            <View style={styles.strategyBtnText}>
                                <Text style={[styles.strategyBtnTitle, { color: '#7C3AED' }]}>
                                    Mostrami come ottenerlo
                                </Text>
                                <Text style={styles.strategyBtnSub}>
                                    Aggiungi step per installare o procurare {currentTool.tool_name}
                                </Text>
                            </View>
                        </Pressable>
                    </Animated.View>
                )}
            </ScrollView>

            {/* Answer Buttons — shown only before strategy pick */}
            {!showStrategyPicker && (
                <View style={[styles.buttonsContainer, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
                    <Pressable style={[styles.button, styles.buttonNo]} onPress={() => handleAnswer(false)}>
                        <Text style={styles.buttonNoText}>No, non ce l'ho</Text>
                    </Pressable>
                    <Pressable style={[styles.button, styles.buttonYes]} onPress={() => handleAnswer(true)}>
                        <Text style={styles.buttonYesText}>✓ Sì, ce l'ho!</Text>
                    </Pressable>
                </View>
            )}
        </View>
    )
}

/* ==================== STYLES ==================== */

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: palette.white,
    },
    progressWrapper: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    progressBarBase: {
        flex: 1,
        height: 8,
        backgroundColor: '#F1F5F9',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#6366F1',
        borderRadius: 4,
    },
    progressLabel: {
        ...typography.body,
        fontSize: 12,
        fontWeight: '800',
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        paddingBottom: spacing.md,
    },
    headerTitle: {
        ...typography.title,
        fontSize: 26,
        marginBottom: 6,
    },
    headerSub: {
        ...typography.body,
        color: palette.gray,
        fontSize: 15,
    },
    scrollContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xl,
        gap: 16,
    },
    questionCard: {
        backgroundColor: '#F8F7FF',
        borderRadius: 28,
        padding: 28,
        borderWidth: 2,
        borderColor: '#E0DFFE',
        gap: 16,
        marginTop: spacing.sm,
    },
    toolTypeRow: {
        gap: 10,
    },
    toolTypePill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#EEF2FF',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    toolTypeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#6366F1',
    },
    toolName: {
        ...typography.title,
        fontSize: 20,
        color: palette.black,
    },
    questionText: {
        ...typography.title,
        fontSize: 22,
        lineHeight: 32,
        letterSpacing: -0.3,
    },
    whyBox: {
        flexDirection: 'row',
        gap: 8,
        backgroundColor: '#F1F5F9',
        borderRadius: 14,
        padding: 12,
        alignItems: 'flex-start',
    },
    whyText: {
        flex: 1,
        ...typography.body,
        fontSize: 13,
        color: '#64748B',
        lineHeight: 20,
    },
    strategyCard: {
        backgroundColor: palette.white,
        borderRadius: 24,
        padding: 20,
        borderWidth: 2,
        borderColor: '#F1F5F9',
        gap: 12,
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 12,
        elevation: 3,
    },
    strategyTitle: {
        ...typography.body,
        fontSize: 16,
        color: palette.black,
        lineHeight: 24,
    },
    alternativeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F0FDF4',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    alternativeText: {
        fontSize: 13,
        color: '#166534',
        flex: 1,
    },
    strategyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        borderRadius: 18,
        padding: 16,
        borderWidth: 2,
    },
    strategyBtnAdapt: {
        borderColor: '#BFDBFE',
        backgroundColor: '#EFF6FF',
    },
    strategyBtnSetup: {
        borderColor: '#DDD6FE',
        backgroundColor: '#F5F3FF',
    },
    strategyBtnText: {
        flex: 1,
        gap: 4,
    },
    strategyBtnTitle: {
        fontWeight: '800',
        fontSize: 15,
    },
    strategyBtnSub: {
        fontSize: 12,
        color: '#64748B',
        lineHeight: 17,
    },
    buttonsContainer: {
        paddingHorizontal: spacing.lg,
        gap: 12,
    },
    button: {
        paddingVertical: 18,
        borderRadius: 24,
        alignItems: 'center',
    },
    buttonNo: {
        backgroundColor: '#F1F5F9',
        borderWidth: 2,
        borderColor: '#E2E8F0',
    },
    buttonNoText: {
        fontWeight: '800',
        fontSize: 16,
        color: '#64748B',
    },
    buttonYes: {
        backgroundColor: '#6366F1',
        shadowColor: '#6366F1',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonYesText: {
        fontWeight: '900',
        fontSize: 16,
        color: palette.white,
    },
})
