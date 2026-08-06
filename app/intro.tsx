import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Path, Rect, Circle } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import { useAuth } from '../src/hooks/useAuth';

export interface IntroScreenProps {
  onFinish?: () => void;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);

// Approximate lengths of SVG digit paths
const PATH_LENGTH_0 = 220;
const PATH_LENGTH_4 = 180;
const PATH_LENGTH_6 = 240;

const DustParticle = ({
  angle,
  translation,
  opacity,
}: {
  angle: number;
  translation: SharedValue<number>;
  opacity: SharedValue<number>;
}) => {
  const pStyle = useAnimatedStyle(() => {
    const dist = translation.value;
    return {
      transform: [
        { translateX: dist * Math.cos(angle) },
        { translateY: dist * Math.sin(angle) },
      ],
      opacity: opacity.value,
    };
  });
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: 4,
          height: 4,
          borderRadius: 2,
          backgroundColor: 'rgba(255, 255, 255, 0.75)',
        },
        pStyle,
      ]}
    />
  );
};

export default function IntroScreen({ onFinish }: IntroScreenProps) {
  const router = useRouter();
  const { user } = useAuth();

  const [loadingProgress, setLoadingProgress] = useState(0);
  const [runsStatus, setRunsStatus] = useState('WRITING SCORE...');

  // Shared values for transitions
  const screenOpacity = useSharedValue(1);

  // Chalk digits draw progress (1 = undrawn, 0 = fully drawn)
  const drawProgress0 = useSharedValue(1);
  const drawProgress4 = useSharedValue(1);
  const drawProgress6 = useSharedValue(1);

  // Opacities for digits
  const opacity0 = useSharedValue(0);
  const opacity4 = useSharedValue(0);
  const opacity6 = useSharedValue(0);

  // Chalk tip drawing pointer coordinates
  const chalkX = useSharedValue(50);
  const chalkY = useSharedValue(10);
  const chalkOpacity = useSharedValue(0);

  // Chalkboard Duster (Eraser) coordinates
  const dusterX = useSharedValue(-100);
  const dusterOpacity = useSharedValue(0);

  // Dust particles shared values (10 particles)
  const pTranslation = useSharedValue(0);
  const pAngles = Array(10).fill(null).map((_, i) => (i * 36) * (Math.PI / 180));
  const pOpacity = useSharedValue(0);

  useEffect(() => {
    // 1. Loading bar simulation (1200ms total)
    let loadingInterval = setInterval(() => {
      setLoadingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(loadingInterval);
          return 100;
        }
        return prev + 2; // 50 steps * 24ms = 1200ms
      });
    }, 24);

    // 2. Timeline Sequence (1000ms smooth digit 6 draw):
    // --- Draw Digit '6' immediately ---
    setRunsStatus('SIXER! MAXIMUM! 🔥');
    opacity6.value = 1;
    chalkOpacity.value = 1;

    chalkX.value = 70; chalkY.value = 10;
    drawProgress6.value = withTiming(0, { duration: 1000, easing: Easing.out(Easing.quad) });

    // Chalk pointer path tracking for '6' (total 1000ms)
    chalkX.value = withTiming(30, { duration: 350 });
    chalkY.value = withTiming(75, { duration: 350 });
    
    chalkX.value = withDelay(350, withTiming(50, { duration: 350 }));
    chalkY.value = withDelay(350, withTiming(85, { duration: 350 }));
    
    chalkX.value = withDelay(700, withTiming(70, { duration: 300 }));
    chalkY.value = withDelay(700, withTiming(50, { duration: 300 }));

    // Hide chalk tip at the end of drawing
    setTimeout(() => {
      chalkOpacity.value = withTiming(0, { duration: 150 });
    }, 1050);

    // Fade out whole screen and navigate when loading hits 100% (at 1200ms)
    setTimeout(() => {
      screenOpacity.value = withTiming(0, { duration: 300 }, (finished) => {
        if (finished) {
          runOnJS(handleNavigation)();
        }
      });
    }, 1200);

    return () => clearInterval(loadingInterval);
  }, []);

  const triggerDustBurst = () => {
    pOpacity.value = 1;
    pTranslation.value = 0;
    pTranslation.value = withTiming(70, { duration: 550, easing: Easing.out(Easing.quad) });
    pOpacity.value = withDelay(350, withTiming(0, { duration: 200 }));
  };

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

  // Reanimated Animated Props and Styles
  const animatedScreenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
  }));

  const animatedChalkProps0 = useAnimatedProps(() => ({
    strokeDashoffset: drawProgress0.value * PATH_LENGTH_0,
    opacity: opacity0.value,
  }));

  const animatedChalkProps4 = useAnimatedProps(() => ({
    strokeDashoffset: drawProgress4.value * PATH_LENGTH_4,
    opacity: opacity4.value,
  }));

  const animatedChalkProps6 = useAnimatedProps(() => ({
    strokeDashoffset: drawProgress6.value * PATH_LENGTH_6,
    opacity: opacity6.value,
  }));

  const animatedChalkTipStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: chalkX.value },
      { translateY: chalkY.value },
    ],
    opacity: chalkOpacity.value,
  }));

  const animatedDusterStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dusterX.value }],
    opacity: dusterOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, animatedScreenStyle]}>
      {/* Background soft ambient glows */}
      <View style={styles.glowGreen} pointerEvents="none" />

      {/* App Header */}
      <View style={styles.header}>
        <Text style={styles.appName}>CRICKSTREET</Text>
        <Text style={styles.appTagline}>LIVE MATCH SCORING PLATFORM</Text>
      </View>

      {/* Slate Green Chalkboard Scoring Widget */}
      <View style={styles.boardWoodFrame}>
        <View style={styles.slateBoard}>
          {/* Decorative chalk border */}
          <View style={styles.chalkBoardBorder} />
          
          <Text style={styles.boardHeader}>SCOREBOARD</Text>

          {/* SVG Canvas for Chalk Writing digits */}
          <View style={styles.svgWrapper}>
            <Svg width="150" height="150" viewBox="0 0 100 100">
              
              {/* Digit '0' path */}
              <AnimatedPath
                d="M 50,10 A 30,40 0 1,0 50.1,10"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={PATH_LENGTH_0}
                animatedProps={animatedChalkProps0}
              />

              {/* Digit '4' path */}
              <AnimatedPath
                d="M 65,10 L 25,70 L 85,70 M 65,30 L 65,90"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={PATH_LENGTH_4}
                animatedProps={animatedChalkProps4}
              />

              {/* Digit '6' path */}
              <AnimatedPath
                d="M 70,10 C 35,30 25,60 30,75 C 35,90 65,90 70,75 C 75,60 45,55 35,70"
                fill="none"
                stroke="#59C749" // Neon Green Chalk for the final sixer!
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={PATH_LENGTH_6}
                animatedProps={animatedChalkProps6}
              />
            </Svg>

            {/* Exploding chalk dust particles */}
            <View style={styles.particlesContainer}>
              {pAngles.map((angle, idx) => (
                <DustParticle
                  key={idx}
                  angle={angle}
                  translation={pTranslation}
                  opacity={pOpacity}
                />
              ))}
            </View>

            {/* Animated chalk pointer tip (drawing white circle dot) */}
            <Animated.View style={[styles.chalkPointer, animatedChalkTipStyle]}>
              <View style={styles.chalkPointerCore} />
            </Animated.View>

            {/* Blackboard Duster Eraser Overlay */}
            <Animated.View style={[styles.dusterEraser, animatedDusterStyle]}>
              <View style={styles.dusterBody} />
              <View style={styles.dusterHandle} />
            </Animated.View>
          </View>

          {/* Chalk status subtext */}
          <Text style={styles.boardStatus}>{runsStatus}</Text>
        </View>
      </View>

      {/* Loading Counter Footer */}
      <View style={styles.footer}>
        <View style={styles.loadingTrack}>
          <View style={[styles.loadingFill, { width: `${loadingProgress}%` }]} />
        </View>
        <Text style={styles.loadingText}>LOADING MATCH ASSETS... {loadingProgress}%</Text>
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
    top: '30%',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(89, 199, 73, 0.04)',
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
  boardWoodFrame: {
    backgroundColor: '#8B5A2B', // Wooden frame color
    borderRadius: 24,
    padding: 12,
    width: '90%',
    maxWidth: 320,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  slateBoard: {
    backgroundColor: '#1E2A22', // Dark slate green chalkboard
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  chalkBoardBorder: {
    ...StyleSheet.absoluteFillObject,
    margin: 4,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 12,
    pointerEvents: 'none',
  },
  boardHeader: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: '800',
    letterSpacing: 3,
    marginBottom: 10,
  },
  svgWrapper: {
    width: 150,
    height: 150,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chalkPointer: {
    position: 'absolute',
    top: 25, // Align center to SVG space
    left: 25,
    width: 16,
    height: 16,
    marginLeft: -8,
    marginTop: -8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  chalkPointerCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  dusterEraser: {
    position: 'absolute',
    top: 40,
    width: 50,
    height: 70,
    zIndex: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dusterBody: {
    width: '100%',
    height: 50,
    backgroundColor: '#4B3621', // Dark felt block
    borderColor: '#3D2B1F',
    borderWidth: 1,
    borderRadius: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  dusterHandle: {
    position: 'absolute',
    top: 10,
    width: '60%',
    height: 14,
    backgroundColor: '#CD7F32', // wood handle
    borderRadius: 3,
  },
  particlesContainer: {
    position: 'absolute',
    width: 10,
    height: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 12,
  },
  dustParticle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
  boardStatus: {
    fontSize: 14,
    fontWeight: '800',
    color: '#F59E0B', // golden chalk text
    letterSpacing: 1.5,
    marginTop: 10,
    textShadowColor: 'rgba(245, 158, 11, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
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
