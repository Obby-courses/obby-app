import React from 'react'
import {
  View,
  Text,
  Pressable,
  Linking,
  ScrollView,
} from 'react-native'
import {
  colors,
  spacing,
  radius,
  layout,
  typography,
} from '@/lib/theme'

/* ================================
   TIPI
================================ */

type Resource = {
  id: string
  title: string
  url: string
  type: string   // ⬅️ NON più union type
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

  const getResourceIcon = (type?: string) => {
    switch (type) {
      case 'video': return '📺'
      case 'article': return '📄'
      case 'tool': return '🛠️'
      case 'course': return '🎓'
      default: return '🔗'
    }
  }

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

      {/* CONTENUTO */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: layout.cardPadding,
          paddingBottom: 120,
        }}
      >
        {step.description && (
          <Text
            style={{
              ...typography.body,
              color: colors.textSecondary,
              marginBottom: spacing.lg,
              lineHeight: 22,
            }}
          >
            {step.description}
          </Text>
        )}

        {/* BOX RISORSA */}
        <View style={{ marginTop: spacing.sm }}>
          <Text
            style={{
              ...typography.small,
              color: colors.textSecondary,
              marginBottom: spacing.sm
            }}
          >
            MATERIALE DI STUDIO
          </Text>
          
          <Pressable
            disabled={!hasResource}
            onPress={() =>
              step.resource?.url && Linking.openURL(step.resource.url)
            }
            style={({ pressed }) => ({
              backgroundColor: hasResource ? colors.card : '#222',
              borderRadius: radius.md,
              padding: spacing.md,
              borderWidth: 1,
              borderColor: hasResource ? 'rgba(255,255,255,0.1)' : 'transparent',
              opacity: !hasResource ? 0.5 : (pressed ? 0.8 : 1),
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 24, marginRight: spacing.sm }}>
                {getResourceIcon(step.resource?.type)}
              </Text>
              
              <View style={{ flex: 1 }}>
                <Text
                  numberOfLines={1}
                  style={{
                    ...typography.body,
                    fontWeight: '700',
                    color: hasResource
                      ? colors.accent
                      : colors.textSecondary,
                  }}
                >
                  {hasResource
                    ? 'Apri Risorsa Esterna'
                    : 'Nessuna risorsa'}
                </Text>

                {hasResource && (
                  <Text
                    numberOfLines={2}
                    style={{
                      marginTop: 2,
                      fontSize: 13,
                      color: colors.textSecondary,
                    }}
                  >
                    {step.resource?.title}
                  </Text>
                )}
              </View>
            </View>
          </Pressable>
          
          {!hasResource && (
            <Text
              style={{
                fontSize: 12,
                color: '#666',
                marginTop: spacing.xs,
                textAlign: 'center'
              }}
            >
              Stiamo preparando il materiale per questo step...
            </Text>
          )}
        </View>
      </ScrollView>

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
