import * as SplashScreen from 'expo-splash-screen';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface Props {
  onFinish: () => void;
}

export default function StartupSplash({ onFinish }: Props) {
  const [LottieComp, setLottieComp] = useState<any | null>(null);
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Force fallback image for now (skip lottie dynamic import) to avoid native module runtime issues
    setLottieComp(null);

    (async () => {
      try {
        await SplashScreen.preventAutoHideAsync();
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    // If no lottie, show an image briefly then hide splash
    if (!LottieComp) {
      Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }).start(async () => {
        // short visible time
        setTimeout(async () => {
          try { await SplashScreen.hideAsync(); } catch {}
          onFinish();
        }, 600);
      });
    }
  }, [LottieComp, fade, onFinish]);

  if (LottieComp) {
    // Render lottie animation when available
    return (
      <View style={styles.container}>
        <LottieComp
          autoPlay
          loop={false}
          source={{ uri: 'https://assets9.lottiefiles.com/packages/lf20_tfb3estd.json' }}
          style={styles.lottie}
          onAnimationFinish={async () => {
            try { await SplashScreen.hideAsync(); } catch {}
            onFinish();
          }}
        />
      </View>
    );
  }

  // Fallback image with a simple fade-in
  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('../assets/images/icon.png')}
        style={[styles.lottie, { opacity: fade }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00c853',
  },
  lottie: {
    width: 220,
    height: 220,
  },
});
