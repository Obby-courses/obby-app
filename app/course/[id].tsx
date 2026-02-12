import { getCourseColor } from '@/constants/courseColors'
import { supabase } from '@/lib/supabase'
import { colors, radius, spacing, typography } from '@/lib/theme'
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router'
import { useEffect, useRef, useState } from 'react'
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
}

type Step = {
  id: string
  title: string
  description: string | null
  completed: boolean
  status?: 'pending' | 'completed' | 'skipped'
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
  id: string
  title: string
  description: string
  milestone_type: string
  phase_id: string
}

/* ---------------- HELPERS ---------------- */

function isPhaseCompleted(phaseId: string, steps: Step[]) {
  const phaseSteps = steps.filter((s) => s.phase_id === phaseId)
  if (phaseSteps.length === 0) return false
  return phaseSteps.every((s) => s.completed || s.status === 'skipped')
}

/* ---------------- SCREEN ---------------- */

export default function CourseScreen() {
  const { id: courseId } =
    useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [courseTitle, setCourseTitle] = useState('')
  const [daysPerStep, setDaysPerStep] = useState<number>(2.33)
  const [courseCreatedAt, setCourseCreatedAt] = useState<string>('')
  const [phases, setPhases] = useState<Phase[]>([])
  const [steps, setSteps] = useState<Step[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])

  // Flattened list of ALL items to render in the map
  const [mapItems, setMapItems] = useState<any[]>([])
  const [selectedStep, setSelectedStep] = useState<Step | null>(null)
  const [selectedMilestone, setSelectedMilestone] = useState<any | null>(null)

  const [mapReady, setMapReady] = useState(false)
  const initialized = useRef(false)
  const flatListRef = useRef<FlatList<any>>(null)

  const courseColor = courseId ? getCourseColor(courseId) : colors.primary

  /* ---------------- LOAD ---------------- */

  useEffect(() => {
    if (!courseId) return
    loadCourse()
    loadPhases()
  }, [courseId])

  useEffect(() => {
    if (phases.length) {
      loadStepsAndMilestones()
    }
  }, [phases])

  useEffect(() => {
    if (mapItems.length > 0 && !initialized.current) {
      // Find index of first incomplete step
      const firstIncompleteIdx = mapItems.findIndex(item => {
        if (item.isMilestone) {
          return !isPhaseCompleted(item.phase_id, steps)
        }
        return !item.completed
      })

      const targetIdx = firstIncompleteIdx === -1 ? 0 : firstIncompleteIdx

      const scrollAndReady = () => {
        flatListRef.current?.scrollToIndex({
          index: targetIdx,
          animated: false,
          viewPosition: 0.33
        })
        setTimeout(() => setMapReady(true), 50)
      }

      // We wait a bit for the FlatList to layout
      scrollAndReady()
      setTimeout(scrollAndReady, 100)

      initialized.current = true
    }
  }, [mapItems])

  async function loadCourse() {
    const { data } = await supabase
      .from('courses')
      .select('title, days_per_step, created_at')
      .eq('id', courseId)
      .single()

    if (data) {
      setCourseTitle(data.title)
      if (data.days_per_step) setDaysPerStep(data.days_per_step)
      if (data.created_at) setCourseCreatedAt(data.created_at)
    }
  }

  async function loadPhases() {
    const { data } = await supabase
      .from('phases')
      .select('id, title, order_index, macro_phase_id')
      .eq('course_id', courseId)
      .order('order_index')

    if (!data) return
    setPhases(data)
  }

  async function loadStepsAndMilestones() {
    // 1. Load Steps
    const { data: stepsData, error: sErr } = await supabase
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
        resource:resources!resource_id (
          id,
          title,
          url,
          type,
          thumbnail_url
        )
      `)
      .eq('course_id', courseId)

    if (sErr || !stepsData) {
      console.error('loadSteps error', sErr)
      return
    }

    // 2. Load Milestones
    const { data: mData } = await supabase
      .from('milestones')
      .select('*')
      .in('phase_id', phases.map(p => p.id))

    const normalizedMilestones = mData || []
    setMilestones(normalizedMilestones)

    // 3. Normalize Steps
    const normalizedSteps: Step[] = stepsData.map((step: any) => ({
      ...step,
      status: step.status || 'pending',
      completed: step.status ? (step.status === 'completed' || step.status === 'skipped') : step.completed,
      resource: step.resource || null,
      global_index: 0,
    }))

    // Sort steps globally by Phase Order then Step Order
    const sortedSteps = normalizedSteps.sort((a, b) => {
      const phaseA = phases.find(p => p.id === a.phase_id)
      const phaseB = phases.find(p => p.id === b.phase_id)
      if (!phaseA || !phaseB) return 0
      if (phaseA.order_index !== phaseB.order_index) return phaseA.order_index - phaseB.order_index
      return a.order_index - b.order_index
    }).map((step, idx) => ({ ...step, global_index: idx + 1 }))

    setSteps(sortedSteps)
    recomputeMapContent(sortedSteps, normalizedMilestones)
  }

  function recomputeMapContent(allSteps: Step[], allMilestones: Milestone[]) {
    const content: any[] = []

    const firstIncompletePhase = getActivePhase(phases, allSteps)

    // Find current macro_phase_id
    const currentMacroPhaseId = firstIncompletePhase?.macro_phase_id || phases[phases.length - 1]?.macro_phase_id

    // Phases to show: any phase with steps OR any phase belonging to the current/past macro-phases
    // Actually, simple rule: show all phases up to the LAST phase of the current macro-phase.

    // Find phases belonging to current macro-phase
    const macroPhasePhases = phases.filter(p => p.macro_phase_id === currentMacroPhaseId)
    const maxMacroOrder = Math.max(...macroPhasePhases.map(p => p.order_index))

    const visiblePhases = phases.filter(p => p.order_index <= maxMacroOrder)

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
      const updated = prev.map((s) => s.id === stepId ? { ...s, status: newStatus, completed: isCompletedBool } : s)
      recomputeMapContent(updated, milestones)
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
          completed: isCompletedBool
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

    // Determine Locked Status
    let isLocked = true
    if (index === 0) {
      isLocked = false
    } else {
      const prevItem = mapItems[index - 1]
      if (prevItem.isMilestone) {
        isLocked = false
      } else {
        isLocked = !prevItem.completed && !prevItem.isPlaceholder
      }
    }

    if (step.completed) isLocked = false
    const isCurrent = !isLocked && !step.completed && !isPlaceholder

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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {!mapReady && (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background, zIndex: 100, justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )}

      <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md, zIndex: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable
            onPress={() => router.replace('/')}
            style={{
              width: 44,
              height: 44,
              borderRadius: radius.md,
              borderWidth: 2,
              borderColor: colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: colors.background
            }}
          >
            <Text style={{ fontSize: 20, fontWeight: '800' }}>←</Text>
          </Pressable>
          <View style={{ flex: 1, marginHorizontal: 15 }}>
            <Text style={{ ...typography.label, color: colors.mutedText }}>Il tuo percorso</Text>
            <Text style={{ ...typography.header, color: colors.textPrimary }} numberOfLines={1}>{courseTitle}</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>
      </View>

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
        ListHeaderComponent={<View style={{ height: height / 4 }} />}
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
          <View style={{ flex: 1, marginTop: spacing.md }}>
            <View style={{ padding: spacing.lg, flexDirection: 'row', justifyContent: 'flex-end', zIndex: 10 }}>
              <Pressable onPress={() => { setSelectedStep(null); setSelectedMilestone(null); }} style={{ width: 40, height: 40, backgroundColor: colors.card, borderRadius: 20, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: colors.border }}>
                <Text style={{ fontSize: 16, color: colors.textPrimary, fontWeight: '900' }}>✕</Text>
              </Pressable>
            </View>

            {selectedStep && (() => {
              const currentIdx = steps.findIndex(s => s.id === selectedStep.id)
              const hasPrev = currentIdx > 0
              const hasNext = currentIdx < steps.length - 1

              return (
                <StepItem
                  step={selectedStep}
                  onUpdateStatus={async (id, status) => {
                    await updateStepStatus(id, status)
                    if (status === 'completed' || status === 'skipped') {
                      setSelectedStep(null)
                    }
                  }}
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
                <Text style={{ fontSize: 16, color: colors.textPrimary, fontWeight: '900' }}>✕</Text>
              </Pressable>
            </View>

            {selectedMilestone && (() => {
              const currentPhase = phases.find(ph => ph.id === selectedMilestone.phase_id)
              const nextPhase = phases.find(p => p.order_index === (currentPhase?.order_index || 0) + 1)
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

