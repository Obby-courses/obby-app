import ResourcePreview from '@/components/ResourcePreview'
import { supabase } from '@/lib/supabase'
import { palette, spacing, typography } from '@/lib/theme'
import React, { useState } from 'react'
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/* ================================
   TIPI
================================ */

type Resource = {
  id: string
  title: string
  url: string
  type: string
  thumbnail_url?: string | null
}

type StepItemProps = {
  step: {
    id: string
    title: string
    description: string | null
    completed: boolean
    status?: 'pending' | 'completed' | 'skipped'
    resource: Resource | null
  }
  onUpdateStatus: (id: string, status: 'completed' | 'skipped' | 'pending') => void
  index: number
  daysPerStep: number
  courseCreatedAt: string
  firstIncompleteIndex: number
  referenceDate: string
  courseColor?: string
  onNext?: () => void
  onPrev?: () => void
}

/* ================================
   COMPONENT
================================ */

export default function StepItem({
  step,
  onUpdateStatus,
  index,
  daysPerStep,
  courseCreatedAt,
  firstIncompleteIndex,
  referenceDate,
  courseColor = palette.black,
  onNext,
  onPrev,
}: StepItemProps) {
  const insets = useSafeAreaInsets()
  const [previewData, setPreviewData] = useState<{ visible: boolean, type: string, url: string, resourceId?: string }>({
    visible: false,
    type: 'youtube',
    url: '',
    resourceId: undefined
  })
  const [showRatingPopup, setShowRatingPopup] = useState(false)
  const [isSubmittingRating, setIsSubmittingRating] = useState(false)

  const hasResource = !!step.resource

  const isYoutubeResource = (res: Resource | null) => {
    if (!res) return false;
    return res.type === 'youtube' || res.url.includes('youtube.com') || res.url.includes('youtu.be');
  }

  const isCurrentStep = index === firstIncompleteIndex

  // Funzione per formattare la data in Italiano
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('it-IT', {
      day: 'numeric',
      month: 'long',
    }).format(date)
  }

  // Calcoli progresso e deadline
  const start = referenceDate ? new Date(referenceDate) : new Date(courseCreatedAt)
  const relativeIndex = index >= firstIncompleteIndex ? index - firstIncompleteIndex : 0
  const totalDurationMs = (relativeIndex + 1) * daysPerStep * 24 * 60 * 60 * 1000
  const deadlineDateObj = new Date(start.getTime() + totalDurationMs)
  const deadlineDate = formatDate(deadlineDateObj)

  let remainingProgress = 1
  if (isCurrentStep && !step.completed) {
    const stepDurationMs = daysPerStep * 24 * 60 * 60 * 1000
    const stepDeadlineMs = start.getTime() + stepDurationMs
    const now = Date.now()
    remainingProgress = Math.max(0, Math.min(1, (stepDeadlineMs - now) / stepDurationMs))
  }

  const progressColor = remainingProgress > 0.5 ? palette.green : (remainingProgress > 0.2 ? palette.yellow : '#FF4444')

  const handleCompletePress = () => {
    if (hasResource && step.resource?.id) {
      setShowRatingPopup(true)
    } else {
      onUpdateStatus(step.id, 'completed')
    }
  }

  const handleSubmitRating = async (rating: number) => {
    setIsSubmittingRating(true)
    try {
      if (step.resource?.id) {
        const { error } = await supabase.rpc('rate_resource', {
          resource_id: step.resource.id,
          rating: rating
        })
        if (error) console.error("Error rating resource:", error)
      }
    } catch (err) {
      console.error("Failed to rate", err)
    } finally {
      setIsSubmittingRating(false)
      setShowRatingPopup(false)
      onUpdateStatus(step.id, 'completed')
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 110, // Increased to accommodate sticky footer
          paddingHorizontal: spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.topSection}>
            {hasResource && (
              <Pressable
                onPress={() => setPreviewData({
                  visible: true,
                  type: step.resource?.type || 'youtube',
                  url: step.resource?.url || '',
                  resourceId: step.resource?.id
                })}
                style={styles.thumbnailContainer}
              >
                {step.resource?.thumbnail_url ? (
                  <Image
                    source={{ uri: step.resource.thumbnail_url }}
                    style={styles.thumbnail}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.thumbnailPlaceholder}>
                    <Text style={{ fontSize: 32 }}>
                      {isYoutubeResource(step.resource) ? '📺' : '🔗'}
                    </Text>
                  </View>
                )}
                <View style={styles.playOverlay}>
                  <Text style={{ color: '#fff', fontSize: 12 }}>
                    {isYoutubeResource(step.resource) ? '▶' : '👁️'}
                  </Text>
                </View>
              </Pressable>
            )}

            <View style={styles.headerInfo}>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={3}>
                  {step.title}
                </Text>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.statusText}>
                  {step.status === 'skipped'
                    ? '⏭️ Saltato'
                    : step.completed
                      ? '✅ Completato'
                      : `⏳ Step #${index + 1}`}
                </Text>

                <View style={{ flex: 1 }} />

                <View style={styles.navButtons}>
                  {onPrev && (
                    <Pressable onPress={onPrev} style={styles.navButton}>
                      <Text style={styles.navButtonText}>←</Text>
                    </Pressable>
                  )}
                  {onNext && (
                    <Pressable onPress={onNext} style={styles.navButton}>
                      <Text style={styles.navButtonText}>→</Text>
                    </Pressable>
                  )}
                </View>
              </View>

              {hasResource && step.resource && (() => {
                const res = step.resource;
                const isYT = isYoutubeResource(res);
                return (
                  <Pressable
                    onPress={() => setPreviewData({
                      visible: true,
                      type: res.type,
                      url: res.url,
                      resourceId: res.id
                    })}
                    style={[
                      styles.resourceAction,
                      { backgroundColor: isYT ? '#FF0000' : palette.black }
                    ]}
                  >
                    <Text style={styles.resourceActionText}>
                      {isYT ? '📺 Guarda Video' : '🔗 Leggi Articolo'}
                    </Text>
                  </Pressable>
                );
              })()}
            </View>
          </View>

          {step.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.description}>
                {step.description}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          <View style={styles.bottomSection}>
            <View style={styles.deadlineInfo}>
              <Text style={styles.deadlineLabel}>Deadline stimata</Text>
              <Text style={[styles.deadlineValue, isCurrentStep && !step.completed && { color: progressColor }]}>
                {deadlineDate}
              </Text>
              {isCurrentStep && !step.completed && (
                <View style={styles.progressBarBg}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${remainingProgress * 100}%`, backgroundColor: progressColor }
                    ]}
                  />
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Footer Actions */}
      <View style={[styles.stickyFooter, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
        <View style={styles.actionsRow}>
          {!step.completed ? (
            <>
              <Pressable
                onPress={() => onUpdateStatus(step.id, 'skipped')}
                style={styles.skipButton}
              >
                <Text style={{ fontSize: 18 }}>⏭️</Text>
              </Pressable>

              <Pressable
                onPress={handleCompletePress}
                style={styles.completeButton}
              >
                <Text style={styles.completeButtonText}>COMPLETA</Text>
              </Pressable>
            </>
          ) : (
            <Pressable
              onPress={() => onUpdateStatus(step.id, 'pending')}
              style={[styles.completeButton, { backgroundColor: '#E6F7EC', borderWidth: 0 }]}
            >
              <Text style={[styles.completeButtonText, { color: '#1E7F43' }]}>
                RIPRISTINA
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      <ResourcePreview
        visible={previewData.visible}
        onClose={() => setPreviewData(prev => ({ ...prev, visible: false }))}
        type={previewData.type}
        url={previewData.url}
        resourceId={previewData.resourceId}
      />

      {/* RATING MODAL */}
      <Modal
        visible={showRatingPopup}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowRatingPopup(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.ratingCard}>
            <Text style={styles.ratingTitle}>Com'era questa risorsa?</Text>
            <Text style={styles.ratingSubtitle}>Dai un voto da 1 a 5 stelline</Text>

            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Pressable
                  key={star}
                  onPress={() => handleSubmitRating(star)}
                  style={({ pressed }) => [
                    styles.starButton,
                    pressed && { transform: [{ scale: 1.2 }] }
                  ]}
                >
                  <Text style={styles.starText}>⭐</Text>
                  <Text style={styles.starNumber}>{star}</Text>
                </Pressable>
              ))}
            </View>

            <Pressable onPress={() => { setShowRatingPopup(false); onUpdateStatus(step.id, 'completed'); }} style={{ marginTop: 20 }}>
              <Text style={{ color: palette.gray, fontSize: 14 }}>Salta valutazione</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    borderRadius: 32,
    padding: 24,
    borderWidth: 2,
    borderColor: palette.border,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 20,
  },
  topSection: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  thumbnailContainer: {
    width: 90,
    height: 90,
    borderRadius: 20,
    backgroundColor: palette.lightGray,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderTopLeftRadius: 12,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    ...typography.body,
    fontSize: 20,
    fontWeight: '800',
    color: palette.black,
  },
  statusText: {
    ...typography.body,
    fontSize: 13,
    color: palette.gray,
    marginTop: 4,
    fontWeight: '600',
    marginBottom: 8,
  },
  resourceAction: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  resourceActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
  },
  descriptionSection: {
    marginBottom: spacing.md,
  },
  description: {
    ...typography.body,
    fontSize: 15,
    color: '#444',
    lineHeight: 22,
  },
  divider: {
    height: 2,
    backgroundColor: palette.border,
    marginVertical: spacing.lg,
  },
  bottomSection: {
    flexDirection: 'column',
    gap: spacing.lg,
  },
  deadlineInfo: {
    flex: 1,
  },
  deadlineLabel: {
    ...typography.label,
    fontSize: 11,
    marginBottom: 4,
  },
  deadlineValue: {
    ...typography.body,
    fontSize: 18,
    fontWeight: '800',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  completeButton: {
    backgroundColor: palette.black,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 24,
    flex: 1,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 1,
  },
  skipButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: palette.white,
    borderWidth: 2,
    borderColor: palette.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: palette.lightGray,
    borderRadius: 3,
    marginTop: 10,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  navButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  navButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: palette.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  navButtonText: {
    fontSize: 18,
    fontWeight: '900',
    color: palette.black,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    shadowColor: palette.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  ratingCard: {
    backgroundColor: palette.white,
    padding: 30,
    borderRadius: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    elevation: 5
  },
  ratingTitle: {
    ...typography.title,
    fontSize: 22,
    marginBottom: 8,
    textAlign: 'center'
  },
  ratingSubtitle: {
    ...typography.body,
    color: palette.gray,
    marginBottom: 24,
    textAlign: 'center'
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center'
  },
  starButton: {
    alignItems: 'center',
    padding: 8,
    backgroundColor: palette.lightGray,
    borderRadius: 12,
    width: 44,
    height: 60,
    justifyContent: 'center'
  },
  starText: {
    fontSize: 20,
    marginBottom: 4
  },
  starNumber: {
    ...typography.label,
    fontSize: 12,
    color: palette.black
  }
})
