import ResourcePreview from '@/components/ResourcePreview'
import {
  colors,
  layout,
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
    resource: Resource | null
  }
  onToggleCompleted: (id: string, value: boolean) => void
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
  onToggleCompleted,
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

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: layout.cardPadding,
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + 140,
        }}
        bounces={false}
        alwaysBounceVertical={false}
      >
        {/* CARD PRINCIPALE CON IMMAGINE DI SFONDO */}
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
          style={({ pressed }) => ({
            width: '100%',
            minHeight: 380,
            backgroundColor: colors.card,
            borderRadius: radius.lg,
            overflow: 'hidden',
            opacity: pressed ? 0.95 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 12,
            elevation: 8
          })}
        >
          {/* IMMAGINE DI SFONDO */}
          {step.resource?.thumbnail_url ? (
            <Image
              source={{ uri: step.resource.thumbnail_url }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#1a1a1a', justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontSize: 60, opacity: 0.3 }}>📺</Text>
            </View>
          )}

          {/* GRADIENTE OVERLAY */}
          <View style={[StyleSheet.absoluteFillObject, {
            backgroundColor: 'rgba(0,0,0,0.5)'
          }]} />

          {/* CONTENUTO CARD */}
          <View style={{ flex: 1, padding: spacing.lg, justifyContent: 'space-between' }}>

            {/* BADGE IN ALTO */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{
                backgroundColor: step.completed ? colors.successBg : 'rgba(255,255,255,0.2)',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 6,
              }}>
                <Text style={{
                  color: step.completed ? colors.successText : '#fff',
                  fontSize: 11,
                  fontWeight: '700',
                  letterSpacing: 0.5
                }}>
                  {step.completed ? '✓ COMPLETATO' : 'DA FARE'}
                </Text>
              </View>

              {/* DEADLINE PER TUTTI GLI STEP NON COMPLETATI */}
              {!step.completed && (() => {
                const start = referenceDate ? new Date(referenceDate) : new Date()
                const totalMs = daysPerStep * 24 * 60 * 60 * 1000

                if (isCurrentStep) {
                  const deadlineMs = start.getTime() + totalMs
                  const now = new Date().getTime()
                  const remaining = Math.max(0, Math.min(1, (deadlineMs - now) / totalMs))
                  const percentage = (remaining * 100).toFixed(0) + '%'

                  return (
                    <View style={{
                      marginLeft: 'auto',
                      backgroundColor: 'rgba(255,255,255,0.1)',
                      borderRadius: 6,
                      height: 28,
                      minWidth: 120,
                      overflow: 'hidden',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: 'rgba(255,165,0,0.3)'
                    }}>
                      <View style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: `${percentage}` as any,
                        backgroundColor: 'rgba(255,165,0,0.8)',
                      }} />
                      <Text style={{
                        color: '#FFF',
                        fontSize: 10,
                        fontWeight: '800',
                        textAlign: 'center',
                        textShadowColor: 'rgba(0,0,0,0.4)',
                        textShadowOffset: { width: 0, height: 1 },
                        textShadowRadius: 2,
                        paddingHorizontal: 8
                      }}>
                        SCADE IL {getDeadline().toUpperCase()}
                      </Text>
                    </View>
                  )
                } else {
                  // Per gli step futuri, mostriamo solo un badge semplice con la data
                  return (
                    <View style={{
                      marginLeft: 'auto',
                      backgroundColor: 'rgba(255,255,255,0.15)',
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 6,
                      borderWidth: 1,
                      borderColor: 'rgba(255,255,255,0.1)'
                    }}>
                      <Text style={{
                        color: 'rgba(255,255,255,0.9)',
                        fontSize: 10,
                        fontWeight: '700',
                      }}>
                        ENTRO IL {getDeadline().toUpperCase()}
                      </Text>
                    </View>
                  )
                }
              })()}
            </View>



            {/* TITOLO E DESCRIZIONE */}
            <View>
              <Text style={{
                fontSize: 28,
                fontWeight: '800',
                color: '#fff',
                marginBottom: spacing.sm,
                textShadowColor: 'rgba(0,0,0,0.5)',
                textShadowOffset: { width: 0, height: 2 },
                textShadowRadius: 4,
                lineHeight: 34
              }}>
                {step.title}
              </Text>

              {step.description && (
                <Text
                  numberOfLines={10}
                  style={{
                    fontSize: 15,
                    color: 'rgba(255,255,255,0.9)',
                    lineHeight: 22,
                    marginBottom: spacing.md,
                    textShadowColor: 'rgba(0,0,0,0.3)',
                    textShadowOffset: { width: 0, height: 1 },
                    textShadowRadius: 2
                  }}
                >
                  {step.description}
                </Text>
              )}

              {/* PULSANTE PRINCIPALE */}
              {hasResource ? (
                <View style={{
                  backgroundColor: '#fff',
                  paddingVertical: 14,
                  paddingHorizontal: 24,
                  borderRadius: radius.md,
                  alignSelf: 'flex-start',
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 6,
                  elevation: 4,
                  marginTop: 'auto'
                }}>
                  <Text style={{
                    color: '#000',
                    fontWeight: '800',
                    fontSize: 15,
                    letterSpacing: 0.3
                  }}>
                    Guarda il Video
                  </Text>
                </View>
              ) : (
                <View style={{
                  backgroundColor: 'rgba(255,255,255,0.15)',
                  paddingVertical: 14,
                  paddingHorizontal: 24,
                  borderRadius: radius.md,
                  alignSelf: 'flex-start',
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.2)',
                  marginTop: 'auto'
                }}>
                  <Text style={{
                    color: 'rgba(255,255,255,0.6)',
                    fontWeight: '700',
                    fontSize: 14
                  }}>
                    Risorsa in caricamento...
                  </Text>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      </ScrollView>

      {/* FOOTER FISSO */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: layout.cardPadding,
          paddingBottom: Math.max(insets.bottom, 20),
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.1)',
        }}
      >
        <Pressable
          onPress={() =>
            onToggleCompleted(step.id, !step.completed)
          }
          style={({ pressed }) => ({
            backgroundColor: step.completed
              ? colors.successBg
              : colors.primaryButton,
            paddingVertical: spacing.md,
            borderRadius: radius.md,
            opacity: pressed ? 0.9 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }]
          })}
        >
          <Text
            style={{
              textAlign: 'center',
              fontSize: 16,
              fontWeight: '700',
              color: step.completed
                ? colors.successText
                : '#ffffff',
            }}
          >
            {step.completed
              ? '✓ Step Completato'
              : 'Segna come completato'}
          </Text>
        </Pressable>
      </View>

      <ResourcePreview
        visible={showPreview}
        onClose={() => setShowPreview(false)}
        type="youtube"
        url={step.resource?.url || ''}
      />
    </View >
  )
}
