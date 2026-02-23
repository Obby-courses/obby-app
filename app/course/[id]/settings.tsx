import { COURSE_COLORS, getCourseColor, getCourseColorIndex } from '@/constants/courseColors'
import { supabase } from '@/lib/supabase'
import { colors, palette, radius, spacing, typography } from '@/lib/theme'
import { Ionicons } from '@expo/vector-icons'
import { Slider } from '@react-native-assets/slider'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'


export default function CourseSettings() {
    const { id } = useLocalSearchParams<{ id: string }>()
    const router = useRouter()
    const insets = useSafeAreaInsets()

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [course, setCourse] = useState<any>(null)

    // Form State
    const [title, setTitle] = useState('')
    const [deadlinesEnabled, setDeadlinesEnabled] = useState(true)
    const [stepsPerWeek, setStepsPerWeek] = useState(3)
    const [selectedColorIndex, setSelectedColorIndex] = useState<number | null>(null)

    // Delete modal state
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [isDeleting, setIsDeleting] = useState(false)

    useEffect(() => {
        loadCourseDetails()
    }, [id])

    async function loadCourseDetails() {
        setLoading(true)
        const { data, error } = await supabase
            .from('courses')
            .select('id, title, days_per_step, color_index, deadlines_enabled')
            .eq('id', id)
            .single()

        if (data && !error) {
            setCourse(data)
            setTitle(data.title)
            setDeadlinesEnabled(data.deadlines_enabled ?? true)
            setSelectedColorIndex(data.color_index ?? getCourseColorIndex(id))

            // Convert days_per_step back to steps_per_week
            // daysPerStep = 7 / stepsPerWeek
            // stepsPerWeek = 7 / daysPerStep
            const spw = data.days_per_step ? Math.round(7 / data.days_per_step) : 3
            setStepsPerWeek(spw)
        }
        setLoading(false)
    }

    async function handleSave() {
        setSaving(true)
        const daysPerStep = parseFloat((7 / stepsPerWeek).toFixed(2))

        const { error } = await supabase
            .from('courses')
            .update({
                title,
                deadlines_enabled: deadlinesEnabled,
                days_per_step: deadlinesEnabled ? daysPerStep : null,
                color_index: selectedColorIndex
            })
            .eq('id', id)

        if (error) {
            Alert.alert('Errore', 'Impossibile salvare le modifiche.')
        } else {
            router.back()
        }
        setSaving(false)
    }

    async function handleDelete() {
        setIsDeleting(true)
        const { error } = await supabase
            .from('courses')
            .delete()
            .eq('id', id)

        if (error) {
            Alert.alert('Errore', "Impossibile eliminare il corso.")
            setIsDeleting(false)
        } else {
            setIsDeleting(false)
            setShowDeleteModal(false)
            router.replace('/')
        }
    }

    if (loading) {
        return (
            <View style={[styles.container, styles.centered]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        )
    }

    const courseColor = getCourseColor(id, selectedColorIndex)

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={palette.black} />
                </Pressable>
                <Text style={styles.headerTitle}>Opzioni Corso</Text>
                <Pressable onPress={handleSave} disabled={saving} style={styles.saveButton}>
                    {saving ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                        <Text style={styles.saveButtonText}>Salva</Text>
                    )}
                </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* RENAME SECTION */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Nome del corso</Text>
                    <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Nome del corso"
                    />
                </View>

                {/* COLOR SECTION */}
                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>Colore</Text>
                    <View style={styles.colorGrid}>
                        {COURSE_COLORS.map((color, index) => (
                            <Pressable
                                key={index}
                                onPress={() => setSelectedColorIndex(index)}
                                style={[
                                    styles.colorCircle,
                                    { backgroundColor: color },
                                    selectedColorIndex === index && styles.selectedColorCircle
                                ]}
                            >
                                {selectedColorIndex === index && (
                                    <Ionicons name="checkmark" size={20} color={palette.black} />
                                )}
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* DEADLINES SECTION */}
                <View style={styles.section}>
                    <View style={styles.switchRow}>
                        <View>
                            <Text style={styles.sectionLabel}>Attiva scadenze</Text>
                            <Text style={styles.sectionSublabel}>Ricevi reminder e vedi scadenze nel calendario</Text>
                        </View>
                        <Switch
                            value={deadlinesEnabled}
                            onValueChange={setDeadlinesEnabled}
                            trackColor={{ false: palette.border, true: palette.green }}
                            thumbColor={palette.white}
                        />
                    </View>

                    {deadlinesEnabled && (
                        <View style={styles.deadlineSettings}>
                            <View style={styles.sliderHeader}>
                                <Text style={styles.sliderLabel}>Pace dell'apprendimento</Text>
                                <Text style={styles.sliderValue}>{stepsPerWeek} step / sett</Text>
                            </View>
                            <Slider
                                value={stepsPerWeek}
                                minimumValue={1}
                                maximumValue={7}
                                step={1}
                                onValueChange={setStepsPerWeek}
                                minimumTrackTintColor={palette.black}
                                maximumTrackTintColor={palette.lightGray}
                                thumbTintColor={palette.black}
                                trackHeight={8}
                                thumbSize={24}
                            />
                        </View>
                    )}
                </View>

                {/* DELETE SECTION */}
                <View style={[styles.section, styles.deleteSection]}>
                    <Pressable style={styles.deleteButton} onPress={() => setShowDeleteModal(true)}>
                        <Ionicons name="trash-outline" size={20} color={palette.error} />
                        <Text style={styles.deleteButtonText}>Elimina Corso</Text>
                    </Pressable>
                </View>
            </ScrollView>

            {/* DELETE CONFIRMATION MODAL */}
            <Modal
                visible={showDeleteModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowDeleteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Eliminare il corso?</Text>
                        <Text style={styles.modalText}>
                            Questa azione è irreversibile. Tutti i progressi e le risorse verranno persi.
                        </Text>
                        <View style={styles.modalButtons}>
                            <Pressable
                                style={[styles.modalBtn, styles.modalBtnCancel]}
                                onPress={() => setShowDeleteModal(false)}
                                disabled={isDeleting}
                            >
                                <Text style={styles.modalBtnTextCancel}>Annulla</Text>
                            </Pressable>
                            <Pressable
                                style={[styles.modalBtn, styles.modalBtnDelete]}
                                onPress={handleDelete}
                                disabled={isDeleting}
                            >
                                {isDeleting ? (
                                    <ActivityIndicator color={palette.white} size="small" />
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
        backgroundColor: colors.background,
    },
    centered: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: palette.border,
    },
    headerTitle: {
        ...typography.title,
        fontSize: 20,
        position: 'absolute',
        left: 0,
        right: 0,
        textAlign: 'center',
        zIndex: -1,
    },
    backButton: {
        padding: 8,
    },
    saveButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: radius.md,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    saveButtonText: {
        ...typography.body,
        fontWeight: '700',
        color: colors.primary,
    },
    scrollContent: {
        padding: spacing.md,
    },
    section: {
        marginBottom: spacing.xl,
    },
    sectionLabel: {
        ...typography.label,
        fontSize: 14,
        marginBottom: 8,
        color: colors.textSecondary,
    },
    sectionSublabel: {
        ...typography.body,
        fontSize: 12,
        color: colors.textSecondary,
        opacity: 0.7,
    },
    input: {
        ...typography.body,
        fontSize: 18,
        backgroundColor: colors.card,
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.border,
        color: colors.textPrimary,
        textAlign: 'center',
    },
    colorGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 8,
    },
    colorCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    selectedColorCircle: {
        borderColor: palette.black,
        transform: [{ scale: 1.1 }],
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    deadlineSettings: {
        marginTop: spacing.lg,
        backgroundColor: colors.card,
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.border,
    },
    sliderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.sm,
    },
    sliderLabel: {
        ...typography.body,
        fontWeight: '600',
        fontSize: 14,
    },
    sliderValue: {
        ...typography.body,
        fontWeight: '800',
        fontSize: 14,
        color: colors.primary,
    },
    deleteSection: {
        marginTop: spacing.xl,
        paddingTop: spacing.xl,
        borderTopWidth: 1,
        borderTopColor: palette.border,
    },
    deleteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: spacing.md,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: palette.error,
    },
    deleteButtonText: {
        color: palette.error,
        fontWeight: '700',
        fontSize: 16,
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
        maxWidth: 340,
    },
    modalTitle: {
        ...typography.header,
        fontSize: 20,
        marginBottom: 12,
        textAlign: 'center',
    },
    modalText: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: radius.md,
        alignItems: 'center',
    },
    modalBtnCancel: {
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    modalBtnDelete: {
        backgroundColor: palette.error,
    },
    modalBtnTextCancel: {
        fontWeight: '700',
        color: colors.textPrimary,
    },
    modalBtnTextDelete: {
        fontWeight: '700',
        color: palette.white,
    },
})
