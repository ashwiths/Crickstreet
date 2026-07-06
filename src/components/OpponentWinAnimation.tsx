import React, { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, Dimensions, TouchableOpacity, StatusBar } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// ─── Confetti Particle Sub-component ──────────────────────────────────────────

interface ConfettiProps {
  index: number;
}

const CONFETTI_COLORS = ['#C0C0C0', '#E6E6FA', '#ADD8E6', '#B0C4DE', '#4682B4', '#F5F5F5', '#FFFFFF'];

function ConfettiParticle({ index }: ConfettiProps) {
  const size = useMemo(() => Math.random() * 8 + 6, []);
  const color = useMemo(() => CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)], []);
  const startX = useMemo(() => Math.random() * screenWidth, []);
  
  const y = useSharedValue(-50);
  const x = useSharedValue(startX);
  const rotation = useSharedValue(Math.random() * 360);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const delay = Math.random() * 2500;
    const duration = Math.random() * 2500 + 2000;

    y.value = withDelay(
      delay,
      withTiming(screenHeight + 50, {
        duration,
        easing: Easing.linear,
      })
    );

    const swayDistance = Math.random() * 60 + 30;
    const swayDuration = Math.random() * 1000 + 1000;
    x.value = withDelay(
      delay,
      withRepeat(
        withTiming(startX + (index % 2 === 0 ? swayDistance : -swayDistance), {
          duration: swayDuration,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      )
    );

    rotation.value = withDelay(
      delay,
      withRepeat(
        withTiming(rotation.value + 360, {
          duration: Math.random() * 1500 + 1000,
          easing: Easing.linear,
        }),
        -1,
        false
      )
    );

    opacity.value = withDelay(
      delay + duration - 800,
      withTiming(0, { duration: 800 })
    );
  }, [index]);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      position: 'absolute',
      top: 0,
      left: 0,
      width: size,
      height: size,
      backgroundColor: color,
      borderRadius: index % 3 === 0 ? size / 2 : 0,
      opacity: opacity.value,
      transform: [
        { translateX: x.value },
        { translateY: y.value },
        { rotate: `${rotation.value}deg` },
      ],
    };
  });

  return <Animated.View style={animatedStyle} />;
}

// ─── Main OpponentWinAnimation Component ───────────────────────────────────────

interface OpponentWinAnimationProps {
  resultText: string;
  onComplete: () => void;
}

export default function OpponentWinAnimation({ resultText, onComplete }: OpponentWinAnimationProps) {
  const starScale = useSharedValue(0);
  const starRotate = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  const particles = useMemo(() => Array.from({ length: 80 }), []);

  useEffect(() => {
    // 1. Play Warning/Medium vibration
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});

    // 2. Fade in backdrop
    backdropOpacity.value = withTiming(0.95, { duration: 400 });

    // 3. Star spring pop
    starScale.value = withDelay(
      200,
      withSpring(1, {
        damping: 11,
        stiffness: 90,
      })
    );

    // 4. Star gentle spin wobble
    starRotate.value = withDelay(
      800,
      withRepeat(
        withTiming(15, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      )
    );

    // 5. Content Fade In
    contentOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
  }, []);

  const animatedBackdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  const animatedStarStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: starScale.value },
      { rotate: `${starRotate.value - 7}deg` },
    ],
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <StatusBar barStyle="light-content" backgroundColor="#0B131E" />
      
      {/* Dark Blue/Slate Gradient Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, animatedBackdropStyle]}>
        <LinearGradient
          colors={['#0F1E36', '#060A12']}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* Render Confetti Particles */}
      {particles.map((_, i) => (
        <ConfettiParticle key={i} index={i} />
      ))}

      {/* Main Content Area */}
      <View style={styles.container}>
        {/* Star Element */}
        <Animated.View style={[styles.starWrapper, animatedStarStyle]}>
          <LinearGradient
            colors={['#E2E8F0', '#94A3B8']}
            style={styles.glowCircle}
          >
            <Ionicons name="star" size={80} color="#FFFFFF" style={styles.starIcon} />
          </LinearGradient>
        </Animated.View>

        {/* Text and CTAs */}
        <Animated.View style={[styles.content, animatedContentStyle]}>
          <Text style={styles.completionTitle}>MATCH COMPLETED</Text>
          <Text style={styles.subTitle}>Opponent Team Victory</Text>
          
          <View style={styles.card}>
            <Text style={styles.resultLabel}>MATCH SUMMARY</Text>
            <Text style={styles.resultDesc}>{resultText}</Text>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.ctaBtn}
            onPress={onComplete}
          >
            <Text style={styles.ctaTxt}>Complete &amp; Save Match</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  starWrapper: {
    marginBottom: 24,
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  glowCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#CBD5E1',
  },
  starIcon: {
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 6,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  completionTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#E2E8F0',
    letterSpacing: 1.5,
    textAlign: 'center',
    textShadowColor: 'rgba(226, 232, 240, 0.3)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
    marginBottom: 6,
  },
  subTitle: {
    fontSize: 15,
    color: '#94A3B8',
    fontWeight: '700',
    marginBottom: 32,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    marginBottom: 40,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  resultDesc: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
  },
  ctaBtn: {
    backgroundColor: '#94A3B8',
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#94A3B8',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 5,
  },
  ctaTxt: {
    fontSize: 16,
    fontWeight: '900',
    color: '#060A12',
    letterSpacing: 0.5,
  },
});
