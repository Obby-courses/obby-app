import { View, Text, Pressable } from 'react-native'
import { useEffect, useState } from 'react'
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router'
import { supabase } from '@/lib/supabase'
import { colors, spacing, typography, radius } from '@/lib/theme'

type Phase = {
  id: string
  title: string
  order_index: number
}

export default function PhaseCompletedScreen() {
  const { phaseId, courseId } =
    useLocalSearchParams<{
      phaseId: string
      courseId: string
    }>()

  const router = useRouter()

  const [phase, setPhase] = useState<Phase | null>(
    null
  )
  const [nextPhase, setNextPhase] =
    useState<Phase | null>(null)
  const [loading, setLoading] = useState(true)

  /* ---------------- LOAD ---------------- */

  useEffect(() => {
    console.log('📄 PhaseComplete mounted')
    console.log('📄 Params:', { phaseId, courseId })
    
    if (!phaseId || !courseId) {
      console.log('❌ Missing params!')
      return
    }
    loadPhase()
  }, [phaseId, courseId])

  async function loadPhase() {
    console.log('🔄 Loading phase...')
    setLoading(true)

    // FIX 1: Usa .maybeSingle() invece di .single()
    const { data: current, error: currentError } = await supabase
      .from('phases')
      .select('id, title, order_index')
      .eq('id', phaseId)
      .maybeSingle()

    console.log('📦 Current phase:', current)
    console.log('⚠️ Error:', currentError)

    if (currentError || !current) {
      console.error('❌ Errore caricamento fase:', currentError)
      setLoading(false)
      return
    }

    setPhase(current)

    // FIX 2: Rimuovi .single(), usa .maybeSingle() o controlla array
    const { data: nextData, error: nextError } = await supabase
      .from('phases')
      .select('id, title, order_index')
      .eq('course_id', courseId)
      .gt('order_index', current.order_index)
      .order('order_index')
      .limit(1)

    console.log('📦 Next phase data:', nextData)

    // Se c'è un array vuoto, va bene (nessuna fase successiva)
    if (!nextError && nextData && nextData.length > 0) {
      setNextPhase(nextData[0])
    } else {
      setNextPhase(null)
    }

    setLoading(false)
    console.log('✅ Phase loaded successfully')
  }

  /* ---------------- UI ---------------- */

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text style={typography.body}>
          Caricamento…
        </Text>
      </View>
    )
  }

  if (!phase) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: colors.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.lg,
        }}
      >
        <Text style={typography.body}>
          Errore nel caricamento della fase
        </Text>
        <Pressable
          onPress={() =>
            router.replace(
              `/course/${courseId}`
            )
          }
          style={{
            marginTop: spacing.md,
            paddingVertical: spacing.sm,
            paddingHorizontal: spacing.md,
            backgroundColor: colors.card,
            borderRadius: radius.md,
          }}
        >
          <Text style={{ color: colors.textPrimary }}>
            Torna al corso
          </Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        padding: spacing.lg,
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          backgroundColor: colors.card,
          borderRadius: radius.lg,
          padding: spacing.xl,
        }}
      >
        <Text
          style={{
            fontSize: 32,
            fontWeight: '700',
            color: colors.textPrimary,
            marginBottom: spacing.sm,
            textAlign: 'center',
          }}
        >
          🎉
        </Text>

        <Text
          style={{
            ...typography.title,
            marginBottom: spacing.md,
            textAlign: 'center',
          }}
        >
          Fase completata
        </Text>

        <Text
          style={{
            ...typography.body,
            color: colors.textSecondary,
            marginBottom: spacing.lg,
            textAlign: 'center',
          }}
        >
          Hai completato la fase{'\n'}
          <Text
            style={{ 
              fontWeight: '600',
              color: colors.textPrimary,
            }}
          >
            {phase.title}
          </Text>
        </Text>

        {/* CASO: ESISTE FASE SUCCESSIVA */}
        {nextPhase ? (
          <>
            <Text
              style={{
                ...typography.small,
                marginBottom: spacing.md,
                color: colors.mutedText,
                textAlign: 'center',
              }}
            >
              Prossima fase: {nextPhase.title}
            </Text>

            <Pressable
              onPress={() =>
                router.replace(
                  `/course/${courseId}`
                )
              }
              style={{
                backgroundColor: colors.primaryButton,
                paddingVertical: spacing.md,
                borderRadius: radius.md,
                marginBottom: spacing.sm,
              }}
            >
              <Text
                style={{
                  color: '#ffffff',
                  textAlign: 'center',
                  fontWeight: '600',
                  fontSize: 16,
                }}
              >
                Continua
              </Text>
            </Pressable>
          </>
        ) : (
          /* CASO: NESSUNA FASE SUCCESSIVA */
          <>
            <Text
              style={{
                ...typography.small,
                color: colors.mutedText,
                marginBottom: spacing.md,
                textAlign: 'center',
              }}
            >
              Hai completato tutte le fasi disponibili 🎯
            </Text>

            <Pressable
              onPress={() =>
                router.replace(
                  `/course/${courseId}`
                )
              }
              style={{
                backgroundColor: colors.primaryButton,
                paddingVertical: spacing.md,
                borderRadius: radius.md,
                marginBottom: spacing.sm,
              }}
            >
              <Text
                style={{
                  color: '#ffffff',
                  textAlign: 'center',
                  fontWeight: '600',
                  fontSize: 16,
                }}
              >
                Rivedi il corso
              </Text>
            </Pressable>
          </>
        )}

        {/* TORNA AL CORSO (SEMPRE) */}
        <Pressable
          onPress={() =>
            router.replace(
              `/course/${courseId}`
            )
          }
          style={{
            paddingVertical: spacing.md,
          }}
        >
          <Text
            style={{
              textAlign: 'center',
              color: colors.textSecondary,
              fontWeight: '500',
              fontSize: 15,
            }}
          >
            Torna al corso
          </Text>
        </Pressable>
      </View>
    </View>
  )
}