import LoadingOverlay from '@/components/LoadingOverlay'
import { LoadingStatus } from '@/lib/loadingMessages'
import { supabase } from '@/lib/supabase'
import { colors, layout, radius, spacing, typography } from '@/lib/theme'
import { Slider } from '@react-native-assets/slider'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../contexts/AuthContext'

/* =======================================================
    TIPI SINCRONIZZATI
   ======================================================= */
type Course = {
  title: string
  description: string
}

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

      // Recupero le macro-fasi per trovare la prima
      const { data: mPhases } = await supabase
        .from('macro_phases')
        .select('id, title, description, order_index')
        .eq('course_id', courseId)
        .order('order_index')

      if (!mPhases?.length) throw new Error('Nessuna macro-fase trovata')
      const targetMacro = mPhases[0]

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
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          padding: layout.screenPadding,
          paddingTop: insets.top + spacing.md,
          paddingBottom: insets.bottom + spacing.xl
        }}
        bounces={false}
        alwaysBounceVertical={false}
      >

        {/* Pulsante Indietro */}
        <Pressable onPress={() => router.back()} style={{ marginBottom: spacing.md }}>
          <Text style={{ fontSize: 32, color: colors.primaryButton }}>←</Text>
        </Pressable>

        <Text style={{ ...typography.title, color: '#000000', marginBottom: spacing.sm }}>
          AI Builder
        </Text>

        <Text style={{ ...typography.body, color: '#000000', marginBottom: spacing.lg }}>
          Descrivi cosa vuoi imparare e l'AI creerà un percorso su misura per te.
        </Text>

        <View style={{ position: 'relative' }}>
          <TextInput
            value={courseInput}
            onChangeText={setCourseInput}
            placeholder="Es. Corso intensivo di cucina giapponese per principianti"
            placeholderTextColor={colors.mutedText}
            multiline
            style={{
              ...typography.body,
              backgroundColor: colors.card,
              borderRadius: radius.md,
              padding: spacing.md,
              paddingRight: 60,
              minHeight: 200,
              borderWidth: 1,
              borderColor: colors.border,
              textAlignVertical: 'top',
              color: '#000000'
            }}
          />
          {courseInput.trim().length > 0 && !isProcessing && (
            <Pressable
              onPress={handleGenerateComplete}
              style={{
                position: 'absolute',
                top: spacing.sm,
                right: spacing.sm,
                backgroundColor: colors.primaryButton,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radius.sm,
                elevation: 2,
              }}
            >
              <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>VAI</Text>
            </Pressable>
          )}
        </View>

        {/* SLIDER PER IL TEMPO */}
        <View style={{ marginTop: spacing.xl }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={{ ...typography.body, color: '#000000', fontWeight: '700' }}>
              Pace dell'apprendimento
            </Text>
            <View style={{ backgroundColor: colors.primaryButton, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
              <Text style={{ color: '#FFF', fontWeight: '800', fontSize: 13 }}>
                {stepsPerWeek} {stepsPerWeek === 1 ? 'step' : 'step'} / sett
              </Text>
            </View>
          </View>

          <Slider
            value={stepsPerWeek}
            minimumValue={1}
            maximumValue={7}
            step={1}
            onValueChange={setStepsPerWeek}
            minimumTrackTintColor={colors.mutedText}
            maximumTrackTintColor="#EEEEEE"
            thumbSize={24}
            thumbTintColor={colors.mutedText}
            trackHeight={8}
          />

          <Text style={{ color: colors.mutedText, fontSize: 13, marginTop: spacing.xs }}>
            {stepsPerWeek <= 2 ? '🏁 Passo rilassato' : stepsPerWeek <= 5 ? '⚡ Passo costante' : '🔥 Passo intensivo'}
          </Text>
        </View>

        {isProcessing && (
          <View
            style={{
              backgroundColor: colors.primaryButton,
              padding: spacing.md,
              borderRadius: radius.md,
              marginTop: spacing.xl,
              opacity: 0.6,
              elevation: 2
            }}
          >
            <Text style={{ color: '#FFF', textAlign: 'center', fontWeight: '700', fontSize: 18 }}>
              Costruendo il tuo percorso...
            </Text>
          </View>
        )}

        {/* Box Errore */}
        {error && (
          <View style={{
            marginTop: spacing.xl,
            padding: spacing.md,
            backgroundColor: '#331111',
            borderRadius: radius.md,
            borderWidth: 1,
            borderColor: '#FF4444'
          }}>
            <Text style={{ color: '#FF8080', fontWeight: 'bold', marginBottom: 4 }}>⚠️ ERRORE GENERAZIONE:</Text>
            <Text style={{ color: '#FFCCCC', fontSize: 14 }}>{error}</Text>
          </View>
        )}
      </ScrollView>

      {/* Overlay di caricamento con messaggi dinamici */}
      <LoadingOverlay visible={isProcessing} status={loadingStatus} />
    </View>
  )
}