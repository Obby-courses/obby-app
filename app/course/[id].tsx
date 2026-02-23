import { supabase } from '@/lib/supabase'
import { colors } from '@/lib/theme'
import { Ionicons } from '@expo/vector-icons'
import {
  useFocusEffect,
  useLocalSearchParams,
  useRouter
} from 'expo-router'
import { useCallback, useRef, useState } from 'react'
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

  useFocusEffect(
    useCallback(() => {
      loadAllCourses(true)
    }, [currentIndex])
  )

  async function loadAllCourses(isRefresh = false) {
    const { data } = await supabase
      .from('courses')
      .select('id, title, color_index')
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

      if (!isRefresh) {
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({ index: startIdx, animated: false })
        }, 0)
      }
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

  if (courses.length === 0) {
    return (
      <View style={{
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40
      }}>
        <View style={{
          width: 100,
          height: 100,
          borderRadius: 50,
          backgroundColor: '#f1f5f9',
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 24
        }}>
          <Ionicons name="school-outline" size={50} color="#94a3b8" />
        </View>

        <Text style={{
          fontSize: 24,
          fontWeight: '900',
          color: colors.primary,
          textAlign: 'center',
          marginBottom: 12
        }}>
          Nessun corso trovato
        </Text>

        <Text style={{
          fontSize: 16,
          color: '#64748b',
          textAlign: 'center',
          marginBottom: 32,
          lineHeight: 24
        }}>
          Non hai ancora dei corsi attivi. Creane uno nuovo per iniziare il tuo percorso di apprendimento.
        </Text>

        <Pressable
          onPress={() => router.push('/new-course')}
          style={{
            backgroundColor: colors.primary,
            paddingVertical: 16,
            paddingHorizontal: 32,
            borderRadius: 16,
            width: '100%',
            alignItems: 'center',
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
            elevation: 5
          }}
        >
          <Text style={{ color: colors.background, fontSize: 18, fontWeight: '700' }}>Crea Nuovo Corso</Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace('/')}
          style={{ marginTop: 24 }}
        >
          <Text style={{ color: '#94a3b8', fontSize: 16, fontWeight: '600' }}>Torna alla Home</Text>
        </Pressable>
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
        <Pressable
          onPress={() => router.push({
            pathname: '/course/[id]/settings',
            params: { id: courses[currentIndex]?.id }
          })}
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Ionicons name="ellipsis-vertical" size={24} color={colors.primary} />
        </Pressable>
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
        renderItem={({ item, index }) => (
          <CourseViewer
            courseId={item.id}
            hideHeader
            isActive={index === currentIndex}
          />
        )}
        removeClippedSubviews={true}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
      />
    </View>
  )
}

