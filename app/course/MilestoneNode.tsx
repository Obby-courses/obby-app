import { colors, palette, radius, spacing, typography } from '@/lib/theme'
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
    courseColor = colors.primary,
}: MilestoneNodeProps) {

    // Logic: Milestones are "Special" so they get the color pop
    const activeColor = courseColor;
    const isSpecial = !isLocked;

    return (
        <View style={styles.container}>
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [
                    styles.block,
                    {
                        backgroundColor: isLocked ? colors.card : colors.background,
                        borderColor: isLocked ? colors.border : colors.primary,
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                        opacity: isLocked ? 0.7 : 1,
                        borderWidth: isSpecial ? 3 : 1,
                    },
                ]}
            >
                <View style={styles.contentRow}>
                    <View style={[
                        styles.iconContainer,
                        {
                            backgroundColor: isLocked ? colors.card : activeColor,
                            borderColor: isLocked ? colors.border : colors.primary
                        }
                    ]}>
                        <Text style={{ fontSize: 32 }}>
                            {isLocked ? '🔒' : '🏆'}
                        </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text style={[styles.badge, { color: isLocked ? colors.mutedText : activeColor }]}>MILESTONE</Text>
                        <Text style={[styles.title, { color: colors.textPrimary }]}>
                            {milestone.title}
                        </Text>
                    </View>

                    {!isLocked && (
                        <View style={[styles.arrowContainer, { borderColor: activeColor }]}>
                            <Text style={{ fontSize: 20, color: activeColor }}>→</Text>
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
        borderRadius: radius.md,
        padding: spacing.lg,
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.05,
        shadowRadius: 20,
        elevation: 3,
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    iconContainer: {
        width: 76,
        height: 76,
        borderRadius: 38,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    badge: {
        ...typography.label,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 4,
    },
    title: {
        ...typography.body,
        fontSize: 20,
        fontWeight: '800',
    },
    arrowContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'transparent',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
    },
});

