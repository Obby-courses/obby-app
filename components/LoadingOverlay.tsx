import { LoadingStatus, loadingMessages } from '@/lib/loadingMessages'
import { palette, spacing, typography } from '@/lib/theme'
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
      <Text style={{ fontSize: 64, marginBottom: spacing.lg }}>
        {message.emoji}
      </Text>

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