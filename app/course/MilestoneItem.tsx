import LoadingOverlay from '@/components/LoadingOverlay'
import { palette, spacing, typography } from '@/lib/theme'
import React, { useState } from 'react'
import {
    Linking,
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
        resource_id?: string | null
        target_config?: {
            support_resource?: {
                type: 'video' | 'webpage'
                title: string
                url: string
                thumbnail_url?: string
                description?: string
            }
            pedagogical_summary?: string
        }
    }
    courseId: string
    nextPhaseId?: string | null
    nextPhaseTitle?: string | null
    isNextPhaseGenerated?: boolean
    onRefresh: (shouldClose?: boolean) => void
    courseColor?: string
}

export default function MilestoneItem({
    milestone,
    courseId,
    nextPhaseId,
    nextPhaseTitle,
    isNextPhaseGenerated,
    onRefresh,
    courseColor = palette.black,
}: MilestoneItemProps) {
    const insets = useSafeAreaInsets()
    const [localMilestone, setLocalMilestone] = useState(milestone)
    const [isGenerating, setIsGenerating] = useState(false)
    const [loadingStatus, setLoadingStatus] = useState<any>('GENERATING_MILESTONE')
    const [error, setError] = useState<string | null>(null)

    React.useEffect(() => {
        if ((milestone as any).isVirtual) {
            handleGenerateMilestone()
        } else {
            setLocalMilestone(milestone)
        }
    }, [milestone])

    async function handleGenerateMilestone() {
        if (!(milestone as any).isVirtual) return

        setIsGenerating(true)
        setLoadingStatus('GENERATING_MILESTONE')
        setError(null)
        try {
            const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
            const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

            const res = await fetch(`${SUPABASE_URL}/functions/v1/create-milestone`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({
                    courseId,
                    phaseId: milestone.phase_id,
                    phaseTitle: milestone.title,
                }),
            })

            const data = await res.json()
            if (!res.ok || !data.success) throw new Error(data.error || 'Errore nella generazione della milestone')

            setLocalMilestone(data.milestone)
            onRefresh(false)
        } catch (err: any) {
            console.error('❌ Milestone Generation error:', err)
            setError(err.message || 'Errore durante la generazione')
        } finally {
            setIsGenerating(false)
        }
    }

    async function handleStartNextPhase() {
        if (!nextPhaseId) return
        if (isNextPhaseGenerated) {
            onRefresh(true);
            return;
        }

        setIsGenerating(true)
        setLoadingStatus('GENERATING_STEPS')
        setError(null)
        const startTime = Date.now()

        try {
            const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
            const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

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

            await fetch(`${SUPABASE_URL}/functions/v1/generate-resources-for-steps`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({ phaseId: nextPhaseId }),
            })

            const elapsed = Date.now() - startTime
            if (elapsed < 1500) await new Promise(resolve => setTimeout(resolve, 1500 - elapsed))

            onRefresh(true)
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
                    paddingHorizontal: spacing.lg,
                }}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.card}>
                    {error && (
                        <View style={styles.errorBox}>
                            <Text style={{ color: '#FF4444', fontWeight: '800' }}>⚠️ {error}</Text>
                        </View>
                    )}

                    <Text style={styles.badge}>TRAGUARDO</Text>
                    <Text style={styles.title}>{localMilestone.title}</Text>

                    <View style={styles.divider} />

                    <Text style={styles.description}>{localMilestone.description}</Text>

                    <View style={[styles.typeContainer, { backgroundColor: palette.lightGray }]}>
                        <Text style={styles.typeLabel}>Modalità di verifica:</Text>
                        <Text style={styles.typeValue}>
                            {localMilestone.milestone_type?.replace('_', ' ').toUpperCase() || 'VALUTAZIONE'}
                        </Text>
                    </View>

                    {localMilestone.target_config?.pedagogical_summary && (
                        <View style={styles.supportSection}>
                            <Text style={styles.supportLabel}>PER COMINCIARE:</Text>
                            <Text style={styles.supportSummary}>
                                {localMilestone.target_config.pedagogical_summary}
                            </Text>

                            {localMilestone.target_config.support_resource && (
                                <Pressable
                                    onPress={() => {
                                        const url = localMilestone.target_config?.support_resource?.url;
                                        if (url) {
                                            Linking.openURL(url).catch(err => console.error("Couldn't load page", err));
                                        }
                                    }}
                                    style={styles.resourceCard}
                                >
                                    <View style={styles.resourceTypeIcon}>
                                        <Text style={{ fontSize: 20 }}>
                                            {localMilestone.target_config.support_resource.type === 'video' ? '📺' : '🔗'}
                                        </Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.resourceTitle} numberOfLines={2}>
                                            {localMilestone.target_config.support_resource.title}
                                        </Text>
                                        <Text style={styles.resourceSource}>
                                            {localMilestone.target_config.support_resource.type === 'video' ? 'YouTube Video' : 'Articolo Web'}
                                        </Text>
                                    </View>
                                </Pressable>
                            )}
                        </View>
                    )}

                    <View style={{ flex: 1, minHeight: 60 }} />

                    <Pressable
                        onPress={handleStartNextPhase}
                        disabled={isGenerating}
                        style={[styles.button, { backgroundColor: courseColor === palette.black ? palette.black : courseColor }, isGenerating && { opacity: 0.6 }]}
                    >
                        <Text style={styles.buttonText}>
                            {nextPhaseTitle ? `PROSSIMA FASE: ${nextPhaseTitle.toUpperCase()}` : 'COMPLETA PERCORSO'}
                        </Text>
                    </Pressable>
                </View>
            </ScrollView>
            <LoadingOverlay visible={isGenerating} status={loadingStatus} />
        </View>
    )
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: palette.white,
        borderRadius: 40,
        padding: 32,
        borderWidth: 2,
        borderColor: palette.border,
        minHeight: 480,
        marginTop: 20,
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
    },
    errorBox: {
        backgroundColor: '#FFEBEB',
        padding: 16,
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#FF4444',
    },
    badge: {
        ...typography.label,
        fontSize: 12,
        letterSpacing: 2,
        marginBottom: 8,
    },
    title: {
        ...typography.title,
        fontSize: 32,
        marginBottom: spacing.md,
    },
    divider: {
        height: 2,
        backgroundColor: palette.border,
        marginBottom: spacing.xl,
    },
    description: {
        ...typography.body,
        color: '#444',
        fontSize: 16,
        lineHeight: 26,
    },
    typeContainer: {
        padding: 20,
        borderRadius: 24,
        marginTop: 40,
        borderWidth: 1,
        borderColor: palette.border,
    },
    typeLabel: {
        ...typography.label,
        fontSize: 11,
        marginBottom: 4,
    },
    typeValue: {
        ...typography.body,
        fontWeight: '800',
        fontSize: 14,
    },
    button: {
        paddingVertical: 18,
        borderRadius: 30,
        marginTop: 20,
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    buttonText: {
        color: palette.black,
        textAlign: 'center',
        fontWeight: '900',
        fontSize: 14,
        letterSpacing: 1,
    },
    supportSection: {
        marginTop: 32,
        paddingTop: 32,
        borderTopWidth: 1,
        borderTopColor: palette.border,
    },
    supportLabel: {
        ...typography.label,
        fontSize: 10,
        color: palette.gray,
        marginBottom: 12,
        letterSpacing: 1.5,
    },
    supportSummary: {
        ...typography.body,
        fontSize: 15,
        color: '#555',
        fontStyle: 'italic',
        lineHeight: 22,
        marginBottom: 20,
    },
    resourceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: palette.border,
        gap: 16,
    },
    resourceTypeIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: '#fff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: palette.border,
    },
    resourceTitle: {
        ...typography.body,
        fontSize: 14,
        fontWeight: '700',
        color: palette.black,
    },
    resourceSource: {
        ...typography.label,
        fontSize: 10,
        marginTop: 2,
    },
})
