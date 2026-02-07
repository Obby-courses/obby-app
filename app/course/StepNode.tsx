import { colors } from '@/lib/theme'
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
}

export default function StepNode({
    step,
    index,
    isLocked,
    isCurrent,
    isPlaceholder = false,
    remainingProgress = 1,
    onPress,
}: StepNodeProps) {
    const isCompleted = step.completed || step.status === 'skipped'

    // Styles based on state
    let backgroundColor = '#e0e0e0' // Locked
    let borderColor = '#cccccc'
    let numberColor = '#999999'

    if (isCompleted) {
        backgroundColor = colors.accent
        borderColor = colors.accent
        numberColor = '#ffffff'
    } else if (isCurrent) {
        backgroundColor = '#ffffff'
        borderColor = 'transparent' // We use the SVG for the border
        numberColor = colors.accent
    } else if (isPlaceholder) {
        backgroundColor = '#f9f9f9'
        borderColor = '#e0e0e0'
        numberColor = '#cccccc'
    } else if (!isLocked) {
        backgroundColor = '#ffffff'
        borderColor = colors.accent
        numberColor = colors.accent
    }

    if (step.status === 'skipped') {
        backgroundColor = '#f0f0f0'
        borderColor = '#ccc'
        numberColor = '#999'
    }

    // Circular Progress Params
    const size = 70;
    const strokeWidth = 6;
    const center = size / 2;
    const radius = size / 2 - strokeWidth / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDashoffset = circumference - remainingProgress * circumference;

    // Color Interpolation (Green -> Yellow -> Red)
    const getProgressColor = (p: number) => {
        if (p > 0.5) {
            // green to yellow
            const ratio = (p - 0.5) * 2;
            const r = Math.round(250 * (1 - ratio) + 74 * ratio);
            const g = Math.round(204 * (1 - ratio) + 222 * ratio);
            const b = Math.round(21 * (1 - ratio) + 128 * ratio);
            return `rgb(${r},${g},${b})`;
        } else {
            // yellow to red
            const ratio = p * 2;
            const r = Math.round(248 * (1 - ratio) + 250 * ratio);
            const g = Math.round(113 * (1 - ratio) + 204 * ratio);
            const b = Math.round(113 * (1 - ratio) + 21 * ratio);
            return `rgb(${r},${g},${b})`;
        }
    };

    const progressColor = getProgressColor(remainingProgress);

    return (
        <View style={styles.container}>
            {isCurrent && (
                <View style={styles.svgWrapper}>
                    <Svg width={size} height={size}>
                        {/* Background track */}
                        <Circle
                            cx={center}
                            cy={center}
                            r={radius}
                            stroke="#e5e7eb"
                            strokeWidth={strokeWidth}
                            fill="none"
                        />
                        {/* Progress ring */}
                        <Circle
                            cx={center}
                            cy={center}
                            r={radius}
                            stroke={progressColor}
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
                        borderColor: isCurrent ? 'transparent' : borderColor,
                        borderStyle: isPlaceholder ? 'dashed' : 'solid',
                        opacity: isLocked && !isPlaceholder ? 0.6 : 1,
                        transform: [{ scale: (pressed && !isPlaceholder) ? 0.95 : 1 }],
                        elevation: isCurrent ? 8 : (isPlaceholder ? 0 : 2),
                        shadowOpacity: isCurrent ? 0.3 : (isPlaceholder ? 0 : 0.1),
                    },
                ]}
            >
                <Text style={[
                    styles.numberText,
                    { color: numberColor }
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
        width: 80,
        height: 80, // Increased to fit SVG
        marginVertical: 10,
    },
    svgWrapper: {
        position: 'absolute',
        zIndex: 1,
    },
    node: {
        width: 64,
        height: 64,
        borderRadius: 32,
        borderWidth: 4,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 4,
        borderBottomWidth: 8, // 3D effect
        zIndex: 2,
    },
    numberText: {
        fontSize: 22,
        fontWeight: '900',
    },
})
