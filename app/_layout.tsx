import { Stack, useRouter, useSegments } from 'expo-router'
import * as ScreenOrientation from 'expo-screen-orientation'
import { useEffect } from 'react'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import TabBar from '../components/TabBar'
import { AuthProvider, useAuth } from '../contexts/AuthContext'

console.log('🔥 _layout FILE LOADED')

function RootLayoutNav() {
  const { session, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === 'login'

    if (!session && !inAuthGroup) {
      // Se non è loggato e non è nella pagina login, vai al login
      router.replace('/login')
    } else if (session && inAuthGroup) {
      // Se è loggato e prova ad andare al login, vai alla home
      router.replace('/')
    }
  }, [session, loading, segments])

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
        }}
      />
      <TabBar />
    </>
  )
}

export default function RootLayout() {
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
  }, [])

  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
          <RootLayoutNav />
        </AuthProvider>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  )
}

