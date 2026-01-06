import {
  colors,
  radius,
  spacing,
  typography,
} from '@/lib/theme'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import {
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native'

export default function NewCourseScreen() {
  const router = useRouter()
  const [courseInput, setCourseInput] = useState('')

  function handleSubmit() {
    console.log('📤 Corso:', courseInput)
    alert('Corso creato (demo)')
    router.push('/')
  }

  const isValid = courseInput.trim().length > 0

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
      }}
    >
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingTop: 80,
          paddingBottom: 120,
        }}
      >
        {/* HEADER */}
        <Pressable
          onPress={() => router.back()}
          style={{
            alignSelf: 'flex-start',
            marginBottom: spacing.lg,
          }}
        >
          <Text style={typography.backButton}>
            ←
          </Text>
        </Pressable>

        <Text style={typography.title}>
          Crea corso
        </Text>

        <TextInput
          value={courseInput}
          onChangeText={setCourseInput}
          placeholder="Descrivi cosa vuoi imparare..."
          placeholderTextColor={colors.mutedText}
          multiline
          textAlignVertical="top"
          style={{
            backgroundColor: colors.card,
            borderRadius: radius.md,
            padding: spacing.md,
            ...typography.body,
            minHeight: 120,
            marginTop: spacing.lg,
          }}
        />
      </ScrollView>

      {/* CTA FISSO */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: spacing.lg,
          backgroundColor: colors.background,
          borderTopWidth: 1,
          borderTopColor: colors.card,
        }}
      >
        <Pressable
          onPress={handleSubmit}
          disabled={!isValid}
          style={{
            backgroundColor: isValid
              ? colors.primaryButton
              : colors.textSecondary,
            paddingVertical: spacing.md,
            borderRadius: radius.md,
            opacity: isValid ? 1 : 0.4,
          }}
        >
          <Text
            style={{
              color: '#fff',
              textAlign: 'center',
              fontSize: 16,
              fontWeight: '600',
            }}
          >
            Crea corso
          </Text>
        </Pressable>
      </View>
    </View>
  )
}