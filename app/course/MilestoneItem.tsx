import LoadingOverlay from '@/components/LoadingOverlay'
import ResourcePreview from '@/components/ResourcePreview'
import { componentStyles, icons, palette, spacing, typography } from '@/lib/theme'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useState } from 'react'
import {
    Image,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View
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
            exercise_text?: string
        }
    }
    courseId: string
    nextPhaseId?: string | null
    nextPhaseTitle?: string | null
    isNextPhaseGenerated?: boolean
    onRefresh: (shouldClose?: boolean) => void
    onClose?: () => void
    courseColor?: string
}

export default function MilestoneItem({
    milestone,
    courseId,
    nextPhaseId,
    nextPhaseTitle,
    isNextPhaseGenerated,
    onRefresh,
    onClose,
    courseColor = palette.black,
}: MilestoneItemProps) {
    const insets = useSafeAreaInsets()
    const [localMilestone, setLocalMilestone] = useState(milestone)
    const [isGenerating, setIsGenerating] = useState(false)
    const [loadingStatus, setLoadingStatus] = useState<any>('GENERATING_MILESTONE')
    const [error, setError] = useState<string | null>(null)
    const [previewData, setPreviewData] = useState<{ visible: boolean, type: string, url: string, resourceId?: string }>({
        visible: false,
        type: 'video',
        url: '',
        resourceId: undefined
    })
    const [smartScale, setSmartScale] = useState(1.05)

    React.useEffect(() => {
        if ((milestone as any).isVirtual) {
            handleGenerateMilestone()
        } else {
            setLocalMilestone(milestone)
        }
    }, [milestone])

    React.useEffect(() => {
        const thumbUrl = localMilestone.target_config?.support_resource?.thumbnail_url
        if (thumbUrl) {
            Image.getSize(thumbUrl, (w, h) => {
                const ratio = w / h
                // YouTube SD thumbs (hqdefault.jpg) are 4:3 (1.33) but often have 16:9 content
                // which leaves large black bars top/bottom. A 1.35x zoom usually removes them.
                if (ratio < 1.4) {
                    setSmartScale(1.35)
                } else {
                    setSmartScale(1.05)
                }
            }, () => {
                setSmartScale(1.05)
            })
        } else {
            setSmartScale(1.05)
        }
    }, [localMilestone.target_config?.support_resource?.thumbnail_url])

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
        <View style={styles.container}>
            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{
                    paddingBottom: insets.bottom + 140, // Space for the hovering footer
                }}
                showsVerticalScrollIndicator={false}
            >
                {/* HEADER SECTION (Like Hero but simpler) */}
                <View style={[styles.headerSection, { backgroundColor: courseColor + '10' }]}>
                    {/* Top Controls - STATIC */}
                    <View style={[styles.topControls, { paddingTop: insets.top + spacing.md }]}>
                        {onClose && (
                            <Pressable
                                onPress={onClose}
                                style={componentStyles.closeButton}
                            >
                                <Ionicons name={icons.close} size={24} color={palette.black} />
                            </Pressable>
                        )}
                    </View>

                    <View style={styles.headerContent}>
                        <Text style={styles.badge}>TRAGUARDO</Text>
                        <Text style={styles.mainTitle}>
                            {localMilestone.title}
                        </Text>
                    </View>

                    <LinearGradient
                        colors={['transparent', 'rgba(255,255,255,0.8)', palette.white]}
                        style={styles.heroGradient}
                    />
                </View>

                {/* CONTENT SECTION */}
                <View style={styles.content}>
                    {error && (
                        <View style={styles.errorBox}>
                            <Text style={{ color: '#FF4444', fontWeight: '800' }}>
                                <Ionicons name={icons.warning} size={16} color="#FF4444" /> {error}
                            </Text>
                        </View>
                    )}

                    <Text style={styles.description}>{localMilestone.description}</Text>

                    <View style={[styles.typeContainer, { backgroundColor: '#F8FAFC' }]}>
                        <Text style={styles.typeLabel}>MODALITÀ DI VERIFICA:</Text>
                        <Text style={styles.typeValue}>
                            {localMilestone.milestone_type?.replace('_', ' ').toUpperCase() || 'VALUTAZIONE'}
                        </Text>
                    </View>

                    {localMilestone.target_config?.exercise_text && (
                        <View style={[styles.exerciseCard, { borderColor: courseColor + '40' }]}>
                            <Text style={[styles.exerciseLabel, { color: courseColor }]}>COSA FARE:</Text>
                            <Text style={styles.exerciseText}>
                                {localMilestone.target_config.exercise_text}
                            </Text>
                        </View>
                    )}

                    {localMilestone.target_config?.pedagogical_summary && (
                        <View style={styles.supportSection}>
                            <Text style={styles.supportLabel}>RIFERIMENTO PRATICO:</Text>
                            <Text style={styles.supportSummary}>
                                {localMilestone.target_config.pedagogical_summary}
                            </Text>


                            {localMilestone.target_config.support_resource && (
                                <Pressable
                                    onPress={() => {
                                        const res = localMilestone.target_config?.support_resource;
                                        if (res?.url) {
                                            setPreviewData({
                                                visible: true,
                                                type: res.type === 'video' ? 'youtube' : 'webpage',
                                                url: res.url,
                                                resourceId: milestone.resource_id || undefined
                                            })
                                        }
                                    }}
                                    style={styles.resourceCard}
                                >
                                    {localMilestone.target_config.support_resource.thumbnail_url ? (
                                        <View style={styles.thumbnailWrapper}>
                                            <Image
                                                source={{ uri: localMilestone.target_config.support_resource.thumbnail_url }}
                                                style={[styles.thumbnailImage, { transform: [{ scale: smartScale }] }]}
                                                resizeMode="cover"
                                            />
                                        </View>
                                    ) : (
                                        <View style={styles.resourceTypeIcon}>
                                            <Ionicons
                                                name={localMilestone.target_config.support_resource.type === 'video' ? icons.video : icons.link}
                                                size={24}
                                                color="#64748B"
                                            />
                                        </View>
                                    )}
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
                </View>
            </ScrollView>

            {/* HOVERING FOOTER */}
            <View style={styles.footerWrapper} pointerEvents="box-none">
                <LinearGradient
                    colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)', palette.white]}
                    style={styles.footerGradient}
                    pointerEvents="none"
                />
                <View style={[styles.footerContent, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
                    <Pressable
                        onPress={handleStartNextPhase}
                        disabled={isGenerating}
                        style={[
                            styles.completeBtn,
                            isGenerating && { opacity: 0.6 }
                        ]}
                    >
                        <LinearGradient
                            colors={courseColor === palette.black ? [palette.black, '#333'] : [courseColor, courseColor]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.completeBtnGradient}
                        >
                            <Text style={[styles.completeBtnText, { color: courseColor === palette.black ? palette.white : palette.black }]}>
                                {nextPhaseTitle ? 'NUOVA FASE' : 'COMPLETA PERCORSO'}
                            </Text>
                        </LinearGradient>
                    </Pressable>
                </View>
            </View>

            <LoadingOverlay visible={isGenerating} status={loadingStatus} />
            <ResourcePreview
                visible={previewData.visible}
                onClose={() => setPreviewData(prev => ({ ...prev, visible: false }))}
                type={previewData.type}
                url={previewData.url}
                resourceId={previewData.resourceId}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: palette.white,
    },
    headerSection: {
        width: '100%',
        minHeight: 240,
        position: 'relative',
        paddingHorizontal: spacing.xl,
        justifyContent: 'center',
    },
    headerContent: {
        marginTop: 40,
    },
    topControls: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: spacing.xl,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 20,
    },
    heroGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 80,
    },
    content: {
        paddingHorizontal: spacing.xl,
        zIndex: 10,
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
        color: palette.gray600,
    },
    mainTitle: {
        ...typography.title,
        fontSize: 34,
        lineHeight: 40,
        color: palette.black,
        fontWeight: '900',
    },
    description: {
        ...typography.body,
        color: '#334155',
        fontSize: 17,
        lineHeight: 26,
    },
    typeContainer: {
        padding: 20,
        borderRadius: 24,
        marginTop: 40,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    typeLabel: {
        ...typography.label,
        fontSize: 10,
        color: '#64748B',
        marginBottom: 4,
        letterSpacing: 1,
    },
    typeValue: {
        ...typography.body,
        fontWeight: '800',
        fontSize: 16,
        color: palette.black,
    },
    footerWrapper: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 180,
        justifyContent: 'flex-end',
    },
    footerGradient: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    footerContent: {
        paddingHorizontal: spacing.xl,
        paddingTop: spacing.md,
    },
    completeBtn: {
        height: 56,
        borderRadius: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 6,
    },
    completeBtnGradient: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    completeBtnText: {
        fontWeight: '900',
        fontSize: 16,
        letterSpacing: 1,
    },
    supportSection: {
        marginTop: 32,
        paddingTop: 32,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
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
        fontSize: 16,
        color: '#475569',
        fontStyle: 'italic',
        lineHeight: 24,
        marginBottom: 20,
    },
    resourceCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#F1F5F9',
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
        borderColor: '#E2E8F0',
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
        color: '#64748B',
    },
    thumbnailWrapper: {
        width: 60,
        height: 60,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    thumbnailImage: {
        width: '110%',
        height: '110%',
        left: '-5%',
    },
    exerciseCard: {
        marginTop: 32,
        padding: 24,
        borderRadius: 24,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderStyle: 'dashed',
    },
    exerciseLabel: {
        ...typography.label,
        fontSize: 10,
        fontWeight: '900',
        marginBottom: 8,
        letterSpacing: 1.5,
    },
    exerciseText: {
        ...typography.body,
        fontSize: 18,
        lineHeight: 28,
        color: palette.black,
        fontWeight: '700',
    },
})
