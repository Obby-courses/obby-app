import { getCourseColor } from '@/constants/courseColors'
import { supabase } from '@/lib/supabase'
import { colors, radius, spacing, typography } from '@/lib/theme'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect, useRouter } from 'expo-router'
import { useCallback, useEffect, useRef, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Modal,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MilestoneItem from './MilestoneItem'
import MilestoneNode from './MilestoneNode'
import StepItem from './StepItem'
import StepNode from './StepNode'

const { width, height } = Dimensions.get('window')

/* ---------------- TYPES ---------------- */

type Resource = {
    id: string
    title: string
    url: string
    type: string
    thumbnail_url?: string | null
    avg_rating?: number
    summary?: string | null
    created_at?: string
}

type Step = {
    id: string
    title: string
    description: string | null
    completed: boolean
    status?: 'pending' | 'completed' | 'skipped'
    skip_reason?: string | null
    order_index: number
    phase_id: string
    course_id?: string
    resource: Resource | null
    created_at?: string
    isMilestone?: boolean
    global_index: number
}

type Phase = {
    id: string
    title: string
    order_index: number
    macro_phase_id: string
}

type Milestone = {
    milestone_type: string
    phase_id: string
    completed?: boolean
    status?: string | null
}

/* ---------------- HELPERS ---------------- */

function isPhaseCompleted(phaseId: string, steps: Step[]) {
    const phaseSteps = steps.filter((s) => s.phase_id === phaseId)
    if (phaseSteps.length === 0) return false
    return phaseSteps.every((s) => s.completed || s.status === 'skipped')
}

type CourseViewerProps = {
    courseId: string;
    hideHeader?: boolean;
    isActive?: boolean;
}

export default function CourseViewer({ courseId, hideHeader, isActive }: CourseViewerProps) {
    const router = useRouter()
    const insets = useSafeAreaInsets()

    const [courseTitle, setCourseTitle] = useState('')
    const [daysPerStep, setDaysPerStep] = useState<number>(2.33)
    const [courseCreatedAt, setCourseCreatedAt] = useState<string>('')
    const [phases, setPhases] = useState<Phase[]>([])
    const [macroPhases, setMacroPhases] = useState<any[]>([])
    const [steps, setSteps] = useState<Step[]>([])
    const [milestones, setMilestones] = useState<Milestone[]>([])
    const [colorIndex, setColorIndex] = useState<number | null>(null)

    // Flattened list of ALL items to render in the map
    const [mapItems, setMapItems] = useState<any[]>([])
    const [selectedStep, setSelectedStep] = useState<Step | null>(null)
    const [selectedMilestone, setSelectedMilestone] = useState<any | null>(null)

    const [mapReady, setMapReady] = useState(false)
    const initialized = useRef(false)
    const flatListRef = useRef<FlatList<any>>(null)

    const courseColor = courseId ? getCourseColor(courseId, colorIndex) : colors.primary

    /* ---------------- LOAD ---------------- */

    useEffect(() => {
        if (!courseId) return
        loadAllData()
    }, [courseId])

    useFocusEffect(
        useCallback(() => {
            if (isActive) {
                loadAllData()
            }
        }, [isActive])
    )

    useEffect(() => {
        if (mapItems.length > 0 && !initialized.current) {
            // Find index of first incomplete step
            const firstIncompleteIdx = mapItems.findIndex(item => {
                if (item.isMilestone) {
                    // Target milestone if all steps in its phase are done but milestone isn't
                    const phaseDone = isPhaseCompleted(item.phase_id, steps)
                    return phaseDone && !item.completed
                }
                return !item.completed
            })

            const targetIdx = firstIncompleteIdx === -1 ? 0 : firstIncompleteIdx

            const scrollAndReady = () => {
                flatListRef.current?.scrollToIndex({
                    index: targetIdx,
                    animated: false,
                    viewPosition: 0.5
                })
                setTimeout(() => setMapReady(true), 50)
            }

            // We wait a bit for the FlatList to layout
            scrollAndReady()
            setTimeout(scrollAndReady, 100)

            initialized.current = true
        }
    }, [mapItems])

    async function loadAllData() {
        try {
            // Parallelize initial core data fetching
            const [courseRes, macroPhasesRes, phasesRes, stepsRes] = await Promise.all([
                supabase
                    .from('courses')
                    .select('title, days_per_step, created_at, color_index')
                    .eq('id', courseId)
                    .single(),
                supabase
                    .from('macro_phases')
                    .select('id, order_index')
                    .eq('course_id', courseId)
                    .order('order_index'),
                supabase
                    .from('phases')
                    .select('id, title, order_index, macro_phase_id')
                    .eq('course_id', courseId),
                supabase
                    .from('steps')
                    .select(`
                        id,
                        title,
                        description,
                        completed,
                        status,
                        order_index,
                        created_at,
                        phase_id,
                        course_id,
                        resource_id,
                        skip_reason,
                        resource:resources!resource_id (
                            id,
                            title,
                            url,
                            type,
                            thumbnail_url,
                            avg_rating,
                            summary,
                            created_at
                        )
                    `)
                    .eq('course_id', courseId)
            ])

            if (courseRes.data) {
                setCourseTitle(courseRes.data.title)
                if (courseRes.data.days_per_step) setDaysPerStep(courseRes.data.days_per_step)
                if (courseRes.data.created_at) setCourseCreatedAt(courseRes.data.created_at)
                setColorIndex(courseRes.data.color_index ?? null)
            }

            const macroPhasesData = macroPhasesRes.data || []
            setMacroPhases(macroPhasesData)

            const phasesData = phasesRes.data || []
            setPhases(phasesData)

            const stepsRawData = stepsRes.data || []

            // Now that we have phases, fetch milestones in parallel if phases exist
            let milestonesData: any[] = []
            if (phasesData.length > 0) {
                const { data } = await supabase
                    .from('milestones')
                    .select('*')
                    .in('phase_id', phasesData.map(p => p.id))
                milestonesData = data || []
            }
            setMilestones(milestonesData)

            // Normalize and Sort Steps
            const normalizedSteps: Step[] = stepsRawData.map((step: any) => ({
                ...step,
                status: step.status || 'pending',
                completed: step.status ? (step.status === 'completed' || step.status === 'skipped') : step.completed,
                resource: step.resource || null,
                global_index: 0,
            }))

            const sortedSteps = normalizedSteps.sort((a, b) => {
                const phaseA = phasesData.find(p => p.id === a.phase_id)
                const phaseB = phasesData.find(p => p.id === b.phase_id)
                if (!phaseA || !phaseB) return 0

                const macroA = macroPhasesData.find(m => m.id === phaseA.macro_phase_id)
                const macroB = macroPhasesData.find(m => m.id === phaseB.macro_phase_id)

                if (macroA && macroB && macroA.order_index !== macroB.order_index) {
                    return macroA.order_index - macroB.order_index
                }

                if (phaseA.order_index !== phaseB.order_index) return phaseA.order_index - phaseB.order_index
                return a.order_index - b.order_index
            }).map((step, idx) => ({ ...step, global_index: idx + 1 }))

            setSteps(sortedSteps)
            recomputeMapContent(sortedSteps, milestonesData, phasesData, macroPhasesData)
        } catch (error) {
            console.error("Error loading course data:", error)
        }
    }

    async function loadStepsAndMilestones() {
        // Kept for refresh logic, but now redirects to loadAllData or minimal update
        await loadAllData()
    }

    function recomputeMapContent(allSteps: Step[], allMilestones: Milestone[], currentPhases: Phase[], currentMacroPhases: any[]) {
        const content: any[] = []

        const firstIncompletePhase = getActivePhase(currentPhases, allSteps)

        const currentMacroPhaseId = firstIncompletePhase?.macro_phase_id || currentPhases[currentPhases.length - 1]?.macro_phase_id
        const currentMacroOrder = currentMacroPhases.find(m => m.id === currentMacroPhaseId)?.order_index || 0

        const visiblePhases = [...currentPhases].sort((a, b) => {
            const m1 = currentMacroPhases.find(m => m.id === a.macro_phase_id)
            const m2 = currentMacroPhases.find(m => m.id === b.macro_phase_id)
            if (m1 && m2 && m1.order_index !== m2.order_index) return m1.order_index - m2.order_index
            return a.order_index - b.order_index
        }).filter(p => {
            const phaseMacro = currentMacroPhases.find(m => m.id === p.macro_phase_id)
            return phaseMacro && phaseMacro.order_index <= currentMacroOrder
        })

        visiblePhases.forEach(p => {
            const phaseSteps = allSteps.filter(s => s.phase_id === p.id)

            if (phaseSteps.length > 0) {
                // Populated phase
                phaseSteps.sort((a, b) => a.order_index - b.order_index)
                content.push(...phaseSteps)
            } else {
                // Future/Virtual phase - Show placeholders
                // Use phase ID as seed for consistent randomization
                const seed = p.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
                const numPlaceholders = 3 + (seed % 3) // Random 3, 4, or 5

                for (let i = 0; i < numPlaceholders; i++) {
                    content.push({
                        id: `placeholder-${p.id}-${i}`,
                        phase_id: p.id,
                        isPlaceholder: true,
                        isMilestone: false,
                    })
                }
            }

            const milestone = allMilestones.find(m => m.phase_id === p.id)
            if (milestone) {
                content.push({ ...milestone, isMilestone: true, phase_id: p.id })
            } else {
                // Virtual milestone placeholder
                content.push({
                    id: `virtual-${p.id}`,
                    title: p.title,
                    description: 'Sfida finale per completare questa fase.',
                    isMilestone: true,
                    phase_id: p.id,
                    isVirtual: true,
                    milestone_type: 'test_finale'
                })
            }
        })

        setMapItems(content)
    }

    function getActivePhase(phases: Phase[], steps: Step[]): Phase | null {
        for (const phase of phases) {
            const phaseSteps = steps.filter((s) => s.phase_id === phase.id)
            if (phaseSteps.length === 0) continue
            const hasIncomplete = phaseSteps.some((s) => !s.completed && s.status !== 'skipped')
            if (hasIncomplete) return phase
        }
        return null
    }


    async function updateStepStatus(
        stepId: string,
        newStatus: 'completed' | 'skipped' | 'pending'
    ) {
        const isCompletedBool = (newStatus === 'completed' || newStatus === 'skipped')

        // 1. Optimistic Local Update
        setSteps((prev) => {
            const updated = prev.map((s) =>
                s.id === stepId
                    ? {
                        ...s,
                        status: newStatus,
                        completed: isCompletedBool,
                        ...(newStatus !== 'skipped' && { skip_reason: null })
                    }
                    : s
            )
            recomputeMapContent(updated, milestones, phases, macroPhases)
            return updated
        })

        // Update selected step if it's open (UI in the modal)
        if (selectedStep && selectedStep.id === stepId) {
            setSelectedStep(prev => prev ? { ...prev, status: newStatus, completed: isCompletedBool } : null)
        }

        // 2. Persistent Update
        try {
            const databaseStatus = newStatus === 'pending' ? null : newStatus;

            const { error } = await supabase
                .from('steps')
                .update({
                    status: databaseStatus,
                    completed: isCompletedBool,
                    ...(newStatus !== 'skipped' && { skip_reason: null })
                })
                .eq('id', stepId)

            if (error) {
                console.error('❌ Database update failed:', error)
                throw error
            }
        } catch (err) {
            console.error('❌ Error updating step status:', err)
            // Rollback or refresh on error
            loadStepsAndMilestones()
            Alert.alert('Errore', 'Non è stato possibile salvare lo stato dello step.')
        }
    }

    /* ---------------- REFERENCE DATE ---------------- */
    const lastCompletedStep = [...steps]
        .filter(s => s.completed && s.created_at)
        .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())[0]

    const referenceDate = lastCompletedStep?.created_at || courseCreatedAt

    /* ---------------- RENDER ---------------- */

    const renderItem = ({ item, index }: { item: any, index: number }) => {
        // Determine Zigzag alignment
        const offsetMap = [0, -45, 0, 45]
        const alignment = item.isMilestone ? 0 : offsetMap[index % 4]

        const firstIncompleteStep = steps.find(s => !s.completed)
        const activePhaseId = firstIncompleteStep?.phase_id

        if (item.isMilestone) {
            // Milestone is strictly locked if phase not done
            const isPhaseDone = isPhaseCompleted(item.phase_id, steps)
            const isLocked = !isPhaseDone

            return (
                <MilestoneNode
                    milestone={item}
                    isLocked={isLocked}
                    courseColor={courseColor}
                    onPress={() => {
                        if (isLocked) {
                            Alert.alert('Step non completati', 'Completa tutti gli step precedenti per sbloccare la Milestone!')
                        } else {
                            setSelectedMilestone(item)
                        }
                    }}
                />
            )
        }

        // It's a Step or Placeholder
        const isPlaceholder = !!item.isPlaceholder
        const step = item as Step

        // Determine Locked Status: 
        // A step is UNLOCKED if it is completed, OR it belongs to the active phase, 
        // OR it's from a previous phase (which should be completed anyway).
        let isLocked = true
        if (step.completed) {
            isLocked = false
        } else if (!isPlaceholder && activePhaseId && step.phase_id === activePhaseId) {
            isLocked = false
        } else if (!isPlaceholder && !activePhaseId && steps.length > 0) {
            // All steps completed - nothing is locked
            isLocked = false
        } else if (!isPlaceholder && index === 0) {
            // Fallback for first ever step
            isLocked = false
        }

        const isCurrent = !isPlaceholder && step.id === firstIncompleteStep?.id

        let remainingProgress = 1
        if (isCurrent) {
            const start = referenceDate ? new Date(referenceDate) : new Date(courseCreatedAt)
            const totalDurationMs = daysPerStep * 24 * 60 * 60 * 1000
            const deadlineMs = start.getTime() + totalDurationMs
            const now = Date.now()
            remainingProgress = Math.max(0, Math.min(1, (deadlineMs - now) / totalDurationMs))
        }

        return (
            <View style={{ alignItems: 'center', transform: [{ translateX: alignment }] }}>
                <StepNode
                    step={step}
                    index={index}
                    isLocked={isLocked || isPlaceholder}
                    isCurrent={isCurrent}
                    isPlaceholder={isPlaceholder}
                    remainingProgress={remainingProgress}
                    courseColor={courseColor}
                    onPress={() => {
                        if (!isLocked && !isPlaceholder) setSelectedStep(step)
                    }}
                />
            </View>
        )
    }

    return (
        <View style={{ width, flex: 1, backgroundColor: colors.background }}>
            {!mapReady && (
                <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, zIndex: 100, justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            )}

            {!hideHeader && (
                <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, zIndex: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Pressable
                            onPress={() => router.replace('/')}
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: radius.md,
                                borderWidth: 2,
                                borderColor: courseColor,
                                justifyContent: 'center',
                                alignItems: 'center',
                                backgroundColor: colors.background
                            }}
                        >
                            <Ionicons name="arrow-back" size={24} color={courseColor} />
                        </Pressable>
                        <View style={{ flex: 1, marginHorizontal: 15 }}>
                            <Text style={{ ...typography.label, color: colors.mutedText }}>Il tuo percorso</Text>
                            <Text style={{ ...typography.header, color: colors.textPrimary }} numberOfLines={1}>{courseTitle}</Text>
                        </View>
                        <Pressable
                            onPress={() => router.push({
                                pathname: '/course/[id]/settings',
                                params: { id: courseId }
                            })}
                            style={{
                                width: 44,
                                height: 44,
                                borderRadius: radius.md,
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <Ionicons name="ellipsis-vertical" size={24} color={courseColor} />
                        </Pressable>
                    </View>
                </View>
            )}

            <FlatList
                ref={flatListRef}
                data={mapItems}
                style={{ flex: 1, opacity: mapReady ? 1 : 0 }}
                inverted
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{
                    paddingBottom: 20,
                    paddingTop: 40
                }}
                ListHeaderComponent={<View style={{ height: height / 2 }} />}
                ListFooterComponent={<View style={{ height: height / 2 }} />}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                onScrollToIndexFailed={(info) => {
                    const wait = new Promise(resolve => setTimeout(resolve, 500));
                    wait.then(() => {
                        flatListRef.current?.scrollToIndex({ index: info.index, animated: false, viewPosition: 0.33 });
                    });
                }}
            />

            {/* STEP DETAIL MODAL */}
            <Modal
                visible={!!selectedStep}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setSelectedStep(null)}
            >
                <View style={{ flex: 1, backgroundColor: colors.background }}>
                    {selectedStep && (() => {
                        const currentIdx = steps.findIndex(s => s.id === selectedStep.id)
                        const hasPrev = currentIdx > 0
                        const hasNext = currentIdx < steps.length - 1

                        return (
                            <StepItem
                                step={selectedStep}
                                onUpdateStatus={async (id, status) => {
                                    await updateStepStatus(id, status)
                                }}
                                onClose={() => setSelectedStep(null)}
                                index={currentIdx}
                                daysPerStep={daysPerStep}
                                courseCreatedAt={courseCreatedAt}
                                firstIncompleteIndex={steps.findIndex(s => !s.completed)}
                                referenceDate={referenceDate}
                                courseColor={courseColor}
                                onPrev={hasPrev ? () => setSelectedStep(steps[currentIdx - 1]) : undefined}
                                onNext={hasNext ? () => setSelectedStep(steps[currentIdx + 1]) : undefined}
                            />
                        )
                    })()}
                </View>
            </Modal>

            {/* MILESTONE DETAIL MODAL */}
            <Modal
                visible={!!selectedMilestone}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setSelectedMilestone(null)}
            >
                <View style={{ flex: 1, backgroundColor: colors.background }}>
                    <View style={{ flex: 1, marginTop: spacing.md }}>
                        <View style={{ padding: spacing.md, flexDirection: 'row', justifyContent: 'flex-end', zIndex: 10 }}>
                            <Pressable onPress={() => setSelectedMilestone(null)} style={{ width: 40, height: 40, backgroundColor: colors.card, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.border }}>
                                <Ionicons name="close" size={20} color={colors.textPrimary} />
                            </Pressable>
                        </View>

                        {selectedMilestone && (() => {
                            const currentPhase = phases.find(ph => ph.id === selectedMilestone.phase_id)

                            // Find all phases sorted globally
                            const sortedPhasesList = [...phases].sort((a, b) => {
                                const m1 = macroPhases.find(m => m.id === a.macro_phase_id)
                                const m2 = macroPhases.find(m => m.id === b.macro_phase_id)
                                if (m1 && m2 && m1.order_index !== m2.order_index) return m1.order_index - m2.order_index
                                return a.order_index - b.order_index
                            })

                            const currentIndex = sortedPhasesList.findIndex(p => p.id === currentPhase?.id)
                            const nextPhase = currentIndex !== -1 && currentIndex < sortedPhasesList.length - 1 ? sortedPhasesList[currentIndex + 1] : null

                            const isNextPhaseGenerated = nextPhase ? steps.some(s => s.phase_id === nextPhase.id) : false

                            return (
                                <MilestoneItem
                                    milestone={selectedMilestone}
                                    courseId={courseId}
                                    nextPhaseId={nextPhase?.id}
                                    nextPhaseTitle={nextPhase?.title}
                                    isNextPhaseGenerated={isNextPhaseGenerated}
                                    onRefresh={(shouldClose) => {
                                        loadStepsAndMilestones()
                                        if (shouldClose) setSelectedMilestone(null)
                                    }}
                                    onClose={() => setSelectedMilestone(null)}
                                    courseColor={courseColor}
                                />
                            )
                        })()}
                    </View>
                </View>
            </Modal>

        </View>
    )
}
