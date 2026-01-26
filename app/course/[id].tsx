import { supabase } from '@/lib/supabase'
import { colors, spacing, typography } from '@/lib/theme'
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
  View,
} from 'react-native'
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
  order_index: number
  phase_id: string
  course_id?: string
  resource: Resource | null
}

type Phase = {
  id: string
  title: string
  order_index: number
}

/* ---------------- HELPERS ---------------- */

function isPhaseCompleted(phaseId: string, steps: Step[]) {
  const phaseSteps = steps.filter(
    (s) => s.phase_id === phaseId
  )
  if (phaseSteps.length === 0) return false
  return phaseSteps.every((s) => s.completed)
}

function getActivePhase(
  phases: Phase[],
  steps: Step[]
): Phase | null {
  for (const phase of phases) {
    const phaseSteps = steps.filter(
      (s) => s.phase_id === phase.id
    )
    if (phaseSteps.length === 0) continue
    const hasIncomplete = phaseSteps.some(
      (s) => !s.completed
    )
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
  const [phases, setPhases] = useState<Phase[]>([])
  const [steps, setSteps] = useState<Step[]>([])
  const [visibleSteps, setVisibleSteps] = useState<Step[]>([])
  const [phasesMap, setPhasesMap] =
    useState<Record<string, string>>({})

  const [currentIndex, setCurrentIndex] = useState(0)

  const flatListRef = useRef<FlatList<Step>>(null)
  const initialized = useRef(false)

  /* ---------------- LOAD ---------------- */

  useEffect(() => {
    if (!courseId) return
    loadCourse()
    loadPhases()
  }, [courseId])

  useEffect(() => {
    if (phases.length) {
      loadSteps()
    }
  }, [phases])

  async function loadCourse() {
    const { data } = await supabase
      .from('courses')
      .select('title')
      .eq('id', courseId)
      .single()

    if (data) setCourseTitle(data.title)
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

  async function loadSteps() {
    const { data, error } = await supabase
      .from('steps')
      .select(`
        id,
        title,
        description,
        completed,
        order_index,
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

    if (error || !data) {
      console.error('loadSteps error', error)
      return
    }

    // 🔥 NORMALIZZA: resources[] → resource
    const normalized: Step[] = data.map((step: any) => ({
      id: step.id,
      title: step.title,
      description: step.description,
      completed: step.completed,
      order_index: step.order_index,
      phase_id: step.phase_id,
      course_id: step.course_id,
      resource: step.resource || null,
    }))

    const sorted = normalized.sort((a, b) => {
      const phaseA = phases.find(p => p.id === a.phase_id)
      const phaseB = phases.find(p => p.id === b.phase_id)

      if (!phaseA || !phaseB) return 0

      if (phaseA.order_index !== phaseB.order_index) {
        return phaseA.order_index - phaseB.order_index
      }

      return a.order_index - b.order_index
    })

    setSteps(sorted)
    recomputeVisibleSteps(sorted)
  }

  /* ---------------- CORE LOGIC ---------------- */

  function recomputeVisibleSteps(allSteps: Step[]) {
    const activePhase = getActivePhase(phases, allSteps)

    let visiblePhaseIds: string[] = []

    if (activePhase) {
      visiblePhaseIds = phases
        .filter(
          (p) =>
            p.order_index <= activePhase.order_index
        )
        .map((p) => p.id)
    } else {
      visiblePhaseIds = phases.map((p) => p.id)
    }

    const visible = allSteps.filter((s) =>
      visiblePhaseIds.includes(s.phase_id)
    )

    setVisibleSteps(visible)

    if (initialized.current) return

    const firstIncompleteIndex =
      visible.findIndex((s) => !s.completed)

    if (firstIncompleteIndex >= 0) {
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({
          index: firstIncompleteIndex,
          animated: false,
        })
      })
    }

    initialized.current = true
  }

  async function toggleCompleted(
    stepId: string,
    value: boolean
  ) {
    await supabase
      .from('steps')
      .update({ completed: value })
      .eq('id', stepId)

    setSteps((prev) => {
      const updated = prev.map((s) =>
        s.id === stepId
          ? { ...s, completed: value }
          : s
      )

      recomputeVisibleSteps(updated)
      setCurrentIndex(0)

      const updatedStep = updated.find(
        (s) => s.id === stepId
      )

      if (updatedStep && value) {
        const completed = isPhaseCompleted(
          updatedStep.phase_id,
          updated
        )

        if (completed) {
          router.push({
            pathname: '/course/phase-completed',
            params: {
              phaseId: updatedStep.phase_id,
              courseId,
            },
          })
        }
      }

      return updated
    })
  }

  /* ---------------- HEADER INFO ---------------- */

  const currentStep = visibleSteps[currentIndex]
  const currentPhaseTitle = currentStep
    ? phasesMap[currentStep.phase_id]
    : null

  /* ---------------- UI ---------------- */

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      {/* HEADER CON BACK BUTTON */}
      <View
        style={{
          paddingTop: 48,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xs,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Back Button */}
          <Pressable
            onPress={() => router.replace('/')}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
              zIndex: 10,
            })}
          >
            <Text style={typography.backButton}>←</Text>
          </Pressable>

          {/* Titles Container (Centered relative to the row) */}
          <View style={{ flex: 1, marginLeft: -30 }}>
            <Text style={[typography.courseTitle, { textAlign: 'center' }]}>
              {courseTitle}
            </Text>
            {currentPhaseTitle && (
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: '600',
                  color: colors.mutedText,
                  textAlign: 'center',
                }}
              >
                {currentPhaseTitle}
              </Text>
            )}
          </View>
        </View>
      </View>

      <FlatList
        ref={flatListRef}
        data={visibleSteps}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(
            e.nativeEvent.contentOffset.x / width
          )
          setCurrentIndex(index)
        }}
        getItemLayout={(data, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          const wait = new Promise((resolve) => setTimeout(resolve, 500))
          wait.then(() => {
            flatListRef.current?.scrollToIndex({
              index: info.index,
              animated: false,
            })
          })
        }}
        renderItem={({ item }) => (
          <View
            style={{
              width,
              padding: spacing.lg,
            }}
          >
            <StepItem
              step={item}
              onToggleCompleted={toggleCompleted}
            />
          </View>
        )}
      />
    </View>
  )
}