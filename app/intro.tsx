import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { useAuth } from '../src/hooks/useAuth';

const AnimatedLine = Animated.createAnimatedComponent(Line);

export interface IntroScreenProps {
  onFinish?: () => void;
}

export default function IntroScreen({ onFinish }: IntroScreenProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Shared values for cricket animation
  const progress = useSharedValue(0); // 0.0 to 1.0 animation timeline
  const scoreProgress = useSharedValue(0); // 0 to 6 runs
  const [currentScore, setCurrentScore] = useState(0);
  const [runsStatus, setRunsStatus] = useState('');
  const [loadingProgress, setLoadingProgress] = useState(0);

  // Ball positions shared values
  const ballX = useSharedValue(20);
  const ballY = useSharedValue(125);
  const ballOpacity = useSharedValue(0);
  const ballScale = useSharedValue(1);

  // Bat rotation shared value
  const batRotation = useSharedValue(-65);

  // Impact flare shared values
  const impactScale = useSharedValue(0);
  const impactOpacity = useSharedValue(0);

  // Ball flight trail shared value
  const trailOpacity = useSharedValue(0);

  // Score text pop animation
  const scoreScale = useSharedValue(1);

  // Score status popup animation
  const statusScale = useSharedValue(0);
  const statusOpacity = useSharedValue(0);

  // Final screen fade out
  const screenOpacity = useSharedValue(1);

  useEffect(() => {
    // 1. Loading bar simulation (0 to 100%)
    let loadingInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(loadingInterval);
          return 100;
        }
        return prev + 1;
      });
    }, 25);

    // 2. Start animation sequence
    // Ball appears & pitches: starts bowler side (x=20, y=105)
    ballOpacity.value = withTiming(1, { duration: 150 });
    
    // Ball translation: Bowler -> pitch (bounce) -> Batsman
    ballX.value = withSequence(
      withTiming(55, { duration: 800, easing: Easing.linear }), // Move to bounce point
      withTiming(90, { duration: 400, easing: Easing.out(Easing.quad) }) // Rise to bat contact
    );

    ballY.value = withSequence(
      withTiming(155, { duration: 800, easing: Easing.quad }), // fall to bounce
      withTiming(130, { duration: 400, easing: Easing.out(Easing.quad) }) // rise to bat contact
    );

    // Bat downswing: sync with ball arriving at contact point (at 1200ms mark)
    batRotation.value = withDelay(
      850,
      withSequence(
        withTiming(35, { duration: 350, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }), // Impact swing
        withTiming(80, { duration: 250, easing: Easing.out(Easing.quad) }), // Follow through
        withTiming(-65, { duration: 400, easing: Easing.inOut(Easing.quad) }) // Return to stance
      )
    );

    // Impact Flare, Ball flying high, Trail, Score Ticking (Triggered at 1200ms impact)
    setTimeout(() => {
      // 1. Impact flare
      impactScale.value = withSequence(
        withTiming(1.8, { duration: 100 }),
        withTiming(0, { duration: 150 })
      );
      impactOpacity.value = withSequence(
        withTiming(1, { duration: 50 }),
        withTiming(0, { duration: 200 })
      );

      // 2. Ball flies off screen (top right)
      ballX.value = withTiming(250, { duration: 1300, easing: Easing.out(Easing.quad) });
      ballY.value = withTiming(15, { duration: 1300, easing: Easing.out(Easing.quad) });
      ballScale.value = withTiming(0.4, { duration: 1300 });
      ballOpacity.value = withDelay(1000, withTiming(0, { duration: 300 }));

      // 3. Trajectory trail appears
      trailOpacity.value = withSequence(
        withTiming(0.6, { duration: 100 }),
        withDelay(800, withTiming(0, { duration: 400 }))
      );

      // 4. Trigger score ticking
      triggerScoreTicking();
    }, 1200);

    // End of Intro: Navigating away
    setTimeout(() => {
      screenOpacity.value = withTiming(0, { duration: 400 }, (finished) => {
        if (finished) {
          runOnJS(handleNavigation)();
        }
      });
    }, 3800);

    return () => clearInterval(loadingInterval);
  }, []);

  const handleNavigation = () => {
    if (onFinish) {
      onFinish();
    } else {
      if (user) {
        router.replace('/(tabs)');
      } else {
        router.replace('/(auth)/welcome');
      }
    }
  };

  const triggerScoreTicking = () => {
    // Ticking 0 -> 1 -> 2 -> 4 -> 6
    const ticks = [
      { score: 1, delay: 150, status: 'SINGLE!' },
      { score: 2, delay: 450, status: 'DOUBLE!' },
      { score: 4, delay: 850, status: 'FOUR! 🏏' },
      { score: 6, delay: 1250, status: 'SIXER! 🚀' },
    ];

    ticks.forEach((tick) => {
      setTimeout(() => {
        setCurrentScore(tick.score);
        setRunsStatus(tick.status);

        // Pop the score text
        scoreScale.value = withSequence(
          withTiming(1.3, { duration: 100 }),
          withTiming(1, { duration: 150 })
        );

        // Pop the status label
        statusScale.value = withSequence(
          withTiming(1.2, { duration: 150, easing: Easing.out(Easing.back()) }),
          withTiming(1, { duration: 100 })
        );
        statusOpacity.value = withTiming(1, { duration: 150 });
      }, tick.delay);
    });
  };

  // Animated Styles
  const animatedScreenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const animatedBallStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ballX.value },
      { translateY: ballY.value },
      { scale: ballScale.value },
    ],
    opacity: ballOpacity.value,
  }));

  const animatedBatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -38 }, // Pivot offset
      { rotate: `${batRotation.value}deg` },
      { translateY: 38 },
    ],
  }));

  const animatedImpactStyle = useAnimatedStyle(() => ({
    transform: [{ scale: impactScale.value }],
    opacity: impactOpacity.value,
  }));

  const animatedTrailProps = useAnimatedProps(() => ({
    opacity: trailOpacity.value,
  }));

  const animatedScoreStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scoreScale.value }],
  }));

  const animatedStatusStyle = useAnimatedStyle(() => ({
    transform: [{ scale: statusScale.value }],
    opacity: statusOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedScreenStyle]}>
      {/* Ambient background glows */}
      <View style={styles.glowGreen} pointerEvents="none" />
      <View style={styles.glowOrange} pointerEvents="none" />

      {/* Main Branding Header */}
      <View style={styles.header}>
        <Text style={styles.appName}>CRICKSTREET</Text>
        <Text style={styles.appTagline}>LIVE MATCH SCORING PLATFORM</Text>
      </View>

      {/* Dynamic Scoreboard Box */}
      <View style={styles.scoreboardContainer}>
        <Text style={styles.scoreLabel}>MATCH SCORE</Text>
        <View style={styles.scoreRow}>
          <Animated.Text style={[styles.scoreValue, animatedScoreStyle]}>
            {currentScore}
          </Animated.Text>
          <Text style={styles.runsText}>runs</Text>
        </View>

        {/* Dynamic score status text */}
        <Animated.View style={[styles.statusBadge, animatedStatusStyle]}>
          <Text style={styles.statusText}>{runsStatus}</Text>
        </Animated.View>
      </View>

      {/* Cricket Field SVG and Bat Animation Overlay */}
      <View style={styles.animationArea}>
        <View style={styles.cricketContainer}>
          {/* Static SVG Field, Wickets, Trajectory */}
          <Svg width="220" height="220" viewBox="0 0 220 220" style={styles.svg}>
            {/* Background field badge */}
            <Circle cx="110" cy="110" r="95" fill="rgba(89, 199, 73, 0.05)" stroke="rgba(89, 199, 73, 0.1)" strokeWidth="1.5" />

            {/* Stadium Roof Arch */}
            <Path d="M 32,130 A 82,82 0 0,1 188,130" stroke="rgba(89, 199, 73, 0.18)" strokeWidth="2.5" strokeDasharray="5 5" fill="none" />

            {/* Ground / Pitch floor lines */}
            <Line x1="15" y1="160" x2="205" y2="160" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />
            <Line x1="75" y1="160" x2="160" y2="160" stroke="#59C749" strokeWidth="3" strokeLinecap="round" />

            {/* Stumps / Wickets behind Batsman (at x = 135) */}
            <Line x1="131" y1="90" x2="131" y2="160" stroke="#4B5563" strokeWidth="2.5" strokeLinecap="round" />
            <Line x1="136" y1="90" x2="136" y2="160" stroke="#4B5563" strokeWidth="2.5" strokeLinecap="round" />
            <Line x1="141" y1="90" x2="141" y2="160" stroke="#4B5563" strokeWidth="2.5" strokeLinecap="round" />
            <Line x1="128" y1="90" x2="144" y2="90" stroke="#6B7280" strokeWidth="2" />

            {/* Batsman Silhouette Body */}
            <Circle cx="100" cy="78" r="9" fill="#1F2937" />
            {/* Torso */}
            <Line x1="100" y1="87" x2="96" y2="122" stroke="#1F2937" strokeWidth="7" strokeLinecap="round" />
            {/* Back Leg */}
            <Line x1="96" y1="122" x2="108" y2="160" stroke="#4B5563" strokeWidth="6" strokeLinecap="round" />
            {/* Front Leg */}
            <Line x1="96" y1="122" x2="82" y2="160" stroke="#1F2937" strokeWidth="7" strokeLinecap="round" />
            {/* Left Arm holding bat */}
            <Line x1="100" y1="92" x2="72" y2="105" stroke="#1F2937" strokeWidth="5.5" strokeLinecap="round" />

            {/* Dashed trajectory flight line */}
            <AnimatedLine
              x1="90"
              y1="130"
              x2="250"
              y2="15"
              stroke="#F59E0B"
              strokeWidth="2.5"
              strokeDasharray="4 4"
              animatedProps={animatedTrailProps}
            />
          </Svg>

          {/* Bat Overlay Container */}
          <View style={[styles.pivotContainer, { left: 72 - 7, top: 105 - 38 }]}>
            <Animated.View style={[styles.batWrapper, animatedBatStyle]}>
              <View style={styles.batHandle} />
              <View style={styles.batBlade} />
            </Animated.View>
          </View>

          {/* Impact Flare Overlay */}
          <View style={[styles.impactContainer, { left: 90 - 20, top: 130 - 20 }]}>
            <Animated.View style={[styles.impactRing, animatedImpactStyle]} />
          </View>

          {/* Cricket Ball Overlay */}
          <Animated.View style={[styles.ball, animatedBallStyle]} />
        </View>
      </View>

      {/* Loading Counter Footer */}
      <View style={styles.footer}>
        <View style={styles.loadingTrack}>
          <View style={[styles.loadingFill, { width: `${loadingProgress}%` }]} />
        </View>
        <Text style={styles.loadingText}>LOADING ASSETS... {loadingProgress}%</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 60,
    paddingHorizontal: 24,
  },
  glowGreen: {
    position: 'absolute',
    top: '15%',
    left: '10%',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(89, 199, 73, 0.05)',
    filter: 'blur(60px)',
  },
  glowOrange: {
    position: 'absolute',
    bottom: '20%',
    right: '10%',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: 'rgba(245, 158, 11, 0.04)',
    filter: 'blur(60px)',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
  },
  appName: {
    fontSize: 32,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 6,
    textShadowColor: 'rgba(89, 199, 73, 0.15)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  appTagline: {
    fontSize: 10,
    fontWeight: '700',
    color: '#59C749',
    letterSpacing: 2,
    marginTop: 6,
  },
  scoreboardContainer: {
    backgroundColor: '#F9FAFB',
    borderColor: 'rgba(89, 199, 73, 0.25)',
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '80%',
    maxWidth: 300,
    shadowColor: '#59C749',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 2,
  },
  scoreLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: 54,
    fontWeight: '900',
    color: '#111827',
  },
  runsText: {
    fontSize: 18,
    color: '#59C749',
    fontWeight: '700',
    marginLeft: 6,
  },
  statusBadge: {
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.25)',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginTop: 8,
  },
  statusText: {
    color: '#D97706',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  animationArea: {
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  cricketContainer: {
    width: 220,
    height: 220,
    position: 'relative',
  },
  svg: {
    ...StyleSheet.absoluteFillObject,
  },
  pivotContainer: {
    position: 'absolute',
    width: 14,
    height: 76,
    alignItems: 'center',
  },
  batWrapper: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
  },
  batHandle: {
    width: 3.5,
    height: 22,
    backgroundColor: '#374151',
    borderRadius: 1.5,
  },
  batBlade: {
    width: 9,
    height: 54,
    backgroundColor: '#D1A153',
    borderColor: '#B4833B',
    borderWidth: 0.5,
    borderRadius: 2.5,
  },
  impactContainer: {
    position: 'absolute',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  impactRing: {
    width: '100%',
    height: '100%',
    borderColor: '#F59E0B',
    borderWidth: 2.5,
    borderRadius: 20,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  ball: {
    position: 'absolute',
    left: -4,
    top: -4,
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 1.5 },
    shadowOpacity: 0.4,
    shadowRadius: 2.5,
  },
  footer: {
    width: '80%',
    maxWidth: 300,
    alignItems: 'center',
  },
  loadingTrack: {
    width: '100%',
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  loadingFill: {
    height: '100%',
    backgroundColor: '#59C749',
    borderRadius: 2,
  },
  loadingText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 1.5,
  },
});
