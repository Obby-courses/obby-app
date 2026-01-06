import { supabase } from '@/lib/supabase'
import { colors, spacing, typography } from '@/lib/theme'
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router'
import { useEffect, useMemo, useRef, useState } from 'react'
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

type Step = {
  id: string
  title: string
  description: string | null
  completed: boolean
  order_index: number
  resources: any | null
  phase_id: string
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
  if (!phaseSteps.length) return false
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
    if (!phaseSteps.length) continue
    if (phaseSteps.some((s) => !s.completed)) {
      return phase
    }
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
  const [currentIndex, setCurrentIndex] = useState(0)

  const flatListRef = useRef<FlatList<Step>>(null)

  // 🔑 controlla lo scroll SOLO all’ingresso pagina
  const hasAutoScrolled = useRef(false)

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

    if (data) setPhases(data)
  }

  async function loadSteps() {
    const { data } = await supabase
      .from('steps')
      .select(`
        id,
        title,
        description,
        completed,
        order_index,
        phase_id,
        resources
      `)
      .eq('course_id', courseId)

    if (!data) return

    const sorted = data.sort((a, b) => {
      const pa = phases.find(
        (p) => p.id === a.phase_id
      )
      const pb = phases.find(
        (p) => p.id === b.phase_id
      )
      if (!pa || !pb) return 0
      if (pa.order_index !== pb.order_index) {
        return pa.order_index - pb.order_index
      }
      return a.order_index - b.order_index
    })

    setSteps(sorted)
  }

  /* ---------------- LOGIC ---------------- */

  const visibleSteps = useMemo(() => {
    const activePhase = getActivePhase(phases, steps)

    const allowedPhaseIds = activePhase
      ? phases
          .filter(
            (p) =>
              p.order_index <= activePhase.order_index
          )
          .map((p) => p.id)
      : phases.map((p) => p.id)

    return steps.filter((s) =>
      allowedPhaseIds.includes(s.phase_id)
    )
  }, [steps, phases])

  /**
   * ✅ SCROLL AUTOMATICO
   * SOLO al primo ingresso nella pagina
   */
  useEffect(() => {
    if (
      hasAutoScrolled.current ||
      !visibleSteps.length
    )
      return

    const firstIncompleteIndex =
      visibleSteps.findIndex(
        (s) => !s.completed
      )

    const targetIndex =
      firstIncompleteIndex >= 0
        ? firstIncompleteIndex
        : 0

    hasAutoScrolled.current = true
    setCurrentIndex(targetIndex)

    requestAnimationFrame(() => {
      flatListRef.current?.scrollToIndex({
        index: targetIndex,
        animated: false,
      })
    })
  }, [visibleSteps])

  async function toggleCompleted(
    stepId: string,
    value: boolean
  ) {
    const updated = steps.map((s) =>
      s.id === stepId
        ? { ...s, completed: value }
        : s
    )

    const step = updated.find(
      (s) => s.id === stepId
    )

    if (step && value) {
      if (
        isPhaseCompleted(
          step.phase_id,
          updated
        )
      ) {
        router.push(
          `/course/phase-completed?phaseId=${step.phase_id}&courseId=${courseId}`
        )
      }
    }

    setSteps(updated)

    supabase
      .from('steps')
      .update({ completed: value })
      .eq('id', stepId)
      .then()
  }

  /* ---------------- HEADER INFO ---------------- */

  const currentStep = visibleSteps[currentIndex]

  const currentPhase = currentStep
    ? phases.find(
        (p) => p.id === currentStep.phase_id
      )
    : null

  const currentPhaseNumber = currentPhase
    ? currentPhase.order_index + 1
    : null

  /* ---------------- UI ---------------- */

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* HEADER */}
      <View
        style={{
          paddingTop: 28,
          paddingBottom: 6,
          paddingHorizontal: spacing.lg,
          alignItems: 'center',
        }}
      >
        <Pressable
          onPress={() => router.push('/')}
          style={{
            position: 'absolute',
            left: spacing.lg,
            top: 28,
          }}
        >
          <Text style={typography.backButton}>←</Text>
        </Pressable>

        <Text
          style={{
            ...typography.courseTitle,
            textAlign: 'center',
          }}
        >
          {courseTitle}
        </Text>

        {currentPhase && (
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: colors.mutedText,
              marginTop: 2,
              textAlign: 'center',
            }}
          >
            Fase {currentPhaseNumber} · {currentPhase.title}
          </Text>
        )}
      </View>

      {/* STEPS */}
      <FlatList
        ref={flatListRef}
        data={visibleSteps}
        horizontal
        pagingEnabled
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(
            e.nativeEvent.contentOffset.x / width
          )
          setCurrentIndex(index)
        }}
        renderItem={({ item }) => (
          <View
            style={{
              width,
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.lg,
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
