import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, palette, radius } from '../lib/theme';

export default function TabBar() {
    const router = useRouter();
    const segments = useSegments();
    const insets = useSafeAreaInsets();

    const isCourse = segments.includes('course');
    const isProfile = segments.includes('profile');
    const isHome = (!segments.length || segments[0] === '(tabs)' || segments[0] === '') && !isProfile && !isCourse;

    if (
        segments.includes('login') ||
        segments.includes('new-course') ||
        segments.includes('phase-completed')
    ) return null;

    return (
        <View style={[styles.container, { bottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.content}>
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => router.replace('/')}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={isHome ? "home" : "home-outline"}
                        size={22}
                        color={isHome ? colors.primary : colors.mutedText}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => router.push('/course/any')}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={isCourse ? "map" : "map-outline"}
                        size={22}
                        color={isCourse ? colors.primary : colors.mutedText}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => router.replace('/profile')}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={isProfile ? "person" : "person-outline"}
                        size={22}
                        color={isProfile ? colors.primary : colors.mutedText}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        alignSelf: 'center',
        width: 220, // Increased for 3 icons
        backgroundColor: colors.background,
        borderRadius: radius.lg, // Pills style
        paddingVertical: 12,
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 15,
        elevation: 8,
        borderWidth: 1,
        borderColor: colors.border,
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignItems: 'center',
    },
    tab: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 44,
        height: 44,
        borderRadius: 22,
    },
});

