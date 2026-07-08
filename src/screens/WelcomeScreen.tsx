import { AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CricketAnimation } from '../components/CricketAnimation';
import { Colors } from '../constants/colors';
import { useAuth } from '../hooks/useAuth';
import { s, fs, sp, br, iconSz, avatarSz } from '../theme/responsive';

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
  const router = useRouter();
  const { signInWithGoogle, loading, error, clearError } = useAuth();
  const { height: screenHeight } = useWindowDimensions();

  const handleEmail = useCallback(() => {
    router.push('/(auth)/login');
  }, [router]);

  const handleGoogle = useCallback(() => {
    signInWithGoogle();
  }, [signInWithGoogle]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Ambient soft green glow background */}
      <View
        style={[
          styles.ambientGlow,
          {
            top: screenHeight * 0.14,
            width: screenHeight * 0.28,
            height: screenHeight * 0.28,
            borderRadius: (screenHeight * 0.28) / 2,
          },
          { pointerEvents: 'none' } as any,
        ]}
      />

      {/* ── Top Section: Branding & Profile Icon ─────────────────── */}
      <TouchableOpacity
        onPress={() => {
          router.replace('/(tabs)');
        }}
        style={styles.topSection}
        activeOpacity={0.6}
      >
        <Animated.View
          entering={FadeInUp.delay(100).duration(600)}
          style={styles.iconWrapper}
        >
          <View style={styles.iconCircle}>
            <AntDesign name="user" size={24} color="#59C749" />
          </View>
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.delay(200).duration(700)}
          style={styles.brandingLabel}
        >
          CRICKSTREET
        </Animated.Text>
      </TouchableOpacity>

      {/* ── Hero: Particle Animation ──────────────────────────────── */}
      <Animated.View
        entering={FadeIn.delay(300).duration(1000)}
        style={[styles.particleWrapper, { height: screenHeight * 0.28 }]}
      >
        <CricketAnimation />
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
            <AntDesign name="close" size={iconSz.sm} color="#FF453A" />
          </Pressable>
        </Animated.View>
      )}

      {/* ── Buttons ───────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeInDown.delay(700).duration(800)}
        style={styles.buttonStack}
      >
        {/* Continue with Email (Green Gradient) */}
        <TouchableOpacity onPress={handleEmail} activeOpacity={0.8}>
          <LinearGradient
            colors={['#59C749', '#46B137']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.emailButton}
          >
            <Text style={styles.emailButtonText}>Continue with Email</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.buttonSpacer} />

        {/* Continue with Google (Light Premium Gray Button) */}
        <TouchableOpacity onPress={handleGoogle} activeOpacity={0.8} style={styles.googleButton}>
          <AntDesign name="google" size={18} color="#111827" style={{ marginRight: sp.sm }} />
          <Text style={styles.googleButtonText}>Continue with Google</Text>
        </TouchableOpacity>
      </Animated.View>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeIn.delay(900).duration(700)}
        style={styles.footerWrapper}
      >
        <Footer />
      </Animated.View>

      {/* ── Fullscreen Overlay Loading Spinner ── */}
      {loading && (
        <View style={styles.overlayLoader}>
          <ActivityIndicator size="large" color="#59C749" />
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingHorizontal: sp.xxl,
    justifyContent: 'space-between',
    position: 'relative',
  },

  ambientGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(89, 199, 73, 0.03)',
    shadowColor: '#59C749',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 50,
  },

  topSection: {
    alignItems: 'center',
    marginTop: sp.sm,
    gap: sp.md,
  },

  iconWrapper: {
    alignItems: 'center',
  },
  iconCircle: {
    width: avatarSz.sm,
    height: avatarSz.sm,
    borderRadius: avatarSz.sm / 2,
    backgroundColor: 'rgba(89, 199, 73, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandingLabel: {
    color: '#4B5563',
    fontSize: fs.base,
    fontWeight: '700',
    letterSpacing: 4.5,
    textAlign: 'center',
  },

  particleWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },

  textBlock: {
    alignItems: 'center',
    marginBottom: sp.lg,
    paddingHorizontal: sp.md,
  },
  heading: {
    color: '#111827',
    fontSize: fs.hero,
    fontWeight: '800',
    letterSpacing: -1.2,
    textAlign: 'center',
    marginBottom: sp.sm,
  },
  subtitle: {
    color: '#4B5563',
    fontSize: fs.md2,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.3,
    lineHeight: fs.md2 * 1.5,
  },

  buttonStack: {
    width: '100%',
    marginBottom: sp.md,
  },
  buttonSpacer: {
    height: sp.md,
  },

  emailButton: {
    height: 52,
    borderRadius: br.full,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    shadowColor: '#59C749',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  emailButtonText: {
    color: '#FFFFFF',
    fontSize: fs.lg,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  googleButton: {
    flexDirection: 'row',
    height: 52,
    borderRadius: br.full,
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  googleButtonText: {
    color: '#111827',
    fontSize: fs.lg,
    fontWeight: '600',
    letterSpacing: 0.3,
  },

  footerWrapper: {
    paddingBottom: sp.lg,
    paddingHorizontal: sp.sm,
    alignItems: 'center',
  },
  footerText: {
    color: '#6B7280',
    fontSize: fs.sm,
    lineHeight: fs.sm * 1.6,
    textAlign: 'center',
  },
  footerLink: {
    textDecorationLine: 'underline',
    color: '#59C749',
  },
  overlayLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
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
    borderRadius: br.full,
    paddingVertical: sp.md3,
    paddingHorizontal: sp.xl,
    width: '100%',
    marginBottom: sp.lg,
    justifyContent: 'space-between',
  },
  errorText: {
    color: '#FF453A',
    fontSize: fs.md,
    fontWeight: '500',
    flex: 1,
  },
  errorClose: {
    marginLeft: sp.sm,
    padding: sp.xs,
  },
});
