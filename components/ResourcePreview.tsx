
import { colors, radius, spacing } from '@/lib/theme'
import * as ScreenOrientation from 'expo-screen-orientation'
import React, { useCallback, useEffect, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import YoutubePlayer from 'react-native-youtube-iframe'

type ResourcePreviewProps = {
    type: string
    url: string
    onClose: () => void
    visible: boolean
}

export default function ResourcePreview({ type, url, onClose, visible }: ResourcePreviewProps) {
    const [playing, setPlaying] = useState(true)

    useEffect(() => {
        const toggleOrientation = async () => {
            try {
                if (visible) {
                    // Quando il video è aperto, permettiamo la rotazione totale 
                    // (ignorando il blocco del telefono se possibile o sbloccandolo)
                    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.ALL)
                } else {
                    // Quando chiudiamo, torniamo forzatamente in verticale
                    await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
                }
            } catch (err) {
                // Silently fail if rotation lock is not supported on the device
                // This happens frequently on certain Android devices or web
            }
        }

        toggleOrientation()

        // Cleanup: torna sempre in verticale se il componente viene smontato
        return () => {
            ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => { })
        }
    }, [visible])

    const getVideoId = (url: string) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    const videoId = getVideoId(url)

    const onStateChange = useCallback((state: string) => {
        if (state === 'ended') {
            setPlaying(false)
        }
    }, [])

    if (!visible) return null

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.container}>
                {/* Overlay dismiss logic */}
                <Pressable style={styles.backdrop} onPress={onClose} />

                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Video Resource</Text>
                        <Pressable onPress={onClose} style={styles.closeButton}>
                            <Text style={styles.closeText}>✕</Text>
                        </Pressable>
                    </View>

                    <View style={styles.playerContainer}>
                        {type === 'youtube' && videoId ? (
                            <YoutubePlayer
                                height={220}
                                play={playing}
                                videoId={videoId}
                                onChangeState={onStateChange}
                            />
                        ) : (
                            <View style={styles.errorContainer}>
                                <Text style={{ color: colors.textSecondary }}>Video non disponibile</Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: spacing.md,
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    content: {
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    title: {
        color: colors.textPrimary,
        fontWeight: '600',
        fontSize: 16,
    },
    closeButton: {
        padding: 4,
    },
    closeText: {
        color: colors.textSecondary,
        fontSize: 20,
        fontWeight: 'bold',
    },
    playerContainer: {
        backgroundColor: '#000',
        height: 220, // Aspect ratio wrapper could be better but this is fixed for now
        justifyContent: 'center',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    }
})
