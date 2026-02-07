import { colors, spacing, typography } from '@/lib/theme'
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
}

export default function MilestoneNode({
    milestone,
    isLocked,
    onPress,
}: MilestoneNodeProps) {

    return (
        <View style={styles.container}>
            {/* The connector line from previous steps */}
            <View style={styles.connectorLine} />
            <Pressable
                onPress={onPress}
                style={({ pressed }) => [
                    styles.block,
                    {
                        backgroundColor: isLocked ? '#a0a0a0' : '#1e1e1e', // Dark theme or distinct color
                        transform: [{ scale: pressed ? 0.98 : 1 }],
                        opacity: isLocked ? 0.8 : 1,
                    },
                ]}
            >
                <View style={styles.contentRow}>
                    <View style={styles.iconContainer}>
                        <Text style={{ fontSize: 32 }}>
                            {isLocked ? '🔒' : '🏆'}
                        </Text>
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text style={styles.badge}>MILESTONE</Text>
                        <Text style={styles.title}>
                            {milestone.title}
                        </Text>
                        <Text style={styles.subtitle} numberOfLines={1}>
                            {isLocked ? 'Completa gli step per sbloccare' : 'Clicca per iniziare'}
                        </Text>
                    </View>

                    {!isLocked && (
                        <View style={styles.arrowContainer}>
                            <Text style={{ fontSize: 20, color: '#fff' }}>→</Text>
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
        paddingHorizontal: spacing.md,
    },
    connectorLine: {
        position: 'absolute',
        top: -40,
        height: 40,
        width: 4,
        backgroundColor: '#ccc', // Same as step connector
        zIndex: -1,
    },
    block: {
        width: '100%',
        borderRadius: 24, // More rounded
        padding: spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        elevation: 10,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.15)',
        overflow: 'hidden',
    },
    contentRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.lg,
    },
    iconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    badge: {
        ...typography.small,
        color: colors.successText, // Or some gold-ish color
        fontWeight: '900',
        fontSize: 11,
        letterSpacing: 2,
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    title: {
        ...typography.title,
        color: '#ffffff',
        fontSize: 20,
        fontWeight: '800',
        marginBottom: 4,
    },
    subtitle: {
        ...typography.small,
        color: '#b0b0b0',
        fontSize: 13,
        fontWeight: '500',
    },
    arrowContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primaryButton,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
})
