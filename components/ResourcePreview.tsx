import { supabase } from '@/lib/supabase'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { ActivityIndicator, Dimensions, Modal, Pressable, StatusBar, StyleSheet, Text, View } from 'react-native'
import { WebView } from 'react-native-webview'
import YoutubePlayer, { YoutubeIframeRef } from 'react-native-youtube-iframe'

type ResourcePreviewProps = {
    resourceId?: string
    type: string
    url: string
    onClose: () => void
    visible: boolean
}

const WEB_ANALYTICS_JS = `
  (function() {
    // 1. Measure content length
    const charCount = document.body.innerText.length;
    window.ReactNativeWebView.postMessage(JSON.stringify({
      type: 'metadata', 
      charCount: charCount 
    }));

    // 2. Track scroll
    let maxScroll = 0;
    window.addEventListener('scroll', function() {
      const scrollHeight = Math.max(
        document.body.scrollHeight, document.documentElement.scrollHeight,
        document.body.offsetHeight, document.documentElement.offsetHeight,
        document.body.clientHeight, document.documentElement.clientHeight
      );
      const scrollMax = scrollHeight - window.innerHeight;
      
      if (scrollMax <= 0) {
        if (maxScroll < 100) {
          maxScroll = 100;
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'scroll', percentage: 100 }));
        }
        return;
      }

      const currentScroll = window.scrollY || window.pageYOffset;
      let percentage = (currentScroll / scrollMax) * 100;
      
      // Snap to 100% if we are within 20px from the bottom
      if (currentScroll + window.innerHeight >= scrollHeight - 20) {
        percentage = 100;
      }

      percentage = Math.min(100, Math.max(0, percentage));
      
      if (percentage > maxScroll) {
        maxScroll = percentage;
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'scroll', 
          percentage: maxScroll
        }));
      }
    });

    // Handle pages that might be too short to scroll
    setTimeout(() => {
        const scrollHeight = document.documentElement.scrollHeight;
        if (scrollHeight <= window.innerHeight + 10) {
             window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'scroll', percentage: 100 }));
        }
    }, 1500);
  })();
`;

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ResourcePreview({ resourceId, type, url, onClose, visible }: ResourcePreviewProps) {
    const [playing, setPlaying] = useState(true)
    const [isWebLoading, setIsWebLoading] = useState(true)
    const startTimeRef = useRef<number | null>(null)
    const playerRef = useRef<YoutubeIframeRef>(null)

    // Analytics state for Web
    const [duration, setDuration] = useState(0)
    const [webCharCount, setWebCharCount] = useState(0)
    const [maxScrollPercentage, setMaxScrollPercentage] = useState(0)

    // Track start time when visible becomes true
    useEffect(() => {
        if (visible) {
            startTimeRef.current = Date.now()
            setMaxScrollPercentage(0)
            setWebCharCount(0)
        } else {
            handleCloseAndTrack()
        }
    }, [visible])

    const handleCloseAndTrack = async () => {
        if (!startTimeRef.current || !resourceId) return;

        const timeSpentSeconds = (Date.now() - startTimeRef.current) / 1000;
        let percentage = 0;

        if (type === 'youtube' || type === 'video') {
            if (duration > 0) {
                percentage = (timeSpentSeconds / duration) * 100;
            } else {
                percentage = (timeSpentSeconds / 300) * 100; // Fallback 5 min
            }
        } else {
            // Use strictly scroll percentage as requested
            percentage = maxScrollPercentage;
        }

        console.log(`[ANALYTICS] Resource ${resourceId}: ${timeSpentSeconds.toFixed(1)}s (Scroll: ${maxScrollPercentage.toFixed(0)}%, Final: ${percentage.toFixed(1)}%)`);

        const { error } = await supabase.rpc('increment_resource_view', {
            resource_id: resourceId,
            percentage: percentage
        });

        if (error) console.error("[ANALYTICS] Error tracking view:", error);
    }

    const handleClose = () => {
        onClose();
    }

    const onWebMessage = (event: any) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'metadata') {
                setWebCharCount(data.charCount);
            } else if (data.type === 'scroll') {
                setMaxScrollPercentage(data.percentage);
            }
        } catch (e) {
            console.warn("Error parsing web analytics message", e);
        }
    };

    const getVideoId = (url: string) => {
        if (!url) return null;
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    }

    const videoId = getVideoId(url)
    const isYoutube = type === 'youtube' || type === 'video'
    const isWebpage = type === 'webpage'

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
                {isYoutube && (
                    <View style={styles.playerWrapper}>
                        {videoId ? (
                            <YoutubePlayer
                                ref={playerRef}
                                height={playerHeight}
                                width={SCREEN_WIDTH}
                                play={playing}
                                videoId={videoId}
                                onChangeState={onStateChange}
                                onReady={() => {
                                    // Try to get duration
                                    playerRef.current?.getDuration().then(d => setDuration(d));
                                }}
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
                )}

                {isWebpage && (
                    <View style={styles.webWrapper}>
                        <WebView
                            source={{ uri: url }}
                            style={{ flex: 1, width: SCREEN_WIDTH }}
                            onLoadStart={() => setIsWebLoading(true)}
                            onLoadEnd={() => setIsWebLoading(false)}
                            injectedJavaScript={WEB_ANALYTICS_JS}
                            onMessage={onWebMessage}
                        />
                        {isWebLoading && (
                            <View style={styles.loaderOverlay}>
                                <ActivityIndicator size="large" color="#fff" />
                            </View>
                        )}
                    </View>
                )}

                {/* Floating Close Button */}
                <Pressable
                    onPress={handleClose}
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
    },
    playerWrapper: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    webWrapper: {
        flex: 1,
        marginTop: 100, // Make space for the close button
    },
    floatingClose: {
        position: 'absolute',
        top: 44, // Safe distance from top
        right: 20,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.4)',
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
    },
    loaderOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    }
})

