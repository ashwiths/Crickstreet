import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View, Dimensions, StatusBar } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface InningsBreakOverAnimationProps {
  onComplete: () => void;
}

export default function InningsBreakOverAnimation({ onComplete }: InningsBreakOverAnimationProps) {
  const [countdown, setCountdown] = useState(3);
  const iconScale = useSharedValue(0);
  const textScale = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);
  const flashOpacity = useSharedValue(1);

  useEffect(() => {
    // Play vibration
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // Fade in backdrop
    backdropOpacity.value = withTiming(0.98, { duration: 400 });

    // Pop-in icon and text
    iconScale.value = withSpring(1, { damping: 12, stiffness: 100 });
    textScale.value = withDelay(
      200,
      withSpring(1, { damping: 10, stiffness: 90 })
    );

    // Flash glow overlay
    flashOpacity.value = withRepeat(
      withTiming(0.3, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // 3-second count timer
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onComplete();
          return 0;
        }
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const animatedIconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const animatedTextStyle = useAnimatedStyle(() => ({
    transform: [{ scale: textScale.value }],
  }));

  const animatedFlashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <StatusBar barStyle="light-content" backgroundColor="#0B150F" />
      
      {/* Dark Forest Green/Emerald Gradient Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, animatedBackdropStyle]}>
        <LinearGradient
          colors={['#0C1E14', '#060B08']}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* Flashing glow overlay */}
      <Animated.View style={[styles.glowOverlay, animatedFlashStyle]} />

      <View style={styles.container}>
        {/* Animated Cricket Icon */}
        <Animated.View style={[styles.iconWrapper, animatedIconStyle]}>
          <LinearGradient
            colors={['#59C749', '#1E4617']}
            style={styles.glowCircle}
          >
            <Ionicons name="walk" size={70} color="#FFFFFF" />
          </LinearGradient>
        </Animated.View>

        {/* Text Details */}
        <Animated.View style={[styles.content, animatedTextStyle]}>
          <Text style={styles.title}>BREAK OVER! 🏏</Text>
          <Text style={styles.subTitle}>Players are returning to the field</Text>
          
          <View style={styles.timerWrap}>
            <Text style={styles.timerLabel}>STARTING SECOND INNINGS IN</Text>
            <Text style={styles.timerVal}>{countdown}</Text>
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  glowOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#59C749',
    opacity: 0.15,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  iconWrapper: {
    marginBottom: 32,
    shadowColor: '#59C749',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 8,
  },
  glowCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#A8CD55',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 34,
    fontWeight: '900',
    color: '#A8CD55',
    letterSpacing: 1.5,
    textAlign: 'center',
    textShadowColor: 'rgba(89, 199, 73, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 16,
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 16,
    color: '#8CA595',
    fontWeight: '600',
    marginBottom: 40,
    textAlign: 'center',
  },
  timerWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 36,
    alignItems: 'center',
    minWidth: 260,
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8CA595',
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  timerVal: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
