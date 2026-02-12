import React, { useCallback, useState } from 'react'
import { Dimensions, Modal, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native'
import YoutubePlayer from 'react-native-youtube-iframe'

type ResourcePreviewProps = {
    type: string
    url: string
    onClose: () => void
    visible: boolean
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function ResourcePreview({ type, url, onClose, visible }: ResourcePreviewProps) {
    const [playing, setPlaying] = useState(true)

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

    // Player height for 16:9 aspect ratio based on screen width
    const playerHeight = (SCREEN_WIDTH * 9) / 16;

    return (
        <Modal
            animationType="slide"
            transparent={false}
            visible={visible}
            onRequestClose={onClose}
        >
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            <View style={styles.container}>
                <View style={styles.playerWrapper}>
                    {type === 'youtube' && videoId ? (
                        <YoutubePlayer
                            height={playerHeight}
                            width={SCREEN_WIDTH}
                            play={playing}
                            videoId={videoId}
                            onChangeState={onStateChange}
                            initialPlayerParams={{
                                rel: false,
                                modestbranding: true,
                            }}
                        />
                    ) : (
                        <View style={styles.errorContainer}>
                            <Text style={{ color: '#fff' }}>Video non disponibile</Text>
                        </View>
                    )}
                </View>

                {/* Floating Close Button */}
                <Pressable
                    onPress={onClose}
                    style={({ pressed }) => [
                        styles.floatingClose,
                        { opacity: pressed ? 0.6 : 1 }
                    ]}
                >
                    <Text style={styles.closeText}>✕</Text>
                </Pressable>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playerWrapper: {
        width: SCREEN_WIDTH,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingClose: {
        position: 'absolute',
        top: 44, // Safe distance from top
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    },
    closeText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    }
})

