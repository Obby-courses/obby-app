import { palette } from '@/lib/theme'
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
}

export default function StepNode({
    step,
    index,
    isLocked,
    isCurrent,
    isPlaceholder = false,
    remainingProgress = 1,
    onPress,
    courseColor = palette.black,
}: StepNodeProps) {
    const isCompleted = step.completed || step.status === 'skipped'

    // Styles based on state
    let backgroundColor = 'rgba(0,0,0,0.05)'
    let textColor = 'rgba(0,0,0,0.3)'
    let borderColor = 'transparent'

    if (isCompleted) {
        backgroundColor = palette.white
        textColor = palette.black
    } else if (isCurrent) {
        backgroundColor = palette.white
        textColor = palette.black
        borderColor = palette.black
    } else if (isPlaceholder) {
        backgroundColor = 'rgba(255,255,255,0.1)'
        textColor = 'rgba(0,0,0,0.2)'
    } else if (!isLocked) {
        backgroundColor = 'rgba(255,255,255,0.2)'
        textColor = palette.black
        borderColor = 'rgba(0,0,0,0.1)'
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
            {isCurrent && (
                <View style={styles.svgWrapper}>
                    <Svg width={size} height={size}>
                        <Circle
                            cx={center}
                            cy={center}
                            r={radius}
                            stroke={palette.lightGray}
                            strokeWidth={strokeWidth}
                            fill="none"
                        />
                        <Circle
                            cx={center}
                            cy={center}
                            r={radius}
                            stroke={palette.black}
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
                        borderColor: isPlaceholder ? '#eee' : borderColor,
                        borderStyle: isPlaceholder ? 'dashed' : 'solid',
                        opacity: isLocked && !isPlaceholder ? 0.5 : 1,
                        transform: [{ scale: (pressed && !isPlaceholder) ? 0.92 : 1 }],
                        shadowOpacity: isCurrent ? 0.2 : 0,
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
        borderWidth: 3,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: palette.white,
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 10,
        zIndex: 2,
    },
    numberText: {
        fontSize: 28,
        fontWeight: '900',
    },
})

