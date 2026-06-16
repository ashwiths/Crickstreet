import { AntDesign } from '@expo/vector-icons';
import React, { useCallback } from 'react';
import {
  Dimensions,
  Linking,
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
  const handlePhone = useCallback(() => {
    // router.push('/(auth)/welcome');
  }, []);

  const handleApple = useCallback(() => {
    // Trigger Apple Sign-In
  }, []);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* ── Top: Profile Icon ─────────────────────────────────────── */}
      <Animated.View
        entering={FadeInUp.delay(100).duration(600)}
        style={styles.iconWrapper}
      >
        <View style={styles.iconCircle}>
          <AntDesign name="user" size={20} color={Colors.background} />
        </View>
      </Animated.View>

      {/* ── Hero: Particle Animation ──────────────────────────────── */}
      <Animated.View
        entering={FadeIn.delay(250).duration(950)}
        style={styles.particleWrapper}
      >
        <AnimatedParticles />
      </Animated.View>

      {/* ── Welcome Text ──────────────────────────────────────────── */}
      <Animated.View
        entering={FadeInDown.delay(500).duration(700)}
        style={styles.textBlock}
      >
        <Text style={styles.heading}>Welcome</Text>
        <Text style={styles.subtitle}>Your Score starts from here</Text>
      </Animated.View>

      {/* ── Buttons ───────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeInDown.delay(650).duration(700)}
        style={styles.buttonStack}
      >
        <PrimaryButton label="Continue with Phone" onPress={handlePhone} />
        <View style={styles.buttonSpacer} />
        <SecondaryButton label="Continue with Apple" onPress={handleApple} />
      </Animated.View>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <Animated.View
        entering={FadeIn.delay(850).duration(650)}
        style={styles.footerWrapper}
      >
        <Footer />
      </Animated.View>
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
  },

  // Top icon
  iconWrapper: {
    marginTop: 12,
    alignItems: 'center',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Particle area
  particleWrapper: {
    height: SCREEN_HEIGHT * 0.36, // Allocate exactly ~36% of screen height to the sphere
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },

  // Welcome text
  textBlock: {
    alignItems: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  heading: {
    color: Colors.white,
    fontSize: 42,
    fontWeight: '700',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    color: Colors.subtitleGray,
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0.1,
  },

  // Buttons
  buttonStack: {
    width: '100%',
    marginBottom: 16,
  },
  buttonSpacer: {
    height: 12,
  },

  // Footer
  footerWrapper: {
    paddingBottom: 12,
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
});
