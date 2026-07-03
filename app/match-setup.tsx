import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
  Easing,
  FadeIn,
  FadeOut,
  SlideInRight,
  FadeInDown,
} from 'react-native-reanimated';
import { s, ms, fs, sp, br } from '../src/theme/responsive';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../src/services/firebase';
import { useAuth } from '../src/hooks/useAuth';

// ─── Colours ──────────────────────────────────────────────────────────────────
const C = {
  bg: '#F3F4F1',
  green: '#59C749',
  greenDark: '#3A9E2E',
  white: '#FFFFFF',
  textDark: '#1A1A1A',
  textGray: '#6B7280',
  border: '#E8E4D4',
  btnGray: '#F9F8F3',
  selected: '#EAF7E6',
  selectedBorder: '#59C749',
  cardBg: '#FFFFFF',
  stepInactive: '#D1D5DB',
  countdownBg: '#0A1A0D',
};

// ─── Types ────────────────────────────────────────────────────────────────────
type Step = 'openers' | 'bowler' | 'countdown';

export default function MatchSetupScreen() {
  const router = useRouter();
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

  const { user } = useAuth();
  const uid = user?.uid || '';

  // ── Parse params ──────────────────────────────────────────────────────────
  const battingFirst = params.battingFirst || 'my';
  const myPlayers: string[] = useMemo(() => {
    try { return JSON.parse(params.myPlayers || '[]'); } catch { return []; }
  }, [params.myPlayers]);
  const oppPlayers: string[] = useMemo(() => {
    try { return JSON.parse(params.oppPlayers || '[]'); } catch { return []; }
  }, [params.oppPlayers]);

  const battingTeamName = battingFirst === 'my'
    ? (params.myTeamName || 'My Team')
    : (params.oppTeamName || 'Opponent');
  const bowlingTeamName = battingFirst === 'my'
    ? (params.oppTeamName || 'Opponent')
    : (params.myTeamName || 'My Team');
  const battingPlayers = battingFirst === 'my' ? myPlayers : oppPlayers;
  const bowlingPlayers = battingFirst === 'my' ? oppPlayers : myPlayers;

  // Initialize step based on what has already been selected (for resuming)
  const initialStep = useMemo(() => {
    const hasOpeners = !!params.striker && (!!params.nonStriker || battingFirst === 'opp');
    const hasBowler = !!params.openingBowler;

    if (hasOpeners && hasBowler) return 'countdown';
    if (hasOpeners) return 'bowler';
    return 'openers';
  }, [params.striker, params.nonStriker, params.openingBowler, battingFirst]);

  // ── Step state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState<Step>(initialStep);
  const [striker, setStriker] = useState<string | null>(params.striker || null);
  const [nonStriker, setNonStriker] = useState<string | null>(params.nonStriker || null);
  const [selectedBowler, setSelectedBowler] = useState<string | null>(params.openingBowler || null);

  // ── Countdown state ───────────────────────────────────────────────────────
  const [countdownValue, setCountdownValue] = useState(3);
  const [countdownDone, setCountdownDone] = useState(false);
  const countdownScale = useSharedValue(0);
  const countdownOpacity = useSharedValue(0);

  // Ring pulse animations
  const ring1Scale = useSharedValue(1);
  const ring1Opacity = useSharedValue(0);
  const ring2Scale = useSharedValue(1);
  const ring2Opacity = useSharedValue(0);
  const ring3Scale = useSharedValue(1);
  const ring3Opacity = useSharedValue(0);

  // Glow burst
  const glowScale = useSharedValue(0.8);
  const glowOpacity = useSharedValue(0.15);

  // Auto-select opponent players for steps where the opposing team is active
  useEffect(() => {
    if (battingFirst === 'opp') {
      // Opponent is batting first: auto-select opening batsmen from oppPlayers
      if (oppPlayers.length >= 1) {
        if (!striker) setStriker(oppPlayers[0]);
      }
      if (oppPlayers.length >= 2) {
        if (!nonStriker) setNonStriker(oppPlayers[1]);
      } else {
        setNonStriker(null);
      }
    } else {
      // User is batting first: opponent is bowling, auto-select opening bowler from oppPlayers
      if (oppPlayers.length >= 1) {
        if (!selectedBowler) setSelectedBowler(oppPlayers[0]);
      }
    }
  }, [battingFirst, oppPlayers, striker, nonStriker, selectedBowler]);

  // ── Player selection helpers ──────────────────────────────────────────────
  const handleSelectBatter = useCallback((player: string) => {
    if (striker === player) {
      setStriker(null);
      return;
    }
    if (nonStriker === player) {
      setNonStriker(null);
      return;
    }
    // First slot
    if (!striker) {
      setStriker(player);
      return;
    }
    // Second slot
    if (!nonStriker) {
      setNonStriker(player);
      return;
    }
    // Both full — replace nonStriker
    setNonStriker(player);
  }, [striker, nonStriker]);

  const handleSelectBowler = useCallback((player: string) => {
    setSelectedBowler(prev => prev === player ? null : player);
  }, []);

  const canGoNext = step === 'openers'
    ? (striker !== null && (nonStriker !== null || battingFirst === 'opp'))
    : step === 'bowler'
      ? selectedBowler !== null
      : false;

  const updateMatchInDb = useCallback(async (updates: Record<string, any>) => {
    if (!uid || !params.matchId) return;
    try {
      const docRef = doc(db, 'users', uid, 'matches', params.matchId);
      await updateDoc(docRef, updates);
    } catch (err) {
      console.error('Error updating match in setup step:', err);
    }
  }, [uid, params.matchId]);

  // ── Step navigation ───────────────────────────────────────────────────────
  const handleNext = useCallback(() => {
    if (step === 'openers' && striker && (nonStriker || battingFirst === 'opp')) {
      updateMatchInDb({
        striker,
        nonStriker: nonStriker || '',
      });
      setStep('bowler');
    } else if (step === 'bowler' && selectedBowler) {
      updateMatchInDb({
        openingBowler: selectedBowler,
      });
      setStep('countdown');
    }
  }, [step, striker, nonStriker, selectedBowler, battingFirst, updateMatchInDb]);

  const handleBack = useCallback(() => {
    if (step === 'bowler') {
      setStep('openers');
    } else if (step === 'openers') {
      router.back();
    }
  }, [step, router]);

  // ── Countdown animation ───────────────────────────────────────────────────
  const pulseRings = useCallback(() => {
    'worklet';
    // Ring 1 — fast inner pulse
    ring1Scale.value = 1;
    ring1Opacity.value = 0.6;
    ring1Scale.value = withTiming(2.2, { duration: 800, easing: Easing.out(Easing.cubic) });
    ring1Opacity.value = withTiming(0, { duration: 800 });

    // Ring 2 — medium pulse
    ring2Scale.value = 1;
    ring2Opacity.value = 0.4;
    ring2Scale.value = withDelay(100, withTiming(2.6, { duration: 900, easing: Easing.out(Easing.cubic) }));
    ring2Opacity.value = withDelay(100, withTiming(0, { duration: 900 }));

    // Ring 3 — wide outer pulse
    ring3Scale.value = 1;
    ring3Opacity.value = 0.25;
    ring3Scale.value = withDelay(200, withTiming(3.0, { duration: 1000, easing: Easing.out(Easing.cubic) }));
    ring3Opacity.value = withDelay(200, withTiming(0, { duration: 1000 }));
  }, [ring1Scale, ring1Opacity, ring2Scale, ring2Opacity, ring3Scale, ring3Opacity]);

  const animateCountdownNumber = useCallback((num: number) => {
    'worklet';
    // Number: scale up from tiny, spring in, then gently fade
    countdownScale.value = 0.15;
    countdownOpacity.value = 0;
    countdownScale.value = withSpring(1, { damping: 10, stiffness: 150, mass: 0.8 });
    countdownOpacity.value = withSequence(
      withTiming(1, { duration: 150, easing: Easing.out(Easing.cubic) }),
      withDelay(550, withTiming(0, { duration: 250, easing: Easing.in(Easing.cubic) })),
    );

    // Glow burst on each number
    glowScale.value = 0.8;
    glowOpacity.value = 0.4;
    glowScale.value = withTiming(1.6, { duration: 700, easing: Easing.out(Easing.cubic) });
    glowOpacity.value = withTiming(0.08, { duration: 700 });

    // Pulse rings
    pulseRings();
  }, [countdownScale, countdownOpacity, glowScale, glowOpacity, pulseRings]);

  useEffect(() => {
    if (step !== 'countdown') return;

    let current = 3;
    setCountdownValue(current);
    setCountdownDone(false);

    // Animate the first number immediately
    animateCountdownNumber(current);

    const interval = setInterval(() => {
      current -= 1;
      if (current > 0) {
        runOnJS(setCountdownValue)(current);
        animateCountdownNumber(current);
      } else if (current === 0) {
        runOnJS(setCountdownValue)(0);
        // Final "LET'S GO" animation — bigger burst
        countdownScale.value = 0.1;
        countdownOpacity.value = 0;
        countdownScale.value = withSpring(1.15, { damping: 7, stiffness: 90, mass: 0.6 });
        countdownOpacity.value = withTiming(1, { duration: 250 });

        glowScale.value = 0.5;
        glowOpacity.value = 0.6;
        glowScale.value = withTiming(2.5, { duration: 1200, easing: Easing.out(Easing.cubic) });
        glowOpacity.value = withTiming(0.05, { duration: 1200 });

        pulseRings();
      } else {
        clearInterval(interval);
        runOnJS(setCountdownDone)(true);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [step, animateCountdownNumber, countdownScale, countdownOpacity, glowScale, glowOpacity, pulseRings]);

  // ── Navigate after countdown ──────────────────────────────────────────────
  useEffect(() => {
    if (!countdownDone) return;
    const timeout = setTimeout(() => {
      router.replace({
        pathname: '/scorecard',
        params: {
          matchId: params.matchId || '',
          myTeamName: params.myTeamName || '',
          oppTeamName: params.oppTeamName || '',
          myPlayers: params.myPlayers || '[]',
          oppPlayers: params.oppPlayers || '[]',
          battingFirst: params.battingFirst || 'my',
          striker: striker || '',
          nonStriker: nonStriker || '',
          openingBowler: selectedBowler || '',
          format: params.format || 'T20',
          customOvers: params.customOvers || '20',
        }
      });
    }, 1200);
    return () => clearTimeout(timeout);
  }, [countdownDone, router]);

  // ── Animated styles ───────────────────────────────────────────────────────
  const countdownAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: countdownScale.value }],
    opacity: countdownOpacity.value,
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring1Scale.value }],
    opacity: ring1Opacity.value,
  }));
  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring2Scale.value }],
    opacity: ring2Opacity.value,
  }));
  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: ring3Scale.value }],
    opacity: ring3Opacity.value,
  }));
  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
    opacity: glowOpacity.value,
  }));

  // ── Step indicator ────────────────────────────────────────────────────────
  const stepIndex = step === 'openers' ? 0 : step === 'bowler' ? 1 : 2;

  // ── Render ────────────────────────────────────────────────────────────────
  if (step === 'countdown') {
    return (
      <View style={cdStyles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#060E08" translucent={true} />
        <LinearGradient
          colors={['#060E08', '#0D1F12', '#0A1710', '#060E08']}
          locations={[0, 0.35, 0.7, 1]}
          style={StyleSheet.absoluteFill}
        />

        <SafeAreaView style={cdStyles.safe}>
          {/* ── Top: Match Info Pill ── */}
          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={cdStyles.topSection}>
            <View style={cdStyles.matchPill}>
              <View style={cdStyles.liveDot} />
              <Text style={cdStyles.matchPillText}>
                {params.myTeamName || 'My Team'}  vs  {params.oppTeamName || 'Opponent'}
              </Text>
            </View>
            <Text style={cdStyles.formatLabel}>{params.format || 'T20'} Match</Text>
          </Animated.View>

          {/* ── Center: Countdown Rings + Number ── */}
          <View style={cdStyles.centerSection}>
            {/* Pulsing ring layers */}
            <Animated.View style={[cdStyles.pulseRing, cdStyles.pulseRingBase, ring1Style]} />
            <Animated.View style={[cdStyles.pulseRing, cdStyles.pulseRingBase, ring2Style]} />
            <Animated.View style={[cdStyles.pulseRing, cdStyles.pulseRingBase, ring3Style]} />

            {/* Background glow burst */}
            <Animated.View style={[cdStyles.glowBurst, glowStyle]} />

            {/* Static outer ring */}
            <View style={cdStyles.staticRingOuter}>
              <View style={cdStyles.staticRingInner}>
                {/* Number or GO text */}
                {countdownValue > 0 ? (
                  <Animated.View style={countdownAnimStyle}>
                    <Text style={cdStyles.numberText}>{countdownValue}</Text>
                  </Animated.View>
                ) : (
                  <Animated.View style={countdownAnimStyle}>
                    <Text style={cdStyles.goEmoji}>🏏</Text>
                    <Text style={cdStyles.goText}>LET&apos;S GO!</Text>
                  </Animated.View>
                )}
              </View>
            </View>

            {/* Subtitle below countdown */}
            <Animated.View entering={FadeInDown.duration(400).delay(300)}>
              <Text style={cdStyles.readyText}>
                {countdownValue > 0 ? 'Get Ready...' : 'Live Scoring Starts Now!'}
              </Text>
            </Animated.View>
          </View>

          {/* ── Bottom: Player Info Cards ── */}
          <Animated.View entering={FadeInDown.delay(200).duration(500)} style={cdStyles.bottomSection}>
            {/* Batsmen row */}
            <View style={cdStyles.playersRow}>
              <View style={cdStyles.playerCard}>
                <View style={cdStyles.playerRoleBadge}>
                  <Text style={cdStyles.playerRoleIcon}>🏏</Text>
                  <Text style={cdStyles.playerRoleText}>Striker</Text>
                </View>
                <Text style={cdStyles.playerNameText} numberOfLines={1}>{striker || '—'}</Text>
              </View>
              <View style={cdStyles.playerCard}>
                <View style={cdStyles.playerRoleBadge}>
                  <Text style={cdStyles.playerRoleIcon}>🏏</Text>
                  <Text style={cdStyles.playerRoleText}>Non-Striker</Text>
                </View>
                <Text style={cdStyles.playerNameText} numberOfLines={1}>{nonStriker || '—'}</Text>
              </View>
            </View>
            {/* Bowler row */}
            <View style={cdStyles.bowlerCard}>
              <View style={cdStyles.playerRoleBadge}>
                <Text style={cdStyles.playerRoleIcon}>⚾</Text>
                <Text style={cdStyles.playerRoleText}>Opening Bowler</Text>
              </View>
              <Text style={cdStyles.playerNameText} numberOfLines={1}>{selectedBowler || '—'}</Text>
            </View>
          </Animated.View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

      {/* Background Gradient */}
      <LinearGradient
        colors={['#E5F2D9', '#F9E5C8', '#F3F4F1']}
        locations={[0, 0.4, 0.8]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.bgGradient}
      />

      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity activeOpacity={0.7} onPress={handleBack} style={styles.backButton}>
            <Feather name="arrow-left" size={s(20)} color={C.textDark} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Match Setup</Text>
          <View style={{ width: s(36) }} />
        </View>

        {/* Step Indicator */}
        <View style={styles.stepRow}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.stepItem}>
              <View style={[
                styles.stepDot,
                i <= stepIndex && styles.stepDotActive,
                i < stepIndex && styles.stepDotCompleted,
              ]}>
                {i < stepIndex ? (
                  <Feather name="check" size={s(12)} color={C.white} />
                ) : (
                  <Text style={[
                    styles.stepDotText,
                    i <= stepIndex && styles.stepDotTextActive,
                  ]}>{i + 1}</Text>
                )}
              </View>
              <Text style={[
                styles.stepLabel,
                i <= stepIndex && styles.stepLabelActive,
              ]}>
                {i === 0 ? 'Openers' : i === 1 ? 'Bowler' : 'Start'}
              </Text>
              {i < 2 && (
                <View style={[
                  styles.stepLine,
                  i < stepIndex && styles.stepLineActive,
                ]} />
              )}
            </View>
          ))}
        </View>

        {/* Content Card */}
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            key={step}
            entering={SlideInRight.duration(300).springify().damping(18)}
            style={styles.card}
          >
            {step === 'openers' && (
              <>
                {/* Opener Icon */}
                <View style={styles.stepIconWrap}>
                  <Text style={{ fontSize: s(28) }}>🏏</Text>
                </View>
                <Text style={styles.cardTitle}>Select Opening Batsmen</Text>
                <Text style={styles.cardSubtitle}>
                  {battingFirst === 'opp'
                    ? `Opening batsmen from ${battingTeamName} are automatically selected.`
                    : `Choose 2 players from ${battingTeamName} to open the innings.\nTap first for Striker, second for Non-Striker.`}
                </Text>

                {/* Selected summary */}
                <View style={styles.selectedSummary}>
                  <View style={styles.selectedSlot}>
                    <View style={[styles.selectedDot, striker ? styles.selectedDotFilled : null]} />
                    <Text style={styles.selectedSlotLabel}>Striker</Text>
                    <Text style={styles.selectedSlotName} numberOfLines={1}>
                      {striker || '—'}
                    </Text>
                  </View>
                  <View style={styles.selectedSlotDivider} />
                  <View style={styles.selectedSlot}>
                    <View style={[styles.selectedDot, nonStriker ? styles.selectedDotFilled : null]} />
                    <Text style={styles.selectedSlotLabel}>Non-Striker</Text>
                    <Text style={styles.selectedSlotName} numberOfLines={1}>
                      {nonStriker || '—'}
                    </Text>
                  </View>
                </View>

                {/* Player List */}
                {battingPlayers.length === 0 ? (
                  <View style={styles.emptyPlayersWrap}>
                    <Feather name="users" size={s(32)} color={C.textGray} style={{ marginBottom: sp.sm }} />
                    <Text style={styles.emptyPlayersText}>No players registered in this squad.</Text>
                    <Text style={styles.emptyPlayersSub}>Please add players to your team roster first.</Text>
                  </View>
                ) : (
                  battingPlayers.map((player, idx) => {
                    const isStriker = striker === player;
                    const isNonStriker = nonStriker === player;
                    const isSelected = isStriker || isNonStriker;
                    return (
                      <TouchableOpacity
                        key={`${player}-${idx}`}
                        activeOpacity={battingFirst === 'opp' ? 1.0 : 0.7}
                        disabled={battingFirst === 'opp'}
                        style={[
                          styles.playerRow,
                          isSelected && styles.playerRowSelected,
                          battingFirst === 'opp' && { opacity: 0.8 }
                        ]}
                        onPress={() => handleSelectBatter(player)}
                      >
                        <View style={[styles.playerAvatar, isSelected && styles.playerAvatarSelected]}>
                          <Text style={styles.playerAvatarText}>
                            {player.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.playerInfo}>
                          <Text style={[styles.playerName, isSelected && styles.playerNameSelected]} numberOfLines={1}>
                            {player}
                          </Text>
                          {isStriker && <Text style={styles.playerRole}>Striker</Text>}
                          {isNonStriker && <Text style={styles.playerRole}>Non-Striker</Text>}
                        </View>
                        <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                          {isSelected && <Feather name="check" size={s(14)} color={C.white} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </>
            )}

            {step === 'bowler' && (
              <>
                {/* Bowler Icon */}
                <View style={[styles.stepIconWrap, { backgroundColor: '#FFF0F0' }]}>
                  <Text style={{ fontSize: s(28) }}>⚾</Text>
                </View>
                <Text style={styles.cardTitle}>Select Opening Bowler</Text>
                <Text style={styles.cardSubtitle}>
                  {battingFirst === 'my'
                    ? `Opening bowler from ${bowlingTeamName} is automatically selected.`
                    : `Choose 1 player from ${bowlingTeamName} to bowl the first over.`}
                </Text>

                {/* Selected summary */}
                <View style={[styles.selectedSummary, { justifyContent: 'center' }]}>
                  <View style={styles.selectedSlot}>
                    <View style={[styles.selectedDot, selectedBowler ? styles.selectedDotFilled : null]} />
                    <Text style={styles.selectedSlotLabel}>Bowler</Text>
                    <Text style={styles.selectedSlotName} numberOfLines={1}>
                      {selectedBowler || '—'}
                    </Text>
                  </View>
                </View>

                {/* Player List */}
                {bowlingPlayers.length === 0 ? (
                  <View style={styles.emptyPlayersWrap}>
                    <Feather name="users" size={s(32)} color={C.textGray} style={{ marginBottom: sp.sm }} />
                    <Text style={styles.emptyPlayersText}>No players registered in this squad.</Text>
                    <Text style={styles.emptyPlayersSub}>Please add players to your team roster first.</Text>
                  </View>
                ) : (
                  bowlingPlayers.map((player, idx) => {
                    const isSelected = selectedBowler === player;
                    return (
                      <TouchableOpacity
                        key={`${player}-${idx}`}
                        activeOpacity={battingFirst === 'my' ? 1.0 : 0.7}
                        disabled={battingFirst === 'my'}
                        style={[
                          styles.playerRow,
                          isSelected && styles.playerRowSelected,
                          battingFirst === 'my' && { opacity: 0.8 }
                        ]}
                        onPress={() => handleSelectBowler(player)}
                      >
                        <View style={[styles.playerAvatar, isSelected && styles.playerAvatarSelected]}>
                          <Text style={styles.playerAvatarText}>
                            {player.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.playerInfo}>
                          <Text style={[styles.playerName, isSelected && styles.playerNameSelected]} numberOfLines={1}>
                            {player}
                          </Text>
                          {isSelected && <Text style={styles.playerRole}>Opening Bowler</Text>}
                        </View>
                        <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                          {isSelected && <Feather name="check" size={s(14)} color={C.white} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </>
            )}
          </Animated.View>
        </ScrollView>

        {/* Bottom Action Bar */}
        <View style={styles.bottomBar}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.bottomBackBtn}
            onPress={handleBack}
          >
            <Feather name="arrow-left" size={s(16)} color="#4B5563" />
            <Text style={styles.bottomBackTxt}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={canGoNext ? 0.85 : 1.0}
            disabled={!canGoNext}
            style={[styles.bottomNextBtn, !canGoNext && styles.bottomNextBtnDisabled]}
            onPress={handleNext}
          >
            <Text style={[styles.bottomNextTxt, !canGoNext && styles.bottomNextTxtDisabled]}>
              {step === 'bowler' ? 'Start Match' : 'Next'}
            </Text>
            <Feather
              name={step === 'bowler' ? 'play' : 'arrow-right'}
              size={s(16)}
              color={canGoNext ? C.white : 'rgba(0,0,0,0.25)'}
              style={{ marginLeft: s(6) }}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Main Screen ─────────────────────────────────────────────────────────
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  bgGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
    zIndex: 1,
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp.lg,
    paddingTop: sp.sm,
    paddingBottom: sp.md,
  },
  backButton: {
    width: s(36),
    height: s(36),
    borderRadius: br.md,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fs.lg,
    fontWeight: '800',
    color: C.textDark,
  },

  // ── Step Indicator ──────────────────────────────────────────────────────
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: sp.xxl,
    paddingBottom: sp.lg,
    gap: sp.xs,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
  },
  stepDot: {
    width: s(26),
    height: s(26),
    borderRadius: s(13),
    backgroundColor: C.white,
    borderWidth: 2,
    borderColor: C.stepInactive,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    borderColor: C.green,
    backgroundColor: C.white,
  },
  stepDotCompleted: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  stepDotText: {
    fontSize: fs.xs,
    fontWeight: '800',
    color: C.stepInactive,
  },
  stepDotTextActive: {
    color: C.green,
  },
  stepLabel: {
    fontSize: fs.xs,
    fontWeight: '600',
    color: C.stepInactive,
  },
  stepLabelActive: {
    color: C.textDark,
    fontWeight: '700',
  },
  stepLine: {
    width: s(24),
    height: 2,
    backgroundColor: C.stepInactive,
    marginHorizontal: sp.xs,
    borderRadius: 1,
  },
  stepLineActive: {
    backgroundColor: C.green,
  },

  // ── Content Card ────────────────────────────────────────────────────────
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: sp.lg,
    paddingBottom: sp.xxl,
  },
  card: {
    backgroundColor: C.cardBg,
    borderRadius: br.xxl,
    padding: sp.xl,
    borderWidth: 1.5,
    borderColor: '#CCD4C5',
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 4,
    alignItems: 'center',
  },
  stepIconWrap: {
    width: s(60),
    height: s(60),
    borderRadius: s(30),
    backgroundColor: '#EAF7E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sp.md,
  },
  cardTitle: {
    fontSize: fs.xl,
    fontWeight: '900',
    color: C.textDark,
    textAlign: 'center',
    marginBottom: sp.xs,
  },
  cardSubtitle: {
    fontSize: fs.sm,
    color: C.textGray,
    textAlign: 'center',
    lineHeight: fs.sm * 1.5,
    marginBottom: sp.lg,
    paddingHorizontal: sp.xs,
  },

  // ── Selected Summary ────────────────────────────────────────────────────
  selectedSummary: {
    flexDirection: 'row',
    width: '100%',
    backgroundColor: '#F9FAFB',
    borderRadius: br.lg,
    paddingVertical: sp.md,
    paddingHorizontal: sp.md,
    marginBottom: sp.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  selectedSlot: {
    flex: 1,
    alignItems: 'center',
    gap: sp.px2,
  },
  selectedDot: {
    width: s(8),
    height: s(8),
    borderRadius: s(4),
    backgroundColor: C.stepInactive,
    marginBottom: sp.px2,
  },
  selectedDotFilled: {
    backgroundColor: C.green,
  },
  selectedSlotLabel: {
    fontSize: fs.xxs,
    fontWeight: '700',
    color: C.textGray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectedSlotName: {
    fontSize: fs.sm,
    fontWeight: '800',
    color: C.textDark,
    maxWidth: s(120),
  },
  selectedSlotDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
    marginHorizontal: sp.sm,
  },

  // ── Player Row ──────────────────────────────────────────────────────────
  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: sp.md,
    paddingHorizontal: sp.md,
    borderRadius: br.lg,
    marginBottom: sp.sm,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  playerRowSelected: {
    backgroundColor: C.selected,
    borderColor: C.selectedBorder,
  },
  playerAvatar: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: sp.md,
  },
  playerAvatarSelected: {
    backgroundColor: C.green,
  },
  playerAvatarText: {
    fontSize: fs.md,
    fontWeight: '800',
    color: C.white,
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: fs.md,
    fontWeight: '700',
    color: C.textDark,
  },
  playerNameSelected: {
    color: C.greenDark,
    fontWeight: '800',
  },
  playerRole: {
    fontSize: fs.xxs,
    fontWeight: '700',
    color: C.green,
    marginTop: 1,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  checkCircle: {
    width: s(28),
    height: s(28),
    borderRadius: s(14),
    borderWidth: 2,
    borderColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleSelected: {
    backgroundColor: C.green,
    borderColor: C.green,
  },

  // ── Bottom Action Bar ───────────────────────────────────────────────────
  bottomBar: {
    flexDirection: 'row',
    paddingHorizontal: sp.lg,
    paddingVertical: sp.md,
    gap: sp.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  bottomBackBtn: {
    flex: 1,
    height: s(48),
    borderRadius: br.full,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.btnGray,
    flexDirection: 'row',
    gap: sp.sm2,
  },
  bottomBackTxt: {
    fontSize: fs.sm,
    fontWeight: '700',
    color: '#4B5563',
  },
  bottomNextBtn: {
    flex: 2,
    height: s(48),
    borderRadius: br.full,
    backgroundColor: C.green,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  bottomNextBtnDisabled: {
    backgroundColor: 'rgba(89,199,73,0.18)',
    shadowColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  bottomNextTxt: {
    fontSize: fs.md,
    fontWeight: '800',
    color: C.white,
  },
  bottomNextTxtDisabled: {
    color: 'rgba(0,0,0,0.25)',
  },

  // ── Countdown Screen (old — replaced by cdStyles) ───────────────────────
  emptyPlayersWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: sp.xl,
    width: '100%',
  },
  emptyPlayersText: {
    fontSize: fs.md,
    fontWeight: '700',
    color: C.textDark,
    textAlign: 'center',
    marginBottom: sp.xs,
  },
  emptyPlayersSub: {
    fontSize: fs.xs,
    color: C.textGray,
    textAlign: 'center',
  },
});

// ─── Countdown-specific Styles ──────────────────────────────────────────────
const RING_SIZE = s(160);

const cdStyles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#060E08',
  },
  safe: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: sp.xl,
    paddingBottom: sp.lg,
  },

  // ── Top Section ──
  topSection: {
    alignItems: 'center',
    paddingTop: sp.md,
  },
  matchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(89,199,73,0.12)',
    borderRadius: br.full,
    paddingVertical: sp.sm2,
    paddingHorizontal: sp.lg,
    borderWidth: 1,
    borderColor: 'rgba(89,199,73,0.2)',
  },
  liveDot: {
    width: s(8),
    height: s(8),
    borderRadius: s(4),
    backgroundColor: '#59C749',
    marginRight: sp.sm,
  },
  matchPillText: {
    fontSize: fs.sm,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 0.5,
  },
  formatLabel: {
    fontSize: fs.xxs,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
    marginTop: sp.sm,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },

  // ── Center Section ──
  centerSection: {
    alignItems: 'center',
    justifyContent: 'center',
    height: s(320),
  },

  // Pulsing ring shared style
  pulseRing: {
    position: 'absolute',
  },
  pulseRingBase: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2,
    borderColor: 'rgba(89,199,73,0.5)',
  },

  // Glow burst behind the number
  glowBurst: {
    position: 'absolute',
    width: RING_SIZE * 1.4,
    height: RING_SIZE * 1.4,
    borderRadius: (RING_SIZE * 1.4) / 2,
    backgroundColor: 'rgba(89,199,73,0.15)',
  },

  // Static outer ring (always visible)
  staticRingOuter: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2.5,
    borderColor: 'rgba(89,199,73,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(89,199,73,0.04)',
  },
  staticRingInner: {
    width: RING_SIZE - s(20),
    height: RING_SIZE - s(20),
    borderRadius: (RING_SIZE - s(20)) / 2,
    borderWidth: 1.5,
    borderColor: 'rgba(89,199,73,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Number text
  numberText: {
    fontSize: ms(80),
    fontWeight: '900',
    color: '#59C749',
    textAlign: 'center',
    textShadowColor: 'rgba(89,199,73,0.4)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },

  // GO text
  goEmoji: {
    fontSize: ms(36),
    textAlign: 'center',
    marginBottom: sp.xs,
  },
  goText: {
    fontSize: ms(28),
    fontWeight: '900',
    color: '#59C749',
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: 'rgba(89,199,73,0.5)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 25,
  },

  // "Get Ready..." subtitle
  readyText: {
    fontSize: fs.sm,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    marginTop: sp.xl,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // ── Bottom Section ──
  bottomSection: {
    width: '100%',
    paddingHorizontal: sp.lg,
    gap: sp.sm,
  },
  playersRow: {
    flexDirection: 'row',
    gap: sp.sm,
  },
  playerCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: br.lg,
    paddingVertical: sp.md,
    paddingHorizontal: sp.md,
    borderWidth: 1,
    borderColor: 'rgba(89,199,73,0.12)',
    alignItems: 'center',
  },
  bowlerCard: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: br.lg,
    paddingVertical: sp.md,
    paddingHorizontal: sp.lg,
    borderWidth: 1,
    borderColor: 'rgba(89,199,73,0.12)',
    alignItems: 'center',
  },
  playerRoleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: sp.xs,
  },
  playerRoleIcon: {
    fontSize: fs.xxs,
    marginRight: sp.px2,
  },
  playerRoleText: {
    fontSize: fs.xxs,
    fontWeight: '700',
    color: 'rgba(89,199,73,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  playerNameText: {
    fontSize: fs.md,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
  },
});
