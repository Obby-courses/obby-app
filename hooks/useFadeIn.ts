import { useFocusEffect } from 'expo-router'
import { useCallback, useRef } from 'react'
import { Animated } from 'react-native'

/**
 * Returns an Animated.Value that fades in to 1 every time the screen gains focus.
 * Use it on the root container of any screen for a consistent dissolve effect.
 */
export function useFadeIn(duration = 350) {
  const fadeAnim = useRef(new Animated.Value(0)).current

  useFocusEffect(
    useCallback(() => {
      fadeAnim.setValue(0)
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start()
    }, [])
  )

  return fadeAnim
}

/**
 * Returns an Animated.Value that fades in to 1 on mount (no focus tracking).
 * Ideal for modal-style screens like Login or NewCourse.
 */
export function useMountFadeIn(duration = 400) {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const hasAnimated = useRef(false)

  if (!hasAnimated.current) {
    hasAnimated.current = true
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }).start()
    }, 50)
  }

  return fadeAnim
}
