import { AntDesign } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  Clipboard,
  Platform,
} from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { verifyOtp, resendOtp, signInWithOtpToken } from '../../src/services/authService';
import { s, fs, sp, br, iconSz, avatarSz } from '../../src/theme/responsive';

export default function OtpScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { height: screenHeight } = useWindowDimensions();

  const [otp, setOtp] = useState<string[]>(Array(6).fill(''));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);

  // References for OTP text inputs
  const inputRefs = useRef<TextInput[]>([]);

  // 1. Autofocus first input on mount
  useEffect(() => {
    setTimeout(() => {
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }, 200);
  }, []);

  // 2. Countdown timer for Resend code
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // 3. Handle key press / character entry
  const handleTextChange = (text: string, index: number) => {
    setError(null);
    setSuccessMessage(null);

    // If paste event occurs (length >= 6 digits)
    if (text.length >= 6) {
      const pasteDigits = text.slice(0, 6).split('');
      const newOtp = [...otp];
      for (let i = 0; i < 6; i++) {
        newOtp[i] = pasteDigits[i] || '';
      }
      setOtp(newOtp);
      // Focus on last box or trigger submit
      inputRefs.current[5]?.focus();
      return;
    }

    const newOtp = [...otp];
    // Keep only the last character entered
    newOtp[index] = text.slice(-1);
    setOtp(newOtp);

    // Auto-focus next input if a digit was entered
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // 4. Handle backspace navigation
  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      setError(null);
      
      // If current box is empty, clear previous box and focus it
      if (otp[index] === '' && index > 0) {
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  // 5. Submit OTP Verification
  const handleVerify = useCallback(async () => {
    const fullOtp = otp.join('');
    if (fullOtp.length < 6) {
      setError('Please enter the complete 6-digit code.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Call verify-otp API endpoint
      const result = await verifyOtp(email!, fullOtp);
      
      setSuccessMessage('Verification successful. Logging in...');

      // Authenticate with Firebase using the custom token
      try {
        await signInWithOtpToken(result.customToken);
      } catch (authErr: any) {
        if (result.customToken === 'mock-custom-token') {
          setError('OTP verified successfully! [DEV MOCK SUCCESS] In development mock mode, mock tokens cannot authenticate with the live Firebase service. To establish a real persistent login session, please configure your real Firebase credentials in backend/.env.');
          setLoading(false);
          return;
        }
        throw authErr;
      }
      
      // Router layout effect will auto redirect authenticated user to /(tabs)
    } catch (err: any) {
      setError(err.message || 'OTP verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  }, [otp, email]);

  // 6. Handle resending OTP code
  const handleResend = useCallback(async () => {
    if (countdown > 0) return;

    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);
      await resendOtp(email!);
      
      setSuccessMessage('A new verification code has been sent.');
      setCountdown(60);
      setOtp(Array(6).fill(''));
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [email, countdown]);

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
        {/* Top Navigation Bar */}
        <Animated.View entering={FadeInUp.delay(50).duration(500)} style={styles.topBar}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <AntDesign name="left" size={20} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>Verify OTP</Text>
          <View style={{ width: 40 }} />
        </Animated.View>

        {/* Branding Hero */}
        <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.brandContainer}>
          <View style={styles.iconCircle}>
            <AntDesign name="key" size={24} color="#59C749" />
          </View>
          <Text style={styles.brandTitle}>Enter Code</Text>
          <Text style={styles.brandSubtitle}>
            We have sent a verification code to:{'\n'}
            <Text style={styles.emailHighlight}>{email}</Text>
          </Text>
        </Animated.View>

        {/* Success or Error Notifications */}
        {error && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable onPress={clearError} style={styles.errorClose} hitSlop={8}>
              <AntDesign name="close" size={iconSz.sm} color="#FF453A" />
            </Pressable>
          </Animated.View>
        )}

        {successMessage && (
          <Animated.View entering={FadeIn.duration(400)} style={styles.successContainer}>
            <Text style={styles.successText}>{successMessage}</Text>
          </Animated.View>
        )}

        {/* 6-digit OTP Inputs Row */}
        <Animated.View entering={FadeInDown.delay(200).duration(700)} style={styles.formContainer}>
          <View style={styles.otpInputRow}>
            {otp.map((digit, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  if (ref) inputRefs.current[index] = ref;
                }}
                value={digit}
                onChangeText={(text) => handleTextChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                placeholder="-"
                placeholderTextColor="#D1D5DB"
                style={styles.otpInputBox}
                keyboardType="number-pad"
                maxLength={6} // Support paste length
                selectTextOnFocus
                textAlign="center"
                editable={!loading}
              />
            ))}
          </View>

          {/* Countdown timer & Resend text */}
          <View style={styles.resendWrapper}>
            {countdown > 0 ? (
              <Text style={styles.timerText}>
                Resend code in <Text style={styles.timerCount}>{countdown}s</Text>
              </Text>
            ) : (
              <TouchableOpacity activeOpacity={0.7} onPress={handleResend} disabled={loading}>
                <Text style={styles.resendText}>Resend Verification Code</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            onPress={handleVerify}
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
                <Text style={styles.actionBtnText}>Verify & Login</Text>
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
  emailHighlight: {
    fontWeight: '700',
    color: '#111827',
  },
  formContainer: {
    width: '100%',
  },
  otpInputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: sp.lg,
    width: '100%',
  },
  otpInputBox: {
    width: s(42),
    height: s(48),
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: br.sm,
    fontSize: fs.xl,
    fontWeight: '700',
    color: '#111827',
    backgroundColor: '#F9FAFB',
  },
  resendWrapper: {
    alignItems: 'center',
    marginBottom: sp.xl,
  },
  timerText: {
    fontSize: fs.sm,
    color: '#6B7280',
    fontWeight: '500',
  },
  timerCount: {
    color: '#59C749',
    fontWeight: '700',
  },
  resendText: {
    fontSize: fs.sm,
    color: '#59C749',
    fontWeight: '700',
    textDecorationLine: 'underline',
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
  successContainer: {
    backgroundColor: 'rgba(89, 199, 73, 0.08)',
    borderColor: 'rgba(89, 199, 73, 0.2)',
    borderWidth: 1,
    borderRadius: br.full,
    paddingVertical: sp.md2,
    paddingHorizontal: sp.xl,
    width: '100%',
    marginBottom: sp.lg,
    alignItems: 'center',
  },
  successText: {
    color: '#4CAF50',
    fontSize: fs.md,
    fontWeight: '500',
    textAlign: 'center',
  },
});
