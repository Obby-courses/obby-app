import LoadingOverlay from '@/components/LoadingOverlay'
import { supabase } from '@/lib/supabase'
import { colors, radius, spacing, typography } from '@/lib/theme'
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router'
import { useEffect, useState } from 'react'
import { Pressable, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type Phase = {
  id: string
  title: string
  order_index: number
}

type Course = {
  title: string
  description: string
}

export default function PhaseCompletedScreen() {
  const { phaseId, courseId } =
    useLocalSearchParams<{
      phaseId: string
      courseId: string
    }>()

  const router = useRouter()

  const [phase, setPhase] = useState<Phase | null>(null)
  const [nextPhase, setNextPhase] = useState<Phase | null>(null)
  const [course, setCourse] = useState<Course | null>(null)

  const [loading, setLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [showSuccessOverlay, setShowSuccessOverlay] = useState(true)
  const [genError, setGenError] = useState<string | null>(null)
  const [nextPhaseHasSteps, setNextPhaseHasSteps] = useState(true)

  /* ---------------- ANIMATION ---------------- */

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSuccessOverlay(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  /* ---------------- LOAD ---------------- */

  useEffect(() => {
    if (!phaseId || !courseId) return
    loadPhase()
  }, [phaseId, courseId])

  async function loadPhase() {
    console.log('🔄 Loading phase and course context...')
    setLoading(true)

    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .select('title, description')
      .eq('id', courseId)
      .single()

    if (courseError || !courseData) {
      console.error('❌ Errore caricamento corso:', courseError)
      setLoading(false)
      return
    }
    setCourse(courseData)

    const { data: current, error: currentError } = await supabase
      .from('phases')
      .select('id, title, order_index')
      .eq('id', phaseId)
      .maybeSingle()

    if (currentError || !current) {
      console.error('❌ Errore caricamento fase:', currentError)
      setLoading(false)
      return
    }

    setPhase(current)

    const { data: nextData, error: nextError } = await supabase
      .from('phases')
      .select('id, title, order_index')
      .eq('course_id', courseId)
      .gt('order_index', current.order_index)
      .order('order_index')
      .limit(1)

    if (!nextError && nextData && nextData.length > 0) {
      const next = nextData[0]
      setNextPhase(next)
    } else {
      setNextPhase(null)
    }

    setLoading(false)
  }

  /* ---------------- CONTINUE ---------------- */
  function handleContinue() {
    router.replace(`/course/${courseId}`)
  }

  /* ---------------- UI ---------------- */
  const insets = useSafeAreaInsets()

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={typography.body}>Caricamento…</Text>
      </View>
    )
  }

  if (!phase) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', padding: spacing.lg }}>
        <Text style={typography.body}>Errore nel caricamento della fase</Text>
        <Pressable
          onPress={() => router.replace(`/course/${courseId}`)}
          style={{ marginTop: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, backgroundColor: colors.card, borderRadius: radius.md }}
        >
          <Text style={{ color: colors.textPrimary }}>Torna al corso</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, padding: spacing.lg, paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg, justifyContent: 'center' }}>
      <View style={{ backgroundColor: colors.card, borderRadius: radius.lg, padding: spacing.xl }}>
        <Text style={{ fontSize: 32, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm, textAlign: 'center' }}>🎉</Text>
        <Text style={{ ...typography.title, marginBottom: spacing.md, textAlign: 'center' }}>Fase completata</Text>
        <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg, textAlign: 'center' }}>
          Hai completato la fase{'\n'}
          <Text style={{ fontWeight: '600', color: colors.textPrimary }}>{phase.title}</Text>
        </Text>

        {genError && <Text style={{ color: '#ef4444', textAlign: 'center', marginBottom: spacing.md, fontSize: 14 }}>{genError}</Text>}

        {nextPhase ? (
          <>
            <Text style={{ ...typography.small, marginBottom: spacing.md, color: colors.mutedText, textAlign: 'center' }}>Prossima fase: {nextPhase.title}</Text>
            <Pressable
              onPress={handleContinue}
              disabled={isGenerating}
              style={{ backgroundColor: isGenerating ? colors.mutedText : colors.primaryButton, paddingVertical: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm }}
            >
              <Text style={{ color: '#ffffff', textAlign: 'center', fontWeight: '600', fontSize: 16 }}>
                {isGenerating ? 'Preparazione in corso...' : 'Continua'}
              </Text>
            </Pressable>
          </>
        ) : (
          <Pressable
            onPress={() => router.replace(`/course/${courseId}`)}
            style={{ backgroundColor: colors.primaryButton, paddingVertical: spacing.md, borderRadius: radius.md, marginBottom: spacing.sm }}
          >
            <Text style={{ color: '#ffffff', textAlign: 'center', fontWeight: '600', fontSize: 16 }}>Rivedi il corso</Text>
          </Pressable>
        )}

        <Pressable onPress={() => router.replace(`/course/${courseId}`)} disabled={isGenerating} style={{ paddingVertical: spacing.md }}>
          <Text style={{ textAlign: 'center', color: isGenerating ? colors.mutedText : colors.textSecondary, fontWeight: '500', fontSize: 15 }}>Torna al corso</Text>
        </Pressable>
      </View>
      <LoadingOverlay
        visible={showSuccessOverlay || isGenerating}
        status={showSuccessOverlay ? 'SUCCESS_PHASE' : 'GENERATING_MILESTONE'}
      />
    </View>
  )
}