import { Stack, useRouter, useSegments } from 'expo-router'
import * as ScreenOrientation from 'expo-screen-orientation'
import { useEffect } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import TabBar from '../components/TabBar'
import { AuthProvider, useAuth } from '../contexts/AuthContext'



function RootLayoutNav() {
  const { session, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    console.log('🧭 [Layout] useEffect → loading:', loading, '| session:', !!session, '| segments:', segments)
    if (loading) return

    const inAuthGroup = segments[0] === 'login'

    if (!session && !inAuthGroup) {
      console.log('➡️ [Layout] Non loggato → redirect /login')
      router.replace('/login')
    } else if (session && inAuthGroup) {
      console.log('➡️ [Layout] Loggato ma su /login → redirect /')
      router.replace('/')
    } else {
      console.log('✅ [Layout] Navigazione ok, nessun redirect')
    }
  }, [session, loading, segments])

  // Schermo di caricamento invece di schermo bianco
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    )
  }

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: false,
          animation: 'fade',
          animationDuration: 300,
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

