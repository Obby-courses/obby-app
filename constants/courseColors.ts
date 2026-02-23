// constants/courseColors.ts
import { palette } from '@/lib/theme'

export const COURSE_COLORS = [
  palette.yellow,
  palette.green,
  palette.purple,
  palette.blue,
  palette.pink,
  palette.peach,
  palette.cyan,
]

export function getCourseColorIndex(id: string) {
  const sum = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return sum % COURSE_COLORS.length
}

export function getCourseColor(id: string, colorIndex?: number | null) {
  if (colorIndex !== undefined && colorIndex !== null) {
    return COURSE_COLORS[colorIndex % COURSE_COLORS.length]
  }
  return COURSE_COLORS[getCourseColorIndex(id)]
}
