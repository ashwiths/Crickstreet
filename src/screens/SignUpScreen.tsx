import { AntDesign, Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PrimaryButton } from '../components/PrimaryButton';
import { Colors } from '../constants/colors';
import { useAuth } from '../hooks/useAuth';
import { s, fs, sp, br, iconSz, avatarSz } from '../theme/responsive';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUpWithEmail, loading, error, clearError } = useAuth();
  const { height: screenHeight } = useWindowDimensions();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Clear errors on mount
  useEffect(() => {
    clearError();
  }, []);

  const handleSignUp = useCallback(() => {
    setLocalError(null);
    clearError();

    // Client-side validations
    if (!name.trim()) {
      setLocalError('Name is required.');
      return;
    }
    if (!email.trim()) {
      setLocalError('Email address is required.');
      return;
    }
    if (!password) {
      setLocalError('Password is required.');
      return;
    }
    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    signUpWithEmail(email.trim(), password, name.trim());
  }, [name, email, password, confirmPassword, signUpWithEmail, clearError]);

  const activeError = error || localError;

  const handleClearError = useCallback(() => {
    setLocalError(null);
    clearError();
  }, [clearError]);

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.background} />

      {/* Ambient soft glow background */}
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

      <View style={styles.container}>
        {/* ── Top Nav: Back Button ──────────────────────────────────── */}
        <Animated.View entering={FadeInUp.delay(50).duration(500)} style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <AntDesign name="left" size={24} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Create Account</Text>
          <View style={{ width: 40 }} /> {/* Spacer */}
        </Animated.View>

        {/* ── Logo & Branding ──────────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.brandContainer}>
          <View style={styles.iconCircle}>
            <AntDesign name="user" size={iconSz.md} color={Colors.background} />
          </View>
          <Text style={styles.brandTitle}>Get Started</Text>
          <Text style={styles.brandSubtitle}>Join Crickstreet to track and score your matches.</Text>
        </Animated.View>

        {/* ── Sign Up Input Form ───────────────────────────────────── */}
        <Animated.View entering={FadeInDown.delay(200).duration(700)} style={styles.formContainer}>
          {/* Name Input */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>FULL NAME</Text>
            <View style={styles.inputFieldContainer}>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your full name"
                placeholderTextColor="#71717A"
                style={styles.textInput}
                autoCapitalize="words"
                autoCorrect={false}
              />
              <View style={styles.inputIcon}>
                <Feather name="user" size={18} color="#71717A" />
              </View>
            </View>
          </View>

          {/* Email Input */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <View style={styles.inputFieldContainer}>
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email address"
                placeholderTextColor="#71717A"
                style={styles.textInput}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.inputIcon}>
                <Feather name="mail" size={18} color="#71717A" />
              </View>
            </View>
          </View>

          {/* Password Input */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>PASSWORD</Text>
            <View style={styles.inputFieldContainer}>
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Choose a password (min 6 chars)"
                placeholderTextColor="#71717A"
                style={styles.textInput}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.inputIcon}
                activeOpacity={0.7}
              >
                <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#71717A" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password Input */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>CONFIRM PASSWORD</Text>
            <View style={styles.inputFieldContainer}>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm your password"
                placeholderTextColor="#71717A"
                style={styles.textInput}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.inputIcon}>
                <Feather name="lock" size={18} color="#71717A" />
              </View>
            </View>
          </View>

          {/* Dynamic Error Notification */}
          {activeError && (
            <Animated.View entering={FadeIn.duration(400)} style={styles.errorContainer}>
              <Text style={styles.errorText}>{activeError}</Text>
              <Pressable onPress={handleClearError} style={styles.errorClose} hitSlop={8}>
                <AntDesign name="close" size={iconSz.sm} color="#FF453A" />
              </Pressable>
            </Animated.View>
          )}

          {/* Submit Button */}
          <View style={styles.submitButtonContainer}>
            <PrimaryButton label="Sign Up" onPress={handleSignUp} />
          </View>

          {/* Sign In Redirect Link */}
          <View style={styles.redirectLinkContainer}>
            <Text style={styles.redirectText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')} activeOpacity={0.7}>
              <Text style={styles.redirectLink}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>

      {/* Fullscreen Overlay Loading Spinner */}
      {loading && (
        <View style={styles.overlayLoader}>
          <ActivityIndicator size="large" color="#FFFFFF" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
    position: 'relative',
  },
  container: {
    flex: 1,
    paddingHorizontal: sp.xl,
  },
  ambientGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    shadowColor: Colors.white,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 50,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: sp.sm,
    height: 48,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.secondaryButton,
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: Colors.secondaryButtonBorder,
    borderWidth: 1,
  },
  topTitle: {
    color: Colors.white,
    fontSize: fs.lg,
    fontWeight: '700',
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: sp.lg,
    marginBottom: sp.md,
  },
  iconCircle: {
    width: avatarSz.sm,
    height: avatarSz.sm,
    borderRadius: avatarSz.sm / 2,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sp.sm,
  },
  brandTitle: {
    color: Colors.white,
    fontSize: fs.hero,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: sp.xs,
  },
  brandSubtitle: {
    color: Colors.subtitleGray,
    fontSize: fs.md,
    textAlign: 'center',
    paddingHorizontal: sp.lg,
    lineHeight: fs.md * 1.4,
  },
  formContainer: {
    width: '100%',
    gap: sp.md,
  },
  inputWrapper: {
    width: '100%',
  },
  inputLabel: {
    color: '#71717A',
    fontSize: fs.xs,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: sp.xs,
  },
  inputFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.secondaryButton,
    borderColor: Colors.secondaryButtonBorder,
    borderWidth: 1,
    borderRadius: br.lg,
    height: 52,
    paddingHorizontal: sp.md,
  },
  textInput: {
    flex: 1,
    color: Colors.white,
    fontSize: fs.md2,
    height: '100%',
  },
  inputIcon: {
    width: 36,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  submitButtonContainer: {
    marginTop: sp.xs,
    width: '100%',
  },
  redirectLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: sp.xs,
  },
  redirectText: {
    color: Colors.subtitleGray,
    fontSize: fs.md,
  },
  redirectLink: {
    color: Colors.white,
    fontSize: fs.md,
    fontWeight: '700',
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
    borderRadius: br.full,
    paddingVertical: sp.md3,
    paddingHorizontal: sp.xl,
    width: '100%',
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
