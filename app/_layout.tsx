import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { Stack } from 'expo-router'
import { useEffect } from 'react'

console.log('🔥 _layout FILE LOADED')

export default function RootLayout() {
  useEffect(() => {
    console.log('🔥 RootLayout MOUNTED')
    console.log('SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL)
    console.log(
      'ANON_KEY',
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 10)
    )
  }, [])

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: true,
        }}
      />
    </GestureHandlerRootView>
  )
}
