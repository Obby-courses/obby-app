import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native'
import { useCallback, useState, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter, useFocusEffect } from 'expo-router'
import {
  colors,
  spacing,
  typography,
  radius,
} from '@/lib/theme'

type Step = {
  id: string
  completed: boolean
}

type Phase = {
  id: string
  title: string
  order_index: number
  steps: Step[]
}

type Course = {
  id: string
  title: string
  description: string
  phases: Phase[]
}

export default function Index() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useFocusEffect(
    useCallback(() => {
      loadCourses()
    }, [])
  )

  async function loadCourses() {
    setLoading(true)
    
    const { data, error } = await supabase
      .from('courses')
      .select(`
        id,
        title,
        description,
        phases (
          id,
          title,
          order_index,
          steps (
            id,
            completed
          )
        )
      `)
      .order('order_index', { foreignTable: 'phases' })

    if (!error && data) {
      setCourses(data as Course[])
    }
    
    setLoading(false)
  }

  const getActivePhase = useMemo(() => {
    return (phases: Phase[]) => {
      if (!phases?.length) return null

      const active = phases.find((phase) =>
        phase.steps.some((step) => !step.completed)
      )

      return active || phases[phases.length - 1]
    }
  }, [])

  const renderCourse = useCallback(({ item }: { item: Course }) => {
    const activePhase = getActivePhase(item.phases)

    const steps = activePhase?.steps || []
    const totalSteps = steps.length
    const completedSteps = steps.filter(
      (s) => s.completed
    ).length

    const progress =
      totalSteps === 0 ? 0 : completedSteps / totalSteps

    return (
      <Pressable
        style={styles.course}
        onPress={() => router.push(`/course/${item.id}`)}
      >
        <Text style={styles.courseTitle}>{item.title}</Text>

        {!!item.description && (
          <Text style={styles.courseDesc}>
            {item.description}
          </Text>
        )}

        {!!activePhase && (
          <Text style={styles.phaseTitle}>
            Fase attiva · {activePhase.title}
          </Text>
        )}

        <View style={styles.progressContainer}>
          <View style={styles.progressBarBackground}>
            <View
              style={[
                styles.progressBarFill,
                { width: `${progress * 100}%` },
              ]}
            />
          </View>

          <Text style={styles.progressText}>
            {completedSteps}/{totalSteps} step completati
          </Text>
        </View>
      </Pressable>
    )
  }, [router, getActivePhase])

  const keyExtractor = useCallback((item: Course) => item.id, [])

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* HEADER CON BOTTONE */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Obby</Text>
          <Text style={styles.subtitle}>I tuoi corsi</Text>
        </View>
        
        <Pressable
          onPress={() => router.push('/new-course')}
          style={styles.addButton}
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      <FlatList
        data={courses}
        keyExtractor={keyExtractor}
        renderItem={renderCourse}
        removeClippedSubviews={true}
        maxToRenderPerBatch={5}
        windowSize={10}
        initialNumToRender={5}
        contentContainerStyle={
          courses.length === 0 && styles.emptyList
        }
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            Nessun corso disponibile
          </Text>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.background,
  },

  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },

  addButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.primaryButton,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  addButtonText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
  },

  title: {
    ...typography.title,
    marginBottom: spacing.xs,
  },

  subtitle: {
    ...typography.small,
  },

  course: {
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },

  courseTitle: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },

  courseDesc: {
    ...typography.small,
    marginBottom: spacing.sm,
  },

  phaseTitle: {
    fontSize: 13,
    color: colors.mutedText,
    marginBottom: spacing.sm,
  },

  progressContainer: {
    marginTop: spacing.sm,
  },

  progressBarBackground: {
    height: 6,
    backgroundColor: colors.textSecondary,
    opacity: 0.15,
    borderRadius: 4,
    overflow: 'hidden',
  },

  progressBarFill: {
    height: 6,
    backgroundColor: colors.accent,
  },

  progressText: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textSecondary,
  },

  emptyList: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
})