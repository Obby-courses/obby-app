import { colors, radius, spacing } from '@/lib/theme'
import React, { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { Directions, Gesture, GestureDetector } from 'react-native-gesture-handler'

type WeeklyCalendarProps = {
    tasksByDate: Record<string, number>
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
        // Set date to 1 to avoid skipping months
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
        if (expanded) {
            // Month change
            // Left swipe -> Next Month (+1)
            // Right swipe -> Prev Month (-1)
            changeMonth(direction === 'left' ? 1 : -1)
        } else {
            // Week change
            // Left swipe -> Next Week (+1)
            // Right swipe -> Prev Week (-1)
            changeWeek(direction === 'left' ? 1 : -1)
        }
    }

    // Gestures
    const swipeLeft = Gesture.Fling().direction(Directions.LEFT).onEnd(() => handleSwipe('left')).runOnJS(true)
    const swipeRight = Gesture.Fling().direction(Directions.RIGHT).onEnd(() => handleSwipe('right')).runOnJS(true)
    const swipeDown = Gesture.Fling().direction(Directions.DOWN).onEnd(() => {
        if (expanded) setExpanded(false)
    }).runOnJS(true)
    const swipeUp = Gesture.Fling().direction(Directions.UP).onEnd(() => {
        if (!expanded) setExpanded(true)
    }).runOnJS(true)
    const composed = Gesture.Race(swipeLeft, swipeRight, swipeDown, swipeUp)

    // Calcolo delle settimane da mostrare
    const getWeeks = () => {
        if (!expanded) {
            // Settimana visualizzata (basata su viewDate)
            const monday = getMonday(viewDate)
            const week = Array.from({ length: 7 }, (_, i) => {
                const d = new Date(monday)
                d.setDate(monday.getDate() + i)
                return d
            })
            return [week]
        } else {
            // Mese selezionato
            const year = viewDate.getFullYear()
            const month = viewDate.getMonth()

            const firstDayOfMonth = new Date(year, month, 1)
            const startGrid = getMonday(firstDayOfMonth)

            const lastDayOfMonth = new Date(year, month + 1, 0)
            const lastDayOfWeek = lastDayOfMonth.getDay()
            const daysUntilSunday = (7 - lastDayOfWeek) % 7
            const endGrid = new Date(lastDayOfMonth)
            endGrid.setDate(lastDayOfMonth.getDate() + daysUntilSunday)

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

    // Mese visualizzato 
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
            const y = monday.getFullYear()
            monthLabel = `${m1} - ${m2} ${y}`
        } else {
            monthLabel = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(monday).toUpperCase()
        }
    }

    return (
        <GestureDetector gesture={composed}>
            <View style={styles.container}>
                {expanded && (
                    <View style={styles.header}>
                        <Pressable
                            onPress={() => changeMonth(-1)}
                            style={styles.navButton}
                            hitSlop={15}
                        >
                            <Text style={styles.navText}>←</Text>
                        </Pressable>

                        <Text style={styles.monthTitle}>{monthLabel}</Text>

                        <Pressable
                            onPress={() => changeMonth(1)}
                            style={styles.navButton}
                            hitSlop={15}
                        >
                            <Text style={styles.navText}>→</Text>
                        </Pressable>
                    </View>
                )}

                {!expanded && (
                    <View style={[styles.header, { justifyContent: 'center', marginBottom: 6, paddingHorizontal: 0 }]}>
                        <Text style={styles.monthTitle}>{monthLabel}</Text>
                    </View>
                )}

                <View style={styles.grid}>
                    {weeks.map((week, wIndex) => (
                        <View key={wIndex} style={styles.daysRow}>
                            {week.map((date, dIndex) => {
                                const isToday = date.getTime() === today.getTime()
                                const isCurrentMonth = date.getMonth() === viewDate.getMonth()
                                const dateKey = formatDateKey(date)
                                const taskCount = tasksByDate[dateKey] || 0

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
                                                !isCurrentMonth && expanded && { color: colors.textSecondary }
                                            ]}>
                                                {date.getDate()}
                                            </Text>

                                            <View style={styles.dotsContainer}>
                                                {Array.from({ length: Math.min(taskCount, 3) }).map((_, i) => (
                                                    <View key={i} style={[styles.dot, isToday && styles.todayDot]} />
                                                ))}
                                                {taskCount > 3 && (
                                                    <Text style={[styles.plusText, isToday && styles.todayText]}>+</Text>
                                                )}
                                            </View>
                                        </View>
                                    </View>
                                )
                            })}
                        </View>
                    ))}
                </View>

                {/* Toggle Button */}
                <Pressable
                    style={styles.expandButton}
                    onPress={() => {
                        // removed auto-reset to user's swipe preference
                        setExpanded(!expanded)
                    }}
                    hitSlop={15}
                >
                    <Text style={styles.arrowText}>
                        {expanded ? '▲' : '▼'}
                    </Text>
                </Pressable>
            </View>
        </GestureDetector>
    )
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        padding: spacing.md,
        paddingBottom: 4,
        marginTop: spacing.sm,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: '#eee',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
        paddingHorizontal: spacing.sm,
    },
    navButton: {
        padding: 4,
    },
    navText: {
        fontSize: 18,
        color: colors.primaryButton,
        fontWeight: 'bold',
    },
    monthTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
        letterSpacing: 1,
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
        fontSize: 10,
        color: colors.mutedText,
        marginBottom: 6,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    todayLabel: {
        color: colors.accent,
    },
    dateContainer: {
        width: 32,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    todayContainer: {
        backgroundColor: colors.accent,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    dateText: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    todayText: {
        color: '#fff',
    },
    dotsContainer: {
        flexDirection: 'row',
        marginTop: 3,
        height: 5,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    dot: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: colors.accent,
    },
    todayDot: {
        backgroundColor: '#fff',
    },
    plusText: {
        fontSize: 7,
        fontWeight: 'bold',
        color: colors.accent,
        marginLeft: 1,
    },
    expandButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        marginTop: 4,
    },
    arrowText: {
        fontSize: 12,
        color: colors.mutedText,
        opacity: 0.6,
    }
})
