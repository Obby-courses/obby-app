import LoadingOverlay from '@/components/LoadingOverlay'
import { colors, radius, spacing, typography } from '@/lib/theme'
import React, { useState } from 'react'
import {
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type MilestoneItemProps = {
    milestone: {
        id: string
        title: string
        description: string
        milestone_type: string
        phase_id: string
    }
    courseId: string
    nextPhaseId?: string | null
    nextPhaseTitle?: string | null
    onRefresh: () => void
}

export default function MilestoneItem({
    milestone,
    courseId,
    nextPhaseId,
    nextPhaseTitle,
    onRefresh,
}: MilestoneItemProps) {
    const insets = useSafeAreaInsets()
    const [isGenerating, setIsGenerating] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleStartNextPhase() {
        if (!nextPhaseId) {
            // Probably at the end of the course
            return
        }

        setIsGenerating(true)
        setError(null)
        const startTime = Date.now()

        try {
            const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
            const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

            // 1. Generate Steps
            const res = await fetch(`${SUPABASE_URL}/functions/v1/create-steps`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({
                    courseId,
                    phaseId: nextPhaseId,
                    phaseTitle: nextPhaseTitle,
                }),
            })

            if (!res.ok) throw new Error('Errore nella creazione degli step')

            // 2. Generate Resources
            await fetch(`${SUPABASE_URL}/functions/v1/generate-resources-for-steps`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({ phaseId: nextPhaseId }),
            })

            // Min 1.5s transition
            const elapsed = Date.now() - startTime
            if (elapsed < 1500) {
                await new Promise(resolve => setTimeout(resolve, 1500 - elapsed))
            }

            onRefresh()
        } catch (err: any) {
            console.error('❌ Generation error:', err)
            setError(err.message || 'Errore durante la generazione')
            setIsGenerating(false)
        }
    }

    return (
        <View style={{ flex: 1 }}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                    paddingBottom: insets.bottom + 40,
                }}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.card}>
                    <Text style={styles.badge}>SFIDA FINALE</Text>

                    <Text style={styles.title}>{milestone.title}</Text>

                    <View style={styles.divider} />

                    <Text style={styles.description}>{milestone.description}</Text>

                    <View style={styles.typeContainer}>
                        <Text style={styles.typeLabel}>Modalità di verifica:</Text>
                        <Text style={styles.typeValue}>
                            {milestone.milestone_type.replace('_', ' ').toUpperCase()}
                        </Text>
                    </View>

                    <View style={{ flex: 1, minHeight: 40 }} />

                    <Pressable
                        onPress={handleStartNextPhase}
                        disabled={isGenerating}
                        style={[styles.button, isGenerating && { opacity: 0.7 }]}
                    >
                        <Text style={styles.buttonText}>
                            {nextPhaseTitle ? `Inizia: ${nextPhaseTitle}` : 'Completa Corso'}
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
            <LoadingOverlay visible={isGenerating} status="GENERATING_STEPS" />
        </View>
    )
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#ffffff',
        borderRadius: radius.lg,
        padding: spacing.xl,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        minHeight: 450,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 4,
    },
    badge: {
        ...typography.small,
        color: colors.accent,
        fontWeight: '700',
        marginBottom: spacing.sm,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    title: {
        ...typography.title,
        fontSize: 24,
        marginBottom: spacing.md,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
        marginBottom: spacing.lg,
    },
    description: {
        ...typography.body,
        color: colors.textSecondary,
        lineHeight: 24,
    },
    typeContainer: {
        backgroundColor: '#f9f9f9',
        padding: spacing.md,
        borderRadius: radius.md,
        marginTop: spacing.xl,
        borderWidth: 1,
        borderColor: colors.border,
    },
    typeLabel: {
        ...typography.small,
        color: colors.mutedText,
        marginBottom: 4,
    },
    typeValue: {
        ...typography.body,
        fontWeight: '600',
    },
    button: {
        backgroundColor: colors.primaryButton,
        paddingVertical: spacing.md,
        borderRadius: radius.md,
        marginTop: spacing.xl,
    },
    buttonText: {
        color: '#ffffff',
        textAlign: 'center',
        fontWeight: '700',
        fontSize: 16,
    },
})
