import { Stack } from 'expo-router'
import * as ScreenOrientation from 'expo-screen-orientation'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

console.log('🔥 _layout FILE LOADED')

export default function RootLayout() {
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)

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
