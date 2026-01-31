import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing } from '../lib/theme';

export default function TabBar() {
    const router = useRouter();
    const segments = useSegments();
    const insets = useSafeAreaInsets();

    // Determina se siamo nella home, nel profilo o in un corso
    const isProfile = segments.includes('profile');
    const isCourse = segments.includes('course') && !segments.includes('phase-completed');
    const isHome = segments.length === 0;

    // Se siamo nel login, nella creazione o nella fase completata, non mostriamo la TabBar
    if (
        segments.includes('login') ||
        segments.includes('new-course') ||
        segments.includes('phase-completed')
    ) return null;




    return (
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <View style={styles.content}>
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => router.replace('/')}
                >
                    <Ionicons
                        name={isHome && !isProfile ? "home" : "home-outline"}
                        size={24}
                        color={isHome && !isProfile ? colors.primaryButton : colors.mutedText}
                    />
                    <Text style={[styles.label, isHome && !isProfile && styles.activeLabel]}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => router.replace('/profile')}
                >
                    <Ionicons
                        name={isProfile ? "person" : "person-outline"}
                        size={24}
                        color={isProfile ? colors.primaryButton : colors.mutedText}
                    />
                    <Text style={[styles.label, isProfile && styles.activeLabel]}>Profilo</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        paddingTop: spacing.sm,
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    tab: {
        alignItems: 'center',
        paddingVertical: spacing.xs,
        flex: 1,
    },
    label: {
        fontSize: 10,
        marginTop: 4,
        color: colors.mutedText,
        fontWeight: '500',
    },
    activeLabel: {
        color: colors.primaryButton,
        fontWeight: '700',
    },
});
