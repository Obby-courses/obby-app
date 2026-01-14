import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Modal,
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

/* =======================
   TIPI
======================= */
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

/* =======================
   COMPONENTE PRINCIPALE
======================= */
export default function Index() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  
  // STATI PER ELIMINAZIONE
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const router = useRouter()

  // Carica i corsi ogni volta che la schermata torna in primo piano
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

  const renderCourse = useCallback(({ item }: { item: Course }) => {
    const activePhase = getActivePhase(item.phases)
    const steps = activePhase?.steps || []
    const totalSteps = steps.length
    const completedSteps = steps.filter((s) => s.completed).length
    const progress = totalSteps === 0 ? 0 : completedSteps / totalSteps

    return (
      <Pressable
        style={styles.course}
        onPress={() => router.push(`/course/${item.id}`)}
      >
        <View style={styles.courseHeaderRow}>
          <Text style={styles.courseTitle} numberOfLines={1}>{item.title}</Text>
          
          <Pressable 
            onPress={(e) => {
              e.stopPropagation() // Impedisce l'apertura del corso
              setCourseToDelete(item)
            }}
            hitSlop={10}
            style={styles.deleteIconBtn}
          >
            <Text style={{ fontSize: 18, color: colors.mutedText }}>🗑️</Text>
          </Pressable>
        </View>

        {!!item.description && (
          <Text style={styles.courseDesc} numberOfLines={2}>
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

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    )
  }

  return (
    <View style={styles.container}>
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
        keyExtractor={(item) => item.id}
        renderItem={renderCourse}
        contentContainerStyle={courses.length === 0 && styles.emptyList}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Nessun corso disponibile</Text>
        }
      />

      {/* MODALE DI CONFERMA (POOP) */}
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
              {deleteError ? "Errore" : "Elimina corso?"}
            </Text>
            
            <Text style={[styles.modalText, deleteError ? { color: '#f00' } : null]}>
              {deleteError 
                ? deleteError 
                : `Sei sicuro di voler eliminare "${courseToDelete?.title}"? L'azione è definitiva.`}
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
                <Text style={styles.modalBtnTextCancel}>Annulla</Text>
              </Pressable>

              <Pressable 
                style={[styles.modalBtn, styles.modalBtnDelete]}
                onPress={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.modalBtnTextDelete}>Elimina</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    paddingTop: 20,
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
  },
  title: {
    ...typography.title,
  },
  subtitle: {
    ...typography.small,
  },
  course: {
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#eee',
  },
  courseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  courseTitle: {
    ...typography.body,
    fontWeight: '700',
    flex: 1,
  },
  deleteIconBtn: {
    padding: 4,
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
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
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
  },
  // STILI MODALE
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: radius.md,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  modalText: {
    fontSize: 15,
    color: '#444',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: radius.sm,
    minWidth: 90,
    alignItems: 'center',
  },
  modalBtnCancel: {
    backgroundColor: '#f0f0f0',
  },
  modalBtnDelete: {
    backgroundColor: '#ff4444',
  },
  modalBtnTextCancel: {
    fontWeight: '600',
    color: '#333',
  },
  modalBtnTextDelete: {
    fontWeight: '600',
    color: '#fff',
  },
})