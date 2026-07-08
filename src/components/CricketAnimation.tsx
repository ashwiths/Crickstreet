import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

const AnimatedLine = Animated.createAnimatedComponent(Line);

export function CricketAnimation() {
  const progress = useSharedValue(0);

  // Loop progress from 0.0 to 1.0 continuously
  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: 2800, // Duration of one full pitch and hit cycle
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      }),
      -1,
      false
    );
  }, [progress]);

  // 1. Calculate Ball Position (Pitch -> Bounce -> Hit -> Fly)
  const ballX = useDerivedValue(() => {
    const p = progress.value;
    if (p < 0.4) {
      // Phase 1: Ball travels from bowler's side (left) to batsman's bat (x = 72)
      return 20 + (72 - 20) * (p / 0.4);
    } else if (p < 0.8) {
      // Phase 2: Ball is hit and flies high to the right (x = 200)
      const t = (p - 0.4) / 0.4;
      return 72 + (200 - 72) * t;
    } else {
      return 200;
    }
  });

  const ballY = useDerivedValue(() => {
    const p = progress.value;
    if (p < 0.4) {
      // Ball pitches and bounces. Starts at y = 105, bounces at y = 145 (around p = 0.24), rises to bat contact at y = 120
      const t = p / 0.4;
      if (t < 0.65) {
        // Downward travel to bounce point
        const nt = t / 0.65;
        return 105 + (145 - 105) * nt * nt;
      } else {
        // Rise after bounce to bat contact point
        const nt = (t - 0.65) / 0.35;
        return 145 - (145 - 120) * nt;
      }
    } else if (p < 0.8) {
      // Hit ball flies high up to y = 32
      const t = (p - 0.4) / 0.4;
      return 120 - (120 - 32) * t;
    } else {
      return 32;
    }
  });

  // 2. Ball Opacity (Fades in at start, fades out after soaring off)
  const ballOpacity = useDerivedValue(() => {
    const p = progress.value;
    if (p < 0.05) {
      return p / 0.05;
    } else if (p < 0.75) {
      return 1;
    } else if (p < 0.85) {
      return 1 - (p - 0.75) / 0.1;
    } else {
      return 0;
    }
  });

  // 3. Bat Rotation Angle (Backlift -> Swing -> Follow-through -> Return)
  const batRotation = useDerivedValue(() => {
    const p = progress.value;
    if (p < 0.2) {
      // Ready stance (Backlifted at -65 deg)
      return -65;
    } else if (p < 0.4) {
      // Downswing to impact at 35 deg
      const t = (p - 0.2) / 0.2;
      return -65 + (35 - (-65)) * t;
    } else if (p < 0.6) {
      // Follow-through up to 75 deg
      const t = (p - 0.4) / 0.2;
      return 35 + (75 - 35) * t;
    } else if (p < 0.9) {
      // Return back to stance
      const t = (p - 0.6) / 0.3;
      return 75 - (75 - (-65)) * t;
    } else {
      return -65;
    }
  });

  // 4. Post-Hit Ball Trail Opacity
  const trailOpacity = useDerivedValue(() => {
    const p = progress.value;
    if (p >= 0.4 && p < 0.75) {
      return 0.55;
    } else if (p >= 0.75 && p < 0.85) {
      return 0.55 * (1 - (p - 0.75) / 0.1);
    } else {
      return 0;
    }
  });

  // ─── Style Configurations ───────────────────────────────────────────

  const animatedBallStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: ballX.value },
      { translateY: ballY.value },
    ],
    opacity: ballOpacity.value,
  }));

  const animatedBatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: -38 }, // Offset to pivot at bottom handle hands (height of bat is 76, center is 38)
      { rotate: `${batRotation.value}deg` },
      { translateY: 38 },
    ],
  }));

  const animatedImpactStyle = useAnimatedStyle(() => {
    const p = progress.value;
    let scale = 0;
    let opacity = 0;
    if (p >= 0.4 && p < 0.52) {
      const t = (p - 0.4) / 0.12;
      scale = 0.2 + t * 1.8;
      opacity = 1.0 - t;
    }
    return {
      transform: [{ scale }],
      opacity,
    };
  });

  const animatedTrailProps = useAnimatedProps(() => ({
    opacity: trailOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* ── Background Static Field & Silhouette ────────────────────── */}
      <Svg width="220" height="220" viewBox="0 0 220 220" style={styles.svg}>
        {/* Soft decorative background circle badge */}
        <Circle cx="110" cy="110" r="95" fill="rgba(89, 199, 73, 0.04)" stroke="rgba(89, 199, 73, 0.1)" strokeWidth="1" />

        {/* Stadium Dome Arch at the top of the circle */}
        <Path d="M 32,130 A 82,82 0 0,1 188,130" stroke="rgba(89, 199, 73, 0.15)" strokeWidth="2.5" strokeDasharray="6 6" fill="none" />

        {/* Pitch ground line (shifted up to y = 160) */}
        <Line x1="15" y1="160" x2="205" y2="160" stroke="#E5E7EB" strokeWidth="2" strokeLinecap="round" />
        <Line x1="75" y1="160" x2="160" y2="160" stroke="#59C749" strokeWidth="2.5" strokeLinecap="round" />

        {/* Wickets/Stumps behind the batsman (x = 135) */}
        <Line x1="131" y1="85" x2="131" y2="160" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" />
        <Line x1="136" y1="85" x2="136" y2="160" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" />
        <Line x1="141" y1="85" x2="141" y2="160" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" />
        {/* Wickets Bails */}
        <Line x1="128" y1="85" x2="144" y2="85" stroke="#71717A" strokeWidth="2" strokeLinecap="round" />

        {/* Batsman Body Silhouette (Static Parts - Enlarged & Shifted) */}
        {/* Head */}
        <Circle cx="100" cy="75" r="10" fill="#1F2937" />
        {/* Torso */}
        <Line x1="100" y1="85" x2="96" y2="122" stroke="#1F2937" strokeWidth="8" strokeLinecap="round" />
        {/* Back Leg */}
        <Line x1="96" y1="122" x2="108" y2="160" stroke="#1F2937" strokeWidth="7.5" strokeLinecap="round" />
        {/* Front Leg */}
        <Line x1="96" y1="122" x2="80" y2="160" stroke="#1F2937" strokeWidth="8" strokeLinecap="round" />
        {/* Lead Arm holding bat at hands/pivot */}
        <Line x1="100" y1="92" x2="72" y2="105" stroke="#1F2937" strokeWidth="6" strokeLinecap="round" />

        {/* Flight Trajectory Trail Line (Dashed) */}
        <AnimatedLine
          x1="72"
          y1="120"
          x2="200"
          y2="32"
          stroke="#EF4444"
          strokeWidth="2"
          strokeDasharray="4 4"
          animatedProps={animatedTrailProps}
        />
      </Svg>

      {/* ── Bat Container (Animated View overlaid at Hands/Pivot) ──── */}
      <View style={[styles.pivotContainer, { left: 72 - 7, top: 105 - 38 }]}>
        <Animated.View style={[styles.batWrapper, animatedBatStyle]}>
          {/* Bat Handle (dark grey) */}
          <View style={styles.batHandle} />
          {/* Bat Blade (willow wood brown) */}
          <View style={styles.batBlade} />
        </Animated.View>
      </View>

      {/* ── Impact Glow Circle (Flares at Hit coordinates) ──────────── */}
      <View style={[styles.impactContainer, { left: 72 - 20, top: 120 - 20 }]}>
        <Animated.View style={[styles.impactRing, animatedImpactStyle]} />
      </View>

      {/* ── Cricket Ball (Animated View overlay) ───────────────────── */}
      <Animated.View style={[styles.ball, animatedBallStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
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
    borderTopLeftRadius: 1.5,
    borderTopRightRadius: 1.5,
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
    left: -4, // Adjust for centering ball offset
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
});
