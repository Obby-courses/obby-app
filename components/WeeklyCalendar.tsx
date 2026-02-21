import { palette, spacing, typography } from '@/lib/theme'
import { Ionicons } from '@expo/vector-icons'
import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler'

type WeeklyCalendarProps = {
    tasksByDate: Record<string, string[]>
}

export default function WeeklyCalendar({ tasksByDate }: WeeklyCalendarProps) {
    const [expanded, setExpanded] = useState(false)
    const [viewDate, setViewDate] = useState(new Date())

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const getDayLabel = (date: Date) => {
        const labels = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab']
        return labels[date.getDay()]
    }

    const formatDateKey = (date: Date) => {
        const d = new Date(date)
        d.setHours(0, 0, 0, 0)
        const year = d.getFullYear()
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const day = String(d.getDate()).padStart(2, '0')
        return `${year}-${month}-${day}`
    }

    const getMonday = (d: Date) => {
        const date = new Date(d)
        const day = date.getDay()
        const diff = date.getDate() - day + (day === 0 ? -6 : 1)
        const res = new Date(date.setDate(diff))
        res.setHours(0, 0, 0, 0)
        return res
    }

    const changeMonth = (delta: number) => {
        const newDate = new Date(viewDate)
        newDate.setDate(1)
        newDate.setMonth(newDate.getMonth() + delta)
        setViewDate(newDate)
    }

    const changeWeek = (delta: number) => {
        const newDate = new Date(viewDate)
        newDate.setDate(newDate.getDate() + (delta * 7))
        setViewDate(newDate)
    }

    const handleSwipe = (direction: 'left' | 'right') => {
        if (expanded) changeMonth(direction === 'left' ? 1 : -1)
        else changeWeek(direction === 'left' ? 1 : -1)
    }

    const swipeLeft = Gesture.Fling().direction(Directions.LEFT).onEnd(() => handleSwipe('left')).runOnJS(true)
    const swipeRight = Gesture.Fling().direction(Directions.RIGHT).onEnd(() => handleSwipe('right')).runOnJS(true)
    const swipeDown = Gesture.Fling().direction(Directions.DOWN).onEnd(() => { if (expanded) setExpanded(false) }).runOnJS(true)
    const swipeUp = Gesture.Fling().direction(Directions.UP).onEnd(() => { if (!expanded) setExpanded(true) }).runOnJS(true)
    const composed = Gesture.Race(swipeLeft, swipeRight, swipeDown, swipeUp)

    const getWeeks = () => {
        if (!expanded) {
            const monday = getMonday(viewDate)
            const week = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(monday)
                d.setDate(monday.getDate() + i)
                return d
            })
            return [week]
        } else {
            const year = viewDate.getFullYear()
            const month = viewDate.getMonth()
            const firstDayOfMonth = new Date(year, month, 1)
            const startGrid = getMonday(firstDayOfMonth)
            const lastDayOfMonth = new Date(year, month + 1, 0)
            const lastDayOfWeek = lastDayOfMonth.getDay()
            const endGrid = new Date(lastDayOfMonth)
            endGrid.setDate(lastDayOfMonth.getDate() + ((7 - lastDayOfWeek) % 7))

            const weeks: Date[][] = []
            let current = new Date(startGrid)
            while (current <= endGrid) {
                const week: Date[] = []
                for (let i = 0; i < 7; i++) {
                    week.push(new Date(current))
                    current.setDate(current.getDate() + 1)
                }
                weeks.push(week)
            }
            return weeks
        }
    }

    const weeks = getWeeks()

    let monthLabel = ''
    if (expanded) {
        monthLabel = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(viewDate).toUpperCase()
    } else {
        const monday = getMonday(viewDate)
        const sunday = new Date(monday)
        sunday.setDate(monday.getDate() + 6)
        if (monday.getMonth() !== sunday.getMonth()) {
            const m1 = new Intl.DateTimeFormat('it-IT', { month: 'short' }).format(monday).toUpperCase()
            const m2 = new Intl.DateTimeFormat('it-IT', { month: 'short' }).format(sunday).toUpperCase()
            monthLabel = `${m1} - ${m2} ${monday.getFullYear()}`
        } else {
            monthLabel = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(monday).toUpperCase()
        }
    }

    return (
        <GestureDetector gesture={composed}>
            <View style={styles.container}>
                <View style={[styles.header, !expanded && { justifyContent: 'center', marginBottom: 6, paddingHorizontal: 0 }]}>
                    {expanded && (
                        <Pressable onPress={() => changeMonth(-1)} style={styles.navButton} hitSlop={15}>
                            <Ionicons name="chevron-back" size={16} color={palette.black} />
                        </Pressable>
                    )}
                    <Text style={styles.monthTitle}>{monthLabel}</Text>
                    {expanded && (
                        <Pressable onPress={() => changeMonth(1)} style={styles.navButton} hitSlop={15}>
                            <Ionicons name="chevron-forward" size={16} color={palette.black} />
                        </Pressable>
                    )}
                </View>

                <View style={styles.grid}>
                    {weeks.map((week, wIndex) => (
                        <View key={wIndex} style={styles.daysRow}>
                            {week.map((date, dIndex) => {
                                const isToday = date.getTime() === today.getTime()
                                const isCurrentMonth = date.getMonth() === viewDate.getMonth()
                                const dateKey = formatDateKey(date)
                                const colors = tasksByDate[dateKey] || []
                                const taskCount = colors.length

                                return (
                                    <View key={dIndex} style={styles.dayColumn}>
                                        {wIndex === 0 && (
                                            <Text style={[styles.dayLabel, isToday && styles.todayLabel]}>
                                                {getDayLabel(date)}
                                            </Text>
                                        )}
                                        <View style={[
                                            styles.dateContainer,
                                            isToday && styles.todayContainer,
                                            !isCurrentMonth && expanded && { opacity: 0.3 }
                                        ]}>
                                            <Text style={[
                                                styles.dateText,
                                                isToday && styles.todayText,
                                                !isCurrentMonth && expanded && { color: palette.gray }
                                            ]}>
                                                {date.getDate()}
                                            </Text>
                                            <View style={styles.dotsContainer}>
                                                {colors.slice(0, 3).map((color, i) => (
                                                    <View
                                                        key={i}
                                                        style={[
                                                            styles.dot,
                                                            { backgroundColor: isToday ? palette.white : color },
                                                            isToday && styles.todayDot
                                                        ]}
                                                    />
                                                ))}
                                                {taskCount > 3 && <Text style={[styles.plusText, isToday && styles.todayText]}>+</Text>}
                                            </View>
                                        </View>
                                    </View>
                                )
                            })}
                        </View>
                    ))}
                </View>

                <Pressable
                    style={styles.expandButton}
                    onPress={() => setExpanded(!expanded)}
                    hitSlop={15}
                >
                    <View style={styles.expandHandle} />
                </Pressable>
            </View>
        </GestureDetector>
    )
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: palette.white,
        borderRadius: 32,
        padding: spacing.md,
        paddingBottom: 4,
        marginTop: spacing.sm,
        marginBottom: spacing.lg,
        borderWidth: 2,
        borderColor: palette.border,
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 2,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
        paddingHorizontal: spacing.sm,
    },
    navButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: palette.lightGray,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: palette.border,
    },
    navText: {
        fontSize: 14,
        color: palette.black,
        fontWeight: '900',
    },
    monthTitle: {
        ...typography.label,
        fontSize: 12,
        letterSpacing: 2,
        color: palette.black,
        textAlign: 'center',
    },
    grid: {
        gap: 12,
    },
    daysRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    dayColumn: {
        alignItems: 'center',
        flex: 1,
    },
    dayLabel: {
        ...typography.label,
        fontSize: 10,
        color: palette.gray,
        marginBottom: 8,
    },
    todayLabel: {
        color: palette.black,
        fontWeight: '900',
    },
    dateContainer: {
        width: 36,
        height: 48,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    todayContainer: {
        backgroundColor: palette.black,
        borderRadius: 18,
    },
    dateText: {
        ...typography.body,
        fontSize: 14,
        fontWeight: '800',
        color: palette.black,
    },
    todayText: {
        color: palette.white,
    },
    dotsContainer: {
        flexDirection: 'row',
        marginTop: 4,
        height: 6,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: palette.black,
    },
    todayDot: {
        backgroundColor: palette.white,
    },
    plusText: {
        fontSize: 8,
        fontWeight: '900',
        color: palette.black,
    },
    expandButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
    },
    expandHandle: {
        width: 32,
        height: 4,
        borderRadius: 2,
        backgroundColor: palette.border,
    },
})

