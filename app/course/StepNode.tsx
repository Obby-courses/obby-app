import { colors, palette } from '@/lib/theme'
import React from 'react'
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native'
import Svg, { Circle } from 'react-native-svg'

type StepNodeProps = {
    step: {
        id: string
        title: string
        completed: boolean
        status?: 'pending' | 'completed' | 'skipped'
        order_index: number
        global_index: number
    }
    index: number
    isLocked: boolean
    isCurrent: boolean
    isPlaceholder?: boolean
    remainingProgress?: number // 0 to 1
    onPress: () => void
    courseColor?: string
    streakStatus?: 'fire' | 'fire-grey' | 'none'
}

export default function StepNode({
    step,
    index,
    isLocked,
    isCurrent,
    isPlaceholder = false,
    remainingProgress = 1,
    onPress,
    courseColor = colors.primary,
    streakStatus = 'none',
}: StepNodeProps) {
    const isCompleted = step.completed || step.status === 'skipped'

    // Styles based on state
    let backgroundColor: string = colors.card
    let textColor: string = colors.mutedText
    let borderColor: string = 'transparent'

    if (isCompleted) {
        backgroundColor = colors.background
        textColor = colors.textPrimary
        borderColor = colors.primary
    } else if (isCurrent) {
        backgroundColor = colors.background
        textColor = colors.textPrimary
        borderColor = colors.primary
    } else if (isPlaceholder) {
        backgroundColor = colors.card
        textColor = colors.mutedText
    } else if (!isLocked) {
        backgroundColor = colors.background
        textColor = colors.textPrimary
        borderColor = colors.border
    }

    // Circular Progress Params
    const size = 80;
    const strokeWidth = 5;
    const center = size / 2;
    const radius = size / 2 - strokeWidth;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - remainingProgress * circumference;

    return (
        <View style={styles.container}>
            {/* STREAK FIRE BADGE */}
            {streakStatus !== 'none' && (
                <View style={styles.fireBadge}>
                    <Text style={[
                        styles.fireEmoji,
                        streakStatus === 'fire-grey' && styles.fireEmojiGrey
                    ]}>
                        🔥
                    </Text>
                </View>
            )}

            {isCurrent && (
                <View style={styles.svgWrapper}>
                    <Svg width={size} height={size}>
                        <Circle
                            cx={center}
                            cy={center}
                            r={radius}
                            stroke={colors.border}
                            strokeWidth={strokeWidth}
                            fill="none"
                        />
                        <Circle
                            cx={center}
                            cy={center}
                            r={radius}
                            stroke={courseColor}
                            strokeWidth={strokeWidth}
                            strokeDasharray={circumference}
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            fill="none"
                            transform={`rotate(-90 ${center} ${center})`}
                        />
                    </Svg>
                </View>
            )}

            <Pressable
                onPress={onPress}
                disabled={isLocked}
                style={({ pressed }) => [
                    styles.node,
                    {
                        backgroundColor,
                        borderColor: isPlaceholder ? colors.border : (isCompleted || isCurrent ? colors.primary : borderColor),
                        borderStyle: isPlaceholder ? 'dashed' : 'solid',
                        opacity: isLocked && !isPlaceholder ? 0.3 : 1,
                        transform: [{ scale: (pressed && !isPlaceholder) ? 0.92 : 1 }],
                        shadowOpacity: (isCurrent || isCompleted) ? 0.1 : 0,
                    },
                ]}
            >
                <Text style={[
                    styles.numberText,
                    { color: textColor }
                ]}>
                    {isPlaceholder ? '?' : step.global_index}
                </Text>
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 100,
        height: 100,
        marginVertical: 15,
    },
    svgWrapper: {
        position: 'absolute',
        zIndex: 1,
    },
    node: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        zIndex: 2,
    },
    numberText: {
        fontSize: 24,
        fontWeight: '800',
    },
    fireBadge: {
        position: 'absolute',
        top: -6,
        right: 2,
        zIndex: 10,
    },
    fireEmoji: {
        fontSize: 20,
    },
    fireEmojiGrey: {
        // Skipped-in-time: semi-transparent to visually distinguish from orange fire
        opacity: 0.35,
    },
});
