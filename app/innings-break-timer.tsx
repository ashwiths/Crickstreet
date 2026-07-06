import React, { useState, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, StatusBar, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Ionicons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { db } from '../src/services/firebase';
import InningsBreakOverAnimation from '../src/components/InningsBreakOverAnimation';
import { s, fs, sp, br } from '../src/theme/responsive';

export default function InningsBreakTimerScreen() {
  const router = useRouter();
  const { matchId, uid } = useLocalSearchParams<{ matchId: string; uid: string }>();

  const [loading, setLoading] = useState(true);
  const [matchData, setMatchData] = useState<any>(null);

  // Timer states
  const [timeLeft, setTimeLeft] = useState(120); // 120 seconds default (2 minutes)
  const [isActive, setIsActive] = useState(true);
  const [showAnimation, setShowAnimation] = useState(false);

  // Load Match Data from Firestore
  useEffect(() => {
    if (!uid || !matchId) {
      setLoading(false);
      return;
    }

    async function fetchMatch() {
      try {
        const matchSnap = await getDoc(doc(db, 'users', uid, 'matches', matchId));
        if (matchSnap.exists()) {
          setMatchData(matchSnap.data());
        }
      } catch (err) {
        console.error('Error loading match for break timer:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchMatch();
  }, [matchId, uid]);

  // Countdown timer effect
  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      setShowAnimation(true);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Adjust duration by custom value (in seconds)
  const adjustTime = (amount: number) => {
    setTimeLeft((prev) => Math.max(10, prev + amount));
  };

  // Set preset timer duration (in minutes)
  const setPreset = (mins: number) => {
    setTimeLeft(mins * 60);
    setIsActive(true);
  };

  // Complete break and route back to scorecard
  const handleTransitionToLive = async () => {
    if (!uid || !matchId) {
      // Safety fallback
      router.replace({
        pathname: '/scorecard',
        params: { matchId }
      });
      return;
    }

    try {
      // Set the database status to Live to activate scoring for the 2nd innings
      const matchRef = doc(db, 'users', uid, 'matches', matchId);
      await updateDoc(matchRef, {
        matchStatus: 'Live',
        status: 'live',
      });
    } catch (err) {
      console.error('Error starting second innings:', err);
    }

    // Go back to scorecard
    router.replace({
      pathname: '/scorecard',
      params: { matchId }
    });
  };

  // Target information display
  const targetInfo = useMemo(() => {
    if (!matchData) return { firstInningsScore: '0/0', targetText: 'Need 1 run off 0 balls', targetVal: 1 };
    
    const isMyBattingNext = matchData.battingTeam === 'my';
    const firstBattingScoreStr = isMyBattingNext ? matchData.oppScore : matchData.myScore;
    
    // Parse first innings runs
    const scoreVal = parseInt(firstBattingScoreStr?.split('/')[0] || '0', 10);
    const target = scoreVal + 1;
    const formatOvers = matchData.format || '20 overs';
    
    const nextBattingTeamName = isMyBattingNext ? (matchData.myTeamName || 'My Team') : (matchData.oppTeamName || 'Opp Team');

    return {
      firstInningsScore: firstBattingScoreStr || '0/0',
      targetText: `${nextBattingTeamName} needs ${target} runs off ${formatOvers} to win.`,
      targetVal: target,
    };
  }, [matchData]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#59C749" />
      </View>
    );
  }

  if (showAnimation) {
    return <InningsBreakOverAnimation onComplete={handleTransitionToLive} />;
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3F4F1" />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={['#E5F2D9', '#F9E5C8', '#F3F4F1']}
        locations={[0, 0.4, 0.8]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={styles.safeArea}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Innings Break</Text>
          <View style={styles.breakBadge}>
            <Text style={styles.breakBadgeTxt}>INTERVAL</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          
          {/* Match Score Card */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>1ST INNINGS SCORE</Text>
            <Text style={styles.summaryScore}>{targetInfo.firstInningsScore}</Text>
            <View style={styles.divider} />
            <Text style={styles.targetHeading}>TARGET</Text>
            <Text style={styles.targetRuns}>{targetInfo.targetVal} runs</Text>
            <Text style={styles.targetDesc}>{targetInfo.targetText}</Text>
          </View>

          {/* Stopwatch Ring Display */}
          <View style={styles.timerContainer}>
            <View style={[styles.timerRing, !isActive && styles.timerRingPaused]}>
              <Text style={styles.timeString}>{formatTime(timeLeft)}</Text>
              <Text style={styles.timerSub}>{isActive ? 'Counting Down' : 'Paused'}</Text>
            </View>
          </View>

          {/* Preset Buttons */}
          <View style={styles.presetsRow}>
            <TouchableOpacity activeOpacity={0.8} style={styles.presetBtn} onPress={() => setPreset(1)}>
              <Text style={styles.presetBtnTxt}>1 Min</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} style={styles.presetBtn} onPress={() => setPreset(2)}>
              <Text style={styles.presetBtnTxt}>2 Min</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} style={styles.presetBtn} onPress={() => setPreset(5)}>
              <Text style={styles.presetBtnTxt}>5 Min</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.8} style={styles.presetBtn} onPress={() => setPreset(10)}>
              <Text style={styles.presetBtnTxt}>10 Min</Text>
            </TouchableOpacity>
          </View>

          {/* Adjustment & Play Controls */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity activeOpacity={0.8} style={styles.adjBtn} onPress={() => adjustTime(-60)}>
              <Feather name="minus" size={20} color="#374151" />
              <Text style={styles.adjBtnTxt}>1m</Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.85}
              style={[styles.playBtn, isActive ? styles.playBtnActive : styles.playBtnPaused]}
              onPress={() => setIsActive(!isActive)}
            >
              <Ionicons name={isActive ? 'pause' : 'play'} size={28} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.8} style={styles.adjBtn} onPress={() => adjustTime(60)}>
              <Feather name="plus" size={20} color="#374151" />
              <Text style={styles.adjBtnTxt}>1m</Text>
            </TouchableOpacity>
          </View>

          {/* Skip Break Action */}
          <TouchableOpacity activeOpacity={0.8} style={styles.skipBtn} onPress={() => setShowAnimation(true)}>
            <Text style={styles.skipBtnTxt}>Skip Break &amp; Play</Text>
            <Feather name="arrow-right" size={16} color="#052E16" />
          </TouchableOpacity>

        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F1',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp.lg,
    paddingTop: sp.md,
    paddingBottom: sp.md,
  },
  headerTitle: {
    fontSize: fs.lg,
    fontWeight: '800',
    color: '#052E16',
  },
  breakBadge: {
    backgroundColor: 'rgba(5, 46, 22, 0.08)',
    borderRadius: br.sm,
    paddingHorizontal: sp.sm,
    paddingVertical: sp.xs - 2,
    borderWidth: 0.5,
    borderColor: '#052E16',
  },
  breakBadgeTxt: {
    fontSize: fs.xxs,
    fontWeight: '800',
    color: '#052E16',
    letterSpacing: 0.5,
  },
  scroll: {
    paddingHorizontal: sp.lg,
    paddingBottom: sp.xl,
    alignItems: 'center',
  },
  summaryCard: {
    backgroundColor: '#1E3F14',
    borderRadius: br.xxl,
    padding: sp.lg,
    width: '100%',
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: sp.lg,
  },
  summaryLabel: {
    fontSize: fs.xxs,
    fontWeight: '800',
    color: '#A8CD55',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  summaryScore: {
    fontSize: fs.xxl,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: sp.sm,
  },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    width: '90%',
    marginBottom: sp.sm,
  },
  targetHeading: {
    fontSize: fs.xxs,
    fontWeight: '800',
    color: '#A8CD55',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  targetRuns: {
    fontSize: fs.lg,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  targetDesc: {
    fontSize: fs.xs,
    fontWeight: '600',
    color: '#D1E7CD',
    textAlign: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: sp.lg,
  },
  timerRing: {
    width: s(220),
    height: s(220),
    borderRadius: s(110),
    borderWidth: 6,
    borderColor: '#59C749',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(89, 199, 73, 0.12)',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 4,
  },
  timerRingPaused: {
    borderColor: '#9CA3AF',
    shadowColor: 'rgba(0,0,0,0.05)',
  },
  timeString: {
    fontSize: fs.hero,
    fontWeight: '900',
    color: '#1F2937',
  },
  timerSub: {
    fontSize: fs.xxs,
    fontWeight: '700',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 1.0,
    marginTop: 2,
  },
  presetsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: sp.lg,
    gap: sp.sm,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderColor: 'rgba(0,0,0,0.06)',
    borderWidth: 1,
    borderRadius: br.md,
    paddingVertical: sp.sm,
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  presetBtnTxt: {
    fontSize: fs.xs,
    fontWeight: '700',
    color: '#374151',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 32,
    marginBottom: sp.xl,
  },
  adjBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    borderRadius: br.lg,
    paddingVertical: sp.sm,
    paddingHorizontal: sp.md,
    gap: 2,
    shadowColor: 'rgba(0,0,0,0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  adjBtnTxt: {
    fontSize: fs.sm,
    fontWeight: '700',
    color: '#374151',
  },
  playBtn: {
    width: s(64),
    height: s(64),
    borderRadius: s(32),
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 4,
  },
  playBtnActive: {
    backgroundColor: '#59C749',
    shadowColor: '#59C749',
  },
  playBtnPaused: {
    backgroundColor: '#9CA3AF',
    shadowColor: '#9CA3AF',
  },
  skipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E5F2D9',
    borderColor: '#A8CD55',
    borderWidth: 1,
    borderRadius: br.xl,
    paddingVertical: sp.md,
    width: '100%',
    gap: sp.xs,
  },
  skipBtnTxt: {
    fontSize: fs.sm,
    fontWeight: '800',
    color: '#052E16',
  },
});
