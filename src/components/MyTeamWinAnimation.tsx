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

const CONFETTI_COLORS = ['#FFD700', '#FFA500', '#FF8C00', '#ADFF2F', '#32CD32', '#00FF00', '#FFFFFF'];

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

// ─── Main MyTeamWinAnimation Component ─────────────────────────────────────────

interface MyTeamWinAnimationProps {
  resultText: string;
  onComplete: () => void;
}

export default function MyTeamWinAnimation({ resultText, onComplete }: MyTeamWinAnimationProps) {
  const trophyScale = useSharedValue(0);
  const trophyRotate = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);

  // Generate 80 particles
  const particles = useMemo(() => Array.from({ length: 80 }), []);

  useEffect(() => {
    // 1. Play Success Haptics
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    // 2. Fade in backdrop
    backdropOpacity.value = withTiming(0.95, { duration: 400 });

    // 3. Trophy spring pop
    trophyScale.value = withDelay(
      200,
      withSpring(1, {
        damping: 11,
        stiffness: 90,
      })
    );

    // 4. Trophy gentle rotation sway
    trophyRotate.value = withDelay(
      800,
      withRepeat(
        withTiming(6, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
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

  const animatedTrophyStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: trophyScale.value },
      { rotate: `${trophyRotate.value - 3}deg` }, // Offsets rotation slightly for dynamic sway
    ],
  }));

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  return (
    <View style={StyleSheet.absoluteFill}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1E0B" />
      
      {/* Dark Green Gradient Backdrop */}
      <Animated.View style={[StyleSheet.absoluteFill, animatedBackdropStyle]}>
        <LinearGradient
          colors={['#0F280D', '#071506']}
          style={StyleSheet.absoluteFillObject}
        />
      </Animated.View>

      {/* Render Confetti Particles */}
      {particles.map((_, i) => (
        <ConfettiParticle key={i} index={i} />
      ))}

      {/* Main Content Area */}
      <View style={styles.container}>
        {/* Trophy Element */}
        <Animated.View style={[styles.trophyWrapper, animatedTrophyStyle]}>
          <LinearGradient
            colors={['#FFF2A3', '#DCA22B']}
            style={styles.glowCircle}
          >
            <Ionicons name="trophy" size={80} color="#FFFFFF" style={styles.trophyIcon} />
          </LinearGradient>
        </Animated.View>

        {/* Text and CTAs */}
        <Animated.View style={[styles.content, animatedContentStyle]}>
          <Text style={styles.victoryTitle}>VICTORY!</Text>
          <Text style={styles.subTitle}>Congratulations to My Team</Text>
          
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
  trophyWrapper: {
    marginBottom: 24,
    shadowColor: '#DCA22B',
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
    borderColor: '#FFE875',
  },
  trophyIcon: {
    textShadowColor: 'rgba(0,0,0,0.2)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 6,
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  victoryTitle: {
    fontSize: 42,
    fontWeight: '900',
    color: '#FFE875',
    letterSpacing: 2,
    textShadowColor: 'rgba(255, 232, 117, 0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 15,
    marginBottom: 4,
  },
  subTitle: {
    fontSize: 16,
    color: '#D1E7CD',
    fontWeight: '700',
    marginBottom: 32,
    textTransform: 'uppercase',
    letterSpacing: 1.0,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderColor: 'rgba(255, 255, 255, 0.15)',
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
    color: '#FFE875',
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
    backgroundColor: '#FFE875',
    paddingVertical: 18,
    paddingHorizontal: 36,
    borderRadius: 30,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#FFE875',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 5,
  },
  ctaTxt: {
    fontSize: 16,
    fontWeight: '900',
    color: '#071506',
    letterSpacing: 0.5,
  },
});
