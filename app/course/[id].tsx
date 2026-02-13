import { supabase } from '@/lib/supabase'
import { colors } from '@/lib/theme'
import {
  useLocalSearchParams,
} from 'expo-router'
import { useEffect, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  View,
} from 'react-native'
import CourseViewer from './CourseViewer'

const { width } = Dimensions.get('window')

export default function CourseScreen() {
  const { id: initialCourseId } = useLocalSearchParams<{ id: string }>()
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const flatListRef = useRef<FlatList>(null)

  useEffect(() => {
    loadAllCourses()
  }, [])

  async function loadAllCourses() {
    const { data, error } = await supabase
      .from('courses')
      .select('id')
      .order('created_at', { ascending: false })

    if (data) {
      setCourses(data)

      // Set initial index based on courseId
      if (initialCourseId && initialCourseId !== 'any') {
        const idx = data.findIndex(c => c.id === initialCourseId)
        if (idx !== -1) {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: idx, animated: false })
          }, 100)
        }
      }
    }
    setLoading(false)
  }

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <FlatList
        ref={flatListRef}
        data={courses}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        onScrollToIndexFailed={(info) => {
          setTimeout(() => {
            flatListRef.current?.scrollToIndex({ index: info.index, animated: false });
          }, 100);
        }}
        renderItem={({ item }) => (
          <CourseViewer courseId={item.id} />
        )}
        removeClippedSubviews={true}
        initialNumToRender={1}
        maxToRenderPerBatch={1}
        windowSize={3}
      />
    </View>
  )
}

