import { supabase } from '@/lib/supabase'
import { colors } from '@/lib/theme'
import { Ionicons } from '@expo/vector-icons'
import {
  useLocalSearchParams,
  useRouter,
} from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  Text,
  View,
} from 'react-native'
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import CourseViewer from './CourseViewer'

const { width } = Dimensions.get('window')

export default function CourseScreen() {
  const { id: initialCourseId } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [displayTitle, setDisplayTitle] = useState('')

  const flatListRef = useRef<FlatList>(null)
  const titleOpacity = useSharedValue(1)

  useEffect(() => {
    loadAllCourses()
  }, [])

  async function loadAllCourses() {
    const { data } = await supabase
      .from('courses')
      .select('id, title')
      .order('created_at', { ascending: false })

    if (data) {
      setCourses(data)

      let startIdx = 0
      if (initialCourseId && initialCourseId !== 'any') {
        const idx = data.findIndex(c => c.id === initialCourseId)
        if (idx !== -1) startIdx = idx
      }

      setCurrentIndex(startIdx)
      setDisplayTitle(data[startIdx]?.title || '')

      setTimeout(() => {
        flatListRef.current?.scrollToIndex({ index: startIdx, animated: false })
      }, 0)
    }
    setLoading(false)
  }

  const onScroll = (event: any) => {
    const x = event.nativeEvent.contentOffset.x
    const newIdx = Math.round(x / width)
    if (newIdx !== currentIndex && newIdx >= 0 && newIdx < courses.length) {
      // Start fade out
      titleOpacity.value = withTiming(0, { duration: 200 }, () => {
        runOnJS(updateTitle)(newIdx)
      })
    }
  }

  const updateTitle = (index: number) => {
    setCurrentIndex(index)
    setDisplayTitle(courses[index]?.title || '')
    // Fade in
    titleOpacity.value = withTiming(1, { duration: 200 })
  }

  const animatedTitleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value
  }))

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* FIXED HEADER */}
      <View style={{
        paddingTop: insets.top + 8,
        paddingHorizontal: 20,
        paddingBottom: 12,
        zIndex: 100,
        backgroundColor: colors.background,
        flexDirection: 'row',
        alignItems: 'center'
      }}>
        <Pressable
          onPress={() => router.replace('/')}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            borderWidth: 2,
            borderColor: colors.primary,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: colors.background
          }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>

        <Animated.View style={[{ flex: 1, marginHorizontal: 15 }, animatedTitleStyle]}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Il tuo percorso</Text>
          <Text style={{ fontSize: 22, fontWeight: '900', color: colors.primary }} numberOfLines={1}>
            {displayTitle}
          </Text>
        </Animated.View>
        <View style={{ width: 44 }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={courses}
        horizontal
        pagingEnabled
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        renderItem={({ item }) => (
          <CourseViewer courseId={item.id} hideHeader />
        )}
        removeClippedSubviews={true}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
      />
    </View>
  )
}

