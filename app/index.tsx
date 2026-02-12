import WeeklyCalendar from '@/components/WeeklyCalendar'
import { getCourseColor } from '@/constants/courseColors'
import { useFocusEffect, useRouter } from 'expo-router'
import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { colors, palette, radius, spacing, typography } from '../lib/theme'

/* =======================
   TIPI
======================= */
type Step = {
  id: string
  completed: boolean
  order_index: number
  created_at: string
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
  created_at: string
  days_per_step: number | null
  phases: Phase[]
}

/* =======================
   COMPONENTE PRINCIPALE
======================= */
export default function Index() {
  const [courses, setCourses] = useState<Course[]>([])
  const [coursesLoading, setCoursesLoading] = useState(true)

  // STATI PER ELIMINAZIONE
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { user, profile, loading: authLoading } = useAuth()
  const router = useRouter()

  // Carica i corsi ogni volta che la schermata torna in primo piano
  useFocusEffect(
    useCallback(() => {
      loadCourses()
    }, [])
  )

  async function loadCourses() {
    setCoursesLoading(true)
    const { data, error } = await supabase
      .from('courses')
      .select(`
        id,
        title,
        description,
        created_at,
        days_per_step,
        phases (
          id,
          title,
          order_index,
          steps (
            id,
            completed,
            order_index,
            created_at
          )
        )
      `)
      .order('order_index', { foreignTable: 'phases' })

    if (!error && data) {
      setCourses(data as Course[])
    }
    setCoursesLoading(false)
  }

  // Funzione per confermare ed eseguire l'eliminazione
  async function confirmDelete() {
    if (!courseToDelete) return

    setIsDeleting(true)
    setDeleteError(null)

    const { error } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseToDelete.id)

    if (!error) {
      // Ottimistico: rimuovi dalla lista locale
      setCourses((prev) => prev.filter((c) => c.id !== courseToDelete.id))
      setCourseToDelete(null)
      setIsDeleting(false)
    } else {
      setIsDeleting(false)
      setDeleteError("Errore durante l'eliminazione. Riprova.")
      console.error("Delete error:", error)
    }
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

  const tasksByDate = useMemo(() => {
    const map: Record<string, string[]> = {}

    courses.forEach((course) => {
      const allSteps: Step[] = []
      const sortedPhases = [...course.phases].sort(
        (a, b) => a.order_index - b.order_index
      )
      sortedPhases.forEach((phase) => {
        const sortedSteps = [...phase.steps].sort(
          (a, b) => a.order_index - b.order_index
        )
        allSteps.push(...sortedSteps)
      })

      const lastCompleted = [...allSteps]
        .filter((s) => s.completed && s.created_at)
        .sort(
          (a, b) =>
            new Date(b.created_at!).getTime() -
            new Date(a.created_at!).getTime()
        )[0]

      const referenceDate = lastCompleted
        ? new Date(lastCompleted.created_at)
        : new Date(course.created_at)

      const firstIncompleteIndex = allSteps.findIndex((s) => !s.completed)
      if (firstIncompleteIndex === -1) return

      const courseColor = getCourseColor(course.id)

      allSteps.forEach((step, index) => {
        if (!step.completed) {
          const relativeIndex = index - firstIncompleteIndex
          const deadline = new Date(
            referenceDate.getTime() +
            (relativeIndex + 1) * (course.days_per_step || 2.33) * 24 * 60 * 60 * 1000
          )
          const year = deadline.getFullYear()
          const month = String(deadline.getMonth() + 1).padStart(2, '0')
          const day = String(deadline.getDate()).padStart(2, '0')
          const dateKey = `${year}-${month}-${day}`

          if (!map[dateKey]) map[dateKey] = []
          map[dateKey].push(courseColor)
        }
      })
    })

    return map
  }, [courses])

  const renderCourse = useCallback(({ item }: { item: Course }) => {
    const activePhase = getActivePhase(item.phases)
    const steps = activePhase?.steps || []
    const totalSteps = steps.length
    const completedSteps = steps.filter((s) => s.completed).length
    const courseColor = getCourseColor(item.id)

    return (
      <Pressable
        style={[styles.course, { backgroundColor: courseColor }]}
        onPress={() => router.push(`/course/${item.id}`)}
      >
        <View style={styles.courseContent}>
          <View style={{ flex: 1, marginRight: 16 }}>
            <Text style={styles.courseTitle}>{item.title}</Text>
            {item.description && (
              <Text style={styles.courseDescription} numberOfLines={2}>
                {item.description}
              </Text>
            )}
            <View style={styles.progressRow}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${(completedSteps / totalSteps) * 100}%` }]} />
              </View>
              <Text style={styles.progressValue}>
                {completedSteps}/{totalSteps}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={(e) => {
              e.stopPropagation()
              setCourseToDelete(item)
            }}
            hitSlop={15}
            style={styles.deleteIconBtn}
          >
            <Text style={{ fontSize: 18, opacity: 0.4, fontWeight: '900' }}>✕</Text>
          </Pressable>
        </View>
      </Pressable>
    )
  }, [router, getActivePhase])

  const insets = useSafeAreaInsets()

  // Se siamo in caricamento auth, mostra loader
  if (authLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={courses}
        keyExtractor={(item) => item.id}
        renderItem={renderCourse}
        ListHeaderComponent={
          <View style={{ paddingTop: spacing.sm }}>
            <View style={styles.header}>
              <View>
                <Text style={styles.dateLabel}>
                  {new Date().toLocaleDateString('it-IT', { month: 'long', day: 'numeric' })}
                </Text>
                <View style={styles.titleRow}>
                  <Text style={styles.greeting}>
                    {profile?.full_name?.split(' ')[0] || (user?.email?.split('@')[0])}
                  </Text>
                  <Pressable
                    onPress={() => router.push('/new-course')}
                    style={styles.addButton}
                  >
                    <Text style={styles.addButtonText}>+</Text>
                  </Pressable>
                </View>
              </View>
            </View>

            <WeeklyCalendar tasksByDate={tasksByDate} />

            <View style={{ marginTop: spacing.md }}>
              <Text style={styles.sectionHeader}>I tuoi percorsi</Text>
              {coursesLoading && (
                <ActivityIndicator style={{ marginBottom: spacing.md }} size="small" color={colors.mutedText} />
              )}
            </View>
          </View>
        }
        contentContainerStyle={{
          paddingBottom: 120,
          paddingHorizontal: spacing.md, // Unified spacing
          flexGrow: 1, // Allows ListEmptyComponent to fill space if needed
        }}
        ListEmptyComponent={
          !coursesLoading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Inizia il tuo primo percorso</Text>
              <Pressable
                onPress={() => router.push('/new-course')}
                style={styles.emptyAction}
              >
                <Text style={styles.emptyActionText}>Crea un corso</Text>
              </Pressable>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
        bounces={true}
      />

      {/* MODALE DI CONFERMA */}
      <Modal
        visible={!!courseToDelete}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setCourseToDelete(null)
          setDeleteError(null)
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {deleteError ? "Errore" : "Elimina?"}
            </Text>

            <Text style={styles.modalText}>
              {deleteError
                ? deleteError
                : `Eliminare "${courseToDelete?.title}"?`}
            </Text>

            <View style={styles.modalButtons}>
              <Pressable
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => {
                  setCourseToDelete(null)
                  setDeleteError(null)
                }}
                disabled={isDeleting}
              >
                <Text style={styles.modalBtnTextCancel}>No</Text>
              </Pressable>

              <Pressable
                style={[styles.modalBtn, styles.modalBtnDelete]}
                onPress={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color={colors.inverseText} size="small" />
                ) : (
                  <Text style={styles.modalBtnTextDelete}>Sì</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View >
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingTop: spacing.md,
    marginBottom: spacing.md,
  },
  dateLabel: {
    ...typography.label,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    ...typography.title,
    fontSize: 32,
  },
  addButton: {
    width: 44,
    height: 44,
    backgroundColor: 'transparent',
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: '400',
    marginTop: -2,
  },
  sectionHeader: {
    ...typography.header,
    marginBottom: spacing.md,
  },
  course: {
    paddingVertical: 28,
    paddingHorizontal: 28,
    borderRadius: radius.md, // Consistent radius
    marginBottom: 16,
  },
  courseContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  courseTitle: {
    ...typography.title,
    fontSize: 26,
    lineHeight: 30,
    color: palette.black,
    marginBottom: 8,
  },
  courseDescription: {
    ...typography.body,
    fontSize: 14,
    color: palette.black,
    opacity: 0.7,
    marginBottom: 20,
    lineHeight: 20,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBarBg: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  progressValue: {
    ...typography.body,
    fontSize: 14,
    fontWeight: '900',
    color: palette.black,
  },
  deleteIconBtn: {
    marginTop: 6,
    marginLeft: 15,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginTop: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  emptyAction: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
  },
  emptyActionText: {
    color: colors.inverseText,
    fontWeight: '700',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: 24,
    width: '100%',
    maxWidth: 300,
    alignItems: 'center',
  },
  modalTitle: {
    ...typography.body,
    fontWeight: '800',
    marginBottom: 8,
  },
  modalText: {
    ...typography.body,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    minWidth: 100,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: colors.secondary,
  },
  modalBtnDelete: {
    backgroundColor: colors.primary,
  },
  modalBtnTextCancel: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  modalBtnTextDelete: {
    fontWeight: '700',
    color: colors.inverseText,
  },
});
