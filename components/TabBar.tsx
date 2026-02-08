import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { palette } from '../lib/theme';

export default function TabBar() {
    const router = useRouter();
    const segments = useSegments();
    const insets = useSafeAreaInsets();

    const isProfile = segments.includes('profile');
    const isHome = (!segments.length || segments[0] === '(tabs)' || segments[0] === '') && !isProfile;

    if (
        segments.includes('login') ||
        segments.includes('new-course') ||
        segments.includes('phase-completed') ||
        segments.includes('course')
    ) return null;

    return (
        <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 15) }]}>
            <View style={styles.content}>
                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => router.replace('/')}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={isHome ? "home" : "home-outline"}
                        size={24}
                        color={isHome ? palette.black : palette.gray}
                    />
                    <Text style={[styles.label, isHome && styles.activeLabel]}>Percorsi</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.tab}
                    onPress={() => router.replace('/profile')}
                    activeOpacity={0.7}
                >
                    <Ionicons
                        name={isProfile ? "person" : "person-outline"}
                        size={24}
                        color={isProfile ? palette.black : palette.gray}
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
        bottom: 20,
        left: 20,
        right: 20,
        backgroundColor: palette.white,
        borderRadius: 40,
        paddingTop: 15,
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 2,
        borderColor: palette.border,
    },
    content: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    tab: {
        alignItems: 'center',
        paddingVertical: 4,
        flex: 1,
    },
    label: {
        fontSize: 12,
        marginTop: 4,
        color: palette.gray,
        fontWeight: '600',
    },
    activeLabel: {
        color: palette.black,
        fontWeight: '800',
    },
});

