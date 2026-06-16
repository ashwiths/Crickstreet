import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '../constants/colors';

// ─── Constants ───────────────────────────────────────────────────────────────

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SPHERE_HEIGHT = SCREEN_HEIGHT * 0.28; // Occupies ~28% of screen height for a balanced compact visual
const CONTAINER_SIZE = Math.min(SPHERE_HEIGHT, 220);

const PARTICLE_COUNT = 160; // Clean particle density for compact sphere size
const BASE_RADIUS = CONTAINER_SIZE * 0.40; // Balanced radius inside the container
const PERSPECTIVE = CONTAINER_SIZE * 1.35; // Calibrate camera depth projection
const TILT_X = 0.42; // Elegant 3D angle tilt

// Pre-compute fixed trigonometric constants outside render loops
const COS_X = Math.cos(TILT_X);
const SIN_X = Math.sin(TILT_X);

// ─── Helper for Deterministic Particle Generation ────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

interface SpherePoint {
  id: number;
  x: number;
  y: number;
  z: number;
  baseOpacity: number;
}

function generateFibonacciSphere(count: number): SpherePoint[] {
  const points: SpherePoint[] = [];
  const goldenRatio = Math.PI * (3 - Math.sqrt(5)); // Golden angle

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2; // y goes from 1 to -1
    const radius = Math.sqrt(1 - y * y); // radius at y

    const theta = goldenRatio * i; // golden angle increment

    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;

    const r1 = seededRandom(i * 3 + 1);

    points.push({
      id: i,
      x,
      y,
      z,
      baseOpacity: 0.35 + r1 * 0.65, // Subtle variation in particle brightness
    });
  }

  // Pre-sort by Z coordinate (back to front) to help render order overlap
  return points.sort((a, b) => a.z - b.z);
}

// ─── Particle Component ──────────────────────────────────────────────────────

interface ParticleProps {
  point: SpherePoint;
  cosY: SharedValue<number>;
  sinY: SharedValue<number>;
  pulse: SharedValue<number>;
}

function Particle({ point, cosY, sinY, pulse }: ParticleProps) {
  const animatedStyle = useAnimatedStyle(() => {
    // Read shared values and guard against NaN during Server-Side Rendering (SSR)
    const cy = typeof cosY.value === 'number' && !isNaN(cosY.value) ? cosY.value : 1;
    const sy = typeof sinY.value === 'number' && !isNaN(sinY.value) ? sinY.value : 0;
    const p = typeof pulse.value === 'number' && !isNaN(pulse.value) ? pulse.value : 1;
    const r = BASE_RADIUS * p;

    // 1. Rotate around Y-axis (continuous horizontal spin)
    const x1 = point.x * cy - point.z * sy;
    const z1 = point.x * sy + point.z * cy;

    // 2. Rotate around X-axis (fixed tilt for depth perspective) using pre-calculated constants
    const rotX = x1;
    const rotY = point.y * COS_X - z1 * SIN_X;
    const rotZ = point.y * SIN_X + z1 * COS_X;

    const finalX = rotX * r;
    const finalY = rotY * r;
    const finalZ = rotZ * r;

    // 3. Perspective Projection
    const depthDistance = PERSPECTIVE + finalZ;
    const scale = depthDistance > 0 ? PERSPECTIVE / depthDistance : 1;
    const finalScale = typeof scale === 'number' && !isNaN(scale) ? scale : 1;

    const screenX = (typeof finalX === 'number' && !isNaN(finalX) ? finalX : 0) * finalScale;
    const screenY = (typeof finalY === 'number' && !isNaN(finalY) ? finalY : 0) * finalScale;

    // 4. Compute size & opacity based on Z-depth (closer = larger/brighter)
    const depthRange = 2 * BASE_RADIUS;
    const normalizedDepth = depthRange > 0 ? (finalZ + BASE_RADIUS) / depthRange : 0.5;
    const depthVal = typeof normalizedDepth === 'number' && !isNaN(normalizedDepth) ? normalizedDepth : 0.5;
    const depthFactor = 1 - Math.max(0, Math.min(1, depthVal));

    const particleSize = 1.0 + depthFactor * 2.2; // size ranges from 1.0 to 3.2
    
    let opacity = (0.15 + depthFactor * 0.85) * point.baseOpacity;
    if (typeof opacity !== 'number' || isNaN(opacity)) {
      opacity = 0.5;
    }

    return {
      transform: [
        { translateX: screenX },
        { translateY: screenY },
      ],
      width: particleSize,
      height: particleSize,
      borderRadius: particleSize / 2,
      opacity: opacity,
      backgroundColor: Colors.white,
    };
  });

  return <Animated.View style={[styles.particle, animatedStyle]} />;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function AnimatedParticles() {
  const points = useMemo(() => generateFibonacciSphere(PARTICLE_COUNT), []);
  
  // Shared values to drive the animations
  const angleY = useSharedValue(0);
  const pulseTime = useSharedValue(0);

  // Derive trigonometric/pulsing values once per frame for all particles
  const cosY = useDerivedValue(() => Math.cos(angleY.value));
  const sinY = useDerivedValue(() => Math.sin(angleY.value));
  const pulse = useDerivedValue(() => 1.0 + 0.04 * Math.sin(pulseTime.value));

  useEffect(() => {
    angleY.value = withRepeat(
      withTiming(Math.PI * 2, {
        duration: 16000, // Very slow continuous horizontal rotation
        easing: Easing.linear,
      }),
      -1,
      false
    );

    pulseTime.value = withRepeat(
      withTiming(Math.PI * 2, {
        duration: 4500, // Gentle breathing/pulsing cycle
        easing: Easing.inOut(Easing.sin),
      }),
      -1,
      false
    );
  }, [angleY, pulseTime]);

  return (
    <View style={styles.container}>
      {points.map((p) => (
        <Particle
          key={p.id}
          point={p}
          cosY={cosY}
          sinY={sinY}
          pulse={pulse}
        />
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    width: CONTAINER_SIZE,
    height: CONTAINER_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  particle: {
    position: 'absolute',
    backgroundColor: Colors.white,
    // Add subtle shadow/glow to closest particles
    shadowColor: Colors.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
  },
});
