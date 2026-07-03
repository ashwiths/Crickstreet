import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { s, fs, sp, br } from '../src/theme/responsive';

const C = {
  bg: '#F3F4F1',
  green: '#59C749',
  white: '#FFFFFF',
  textDark: '#1A1A1A',
  textGray: '#6B7280',
  border: '#E8E4D4',
  btnGray: '#F9F8F3',
};

export default function MatchWarningScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [accepted, setAccepted] = useState(false);
  const params = useLocalSearchParams<{
    matchId?: string;
    myTeamName?: string;
    oppTeamName?: string;
    myPlayers?: string;
    oppPlayers?: string;
    myRoles?: string;
    oppRoles?: string;
    battingFirst?: string;
    striker?: string;
    nonStriker?: string;
    openingBowler?: string;
    format?: string;
    customOvers?: string;
  }>();

  const handleProceed = () => {
    router.replace({
      pathname: '/match-setup',
      params: {
        myTeamName: params.myTeamName || '',
        oppTeamName: params.oppTeamName || '',
        myPlayers: params.myPlayers || '[]',
        oppPlayers: params.oppPlayers || '[]',
        myRoles: params.myRoles || '{}',
        oppRoles: params.oppRoles || '{}',
        battingFirst: params.battingFirst || 'my',
        striker: params.striker || '',
        nonStriker: params.nonStriker || '',
        openingBowler: params.openingBowler || '',
        matchId: params.matchId || '',
        format: params.format || 'T20',
        customOvers: params.customOvers || '20',
      },
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />
      
      {/* Background Gradient matching HomeScreen */}
      <LinearGradient
        colors={['#E5F2D9', '#F9E5C8', '#F3F4F1']}
        locations={[0, 0.4, 0.8]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { height: '100%', position: 'absolute', left: 0, right: 0, top: 0 }]}
      />

      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          {/* Main Warning Card */}
          <View style={styles.card}>
            {/* Warning Icon Banner */}
            <View style={styles.iconContainer}>
              <Feather name="alert-triangle" size={s(44)} color="#FFB020" />
            </View>

            <Text style={styles.title}>Ready to Start? 🏏</Text>
            <Text style={styles.subtitle}>
              Please read and acknowledge the guidelines and rules before you start scoring live balls.
            </Text>

            {/* Checkbox Section */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.checkboxContainer}
              onPress={() => setAccepted(!accepted)}
            >
              <Feather 
                name={accepted ? "check-square" : "square"} 
                size={22} 
                color={accepted ? C.green : C.textGray} 
              />
              <Text style={styles.checkboxLabel}>
                I accept the{' '}
                <Text 
                  style={styles.underlineText}
                  onPress={() => router.push('/rules-conditions')}
                >
                  Rules &amp; Conditions
                </Text>
                .
              </Text>
            </TouchableOpacity>

            {/* Action Buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity 
                activeOpacity={0.8} 
                style={styles.backBtn} 
                onPress={() => router.back()}
              >
                <Text style={styles.backBtnTxt}>Go Back</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                activeOpacity={accepted ? 0.85 : 1.0} 
                disabled={!accepted}
                style={[
                  styles.startBtn,
                  !accepted && styles.startBtnDisabled
                ]} 
                onPress={handleProceed}
              >
                <Text style={[
                  styles.startBtnTxt,
                  !accepted && styles.startBtnTxtDisabled
                ]}>Get Started</Text>
                <Feather name="arrow-right" size={16} color={accepted ? "#FFFFFF" : "rgba(0,0,0,0.25)"} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  headerGradient: {
    width: '100%',
  },
  safeArea: {
    flex: 1,
    zIndex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: sp.lg,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: br.xxl,
    padding: sp.xl,
    width: '100%',
    borderWidth: 1.5,
    borderColor: '#CCD4C5',
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
  },
  iconContainer: {
    width: s(72),
    height: s(72),
    borderRadius: s(36),
    backgroundColor: '#FFF8EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sp.md,
    borderWidth: 1,
    borderColor: '#FFECC7',
  },
  title: {
    fontSize: fs.xl,
    fontWeight: '900',
    color: C.textDark,
    textAlign: 'center',
    marginBottom: sp.xs,
  },
  subtitle: {
    fontSize: fs.sm,
    color: C.textGray,
    textAlign: 'center',
    lineHeight: fs.sm * 1.4,
    marginBottom: sp.xl,
    paddingHorizontal: sp.sm,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    marginBottom: sp.xl,
    alignSelf: 'center',
    paddingHorizontal: 4,
  },
  checkboxLabel: {
    fontSize: fs.sm,
    color: C.textGray,
    fontWeight: '600',
  },
  underlineText: {
    textDecorationLine: 'underline',
    color: C.green,
    fontWeight: '800',
  },
  btnRow: {
    flexDirection: 'row',
    width: '100%',
    gap: sp.md,
  },
  backBtn: {
    flex: 1,
    height: s(48),
    borderRadius: br.full,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.btnGray,
  },
  backBtnTxt: {
    fontSize: fs.sm,
    fontWeight: '700',
    color: '#4B5563',
  },
  startBtn: {
    flex: 2,
    height: s(48),
    borderRadius: br.full,
    backgroundColor: C.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  startBtnDisabled: {
    backgroundColor: 'rgba(89,199,73,0.18)',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  startBtnTxt: {
    fontSize: fs.sm,
    fontWeight: '800',
    color: C.white,
  },
  startBtnTxtDisabled: {
    color: 'rgba(0,0,0,0.25)',
  },
});
