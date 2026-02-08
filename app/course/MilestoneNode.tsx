import { palette, spacing, typography } from '@/lib/theme'
import React from 'react'
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native'

type MilestoneNodeProps = {
    milestone: {
        id: string
        title: string
        description: string
    }
    isLocked: boolean
    onPress: () => void
    courseColor?: string
}

export default function MilestoneNode({
    milestone,
    isLocked,
    onPress,
    courseColor = palette.black,
}: MilestoneNodeProps) {

    return (
        <View style={styles.container}>
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [
                    styles.block,
                    {
                        backgroundColor: isLocked ? 'rgba(0,0,0,0.05)' : palette.white,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                        opacity: isLocked ? 0.6 : 1,
                        borderColor: isLocked ? 'transparent' : palette.black,
                    },
                ]}
            >
                <View style={styles.contentRow}>
                    <View style={[styles.iconContainer, { backgroundColor: isLocked ? '#eee' : courseColor }]}>
                        <Text style={{ fontSize: 32 }}>
                            {isLocked ? '🔒' : '🏆'}
                        </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text style={[styles.badge, { color: isLocked ? palette.gray : palette.black }]}>MILESTONE</Text>
                        <Text style={[styles.title, { color: palette.black }]}>
                            {milestone.title}
                        </Text>
                    </View>

                    {!isLocked && (
                        <View style={styles.arrowContainer}>
                            <Text style={{ fontSize: 20, color: palette.black }}>→</Text>
                        </View>
                    )}
                </View>
            </Pressable>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        marginVertical: 40,
        paddingHorizontal: spacing.lg,
    },
    block: {
        width: '100%',
        borderRadius: 40,
        padding: spacing.lg,
        borderWidth: 3,
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    iconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: palette.black,
    },
    badge: {
        ...typography.label,
        fontSize: 12,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 4,
    },
    title: {
        ...typography.body,
        fontSize: 22,
        fontWeight: '800',
    },
    arrowContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: palette.black,
    },
})

