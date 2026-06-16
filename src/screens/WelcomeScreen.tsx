import { AntDesign } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AnimatedParticles } from '../components/AnimatedParticles';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { Colors } from '../constants/colors';
import { useAuth } from '../hooks/useAuth';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Footer ──────────────────────────────────────────────────────────────────

function Footer() {
  const openTerms = useCallback(() => {
    Linking.openURL('https://crickstreet.com/terms');
  }, []);

  const openPrivacy = useCallback(() => {
    Linking.openURL('https://crickstreet.com/privacy');
  }, []);

  return (
    <Text style={styles.footerText}>
      By pressing Continue, you agree to our{' '}
      <Text style={styles.footerLink} onPress={openTerms}>
        Terms of Service
      </Text>{' '}
      and{' '}
      <Text style={styles.footerLink} onPress={openPrivacy}>
        Privacy Policy
      </Text>
      .
    </Text>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WelcomeScreen() {
  const { signInWithGoogle, loading, error, clearError } = useAuth();

  const handlePhone = useCallback(() => {
    // router.push('/(auth)/welcome');
  }, []);

  const handleGoogle = useCallback(() => {
    // Trigger Google Sign-In
    signInWithGoogle();
  }, [signInWithGoogle]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Ambient soft glow background behind the particle sphere */}
      <View style={[styles.ambientGlow, { pointerEvents: 'none' } as any]} />

      {/* ── Top Section: Branding & Profile Icon ─────────────────── */}
      <View style={styles.topSection}>
        <Animated.View
          entering={FadeInUp.delay(100).duration(600)}
          style={styles.iconWrapper}
        >
          <View style={styles.iconCircle}>
            <AntDesign name="user" size={18} color={Colors.background} />
          </View>
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.delay(200).duration(700)}
          style={styles.brandingLabel}
        >
          CRICKSTREET
        </Animated.Text>
      </View>

      {/* ── Hero: Particle Animation ──────────────────────────────── */}
      <Animated.View
        entering={FadeIn.delay(300).duration(1000)}
        style={styles.particleWrapper}
      >
        <AnimatedParticles />
      </Animated.View>

      {/* ── Welcome Text ──────────────────────────────────────────── */}
      <Animated.View
        entering={FadeInDown.delay(500).duration(800)}
        style={styles.textBlock}
      >
        <Text style={styles.heading}>Welcome</Text>
        <Text style={styles.subtitle}>Where every match creates a story.</Text>
      </Animated.View>

      {/* ── Dynamic Error Notification ── */}
      {error && (
        <Animated.View entering={FadeIn.duration(400)} style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={clearError} style={styles.errorClose} hitSlop={8}>
            <AntDesign name="close" size={14} color="#FF453A" />
          </Pressable>
        </Animated.View>
      )}

      {/* ── Buttons ───────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeInDown.delay(700).duration(800)}
        style={styles.buttonStack}
      >
        <PrimaryButton label="Continue with Phone" onPress={handlePhone} />
        <View style={styles.buttonSpacer} />
        <SecondaryButton label="Continue with Google" onPress={handleGoogle} />
      </Animated.View>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeIn.delay(900).duration(700)}
        style={styles.footerWrapper}
      >
        <Footer />
      </Animated.View>

      {/* ── Fullscreen Overlay Loading Spinner during Google Login ── */}
      {loading && (
        <View style={styles.overlayLoader}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    paddingHorizontal: 24,
    justifyContent: 'space-between', // Push contents vertically for elegant spacing
    position: 'relative',
  },

  // Soft ambient glow behind the sphere
  ambientGlow: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.14,
    width: SCREEN_HEIGHT * 0.30,
    height: SCREEN_HEIGHT * 0.30,
    borderRadius: (SCREEN_HEIGHT * 0.30) / 2,
    backgroundColor: 'rgba(255, 255, 255, 0.02)', // Translucent ambient lighting
    shadowColor: Colors.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 50,
  },

  topSection: {
    alignItems: 'center',
    marginTop: 8,
    gap: 12,
  },

  // Top icon
  iconWrapper: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.white,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  brandingLabel: {
    color: '#71717A',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 4.5,
    textAlign: 'center',
  },

  // Particle area
  particleWrapper: {
    height: SCREEN_HEIGHT * 0.28, // Align exactly with optimized SPHERE_HEIGHT
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },

  // Welcome text
  textBlock: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 12,
  },
  heading: {
    color: Colors.white,
    fontSize: 50, // Bold, premium, large presence
    fontWeight: '800',
    letterSpacing: -1.2, // Clean modern font spacing
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: Colors.subtitleGray,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: 22,
  },

  // Buttons
  buttonStack: {
    width: '100%',
    marginBottom: 12,
  },
  buttonSpacer: {
    height: 12,
  },

  // Footer
  footerWrapper: {
    paddingBottom: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  footerText: {
    color: Colors.footerGray,
    fontSize: 11.5,
    lineHeight: 18,
    textAlign: 'center',
  },
  footerLink: {
    textDecorationLine: 'underline',
  },
  overlayLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.08)',
    borderColor: 'rgba(255, 69, 58, 0.2)',
    borderWidth: 1,
    borderRadius: 100, // Matches button shapes
    paddingVertical: 14,
    paddingHorizontal: 20,
    width: '100%',
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#FF453A',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  errorClose: {
    marginLeft: 8,
    padding: 2,
  },
});
