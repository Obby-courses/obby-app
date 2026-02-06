import { supabase } from '@/lib/supabase'
import { spacing } from '@/lib/theme'
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  Dimensions,
  FlatList,
  Pressable,
  Text,
  View
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import MilestoneItem from './MilestoneItem'
import StepItem from './StepItem'

const { width } = Dimensions.get('window')

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
  isMilestone?: boolean // Flag to distinguish milestone cards
}

type Phase = {
  id: string
  title: string
  order_index: number
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
  return phaseSteps.every((s) => s.completed)
}

function getActivePhase(phases: Phase[], steps: Step[]): Phase | null {
  for (const phase of phases) {
    const phaseSteps = steps.filter((s) => s.phase_id === phase.id)
    if (phaseSteps.length === 0) continue
    const hasIncomplete = phaseSteps.some((s) => !s.completed)
    if (hasIncomplete) return phase
  }
  return null
}

/* ---------------- SCREEN ---------------- */

export default function CourseScreen() {
  const { id: courseId } =
    useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  const [courseTitle, setCourseTitle] = useState('')
  const [daysPerStep, setDaysPerStep] = useState<number>(2.33)
  const [courseCreatedAt, setCourseCreatedAt] = useState<string>('')
  const [phases, setPhases] = useState<Phase[]>([])
  const [steps, setSteps] = useState<Step[]>([])
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [visibleItems, setVisibleItems] = useState<any[]>([])
  const [phasesMap, setPhasesMap] =
    useState<Record<string, string>>({})

  const [currentIndex, setCurrentIndex] = useState(0)

  const flatListRef = useRef<FlatList<any>>(null)
  const initialized = useRef(false)

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
      .select('id, title, order_index')
      .eq('course_id', courseId)
      .order('order_index')

    if (!data) return

    setPhases(data)

    const map: Record<string, string> = {}
    data.forEach((p) => {
      map[p.id] = p.title
    })
    setPhasesMap(map)
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
    }))

    const sortedSteps = normalizedSteps.sort((a, b) => {
      const phaseA = phases.find(p => p.id === a.phase_id)
      const phaseB = phases.find(p => p.id === b.phase_id)
      if (!phaseA || !phaseB) return 0
      if (phaseA.order_index !== phaseB.order_index) return phaseA.order_index - phaseB.order_index
      return a.order_index - b.order_index
    })

    setSteps(sortedSteps)
    recomputeVisibleContent(sortedSteps, normalizedMilestones)
  }

  function recomputeVisibleContent(allSteps: Step[], allMilestones: Milestone[]) {
    // Determine which phases are visible
    const firstIncompletePhase = getActivePhase(phases, allSteps)
    const firstIncompleteOrder = firstIncompletePhase ? firstIncompletePhase.order_index : -1

    let maxCompletedStepOrder = -1
    allSteps.forEach(step => {
      if (step.completed) {
        const phase = phases.find(p => p.id === step.phase_id)
        if (phase && phase.order_index > maxCompletedStepOrder) {
          maxCompletedStepOrder = phase.order_index
        }
      }
    })

    let maxVisibleOrder = Math.max(firstIncompleteOrder, maxCompletedStepOrder)
    if (firstIncompleteOrder === -1) {
      maxVisibleOrder = Math.max(...phases.map(p => p.order_index))
    }

    const visiblePhases = phases.filter(p => p.order_index <= maxVisibleOrder)

    // Interleave steps and milestones
    const content: any[] = []
    visiblePhases.forEach(p => {
      const phaseSteps = allSteps.filter(s => s.phase_id === p.id)
      content.push(...phaseSteps)

      const milestone = allMilestones.find(m => m.phase_id === p.id)
      if (milestone) {
        content.push({ ...milestone, isMilestone: true })
      }
    })

    setVisibleItems(content)

    if (!initialized.current) {
      const firstIncompleteIndex = content.findIndex((item) => !item.completed && !item.isMilestone)
      if (firstIncompleteIndex >= 0) {
        requestAnimationFrame(() => {
          flatListRef.current?.scrollToIndex({ index: firstIncompleteIndex, animated: false })
        })
      }
      initialized.current = true
    }
  }

  async function updateStepStatus(
    stepId: string,
    newStatus: 'completed' | 'skipped' | 'pending'
  ) {
    const isCompletedBool = (newStatus === 'completed' || newStatus === 'skipped')
    await supabase.from('steps').update({ status: newStatus, completed: isCompletedBool }).eq('id', stepId)

    setSteps((prev) => {
      const updated = prev.map((s) => s.id === stepId ? { ...s, status: newStatus, completed: isCompletedBool } : s)
      recomputeVisibleContent(updated, milestones)

      const updatedStep = updated.find(s => s.id === stepId)
      if (updatedStep && isCompletedBool && isPhaseCompleted(updatedStep.phase_id, updated)) {
        router.push({
          pathname: '/course/phase-completed',
          params: { phaseId: updatedStep.phase_id, courseId },
        })
      }
      return updated
    })
  }

  /* ---------------- REFERENCE DATE ---------------- */
  const lastCompletedStep = [...steps]
    .filter(s => s.completed && s.created_at)
    .sort((a, b) => new Date(b.created_at!).getTime() - new Date(a.created_at!).getTime())[0]

  const referenceDate = lastCompletedStep?.created_at || courseCreatedAt

  /* ---------------- HEADER INFO ---------------- */
  const currentItem = visibleItems[currentIndex]
  const currentPhaseTitle = currentItem ? phasesMap[currentItem.phase_id] : null

  const insets = useSafeAreaInsets()

  return (
    <View style={{ flex: 1, backgroundColor: '#f2f2f2' }}>
      <View style={{ paddingTop: insets.top + spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable onPress={() => router.replace('/')} style={{ width: 40, height: 40, justifyContent: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: '300' }}>←</Text>
          </Pressable>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '700', textAlign: 'center', color: '#000' }}>{courseTitle}</Text>
            {currentPhaseTitle && <Text style={{ fontSize: 12, fontWeight: '500', color: '#999', textAlign: 'center' }}>{currentPhaseTitle}</Text>}
          </View>
          <View style={{ width: 40 }} />
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={visibleItems}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(e) => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width))
        }}
        getItemLayout={(data, index) => ({ length: width, offset: width * index, index })}
        renderItem={({ item }) => (
          <View style={{ width, padding: spacing.lg }}>
            {item.isMilestone ? (
              (() => {
                const currentPhase = phases.find(ph => ph.id === item.phase_id)
                const nextPhase = phases.find(p => p.order_index === (currentPhase?.order_index || 0) + 1)
                return (
                  <MilestoneItem
                    milestone={item}
                    courseId={courseId}
                    nextPhaseId={nextPhase?.id}
                    nextPhaseTitle={nextPhase?.title}
                    onRefresh={loadStepsAndMilestones}
                  />
                )
              })()
            ) : (
              <StepItem
                step={item}
                onUpdateStatus={updateStepStatus}
                index={steps.findIndex(s => s.id === item.id)}
                daysPerStep={daysPerStep}
                courseCreatedAt={courseCreatedAt}
                firstIncompleteIndex={steps.findIndex(s => !s.completed)}
                referenceDate={referenceDate}
              />
            )}
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 100 }}
      />
    </View>
  )
}
