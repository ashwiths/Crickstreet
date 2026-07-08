import { AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
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
  Platform,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { sendOtp } from '../../src/services/authService';
import { s, fs, sp, br, iconSz, avatarSz } from '../../src/theme/responsive';

export default function EmailScreen() {
  const router = useRouter();
  const { height: screenHeight } = useWindowDimensions();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email Validation regex
  const validateEmail = (val: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(val);
  };

  const handleSendOtp = useCallback(async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      setError('Please enter a valid email address.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await sendOtp(trimmedEmail);
      
      // Navigate to OTP Screen, passing email as query parameter
      router.push({
        pathname: '/(auth)/otp',
        params: { email: trimmedEmail },
      });
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, router]);

  const clearError = () => {
    setError(null);
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Ambient soft green glow background */}
      <View
        pointerEvents="none"
        style={[
          styles.ambientGlow,
          {
            top: screenHeight * 0.1,
            width: screenHeight * 0.35,
            height: screenHeight * 0.35,
            borderRadius: (screenHeight * 0.35) / 2,
          },
        ]}
      />

      <View style={styles.container}>
        {/* Top Navigation Back Button */}
        <Animated.View entering={FadeInUp.delay(50).duration(500)} style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <AntDesign name="left" size={20} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Email Auth</Text>
          <View style={{ width: 40 }} />
        </Animated.View>

        {/* Branding Hero */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.brandContainer}>
          <View style={styles.iconCircle}>
            <AntDesign name="mail" size={24} color="#59C749" />
          </View>
          <Text style={styles.brandTitle}>Enter your Email</Text>
          <Text style={styles.brandSubtitle}>We will send a 6-digit verification code to your email.</Text>
        </Animated.View>

        {/* Error Notification */}
        {error && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={clearError} style={styles.errorClose} hitSlop={8}>
              <AntDesign name="close" size={iconSz.sm} color="#FF453A" />
            </Pressable>
          </Animated.View>
        )}

        {/* Input Form */}
        <Animated.View entering={FadeInDown.delay(200).duration(700)} style={styles.formContainer}>
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>EMAIL ADDRESS</Text>
            <View style={styles.inputFieldContainer}>
              <TextInput
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (error) setError(null);
                }}
                placeholder="name@example.com"
                placeholderTextColor="#9CA3AF"
                style={styles.textInput}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity
            onPress={handleSendOtp}
            activeOpacity={0.8}
            style={styles.actionBtn}
            disabled={loading}
          >
            <LinearGradient
              colors={['#59C749', '#46B137']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientButton}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.actionBtnText}>Send OTP</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    position: 'relative',
  },
  container: {
    flex: 1,
    width: '100%',
    paddingHorizontal: sp.xxl,
  },
  ambientGlow: {
    position: 'absolute',
    backgroundColor: 'rgba(89, 199, 73, 0.03)',
    shadowColor: '#59C749',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 60,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: s(56),
    marginTop: sp.xs,
  },
  backButton: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  topTitle: {
    fontSize: fs.lg,
    fontWeight: '700',
    color: '#111827',
  },
  brandContainer: {
    alignItems: 'center',
    marginTop: sp.xxl,
    marginBottom: sp.xl,
  },
  iconCircle: {
    width: avatarSz.md,
    height: avatarSz.md,
    borderRadius: avatarSz.md / 2,
    backgroundColor: 'rgba(89, 199, 73, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sp.md,
  },
  brandTitle: {
    fontSize: fs.h2,
    fontWeight: '800',
    color: '#111827',
    marginBottom: sp.xs,
  },
  brandSubtitle: {
    fontSize: fs.md,
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: fs.md * 1.4,
    paddingHorizontal: sp.md,
  },
  formContainer: {
    width: '100%',
  },
  inputWrapper: {
    marginBottom: sp.xl,
  },
  inputLabel: {
    fontSize: fs.xs,
    fontWeight: '700',
    color: '#9CA3AF',
    marginBottom: sp.sm,
    letterSpacing: 1.5,
  },
  inputFieldContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: br.full,
    paddingHorizontal: sp.lg,
    height: 52,
    backgroundColor: '#F9FAFB',
  },
  textInput: {
    flex: 1,
    fontSize: fs.md,
    color: '#111827',
    fontWeight: '500',
  },
  actionBtn: {
    width: '100%',
    height: 52,
    borderRadius: br.full,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(89, 199, 73, 0.2)',
      },
      default: {
        shadowColor: '#59C749',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 3,
      },
    }),
  },
  gradientButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: fs.lg,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 69, 58, 0.08)',
    borderColor: 'rgba(255, 69, 58, 0.2)',
    borderWidth: 1,
    borderRadius: br.full,
    paddingVertical: sp.md2,
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
