import ResourcePreview from '@/components/ResourcePreview'
import { supabase } from '@/lib/supabase'
import { colors, componentStyles, icons, palette, spacing, typography } from '@/lib/theme'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import React, { useEffect, useRef, useState } from 'react'
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native'
import { Directions, Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler'
import { runOnJS } from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

const { width } = Dimensions.get('window')

/* ================================
   TIPI
================================ */

type Resource = {
  id: string
  title: string
  url: string
  type: string
  thumbnail_url?: string | null
  avg_rating?: number
  summary?: string | null
}

type SkipReason = 'already_know' | 'too_hard' | 'too_easy' | 'not_relevant' | 'bad_resource' | 'not_the_time' | 'other'

const SKIP_REASONS: { key: SkipReason; label: string; icon: string }[] = [
  { key: 'already_know', label: 'So già questo', icon: icons.skipAlreadyKnow },
  { key: 'too_hard', label: 'Troppo difficile', icon: icons.skipTooHard },
  { key: 'too_easy', label: 'Troppo semplice', icon: icons.skipTooEasy },
  { key: 'not_relevant', label: 'Non è rilevante', icon: icons.skipNotRelevant },
  { key: 'bad_resource', label: 'Risorsa di bassa qualità', icon: icons.skipBadResource },
  { key: 'not_the_time', label: 'Non è il momento', icon: icons.skipNotTheTime },
  { key: 'other', label: 'Altro', icon: icons.skipOther },
]

type StepItemProps = {
  step: {
    id: string
    title: string
    description: string | null
    completed: boolean
    status?: 'pending' | 'completed' | 'skipped'
    skip_reason?: string | null
    resource: Resource | null
  }
  onUpdateStatus: (id: string, status: 'completed' | 'skipped' | 'pending') => void
  onClose?: () => void
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
   HELPERS
================================ */

const getVideoId = (url: string) => {
  if (!url) return null;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

/* ================================
   COMPONENT
================================ */

export default function StepItem({
  step,
  onUpdateStatus,
  onClose,
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
  const [showSkipReasonPopup, setShowSkipReasonPopup] = useState(false)
  const [isSubmittingSkip, setIsSubmittingSkip] = useState(false)
  const [isOtherSelected, setIsOtherSelected] = useState(false)
  const [skipOtherText, setSkipOtherText] = useState('')

  useEffect(() => {
    if (!showSkipReasonPopup) {
      setIsOtherSelected(false)
      setSkipOtherText('')
    }
  }, [showSkipReasonPopup])

  const [smartScale, setSmartScale] = useState(1.1)
  const [displayThumbnail, setDisplayThumbnail] = useState<string | null>(step.resource?.thumbnail_url || null)

  // ANIMATION REFS
  const fadeAnim = useRef(new Animated.Value(1)).current
  const slideAnim = useRef(new Animated.Value(0)).current
  const lastSwipeDirection = useRef(0) // -1 for left (next), 1 for right (prev)

  // TRIGGER ANIMATE IN ON STEP CHANGE
  useEffect(() => {
    // Start from the opposite direction we swiped out to
    const startOffset = lastSwipeDirection.current === -1 ? 50 : (lastSwipeDirection.current === 1 ? -50 : 0)

    fadeAnim.setValue(0)
    slideAnim.setValue(startOffset)

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      lastSwipeDirection.current = 0 // Reset after entry
    })

    // SMART THUMBNAIL SCALING & UPGRADE
    if (step.resource?.thumbnail_url) {
      let thumbUrl = step.resource.thumbnail_url

      // Upgrade YouTube thumbnails to MaxRes (1280x720) 
      if (isYoutubeResource(step.resource) && !thumbUrl.includes('maxresdefault')) {
        const vId = getVideoId(thumbUrl) || (step.resource.url ? getVideoId(step.resource.url) : null)
        if (vId) {
          thumbUrl = `https://i.ytimg.com/vi/${vId}/maxresdefault.jpg`
        }
      }

      setDisplayThumbnail(thumbUrl)

      Image.getSize(thumbUrl, (w, h) => {
        const ratio = w / h
        if (ratio < 1.4) {
          setSmartScale(1.35)
        } else {
          setSmartScale(1.1)
        }
      }, () => {
        // Fallback for private videos or missing maxres
        setSmartScale(1.1)
      })
    } else {
      setDisplayThumbnail(null)
      setSmartScale(1.1)
    }
  }, [step.id, step.resource?.thumbnail_url])

  const animateOutAndProceed = (direction: number, callback?: () => void) => {
    lastSwipeDirection.current = direction
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: direction * 50, // Move in swipe direction
        duration: 120,
        useNativeDriver: true,
      }),
    ]).start((result) => {
      if (result.finished && callback) {
        callback()
      }
    })
  }

  const handleNextSwipe = () => {
    if (onNext) animateOutAndProceed(-1, onNext)
  }

  const handlePrevSwipe = () => {
    if (onPrev) animateOutAndProceed(1, onPrev)
  }

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

  const progressColor = remainingProgress > 0.5 ? '#22C55E' : (remainingProgress > 0.2 ? '#EAB308' : '#EF4444')

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

  const handleSkipPress = () => {
    setShowSkipReasonPopup(true)
  }

  const handleSubmitSkipReason = async (reason: SkipReason | null) => {
    if (reason === 'other') {
      setIsOtherSelected(true)
      return
    }

    setIsSubmittingSkip(true)
    setShowSkipReasonPopup(false)
    try {
      if (reason) {
        await supabase
          .from('steps')
          .update({ skip_reason: reason })
          .eq('id', step.id)
      }
    } catch (err) {
      console.error('Failed to save skip reason', err)
    } finally {
      setIsSubmittingSkip(false)
      onUpdateStatus(step.id, 'skipped')
    }
  }

  const handleFinalOtherSubmit = async () => {
    if (!skipOtherText.trim()) return

    setIsSubmittingSkip(true)
    setShowSkipReasonPopup(false)
    try {
      await supabase
        .from('steps')
        .update({ skip_reason: skipOtherText.trim() })
        .eq('id', step.id)
    } catch (err) {
      console.error('Failed to save skip reason', err)
    } finally {
      setIsSubmittingSkip(false)
      setIsOtherSelected(false)
      setSkipOtherText('')
      onUpdateStatus(step.id, 'skipped')
    }
  }

  // SWIPE GESTURES
  const flingLeft = Gesture.Fling()
    .direction(Directions.LEFT)
    .onStart(() => {
      if (onNext) {
        runOnJS(handleNextSwipe)()
      }
    })

  const flingRight = Gesture.Fling()
    .direction(Directions.RIGHT)
    .onStart(() => {
      if (onPrev) {
        runOnJS(handlePrevSwipe)()
      }
    })

  const composedGestures = Gesture.Exclusive(flingLeft, flingRight)

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <GestureDetector gesture={composedGestures}>
        <View style={styles.container}>
          {/* Top Controls - STATIC (Fixed at the top, outside ScrollView) */}
          <View style={[styles.topControls, { paddingTop: insets.top + spacing.md }]}>
            {onClose && (
              <Pressable onPress={onClose} style={componentStyles.closeButton}>
                <Ionicons name={icons.close} size={24} color={palette.black} />
              </Pressable>
            )}
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{
              paddingBottom: insets.bottom + 140, // Space for the hovering footer
            }}
            showsVerticalScrollIndicator={false}
          >
            {/* WRAP CONTENT IN ANIMATED VIEW FOR FADE/SLIDE EFFECT */}
            <Animated.View style={{
              flex: 1,
              opacity: fadeAnim,
              transform: [{ translateX: slideAnim }]
            }}>
              {/* HERO SECTION */}
              <View style={styles.heroContainer}>
                {hasResource && displayThumbnail ? (
                  <Image
                    source={{ uri: displayThumbnail }}
                    style={[styles.heroImage, { transform: [{ scale: smartScale }] }]}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.heroPlaceholder, { backgroundColor: courseColor + '20' }]}>
                    <Ionicons
                      name={isYoutubeResource(step.resource) ? 'play-circle' : 'link'}
                      size={64}
                      color={courseColor}
                    />
                  </View>
                )}

                <LinearGradient
                  colors={['transparent', 'rgba(255,255,255,0.8)', colors.background]}
                  style={styles.heroGradient}
                />
              </View>

              {/* CONTENT SECTION */}
              <View style={styles.content}>
                <View style={styles.statusRow}>
                  <View style={[
                    componentStyles.statusBadge,
                    { backgroundColor: step.completed ? '#DCFCE7' : '#F3F4F6' }
                  ]}>
                    {step.status === 'skipped' ? (
                      <Ionicons name={icons.skipped} size={14} color="#6B7280" />
                    ) : step.completed ? (
                      <Ionicons name={icons.completed} size={14} color="#166534" />
                    ) : null}
                    <Text style={[styles.statusBadgeText, { color: step.completed ? '#166534' : '#6B7280' }]}>
                      {step.status === 'skipped'
                        ? 'SALTATO'
                        : step.completed
                          ? 'COMPLETATO'
                          : `STEP #${index + 1}`}
                    </Text>
                  </View>
                  {isCurrentStep && !step.completed && (
                    <View style={[componentStyles.statusBadge, { backgroundColor: '#FEF9C3', marginLeft: 8 }]}>
                      <Text style={[styles.statusBadgeText, { color: '#854D0E' }]}>IN CORSO</Text>
                    </View>
                  )}
                </View>

                {/* Navigation Swipe Hint Area - MINIMAL & GESTURE DRIVEN */}
                <View style={styles.swipeHintRow}>
                  {onPrev && (
                    <View style={styles.minimalNavHint}>
                      <Text style={styles.minimalNavLabel}>SWIPE</Text>
                      <Ionicons name={icons.back} size={14} color="#CBD5E1" />
                    </View>
                  )}
                  {(onPrev && onNext) && <View style={{ width: 12 }} />}
                  {onNext && (
                    <View style={styles.minimalNavHint}>
                      <Ionicons name={icons.forward} size={14} color="#CBD5E1" />
                      <Text style={styles.minimalNavLabel}>SWIPE</Text>
                    </View>
                  )}
                </View>

                <Text
                  style={styles.mainTitle}
                >
                  {step.title}
                </Text>

                {hasResource && step.resource && (
                  <View style={styles.resourceMetaRow}>
                    {/* Rating Badge */}
                    <View style={styles.metaBadge}>
                      <Ionicons name="star" size={14} color="#F59E0B" />
                      <Text style={styles.metaText}>
                        {step.resource.avg_rating ? step.resource.avg_rating.toFixed(1) : 'New'}
                      </Text>
                    </View>

                    {/* Duration/Reading Time Badge */}
                    <View style={styles.metaBadge}>
                      <Ionicons
                        name={isYoutubeResource(step.resource) ? 'time-outline' : 'book-outline'}
                        size={14}
                        color="#64748B"
                      />
                      <Text style={styles.metaText}>
                        {isYoutubeResource(step.resource)
                          ? '10 min' // Placeholder for video duration for now as it's not in DB
                          : `${Math.max(1, Math.ceil((step.resource.summary?.length || 0) / 1000))} min`
                        }
                      </Text>
                    </View>

                    {/* Type Badge */}
                    <View style={styles.metaBadge}>
                      <Ionicons
                        name={isYoutubeResource(step.resource) ? 'play-circle-outline' : 'globe-outline'}
                        size={14}
                        color="#64748B"
                      />
                      <Text style={styles.metaText}>
                        {isYoutubeResource(step.resource) ? 'Video' : 'Articolo'}
                      </Text>
                    </View>
                  </View>
                )}

                {hasResource && step.resource && (
                  <Pressable
                    onPress={() => setPreviewData({
                      visible: true,
                      type: step.resource?.type || 'youtube',
                      url: step.resource?.url || '',
                      resourceId: step.resource?.id
                    })}
                    style={[
                      componentStyles.mainActionBtn,
                      { backgroundColor: isYoutubeResource(step.resource) ? '#FF0000' : palette.black }
                    ]}
                  >
                    <Ionicons
                      name={isYoutubeResource(step.resource) ? (icons.video.replace('-outline', '') as any) : icons.article}
                      size={24}
                      color="#fff"
                      style={{ marginRight: 10 }}
                    />
                    <Text style={styles.mainActionBtnText}>
                      {isYoutubeResource(step.resource) ? 'Guarda il Video' : 'Leggi l\'Articolo'}
                    </Text>
                  </Pressable>
                )}

                {step.description && (
                  <View style={styles.descriptionBox}>
                    <Text style={styles.descriptionText}>
                      {step.description}
                    </Text>
                  </View>
                )}

                <View style={styles.divider} />

                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Deadline Prevista</Text>
                    <Text style={[styles.infoValue, isCurrentStep && !step.completed && { color: progressColor }]}>
                      {deadlineDate}
                    </Text>
                  </View>

                  {isCurrentStep && !step.completed && (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBarBg}>
                        <View
                          style={[
                            styles.progressBarFill,
                            { width: `${remainingProgress * 100}%`, backgroundColor: progressColor }
                          ]}
                        />
                      </View>
                      <Text style={styles.progressLabel}>
                        {Math.round(remainingProgress * 100)}% del tempo rimasto
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </Animated.View>
          </ScrollView>

          {/* HOVERING FOOTER */}
          <View style={styles.footerWrapper} pointerEvents="box-none">
            <LinearGradient
              colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.9)', colors.background]}
              style={styles.footerGradient}
              pointerEvents="none"
            />
            <View style={[styles.footerContent, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
              {!step.completed ? (
                <View style={styles.footerActions}>
                  <Pressable
                    onPress={handleSkipPress}
                    style={styles.skipBtn}
                  >
                    <Text style={styles.skipBtnText}>Salta</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleCompletePress}
                    style={styles.completeBtn}
                  >
                    <LinearGradient
                      colors={[palette.black, '#333']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.completeBtnGradient}
                    >
                      <Text style={styles.completeBtnText}>COMPLETA STEP</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={() => onUpdateStatus(step.id, 'pending')}
                  style={styles.resetBtn}
                >
                  <Text style={styles.resetBtnText}>RIPRISTINA STEP</Text>
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
                      <Ionicons name={icons.star} size={24} color="#F59E0B" />
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

          {/* SKIP REASON MODAL */}
          <Modal
            visible={showSkipReasonPopup}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowSkipReasonPopup(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.skipReasonCard}>
                <Text style={styles.ratingTitle}>Perché salti questo step?</Text>
                <Text style={styles.ratingSubtitle}>Il tuo feedback migliora i corsi</Text>

                {!isOtherSelected ? (
                  <>
                    <View style={styles.skipReasonsGrid}>
                      {SKIP_REASONS.map((reason) => (
                        <Pressable
                          key={reason.key}
                          onPress={() => handleSubmitSkipReason(reason.key)}
                          style={({ pressed }) => [
                            styles.skipReasonBtn,
                            pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] }
                          ]}
                        >
                          <Ionicons name={reason.icon as any} size={22} color={palette.black} />
                          <Text style={styles.skipReasonLabel}>{reason.label}</Text>
                        </Pressable>
                      ))}
                    </View>

                    <Pressable
                      onPress={() => handleSubmitSkipReason(null)}
                      style={{ marginTop: 20 }}
                    >
                      <Text style={{ color: palette.gray, fontSize: 14 }}>Salta senza rispondere</Text>
                    </Pressable>
                  </>
                ) : (
                  <View style={styles.otherInputWrapper}>
                    <TextInput
                      style={styles.otherTextInput}
                      placeholder="Esempio: Argomento già approfondito"
                      placeholderTextColor={palette.gray}
                      value={skipOtherText}
                      onChangeText={setSkipOtherText}
                      multiline
                      numberOfLines={4}
                      autoFocus
                      maxLength={100}
                    />
                    <Text style={styles.charCounter}>
                      {skipOtherText.length}/100
                    </Text>
                    <View style={styles.otherActions}>
                      <Pressable
                        onPress={() => setIsOtherSelected(false)}
                        style={styles.otherCancelBtn}
                      >
                        <Text style={styles.otherCancelBtnText}>Indietro</Text>
                      </Pressable>
                      <Pressable
                        onPress={handleFinalOtherSubmit}
                        style={[styles.otherSubmitBtn, !skipOtherText.trim() && { opacity: 0.5 }]}
                        disabled={!skipOtherText.trim()}
                      >
                        <Text style={styles.otherSubmitBtnText}>Invia</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </Modal>
        </View>
      </GestureDetector>
    </GestureHandlerRootView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  heroContainer: {
    width: '100%',
    height: width * 0.75, // Dynamic height based on screen width
    position: 'relative',
    overflow: 'hidden', // Ensure zoomed image doesn't bleed out
  },
  heroImage: {
    width: '102%', // Slightly wider to ensure no edge gaps
    height: '102%',
    left: '-1%', // Center the slightly larger image
    transform: [{ scale: 1.1 }], // Zoom in to crop out potential black bars
  },
  heroPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120, // Taller gradient for smoother transition
  },
  topControls: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: '900',
    color: palette.black,
  },
  swipeHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    gap: 4,
  },
  minimalNavHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  minimalNavLabel: {
    fontSize: 7,
    fontWeight: '600',
    color: '#CBD5E1',
    letterSpacing: 0.3,
  },
  minimalNavArrow: {
    fontSize: 9,
    color: '#CBD5E1',
    fontWeight: '800',
  },
  content: {
    paddingHorizontal: spacing.xl,
    marginTop: -20, // Pull content over the hero area a bit
    zIndex: 10,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  mainTitle: {
    ...typography.title,
    fontSize: 34,
    lineHeight: 40,
    color: palette.black,
    fontWeight: '900',
    marginBottom: spacing.xs,
  },
  resourceMetaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
  },
  metaIcon: {
    fontSize: 12,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  mainActionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
  descriptionBox: {
    marginBottom: spacing.xl,
  },
  descriptionText: {
    ...typography.body,
    fontSize: 17,
    lineHeight: 26,
    color: '#334155',
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginBottom: spacing.xl,
  },
  infoGrid: {
    gap: spacing.lg,
  },
  infoItem: {
    flex: 1,
  },
  infoLabel: {
    ...typography.label,
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  infoValue: {
    ...typography.body,
    fontSize: 20,
    fontWeight: '800',
    color: palette.black,
  },
  progressContainer: {
    backgroundColor: '#F8FAFC',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  footerWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 180,
    justifyContent: 'flex-end',
  },
  footerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  footerContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
  },
  footerActions: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  skipBtn: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  skipBtnText: {
    color: '#64748B',
    fontWeight: '800',
    fontSize: 15,
  },
  completeBtn: {
    flex: 1,
    height: 56,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  completeBtnGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  completeBtnText: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 1,
  },
  resetBtn: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    borderRadius: 20,
    alignItems: 'center',
  },
  resetBtnText: {
    color: '#64748B',
    fontWeight: '800',
    fontSize: 15,
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
    color: '#64748B',
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
    backgroundColor: '#F1F5F9',
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
    fontSize: 12,
    fontWeight: '700',
    color: palette.black
  },

  // Skip Reason Modal
  skipReasonCard: {
    backgroundColor: palette.white,
    padding: 28,
    borderRadius: 28,
    alignItems: 'center',
    width: '100%',
    maxWidth: 360,
    elevation: 5,
  },
  skipReasonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    marginTop: 4,
  },
  skipReasonBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 14,
    width: '45%',
    gap: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  skipReasonLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.black,
    textAlign: 'center',
  },
  otherInputWrapper: {
    width: '100%',
    marginTop: 10,
  },
  otherTextInput: {
    backgroundColor: '#F1F5F9',
    borderRadius: 16,
    padding: 16,
    fontSize: 15,
    color: palette.black,
    textAlignVertical: 'top',
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  otherActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    justifyContent: 'flex-end',
  },
  otherCancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  otherCancelBtnText: {
    color: palette.gray,
    fontWeight: '700',
    fontSize: 15,
  },
  otherSubmitBtn: {
    backgroundColor: palette.black,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  otherSubmitBtnText: {
    color: palette.white,
    fontWeight: '900',
    fontSize: 15,
  },
  charCounter: {
    fontSize: 11,
    color: palette.gray,
    textAlign: 'right',
    marginTop: 4,
    fontWeight: '600',
  },
})
