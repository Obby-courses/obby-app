import { LoadingStatus, loadingMessages } from '@/lib/loadingMessages'
import { colors, palette, spacing, typography } from '@/lib/theme'
import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { Text, View } from 'react-native'

type Props = {
  visible: boolean
  status: LoadingStatus
}

export default function LoadingOverlay({ visible, status }: Props) {
  if (!visible) return null

  const message = loadingMessages[status]

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: palette.white,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.lg,
        zIndex: 999,
      }}
    >
      <Ionicons name={message.icon} size={84} color={colors.primary} style={{ marginBottom: spacing.lg }} />

      <Text style={{ ...typography.title, textAlign: 'center' }}>
        {message.title}
      </Text>

      {message.subtitle && (
        <Text
          style={{
            ...typography.body,
            color: palette.gray,
            marginTop: spacing.md,
            textAlign: 'center',
            fontWeight: '600',
          }}
        >
          {message.subtitle}
        </Text>
      )}
    </View>
  )
}