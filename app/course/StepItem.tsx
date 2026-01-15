import {
  colors,
  layout,
  radius,
  spacing,
  typography,
} from '@/lib/theme'
import React from 'react'
import {
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'

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
}

/* ================================
   COMPONENT
================================ */

export default function StepItem({
  step,
  onToggleCompleted,
}: StepItemProps) {

  const hasResource = !!step.resource

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* HEADER */}
      <View
        style={{
          paddingHorizontal: layout.cardPadding,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
          backgroundColor: colors.card,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(255,255,255,0.05)',
        }}
      >
        <Text
          style={{
            ...typography.small,
            color: step.completed
              ? colors.successText
              : colors.textSecondary,
            marginBottom: spacing.xs,
          }}
        >
          {step.completed ? '✓ COMPLETATO' : '○ DA FARE'}
        </Text>

        <Text style={{ ...typography.title }}>
          {step.title}
        </Text>
      </View>

      {/* THUMBNAIL INTERATTIVA (RESOURCE BUTTON) */}
      <View style={{ paddingHorizontal: layout.cardPadding, marginTop: spacing.md }}>
        <Pressable
          disabled={!hasResource}
          onPress={() => step.resource?.url && Linking.openURL(step.resource.url)}
          style={({ pressed }) => ({
            width: '100%',
            height: 200,
            backgroundColor: '#1a1a1a',
            borderRadius: radius.md,
            overflow: 'hidden',
            position: 'relative',
            opacity: pressed ? 0.9 : 1,
            borderWidth: 1,
            borderColor: 'rgba(255,255,255,0.1)',
          })}
        >
          {step.resource?.thumbnail_url ? (
            <Image
              source={{ uri: step.resource.thumbnail_url }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : (
            <View style={[StyleSheet.absoluteFillObject, { justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={{ fontSize: 40 }}>📺</Text>
            </View>
          )}

          {/* OVERLAY PLAY BUTTON */}
          {hasResource && (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' }]}>
              <View style={{
                backgroundColor: colors.accent,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: 30,
                flexDirection: 'row',
                alignItems: 'center',
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 5,
                elevation: 5
              }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>
                  GUARDA IL VIDEO
                </Text>
              </View>
            </View>
          )}

          {!hasResource && (
            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
              <Text style={{ color: '#888', textAlign: 'center', fontSize: 13, fontWeight: '600' }}>
                Risorsa in fase di generazione...
              </Text>
            </View>
          )}
        </Pressable>

        {hasResource && (
          <Text
            numberOfLines={1}
            style={{
              marginTop: spacing.xs,
              ...typography.small,
              color: colors.mutedText,
              fontSize: 12,
              fontStyle: 'italic'
            }}
          >
            {step.resource?.title}
          </Text>
        )}
      </View>

      {/* CONTENUTO */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: layout.cardPadding,
          paddingTop: spacing.md,
          paddingBottom: 120,
        }}
      >
        {step.description && (
          <Text
            style={{
              ...typography.body,
              color: colors.textSecondary,
              lineHeight: 22,
            }}
          >
            {step.description}
          </Text>
        )}
      </ScrollView>

      {/* OVERLAY DI COMPLETAMENTO (VELO OPACO) */}
      {step.completed && (
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              zIndex: 10,
              pointerEvents: 'none'
            }
          ]}
        />
      )}

      {/* FOOTER */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: layout.cardPadding,
          paddingBottom: 30,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: 'rgba(255,255,255,0.1)',
          zIndex: 20, // Sopra il velo opaco
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
              ? 'Step Completato'
              : 'Segna come completato'}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
