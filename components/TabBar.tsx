import { Ionicons } from '@expo/vector-icons';
import { useRouter, useSegments } from 'expo-router';
import React, { useRef } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
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

    const TabButton = ({ onPress, name, activeName, isActive }: { onPress: () => void, name: any, activeName: any, isActive: boolean }) => {
        const scaleAnim = useRef(new Animated.Value(1)).current
        const handlePress = () => {
            Animated.sequence([
                Animated.timing(scaleAnim, { toValue: 0.82, duration: 90, useNativeDriver: true }),
                Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, bounciness: 10 }),
            ]).start()
            onPress()
        }
        return (
            <Pressable style={styles.tab} onPress={handlePress}>
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                    <Ionicons
                        name={isActive ? activeName : name}
                        size={22}
                        color={isActive ? colors.primary : colors.mutedText}
                    />
                </Animated.View>
            </Pressable>
        )
    }

    return (
        <View style={[styles.container, { bottom: Math.max(insets.bottom, 20) }]}>
            <View style={styles.content}>
                <TabButton onPress={() => router.replace('/')} name="home-outline" activeName="home" isActive={isHome} />
                <TabButton onPress={() => router.push('/course/any')} name="map-outline" activeName="map" isActive={isCourse} />
                <TabButton onPress={() => router.replace('/profile')} name="person-outline" activeName="person" isActive={isProfile} />
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

