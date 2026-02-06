import ResourcePreview from '@/components/ResourcePreview'
import {
  colors,
  radius,
  spacing
} from '@/lib/theme'
import React, { useState } from 'react'
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
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
}: StepItemProps) {
  const insets = useSafeAreaInsets()
  const [showPreview, setShowPreview] = useState(false)

  const hasResource = !!step.resource
  const isCurrentStep = index === firstIncompleteIndex

  // Funzione per formattare la data in Italiano
  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('it-IT', {
      day: 'numeric',
      month: 'long',
    }).format(date)
  }

  // Calcolo deadline dello step
  const getDeadline = () => {
    const start = referenceDate ? new Date(referenceDate) : new Date()
    const relativeIndex = index >= firstIncompleteIndex ? index - firstIncompleteIndex : 0
    const deadline = new Date(start.getTime() + (relativeIndex + 1) * daysPerStep * 24 * 60 * 60 * 1000)
    return formatDate(deadline)
  }

  const deadlineDate = getDeadline()

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: insets.bottom + 40,
        }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.card}>
          {/* TOP SECTION: Resource + Info */}
          <View style={styles.topSection}>
            <Pressable
              disabled={!hasResource}
              onPress={() => {
                if (step.resource?.url) {
                  const isYoutube = step.resource.url.includes('youtu');
                  if (isYoutube) {
                    setShowPreview(true);
                  } else {
                    Linking.openURL(step.resource.url);
                  }
                }
              }}
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
                  <Text style={{ fontSize: 32 }}>📺</Text>
                </View>
              )}
              {hasResource && (
                <View style={styles.playOverlay}>
                  <Text style={{ color: '#fff', fontSize: 12 }}>▶</Text>
                </View>
              )}
            </Pressable>

            <View style={styles.headerInfo}>
              <View style={styles.titleRow}>
                <Text style={styles.title} numberOfLines={2}>
                  {step.title}
                </Text>
                <Text style={styles.stepCount}>
                  x{index + 1}
                </Text>
              </View>

              <Text style={styles.statusText}>
                {step.status === 'skipped'
                  ? '⏭️ Saltato'
                  : step.completed
                    ? '✅ Completato'
                    : '⏳ In sospeso'}
              </Text>

              {!step.completed && (
                <Text style={styles.pricePlaceholder}>
                  Pronto per iniziare
                </Text>
              )}
            </View>
          </View>

          {/* DESCRIPTION */}
          {step.description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.description}>
                {step.description}
              </Text>
            </View>
          )}

          <View style={styles.divider} />

          {/* BOTTOM SECTION: Deadline + Actions */}
          <View style={styles.bottomSection}>
            <View style={styles.deadlineInfo}>
              <Text style={styles.deadlineLabel}>Scadenza stimata</Text>
              <Text style={styles.deadlineValue}>{deadlineDate}</Text>
            </View>

            <View style={styles.actionsRow}>
              {!step.completed ? (
                <>
                  <Pressable
                    onPress={() => onUpdateStatus(step.id, 'skipped')}
                    style={styles.skipButton}
                  >
                    <Text style={styles.skipButtonIcon}>⏭️</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => onUpdateStatus(step.id, 'completed')}
                    style={styles.completeButton}
                  >
                    <Text style={styles.completeButtonText}>Completa Step</Text>
                  </Pressable>
                </>
              ) : (
                <Pressable
                  onPress={() => onUpdateStatus(step.id, 'pending')}
                  style={[styles.completeButton, { backgroundColor: colors.successBg, borderWidth: 0 }]}
                >
                  <Text style={[styles.completeButtonText, { color: colors.successText }]}>
                    Ripristina
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      <ResourcePreview
        visible={showPreview}
        onClose={() => setShowPreview(false)}
        type="youtube"
        url={step.resource?.url || ''}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    // Elevation for Android
    elevation: 4,
  },
  topSection: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  thumbnailContainer: {
    width: 100,
    height: 100,
    borderRadius: radius.md,
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
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
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
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
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    flex: 1,
  },
  stepCount: {
    fontSize: 14,
    color: '#ccc',
    marginLeft: 8,
  },
  statusText: {
    fontSize: 13,
    color: '#999',
    marginTop: 2,
    marginBottom: 8,
  },
  pricePlaceholder: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  descriptionSection: {
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 14,
    color: '#555',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: spacing.md,
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deadlineInfo: {
    flex: 1,
  },
  deadlineLabel: {
    fontSize: 12,
    color: '#bbb',
    marginBottom: 2,
  },
  deadlineValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  completeButton: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    minWidth: 120,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
  skipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonIcon: {
    fontSize: 18,
  },
})
