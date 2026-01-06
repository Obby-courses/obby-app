import {
  View,
  Text,
  Image,
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

type StepResources = {
  cover_url?: string | null
  resource_url?: string | null
}

type StepItemProps = {
  step: {
    id: string
    title: string
    description: string | null
    completed: boolean
    resources: StepResources | null
  }
  onToggleCompleted: (id: string, value: boolean) => void
}

export default function StepItem({
  step,
  onToggleCompleted,
}: StepItemProps) {
  const coverUrl = step.resources?.cover_url
  const resourceUrl = step.resources?.resource_url

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      {/* HEADER FISSO */}
      <View
        style={{
          paddingHorizontal: layout.cardPadding,
          paddingTop: spacing.md,
          paddingBottom: spacing.sm,
          backgroundColor: colors.card,
        }}
      >
        {coverUrl && (
          <Image
            source={{ uri: coverUrl }}
            resizeMode="cover"
            style={{
              width: '100%',
              height: 120, // 👈 meno spazio
              borderRadius: radius.md,
              marginBottom: spacing.xs,
            }}
          />
        )}

        <Text
          style={{
            ...typography.small,
            color: step.completed
              ? colors.successText
              : colors.textSecondary,
            marginBottom: spacing.xs,
          }}
        >
          {step.completed ? 'COMPLETATO' : 'DA FARE'}
        </Text>

        <Text
          style={{
            ...typography.title,
            marginBottom: spacing.xs, // 👈 più compatto
          }}
        >
          {step.title}
        </Text>
      </View>

      {/* CONTENUTO SCROLLABILE */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          padding: layout.cardPadding,
          paddingBottom: 120, // spazio bottone fisso
        }}
        showsVerticalScrollIndicator={false}
      >
        {step.description && (
          <Text
            style={{
              ...typography.body,
              color: colors.textSecondary,
              marginBottom: spacing.lg,
            }}
          >
            {step.description}
          </Text>
        )}

        {resourceUrl && (
          <Pressable onPress={() => Linking.openURL(resourceUrl)}>
            <Text
              style={{
                ...typography.body,
                color: colors.accent,
                fontWeight: '600',
              }}
            >
              Apri risorsa →
            </Text>
          </Pressable>
        )}
      </ScrollView>

      {/* FOOTER FISSO */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: layout.cardPadding,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: '#eee',
        }}
      >
        <Pressable
          onPress={() =>
            onToggleCompleted(step.id, !step.completed)
          }
          style={{
            backgroundColor: step.completed
              ? colors.successBg
              : colors.primaryButton,
            paddingVertical: spacing.md,
            borderRadius: radius.md,
          }}
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
            {step.completed ? 'Completato' : 'Completa'}
          </Text>
        </Pressable>
      </View>
    </View>
  )
}
