import React from 'react'
import { View, Text } from 'react-native'
import { loadingMessages, LoadingStatus } from '@/lib/loadingMessages'
import { colors, spacing, typography } from '@/lib/theme'

type Props = {
  visible: boolean
  status: LoadingStatus
}

export default function LoadingOverlay({ visible, status }: Props) {
  // Se non è visibile, restituiamo null (ReactNode valido)
  if (!visible) return null

  const message = loadingMessages[status]

  return (
    <View
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
        zIndex: 999,
      }}
    >
      <Text style={{ fontSize: 48, marginBottom: spacing.md }}>
        {message.emoji}
      </Text>

      <Text style={typography.title}>
        {message.title}
      </Text>

      {message.subtitle && (
        <Text
          style={{
            ...typography.body,
            color: colors.textSecondary,
            marginTop: spacing.sm,
            textAlign: 'center',
          }}
        >
          {message.subtitle}
        </Text>
      )}
    </View>
  )
}