import LoadingOverlay from '@/components/LoadingOverlay'
import SkillAssessment, { AssessmentQuestion } from '@/components/SkillAssessment'
import { LoadingStatus } from '@/lib/loadingMessages'
import { supabase } from '@/lib/supabase'
import { palette, radius, spacing, typography } from '@/lib/theme'
import { Ionicons } from '@expo/vector-icons'
import { Slider } from '@react-native-assets/slider'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Animated, Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../contexts/AuthContext'

/* =======================================================
    TIPI SINCRONIZZATI
   ======================================================= */
type Course = {
  title: string
  description: string
}

type SearchMode = 'video' | 'web' | 'mixed'

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY

export default function NewCourseAIScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [courseInput, setCourseInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>('CREATING_COURSE')
  const [error, setError] = useState<string | null>(null)
  const [stepsPerWeek, setStepsPerWeek] = useState(3)
  const [searchMode, setSearchMode] = useState<SearchMode>('mixed')

  // Skill Assessment state
  const [assessmentQuestions, setAssessmentQuestions] = useState<AssessmentQuestion[]>([])
  const [showAssessment, setShowAssessment] = useState(false)
  const assessmentResolveRef = useRef<((startIndex: number) => void) | null>(null)

  // Fade-in on mount
  const fadeAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start()
  }, [])

  async function handleGenerateComplete() {
    if (!courseInput.trim()) return
    setIsProcessing(true)
    setError(null)

    try {
      console.log('--- 🚀 START GENERATION ---')

      /* =======================================================
          STEP 1 — MACRO PHASES + COURSE CREATION
         ======================================================= */
      setLoadingStatus('CREATING_COURSE')

      const macroRes = await fetch(`${SUPABASE_URL}/functions/v1/create-macrophases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          topic: courseInput.trim(),
          userId: user?.id
        }),
      })

      const macroData = await macroRes.json()
      if (!macroRes.ok || !macroData.success) throw new Error(macroData.error || 'Errore Step 1')

      const courseId = macroData.courseId
      console.log('✅ STEP 1 OK. Course ID:', courseId)

      // AGGIORNA IL CORSO DIRETTAMENTE (senza toccare il backend)
      const daysPerStep = parseFloat((7 / stepsPerWeek).toFixed(2))
      const { error: updateError } = await supabase
        .from('courses')
        .update({ days_per_step: daysPerStep })
        .eq('id', courseId)

      if (updateError) console.error('Errore salvataggio days_per_step:', updateError)

      // Recuperiamo i testi reali generati dall'AI (Titolo e Descrizione del corso)
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('title, description')
        .eq('id', courseId)
        .single()

      if (courseError || !courseData) throw new Error('Errore caricamento dettagli corso')

      // Recupero le macro-fasi con keywords
      const { data: mPhases } = await supabase
        .from('macro_phases')
        .select('id, title, description, order_index, keywords')
        .eq('course_id', courseId)
        .order('order_index')

      if (!mPhases?.length) throw new Error('Nessuna macro-fase trovata')

      /* =======================================================
          STEP 1.5 — SKILL ASSESSMENT (Binary Search Quiz)
         ======================================================= */
      setLoadingStatus('GENERATING_ASSESSMENT')

      let startIndex = 0
      try {
        const quizRes = await fetch(`${SUPABASE_URL}/functions/v1/generate-quiz`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`
          },
          body: JSON.stringify({
            quizType: 'skill_assessment',
            courseId,
            courseTitle: courseData.title,
            macroPhases: mPhases.map(mp => ({
              id: mp.id,
              title: mp.title,
              keywords: mp.keywords || [],
              order_index: mp.order_index,
            })),
          }),
        })

        const quizData = await quizRes.json()
        console.log('🧠 Quiz data:', JSON.stringify(quizData))

        if (quizData.success && quizData.questions?.length > 0) {
          // Show assessment modal and wait for user response
          setAssessmentQuestions(quizData.questions)
          setShowAssessment(true)

          // Pause the generation flow until user completes the quiz
          startIndex = await new Promise<number>((resolve) => {
            assessmentResolveRef.current = resolve
          })

          setShowAssessment(false)
          console.log('✅ Assessment complete. Starting from macro-phase index:', startIndex)
        } else {
          console.warn('⚠️ Quiz generation failed, starting from beginning')
        }
      } catch (quizErr: any) {
        console.warn('⚠️ Assessment error (non-blocking):', quizErr.message)
        // Non-blocking: if quiz fails, just start from the beginning
      }

      const targetMacro = mPhases[startIndex]

      /* =======================================================
          STEP 2 — PHASES GENERATION
         ======================================================= */
      setLoadingStatus('GENERATING_PHASES')

      const phaseRes = await fetch(`${SUPABASE_URL}/functions/v1/create-phases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          courseId,
          courseTitle: courseData.title,
          macroPhaseId: targetMacro.id,
          macroPhaseTitle: targetMacro.title,
          macroPhaseDescription: targetMacro.description,
          orderIndex: targetMacro.order_index,
          priorKnowledge: mPhases.slice(0, startIndex).map(mp => ({
            title: mp.title,
            description: mp.description,
            keywords: mp.keywords
          }))
        }),
      })

      const phaseData = await phaseRes.json()
      if (!phaseRes.ok || !phaseData.success) throw new Error(phaseData.error || 'Errore Step 2')

      /* Delay di sincronizzazione DB */
      await new Promise((r) => setTimeout(r, 1500))

      // Recupero la prima fase effettiva per generare gli step
      const { data: phases } = await supabase
        .from('phases')
        .select('id, title, description')
        .eq('macro_phase_id', targetMacro.id)
        .order('order_index')

      if (!phases || phases.length === 0) throw new Error('Le fasi non sono ancora leggibili')
      const targetPhase = phases[0]

      /* =======================================================
          STEP 3 — STEPS (con contesto completo)
         ======================================================= */
      setLoadingStatus('GENERATING_STEPS')

      const stepsRes = await fetch(`${SUPABASE_URL}/functions/v1/create-steps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({
          courseId,
          phaseId: targetPhase.id,
          phaseTitle: targetPhase.title,
          phaseDescription: targetPhase.description,
          courseTitle: courseData.title,
          courseDescription: courseData.description,
          searchMode, // Passa la modalità scelta
          priorKnowledge: mPhases.slice(0, startIndex).map(mp => ({
            title: mp.title,
            description: mp.description,
            keywords: mp.keywords
          }))
        }),
      })

      const stepsData = await stepsRes.json()
      if (!stepsRes.ok || !stepsData.success) throw new Error(stepsData.error || 'Errore Step 3')
      console.log('✅ Step creati con successo')

      /* =======================================================
          STEP 4 — RESOURCES (Markdown e Link)
         ======================================================= */
      console.log('🔍 Generazione risorse in corso...')
      // Nota: qui potresti voler aggiungere uno stato di loading specifico se lo desideri

      const resourceRes = await fetch(`${SUPABASE_URL}/functions/v1/generate-resources-for-steps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          phaseId: targetPhase.id,
        }),
      })

      const resourceData = await resourceRes.json()
      console.log('📦 Risorse generate:', resourceData)

      /* =======================================================
          FINE — NAVIGAZIONE
         ======================================================= */
      console.log('🎉 PROCESSO COMPLETATO')
      router.push(`/course/${courseId}`)

    } catch (err: any) {
      console.error('❌ Errore durante la creazione del corso:', err.message)
      setError(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  const insets = useSafeAreaInsets()

  return (
    <Animated.View style={{ flex: 1, backgroundColor: palette.white, opacity: fadeAnim }}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xl
        }}
        showsVerticalScrollIndicator={false}
      >

        {/* Pulsante Indietro */}
        <Pressable onPress={() => router.back()} style={{ width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: palette.black, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.xl }}>
          <Ionicons name="arrow-back" size={24} color={palette.black} />
        </Pressable>

        <Text style={{ ...typography.title, marginBottom: 8 }}>
          AI Builder
        </Text>

        <Text style={{ ...typography.body, color: palette.gray, marginBottom: spacing.xl }}>
          Descrivi cosa vuoi imparare e l'AI creerà un percorso su misura per te.
        </Text>

        <View style={{ position: 'relative' }}>
          <TextInput
            value={courseInput}
            onChangeText={setCourseInput}
            placeholder="Es. Corso intensivo di cucina giapponese per principianti"
            placeholderTextColor={palette.gray}
            multiline
            style={{
              ...typography.body,
              backgroundColor: palette.lightGray,
              borderRadius: 32,
              padding: 24,
              minHeight: 180,
              borderWidth: 2,
              borderColor: palette.border,
              textAlignVertical: 'top',
              color: palette.black
            }}
          />
          {courseInput.trim().length > 0 && !isProcessing && (
            <Pressable
              onPress={handleGenerateComplete}
              style={{
                position: 'absolute',
                bottom: -20,
                alignSelf: 'center',
                backgroundColor: palette.black,
                paddingHorizontal: 32,
                paddingVertical: 14,
                borderRadius: 24,
                elevation: 4,
                shadowColor: palette.black,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
              }}
            >
              <Text style={{ color: palette.white, fontWeight: '800', fontSize: 16 }}>GENERA ORA</Text>
            </Pressable>
          )}
        </View>

        {/* SLIDER PER IL TEMPO */}
        <View style={{ marginTop: 60 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={{ ...typography.body, fontWeight: '800' }}>
              Pace dell'apprendimento
            </Text>
            <View style={{ backgroundColor: palette.black, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
              <Text style={{ color: palette.white, fontWeight: '800', fontSize: 13 }}>
                {stepsPerWeek} step / sett
              </Text>
            </View>
          </View>

          <Slider
            value={stepsPerWeek}
            minimumValue={1}
            maximumValue={7}
            step={1}
            onValueChange={setStepsPerWeek}
            minimumTrackTintColor={palette.black}
            maximumTrackTintColor={palette.lightGray}
            thumbSize={28}
            thumbTintColor={palette.black}
            trackHeight={10}
          />

          <Text style={{ color: palette.gray, fontSize: 14, fontWeight: '600', marginTop: spacing.sm }}>
            {stepsPerWeek <= 2 ? (
              <><Ionicons name="flag-outline" size={14} /> Passo rilassato</>
            ) : stepsPerWeek <= 5 ? (
              <><Ionicons name="flash-outline" size={14} /> Passo costante</>
            ) : (
              <><Ionicons name="flame-outline" size={14} /> Passo intensivo</>
            )}
          </Text>
        </View>

        {/* SELECTOR: RESOURCE TYPE */}
        <View style={{ marginTop: spacing.xl }}>
          <Text style={{ ...typography.body, fontWeight: '800', marginBottom: spacing.md }}>
            Tipo di Risorse
          </Text>
          <View style={{ flexDirection: 'row', backgroundColor: palette.lightGray, borderRadius: 24, padding: 6, borderWidth: 2, borderColor: palette.border }}>
            {(['video', 'mixed', 'web'] as const).map((mode) => {
              const isActive = searchMode === mode
              const labels = { video: 'Video', mixed: 'Misto', web: 'Web' }
              const icons = { video: 'play-outline', mixed: 'sparkles-outline', web: 'globe-outline' } as const

              return (
                <Pressable
                  key={mode}
                  onPress={() => setSearchMode(mode)}
                  style={{
                    flex: 1,
                    paddingVertical: 12,
                    borderRadius: 20,
                    backgroundColor: isActive ? palette.black : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Text style={{
                    color: isActive ? palette.white : palette.black,
                    fontWeight: '800',
                    fontSize: 14
                  }}>
                    <Ionicons name={icons[mode]} size={16} color={isActive ? palette.white : palette.black} /> {labels[mode]}
                  </Text>
                </Pressable>
              )
            })}
          </View>
        </View>

        {isProcessing && (
          <View
            style={{
              backgroundColor: palette.black,
              padding: spacing.md,
              borderRadius: radius.md,
              marginTop: spacing.xl,
              opacity: 0.6,
              elevation: 2
            }}
          >
            <Text style={{ color: palette.white, textAlign: 'center', fontWeight: '700', fontSize: 18 }}>
              Costruendo il tuo percorso...
            </Text>
          </View>
        )}

        {/* Box Errore */}
        {error && (
          <View style={{
            marginTop: spacing.xl,
            padding: 20,
            backgroundColor: '#FFEBEB',
            borderRadius: 24,
            borderWidth: 2,
            borderColor: '#FF4444'
          }}>
            <Text style={{ color: '#FF4444', fontWeight: '900', marginBottom: 4 }}>
              <Ionicons name="warning-outline" size={16} color="#FF4444" /> ERRORE
            </Text>
            <Text style={{ color: '#666', fontSize: 14, fontWeight: '500' }}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Overlay di caricamento con messaggi dinamici */}
      <LoadingOverlay visible={isProcessing && !showAssessment} status={loadingStatus} />

      {/* Skill Assessment Modal */}
      <Modal
        visible={showAssessment}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <SkillAssessment
          questions={assessmentQuestions}
          onComplete={(startIndex) => {
            if (assessmentResolveRef.current) {
              assessmentResolveRef.current(startIndex)
              assessmentResolveRef.current = null
            }
          }}
        />
      </Modal>
    </Animated.View>
  )
}