import { palette, spacing, typography } from '@/lib/theme'
import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
    Animated,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/* ==================== TYPES ==================== */

export type AssessmentQuestion = {
    id: string
    macro_phase_id: string | null
    macro_phase_title: string
    order_index: number
    question: string
    keywords_tested: string[]
}

type SkillAssessmentProps = {
    questions: AssessmentQuestion[] // All 6 questions, ordered by order_index
    onComplete: (startingMacroPhaseIndex: number) => void
    courseColor?: string
}

/* ==================== BINARY SEARCH LOGIC ==================== */

/**
 * Binary search over 6 macro-phases (indices 0-5).
 * Each step narrows the search range by half.
 * 
 * answeredYes(midIndex) → user knows phases 0..midIndex → search upper half
 * answeredNo(midIndex) → user needs this phase → search lower half
 * 
 * When the range has size 1, that's the starting phase.
 */
function getNextQuestionIndex(low: number, high: number): number {
    return Math.floor((low + high) / 2)
}

/* ==================== COMPONENT ==================== */

export default function SkillAssessment({
    questions,
    onComplete,
    courseColor = palette.black,
}: SkillAssessmentProps) {
    const insets = useSafeAreaInsets()

    // Binary search bounds: [low, high] represent the range of possible starting phases
    // low = earliest possible start, high = latest possible start
    const [low, setLow] = useState(0)
    const [high, setHigh] = useState(questions.length - 1)
    const [stepCount, setStepCount] = useState(0)
    const [isFinished, setIsFinished] = useState(false)

    // Animation
    const fadeAnim = useRef(new Animated.Value(1)).current
    const slideAnim = useRef(new Animated.Value(0)).current

    const currentQuestionIndex = useMemo(
        () => getNextQuestionIndex(low, high),
        [low, high]
    )

    const currentQuestion = questions[currentQuestionIndex]
    const maxSteps = Math.ceil(Math.log2(questions.length)) // ~3 for 6 questions

    const quizProgressAnim = useRef(new Animated.Value(0)).current

    const animateTransition = useCallback((callback: () => void, newStep: number) => {
        // Animate the progress bar first
        Animated.timing(quizProgressAnim, {
            toValue: newStep / maxSteps,
            duration: 400,
            useNativeDriver: false, // width doesn't support native driver
        }).start()

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: -30,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            callback()
            slideAnim.setValue(30)
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start()
        })
    }, [fadeAnim, slideAnim, quizProgressAnim, maxSteps])

    const handleAnswer = useCallback((knowsIt: boolean) => {
        const newStep = stepCount + 1

        if (knowsIt) {
            // User knows phases 0..currentQuestionIndex → start AFTER this
            const newLow = currentQuestionIndex + 1

            if (newLow > high || newStep >= maxSteps) {
                // Converged: start from newLow (or clamp to last phase)
                const startIdx = Math.min(newLow, questions.length - 1)

                // Final progress fill
                Animated.timing(quizProgressAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: false
                }).start()

                setIsFinished(true)
                setTimeout(() => onComplete(startIdx), 600)
                return
            }

            animateTransition(() => {
                setLow(newLow)
                setStepCount(newStep)
            }, newStep)
        } else {
            // User doesn't know this phase → start HERE or earlier
            const newHigh = currentQuestionIndex

            if (newHigh <= low || newStep >= maxSteps) {
                // Converged: start from low (the earliest uncertain phase)

                // Final progress fill
                Animated.timing(quizProgressAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: false
                }).start()

                setIsFinished(true)
                setTimeout(() => onComplete(Math.max(0, low)), 600)
                return
            }

            animateTransition(() => {
                setHigh(newHigh)
                setStepCount(newStep)
            }, newStep)
        }
    }, [currentQuestionIndex, low, high, stepCount, maxSteps, questions.length, onComplete, animateTransition, quizProgressAnim])

    // Progress dots — show which phases are known/unknown/undecided
    const progressDots = useMemo(() => {
        return questions.map((_, idx) => {
            if (idx === currentQuestionIndex) return 'active'
            if (idx < low) return 'known'
            if (idx > high) return 'unknown'
            return 'undecided'
        })
    }, [questions, low, high, currentQuestionIndex])

    if (isFinished) {
        return (
            <View style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.centerContent}>
                    <Text style={styles.finishedEmoji}>🎯</Text>
                    <Text style={styles.finishedTitle}>Livello identificato!</Text>
                    <Text style={styles.finishedSubtitle}>
                        Stiamo preparando il tuo percorso personalizzato...
                    </Text>
                </View>
            </View>
        )
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            {/* Top Quiz Progress (1/3, 2/3...) */}
            <View style={styles.quizProgressWrapper}>
                <View style={styles.quizProgressBarBase}>
                    <Animated.View
                        style={[
                            styles.quizProgressBarFill,
                            {
                                backgroundColor: courseColor,
                                width: quizProgressAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0%', '100%']
                                })
                            }
                        ]}
                    />
                </View>
                <Text style={styles.headerStep}>
                    Domanda {stepCount + 1} di {maxSteps}
                </Text>
            </View>

            {/* Knowledge Map Dots */}
            <View style={styles.progressContainer}>
                {progressDots.map((status, idx) => (
                    <View
                        key={idx}
                        style={[
                            styles.progressDot,
                            status === 'known' && styles.progressDotKnown,
                            status === 'active' && [styles.progressDotActive, { backgroundColor: courseColor }],
                            status === 'unknown' && styles.progressDotUnknown,
                        ]}
                    />
                ))}
            </View>
            <Text style={styles.knowledgeMapLabel}>MAPPA COMPETENZE</Text>

            {/* Question Card */}
            <View style={styles.questionSection}>
                <Animated.View
                    style={[
                        styles.questionCard,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        }
                    ]}
                >
                    <Text style={styles.macroPhaseLabel}>
                        {currentQuestion?.macro_phase_title || ''}
                    </Text>

                    <Text style={styles.questionText}>
                        {currentQuestion?.question || ''}
                    </Text>

                    {currentQuestion?.keywords_tested?.length > 0 && (
                        <View style={styles.keywordsRow}>
                            {currentQuestion.keywords_tested.map((kw, i) => (
                                <View key={i} style={styles.keywordBadge}>
                                    <Text style={styles.keywordText}>{kw}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </Animated.View>
            </View>

            {/* Answer Buttons */}
            <View style={[styles.buttonsContainer, { paddingBottom: Math.max(insets.bottom, spacing.xl) }]}>
                <Pressable
                    onPress={() => handleAnswer(false)}
                    style={[styles.button, styles.buttonNo]}
                >
                    <Text style={styles.buttonNoText}>No, devo impararlo</Text>
                </Pressable>

                <Pressable
                    onPress={() => handleAnswer(true)}
                    style={[styles.button, styles.buttonYes, { backgroundColor: courseColor }]}
                >
                    <Text style={[
                        styles.buttonYesText,
                        { color: courseColor === palette.black ? palette.white : palette.black }
                    ]}>
                        Sì, lo so già!
                    </Text>
                </Pressable>
            </View>
        </View>
    )
}

/* ==================== STYLES ==================== */

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: palette.white,
    },
    header: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        alignItems: 'center',
    },
    headerLabel: {
        ...typography.label,
        fontSize: 11,
        letterSpacing: 2,
        marginBottom: 4,
    },
    headerStep: {
        ...typography.body,
        fontWeight: '800',
        fontSize: 12,
        color: palette.gray600,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    quizProgressWrapper: {
        paddingHorizontal: spacing.lg,
        paddingTop: spacing.lg,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    quizProgressBarBase: {
        flex: 1,
        height: 8,
        backgroundColor: palette.gray100,
        borderRadius: 4,
        overflow: 'hidden',
    },
    quizProgressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    knowledgeMapLabel: {
        ...typography.label,
        fontSize: 9,
        textAlign: 'center',
        marginTop: 6,
        color: palette.gray400,
        letterSpacing: 1,
    },
    progressContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
        marginTop: spacing.lg,
        paddingHorizontal: spacing.xl,
    },
    progressDot: {
        flex: 1,
        height: 6,
        borderRadius: 3,
        backgroundColor: palette.gray200,
    },
    progressDotKnown: {
        backgroundColor: palette.success,
    },
    progressDotActive: {
        backgroundColor: palette.black,
        height: 8,
        borderRadius: 4,
    },
    progressDotUnknown: {
        backgroundColor: palette.gray200,
    },
    questionSection: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: spacing.lg,
    },
    questionCard: {
        backgroundColor: palette.gray50,
        borderRadius: 32,
        padding: 32,
        borderWidth: 2,
        borderColor: palette.border,
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 4,
    },
    macroPhaseLabel: {
        ...typography.label,
        fontSize: 10,
        letterSpacing: 1.5,
        color: palette.gray,
        marginBottom: 16,
    },
    questionText: {
        ...typography.title,
        fontSize: 24,
        lineHeight: 34,
        letterSpacing: -0.5,
    },
    keywordsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 24,
    },
    keywordBadge: {
        backgroundColor: palette.gray200,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    keywordText: {
        ...typography.label,
        fontSize: 11,
        textTransform: 'none',
        color: palette.gray600,
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
        backgroundColor: palette.gray100,
        borderWidth: 2,
        borderColor: palette.border,
    },
    buttonNoText: {
        fontWeight: '800',
        fontSize: 16,
        color: palette.gray600,
    },
    buttonYes: {
        backgroundColor: palette.black,
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonYesText: {
        fontWeight: '900',
        fontSize: 16,
        color: palette.white,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: spacing.xl,
    },
    finishedEmoji: {
        fontSize: 64,
        marginBottom: 20,
    },
    finishedTitle: {
        ...typography.title,
        fontSize: 28,
        textAlign: 'center',
        marginBottom: 12,
    },
    finishedSubtitle: {
        ...typography.body,
        color: palette.gray,
        textAlign: 'center',
        fontSize: 16,
    },
})
