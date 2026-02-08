// constants/courseColors.ts
import { palette } from '@/lib/theme'

const COURSE_COLORS = [
  palette.yellow,
  palette.green,
  palette.purple,
  palette.blue,
  palette.pink,
  palette.peach,
  palette.cyan,
]

export function getCourseColor(id: string) {
  // Simple hash for consistent color per course
  const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return COURSE_COLORS[sum % COURSE_COLORS.length]
}
