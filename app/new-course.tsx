import LoadingOverlay from '@/components/LoadingOverlay'
import SkillAssessment, { AssessmentQuestion } from '@/components/SkillAssessment'
import ToolAssessment, { ToolAssessmentResult, ToolQuestion } from '@/components/ToolAssessment'
import { LoadingStatus } from '@/lib/loadingMessages'
import { supabase } from '@/lib/supabase'
import { palette, radius, spacing, typography } from '@/lib/theme'
import { Ionicons } from '@expo/vector-icons'
import { Slider } from '@react-native-assets/slider'
import { useRouter } from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import { Animated, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from 'react-native'
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
  const { user, profile } = useAuth()
  const router = useRouter()
  const [courseInput, setCourseInput] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [loadingStatus, setLoadingStatus] = useState<LoadingStatus>('CREATING_COURSE')
  const [bulkProgressLabel, setBulkProgressLabel] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [stepsPerWeek, setStepsPerWeek] = useState(3)
  const [searchMode, setSearchMode] = useState<SearchMode>('mixed')
  const [isBulkMode, setIsBulkMode] = useState(false)

  // Language prefs from user profile
  const primaryLanguage = profile?.primary_language || 'it'
  const secondaryLanguages = profile?.secondary_languages || ['en']

  // Skill Assessment state
  const [assessmentQuestions, setAssessmentQuestions] = useState<AssessmentQuestion[]>([])
  const [showAssessment, setShowAssessment] = useState(false)
  const assessmentResolveRef = useRef<((startIndex: number) => void) | null>(null)

  // Tool Assessment state
  const [toolQuestions, setToolQuestions] = useState<ToolQuestion[]>([])
  const [showToolAssessment, setShowToolAssessment] = useState(false)
  const toolAssessmentResolveRef = useRef<((result: ToolAssessmentResult) => void) | null>(null)

  // Fade-in on mount
  const fadeAnim = useRef(new Animated.Value(0)).current
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start()
  }, [])

  /* =======================================================
      BULK DEV GENERATION (usa generate-skeleton)
     ======================================================= */
  async function handleBulkGenerate() {
    if (!courseInput.trim()) return
    setIsProcessing(true)
    setError(null)
    setLoadingStatus('BULK_GENERATING')

    try {
      /* STEP 1 — SCHELETRO UNIFICATO (Macro + Fasi in una sola chiamata) */
      setBulkProgressLabel('🏗️ Generazione scheletro completo del corso...')
      const skeletonRes = await fetch(`${SUPABASE_URL}/functions/v1/generate-skeleton`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ topic: courseInput.trim(), userId: user?.id }),
      })
      const skeletonData = await skeletonRes.json()
      if (!skeletonRes.ok || !skeletonData.success) throw new Error(skeletonData.error || 'Errore generazione scheletro')

      const courseId = skeletonData.courseId
      const mPhases = skeletonData.macro_phases // già include id, title, description, keywords, phases[]
      const totalMacros = mPhases.length

      setBulkProgressLabel(`✅ Scheletro creato: ${totalMacros} macrofasi, ${skeletonData.total_phases} fasi totali`)

      const daysPerStep = parseFloat((7 / stepsPerWeek).toFixed(2))
      await supabase.from('courses').update({ days_per_step: daysPerStep }).eq('id', courseId)

      const { data: courseData } = await supabase
        .from('courses').select('title, description').eq('id', courseId).single()

      /* STEP 2..N — per ogni fase nello scheletro: step → resources → milestone */
      let totalSteps = 0

      for (let mi = 0; mi < mPhases.length; mi++) {
        const macro = mPhases[mi]
        const phases = macro.phases || []

        for (let pi = 0; pi < phases.length; pi++) {
          const phase = phases[pi]
          let stepsCreatedInThisPhase = 0

          if (pi > 0 || mi > 0) {
            setBulkProgressLabel(
              `⏳ Attesa API...\n(Totali: ${totalSteps} step)`
            )
            await new Promise(r => setTimeout(r, 3000))
          }

          /* Steps */
          setBulkProgressLabel(
            `📋 Generazione Step...\n${phase.title}\n(Totali: ${totalSteps})`
          )
          try {
            const stepsRes = await fetch(`${SUPABASE_URL}/functions/v1/create-steps`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
              body: JSON.stringify({
                courseId,
                phaseId: phase.id,
                phaseTitle: phase.title,
                phaseDescription: phase.description,
                courseTitle: courseData?.title,
                courseDescription: courseData?.description,
                searchMode,
                primaryLanguage,
                secondaryLanguages,
                priorKnowledge: mPhases.slice(0, mi).map((mp: any) => ({ title: mp.title, description: mp.description, keywords: mp.keywords }))
              }),
            })
            const stepsData = await stepsRes.json()
            if (stepsData.success && stepsData.created_steps_count) {
              stepsCreatedInThisPhase = stepsData.created_steps_count
              totalSteps += stepsCreatedInThisPhase
              console.log(`✅ ${stepsCreatedInThisPhase} step creati per "${phase.title}"`)
            }
          } catch (stepErr: any) {
            // Silently continue
          }

          /* Resources */
          if (stepsCreatedInThisPhase > 0) {
            setBulkProgressLabel(
              `🔗 Recupero Risorse...\n${phase.title}`
            )
            try {
              await fetch(`${SUPABASE_URL}/functions/v1/generate-resources-for-steps`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
                body: JSON.stringify({ phaseId: phase.id, primaryLanguage, secondaryLanguages }),
              })
            } catch (resErr: any) {
              // Silently continue
            }
          }

        }
      }

      setBulkProgressLabel(`✅ Completato! ${totalSteps} step generati in ${skeletonData.total_phases} fasi.`)

      /* FINALLY: PUBLISH COURSE */
      await supabase.from('courses').update({ is_published: true }).eq('id', courseId)

      await new Promise(r => setTimeout(r, 800))
      router.push(`/course/${courseId}`)

    } catch (err: any) {
      console.error('❌ Bulk generation error:', err.message)
      setError(err.message)
    } finally {
      setIsProcessing(false)
      setBulkProgressLabel('')
    }
  }

  /* =======================================================
      NORMAL GENERATION (usa generate-skeleton)
     ======================================================= */
  async function handleGenerateComplete() {
    if (!courseInput.trim()) return
    setIsProcessing(true)
    setError(null)

    try {
      /* STEP 1 — SCHELETRO UNIFICATO (Macro + Fasi) */
      setLoadingStatus('CREATING_COURSE')

      const skeletonRes = await fetch(`${SUPABASE_URL}/functions/v1/generate-skeleton`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ topic: courseInput.trim(), userId: user?.id }),
      })

      const skeletonText = await skeletonRes.text()
      let skeletonData: any
      try {
        skeletonData = JSON.parse(skeletonText)
      } catch (e) {
        console.error('❌ Failed to parse skeleton JSON. Raw response:', skeletonText)
        throw new Error(`Server returned HTML instead of JSON. Status: ${skeletonRes.status}`)
      }

      if (!skeletonRes.ok || !skeletonData.success) throw new Error(skeletonData.error || 'Errore generazione scheletro')

      const courseId = skeletonData.courseId
      const mPhases: any[] = skeletonData.macro_phases

      const daysPerStep = parseFloat((7 / stepsPerWeek).toFixed(2))
      const { error: updateError } = await supabase
        .from('courses').update({ days_per_step: daysPerStep }).eq('id', courseId)

      if (updateError) console.error('Errore salvataggio days_per_step:', updateError)

      const { data: courseData, error: courseError } = await supabase
        .from('courses').select('title, description').eq('id', courseId).single()

      if (courseError || !courseData) throw new Error('Errore caricamento dettagli corso')

      /* STEP 1.5 — SKILL ASSESSMENT */
      setLoadingStatus('GENERATING_ASSESSMENT')

      let startMacroIndex = 0
      try {
        const quizRes = await fetch(`${SUPABASE_URL}/functions/v1/generate-quiz`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({
            quizType: 'skill_assessment',
            courseId,
            courseTitle: courseData.title,
            macroPhases: mPhases.map(mp => ({ id: mp.id, title: mp.title, keywords: mp.keywords || [], order_index: mp.order_index })),
          }),
        })

        const quizData = await quizRes.json()

        if (quizData.success && quizData.questions?.length > 0) {
          setAssessmentQuestions(quizData.questions)
          setShowAssessment(true)

          startMacroIndex = await new Promise<number>((resolve) => {
            assessmentResolveRef.current = resolve
          })

          setShowAssessment(false)
        } else {
          console.warn('⚠️ Quiz generation failed, starting from beginning')
        }
      } catch (quizErr: any) {
        console.warn('⚠️ Assessment error (non-blocking):', quizErr.message)
      }

      /* STEP 1.6 — TOOL ASSESSMENT */
      let toolResult: ToolAssessmentResult | null = null
      try {
        const toolRes = await fetch(`${SUPABASE_URL}/functions/v1/generate-quiz`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({
            quizType: 'tool_assessment',
            courseId,
            courseTitle: courseData.title,
            macroPhases: mPhases.map((mp: any) => ({ id: mp.id, title: mp.title, keywords: mp.keywords || [], order_index: mp.order_index })),
          }),
        })
        const toolData = await toolRes.json()

        if (toolData.success && toolData.tool_questions?.length > 0) {
          setToolQuestions(toolData.tool_questions)
          setShowToolAssessment(true)

          toolResult = await new Promise<ToolAssessmentResult>((resolve) => {
            toolAssessmentResolveRef.current = resolve
          })

          setShowToolAssessment(false)
        } else {
          console.log('✅ Nessuno strumento speciale richiesto per questo corso')
        }
      } catch (toolErr: any) {
        console.warn('⚠️ Tool assessment error (non-blocking):', toolErr.message)
      }

      /* Identifica la prima fase dalla macro di partenza */
      const targetMacro = mPhases[startMacroIndex]
      const targetPhase = targetMacro?.phases?.[0]

      if (!targetPhase?.id) throw new Error('Nessuna fase trovata nel percorso generato')

      /* STEP 2 — STEPS per la prima fase */
      setLoadingStatus('GENERATING_STEPS')

      const stepsRes = await fetch(`${SUPABASE_URL}/functions/v1/create-steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          courseId,
          phaseId: targetPhase.id,
          phaseTitle: targetPhase.title,
          phaseDescription: targetPhase.description,
          courseTitle: courseData.title,
          courseDescription: courseData.description,
          searchMode,
          primaryLanguage,
          secondaryLanguages,
          priorKnowledge: mPhases.slice(0, startMacroIndex).map((mp: any) => ({ title: mp.title, description: mp.description, keywords: mp.keywords })),
          toolStrategy: toolResult?.toolStrategy !== 'none' ? toolResult?.toolStrategy : undefined,
          missingTools: toolResult?.missingTools,
          availableTools: toolResult?.availableTools,
        }),
      })

      const stepsData = await stepsRes.json()
      if (!stepsRes.ok || !stepsData.success) throw new Error(stepsData.error || 'Errore Step 2')

      /* STEP 3 — RESOURCES */
      await fetch(`${SUPABASE_URL}/functions/v1/generate-resources-for-steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ phaseId: targetPhase.id, primaryLanguage, secondaryLanguages }),
      })

      /* FINALLY: PUBLISH COURSE */
      await supabase.from('courses').update({ is_published: true }).eq('id', courseId)

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
              borderColor: isBulkMode ? '#F97316' : palette.border,
              textAlignVertical: 'top',
              color: palette.black
            }}
          />
          {courseInput.trim().length > 0 && !isProcessing && (
            <Pressable
              onPress={isBulkMode ? handleBulkGenerate : handleGenerateComplete}
              style={{
                position: 'absolute',
                bottom: -20,
                alignSelf: 'center',
                backgroundColor: isBulkMode ? '#F97316' : palette.black,
                paddingHorizontal: 32,
                paddingVertical: 14,
                borderRadius: 24,
                elevation: 4,
                shadowColor: isBulkMode ? '#F97316' : palette.black,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
              }}
            >
              {isBulkMode && <Ionicons name="construct-outline" size={18} color={palette.white} />}
              <Text style={{ color: palette.white, fontWeight: '800', fontSize: 16 }}>
                {isBulkMode ? 'BULK GENERATE' : 'GENERA ORA'}
              </Text>
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

        {/* ⚡ DEV BULK MODE TOGGLE */}
        <View style={{
          marginTop: spacing.xl,
          backgroundColor: isBulkMode ? '#FFF7ED' : '#F5F5F5',
          borderRadius: 20,
          padding: 18,
          borderWidth: 2,
          borderColor: isBulkMode ? '#F97316' : 'transparent',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <View style={{ flex: 1, marginRight: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <Ionicons name="construct-outline" size={18} color={isBulkMode ? '#F97316' : '#999'} />
              <Text style={{ fontWeight: '900', fontSize: 15, color: isBulkMode ? '#F97316' : '#555' }}>
                Bulk Dev Mode
              </Text>
              <View style={{ backgroundColor: isBulkMode ? '#F97316' : '#999', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900' }}>DEV</Text>
              </View>
            </View>
            <Text style={{ fontSize: 12, color: '#888', fontWeight: '500', lineHeight: 16 }}>
              {isBulkMode
                ? 'Genererà TUTTO il corso (6 macro × 4 fasi × step + milestone). Tempo: 3–8 min.'
                : 'Attiva per generare una fotografia completa del corso per analisi.'
              }
            </Text>
          </View>
          <Switch
            value={isBulkMode}
            onValueChange={setIsBulkMode}
            trackColor={{ false: '#DDD', true: '#FDBA74' }}
            thumbColor={isBulkMode ? '#F97316' : '#FFF'}
          />
        </View>

        {/* Bulk progress label */}
        {isProcessing && isBulkMode && bulkProgressLabel.length > 0 && (
          <View style={{
            backgroundColor: '#FFF7ED',
            padding: spacing.md,
            borderRadius: radius.md,
            marginTop: spacing.xl,
            borderWidth: 2,
            borderColor: '#F97316',
          }}>
            <Text style={{ color: '#F97316', textAlign: 'center', fontWeight: '700', fontSize: 14 }}>
              {bulkProgressLabel}
            </Text>
          </View>
        )}

        {isProcessing && !isBulkMode && (
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
      <LoadingOverlay
        visible={isProcessing && !showAssessment}
        status={loadingStatus}
        customSubtitle={isBulkMode ? bulkProgressLabel : undefined}
      />


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

      {/* Tool Assessment Modal */}
      <Modal
        visible={showToolAssessment}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <ToolAssessment
          toolQuestions={toolQuestions}
          onComplete={(result) => {
            if (toolAssessmentResolveRef.current) {
              toolAssessmentResolveRef.current(result)
              toolAssessmentResolveRef.current = null
            }
          }}
        />
      </Modal>
    </Animated.View>
  )
}