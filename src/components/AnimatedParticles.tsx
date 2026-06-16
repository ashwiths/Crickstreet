import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { Colors } from '../constants/colors';

// ─── Constants ───────────────────────────────────────────────────────────────

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SPHERE_HEIGHT = SCREEN_HEIGHT * 0.36; // Occupy ~36% of screen height
const CONTAINER_SIZE = Math.min(SPHERE_HEIGHT, 280);

const PARTICLE_COUNT = 280; // Dense, premium density
const BASE_RADIUS = CONTAINER_SIZE * 0.38; // Radius of sphere shell
const PERSPECTIVE = CONTAINER_SIZE * 1.1; // Camera perspective distance
const TILT_X = 0.4; // 3D tilt angle (radians)

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
  noiseSpeed: number;
  noisePhase: number;
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

    // Use seededRandom to ensure absolute consistency between renders
    const r1 = seededRandom(i * 3 + 1);
    const r2 = seededRandom(i * 3 + 2);
    const r3 = seededRandom(i * 3 + 3);

    points.push({
      id: i,
      x,
      y,
      z,
      noiseSpeed: 0.8 + r1 * 1.6,
      noisePhase: r2 * Math.PI * 2,
      baseOpacity: 0.3 + r3 * 0.7, // Subtle variations in initial particle intensity
    });
  }

  // Pre-sort by Z coordinate (back to front) to help render order overlap
  return points.sort((a, b) => a.z - b.z);
}

// ─── Particle Component ──────────────────────────────────────────────────────

interface ParticleProps {
  point: SpherePoint;
  timeShared: SharedValue<number>;
}

function Particle({ point, timeShared }: ParticleProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const t = timeShared.value;

    // 1. Compute breathing/pulsation effect
    const pulse = 1.0 + 0.05 * Math.sin(t * 2.2 + point.noisePhase);
    const r = BASE_RADIUS * pulse;

    // 2. Rotate points in 3D space
    // Y-axis rotation (continuous horizontal spin)
    const angleY = t * 0.45; 
    const cosY = Math.cos(angleY);
    const sinY = Math.sin(angleY);

    const x1 = point.x * cosY - point.z * sinY;
    const z1 = point.x * sinY + point.z * cosY;

    // X-axis tilt rotation (fixed tilt for depth perspective)
    const cosX = Math.cos(TILT_X);
    const sinX = Math.sin(TILT_X);

    const rotX = x1;
    const rotY = point.y * cosX - z1 * sinX;
    const rotZ = point.y * sinX + z1 * cosX;

    // 3. Apply subtle organic flow noise (micro-vibrations)
    const noiseScale = 0.03 * r;
    const noiseX = Math.sin(t * point.noiseSpeed + point.noisePhase) * noiseScale;
    const noiseY = Math.cos(t * point.noiseSpeed * 1.2 + point.noisePhase) * noiseScale;

    const finalX = rotX * r + noiseX;
    const finalY = rotY * r + noiseY;
    const finalZ = rotZ * r;

    // 4. Perspective Projection
    const scale = PERSPECTIVE / (PERSPECTIVE + finalZ);
    const screenX = finalX * scale;
    const screenY = finalY * scale;

    // 5. Compute size & opacity based on Z-depth (closer = larger/brighter)
    const normalizedDepth = (finalZ + BASE_RADIUS) / (2 * BASE_RADIUS); // 0 (front) to 1 (back)
    const depthFactor = 1 - Math.max(0, Math.min(1, normalizedDepth)); // 1 (front) to 0 (back)

    const particleSize = 1.0 + depthFactor * 2.4; // size ranges from 1.0 to 3.4
    const opacity = (0.15 + depthFactor * 0.85) * point.baseOpacity;

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
  const time = useSharedValue(0);

  useEffect(() => {
    time.value = withRepeat(
      withTiming(Math.PI * 100, {
        duration: 200000, // Very slow continuous smooth rotation
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [time]);

  return (
    <View style={styles.container}>
      {points.map((p) => (
        <Particle key={p.id} point={p} timeShared={time} />
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
