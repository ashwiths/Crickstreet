/**
 * SimpleHomeScreen.tsx — Crickstreet Simplified Home
 * Clean greeting + single active-match card + bottom nav.
 * Does NOT replace or modify the original HomeScreen.
 */

import { Feather } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState, useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import FloatingBottomNav from '@/src/components/FloatingBottomNav';
import ProfileScreen from '@/app/(tabs)/profile';
import TournamentScreen from './Tournament/TournamentScreen';
import { s, fs, sp, br } from '../theme/responsive';

// ─── Design Tokens (matched to HomeScreen) ────────────────────────────────────
const C = {
  green:   '#59C749',
  bg:      '#F3F4F1',
  white:   '#FFFFFF',
  black:   '#0A0A0A',
  gray:    '#8A8A8A',
  dark:    '#1A1A1A',
  border:  '#E5E7EB',
  cardBg:  '#FFFFFF',
  liveRed: '#FF4D4D',
  liveBg:  '#FFF0F0',
  accent:  '#2D5016',
  lime:    '#A8CD55',
  softGreen: '#F0F4EC',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

function formatLastUpdated(timestamp: any): string {
  if (!timestamp) return 'Just now';
  const date = timestamp.seconds
    ? new Date(timestamp.seconds * 1000)
    : new Date(timestamp);
  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SimpleHomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{ tab?: string }>();

  // Tab state — mirrors HomeScreen so nav works identically
  const [activeTab, setActiveTab] = useState<
    'home' | 'matches' | 'tournament' | 'profile'
  >('home');

  useEffect(() => {
    if (params.tab === 'matches') setActiveTab('matches');
    else if (params.tab === 'tournament') setActiveTab('tournament');
    else if (params.tab === 'profile') setActiveTab('profile');
    else if (params.tab === 'home') setActiveTab('home');
  }, [params.tab]);

  // ── Firestore matches listener ──────────────────────────────────────────────
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMatches([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const mQuery = query(
      collection(db, 'users', user.uid, 'matches'),
      orderBy('createdAt', 'desc'),
    );
    const unsub = onSnapshot(
      mQuery,
      (snap) => {
        const list: any[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setMatches(list);
        setLoading(false);
      },
      () => setLoading(false),
    );
    return unsub;
  }, [user]);

  const liveMatch = useMemo(
    () => matches.find((m) => m.status === 'live') ?? null,
    [matches],
  );

  // Has the match actually been scored (i.e. scores beyond initial 0/0)?
  const hasStartedScoring = useMemo(() => {
    if (!liveMatch) return false;
    const my = liveMatch.myScore || '0/0';
    const opp = liveMatch.oppScore || '0/0';
    return my !== '0/0' || opp !== '0/0';
  }, [liveMatch]);

  // ── Float animation for empty-state emoji ───────────────────────────────────
  const floatAnim = useSharedValue(0);
  useEffect(() => {
    floatAnim.value = withRepeat(
      withSequence(
        withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, []);
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatAnim.value }],
  }));

  // ── Non-home tabs render using existing screens ─────────────────────────────
  if (activeTab === 'matches') {
    // Re-use the matches tab from the original HomeScreen by routing there
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="#F3F4F1" />
        {/* Import existing renderMatchesTab not possible without coupling,
            so we redirect to the original screen with ?tab=matches */}
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={C.green} />
        </View>
        <FloatingBottomNav activeTab={activeTab} onTabPress={setActiveTab} />
      </View>
    );
  }

  if (activeTab === 'tournament') {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0D0A" />
        <TournamentScreen
          onBack={() => setActiveTab('home')}
          matches={matches}
          userStats={null}
        />
        <FloatingBottomNav activeTab={activeTab} onTabPress={setActiveTab} />
      </View>
    );
  }

  if (activeTab === 'profile') {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" />
        <ProfileScreen onBack={() => setActiveTab('home')} />
        <FloatingBottomNav activeTab={activeTab} onTabPress={setActiveTab} />
      </View>
    );
  }

  // ── HOME TAB ────────────────────────────────────────────────────────────────

  const displayName = user?.displayName || 'A. Infant Ashil';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Subtle gradient backdrop (same as original) */}
      <LinearGradient
        colors={['#E5F2D9', '#F9E5C8', '#F3F4F1']}
        locations={[0, 0.4, 0.8]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.bgGradient, { height: Math.max(260, 260 + insets.top) }]}
      />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.green} />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces
        >
          {/* ── Header ─────────────────────────────────────────────────── */}
          <View
            style={[
              styles.headerContainer,
              { paddingTop: insets.top > 0 ? insets.top + s(16) : s(28) },
            ]}
          >
            <Text style={styles.greetingLabel}>{getGreeting()},</Text>
            <Text style={styles.nameText} numberOfLines={1}>
              {displayName}
            </Text>
          </View>

          {/* ── Active Match Section ───────────────────────────────────── */}
          <View style={styles.sectionContainer}>
            {liveMatch ? (
              <Animated.View
                entering={FadeInDown.duration(500).springify().damping(18)}
                style={styles.matchCard}
              >
                {/* Card Header: LIVE badge + Last updated */}
                <View style={styles.matchCardHeader}>
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                  <Text style={styles.lastUpdated}>
                    {formatLastUpdated(
                      liveMatch.updatedAt || liveMatch.createdAt,
                    )}
                  </Text>
                </View>

                {/* Teams & Scores */}
                <View style={styles.teamsRow}>
                  <View style={styles.teamCol}>
                    <View style={[styles.teamLogoBg, { backgroundColor: C.softGreen }]}>
                      <Text style={styles.teamLogoText}>
                        {(liveMatch.myTeamName || 'MY')
                          .slice(0, 2)
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.teamInfo}>
                      <Text style={styles.teamName} numberOfLines={1}>
                        {liveMatch.myTeamName || 'My Team'}
                      </Text>
                      <Text style={styles.teamScore}>
                        {liveMatch.myScore || '0/0'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.vsContainer}>
                    <Text style={styles.vsText}>vs</Text>
                  </View>

                  <View style={styles.teamCol}>
                    <View style={[styles.teamLogoBg, { backgroundColor: C.liveBg }]}>
                      <Text style={[styles.teamLogoText, { color: C.liveRed }]}>
                        {(liveMatch.oppTeamName || 'OP')
                          .slice(0, 2)
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.teamInfo}>
                      <Text style={styles.teamName} numberOfLines={1}>
                        {liveMatch.oppTeamName || 'Opponent'}
                      </Text>
                      <Text style={styles.teamScore}>
                        {liveMatch.oppScore || '0/0'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Format + Status row */}
                <View style={styles.metaRow}>
                  <Text style={styles.formatLabel}>
                    🏏 Format: {liveMatch.format || 'Overs'}
                  </Text>
                  <Text style={styles.statusText}>
                    {liveMatch.statusText || 'Scoring in progress'}
                  </Text>
                </View>

                {/* Action Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.actionButton}
                  onPress={() =>
                    router.push({
                      pathname: '/scorecard',
                      params: {
                        myTeamName: liveMatch.myTeamName,
                        oppTeamName: liveMatch.oppTeamName,
                        myPlayers: JSON.stringify(liveMatch.myPlayers || []),
                        oppPlayers: JSON.stringify(liveMatch.oppPlayers || []),
                        matchId: liveMatch.id,
                      },
                    })
                  }
                >
                  <Feather
                    name={hasStartedScoring ? 'play-circle' : 'plus-circle'}
                    size={18}
                    color={C.white}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.actionButtonText}>
                    {hasStartedScoring ? 'Resume Match' : 'Start Match'}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              /* ── Empty State ─────────────────────────────────────────── */
              <Animated.View
                entering={FadeInDown.duration(500).springify().damping(18)}
                style={styles.emptyCard}
              >
                <Animated.Text style={[styles.emptyEmoji, floatStyle]}>
                  🏏
                </Animated.Text>
                <Text style={styles.emptyTitle}>No Active Match</Text>
                <Text style={styles.emptyDesc}>
                  Create a street cricket match to begin scoring.
                </Text>

                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.actionButton}
                  onPress={() => router.push('/create-matches')}
                >
                  <Feather
                    name="plus-circle"
                    size={18}
                    color={C.white}
                    style={{ marginRight: 8 }}
                  />
                  <Text style={styles.actionButtonText}>Create Match</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          </View>
        </ScrollView>
      )}

      {/* ── Bottom Navigation (untouched) ──────────────────────────────── */}
      <FloatingBottomNav activeTab={activeTab} onTabPress={setActiveTab} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  bgGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  headerContainer: {
    paddingHorizontal: sp.lg,
    paddingBottom: sp.xl,
  },
  greetingLabel: {
    fontSize: fs.sm,
    fontWeight: '600',
    color: C.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: sp.px2,
  },
  nameText: {
    fontSize: fs.h2,
    fontWeight: '800',
    color: C.dark,
    letterSpacing: -0.3,
  },

  // ── Section ─────────────────────────────────────────────────────────────────
  sectionContainer: {
    paddingHorizontal: sp.lg,
  },

  // ── Match Card ──────────────────────────────────────────────────────────────
  matchCard: {
    backgroundColor: C.cardBg,
    borderRadius: br.xxl,
    padding: sp.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  matchCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.md,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.liveBg,
    paddingHorizontal: s(10),
    paddingVertical: s(4),
    borderRadius: br.sm,
    borderWidth: 0.5,
    borderColor: '#FFC1C1',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.liveRed,
    marginRight: 6,
  },
  liveText: {
    fontSize: fs.xxs,
    fontWeight: '800',
    color: C.liveRed,
    letterSpacing: 0.4,
  },
  lastUpdated: {
    fontSize: fs.sm2,
    fontWeight: '600',
    color: C.gray,
  },

  // ── Teams ───────────────────────────────────────────────────────────────────
  teamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: sp.md,
  },
  teamCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: s(10),
  },
  teamLogoBg: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLogoText: {
    fontSize: fs.md,
    fontWeight: '800',
    color: C.accent,
  },
  teamInfo: {
    flex: 1,
  },
  teamName: {
    fontSize: fs.md2,
    fontWeight: '700',
    color: C.dark,
    marginBottom: 2,
  },
  teamScore: {
    fontSize: fs.md,
    fontWeight: '700',
    color: C.accent,
  },
  vsContainer: {
    paddingHorizontal: s(8),
    alignItems: 'center',
  },
  vsText: {
    fontSize: fs.sm,
    fontWeight: '800',
    color: C.lime,
  },

  // ── Divider ─────────────────────────────────────────────────────────────────
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginBottom: sp.md,
  },

  // ── Meta ─────────────────────────────────────────────────────────────────────
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.lg,
  },
  formatLabel: {
    fontSize: fs.sm,
    fontWeight: '700',
    color: C.gray,
  },
  statusText: {
    fontSize: fs.sm,
    fontWeight: '600',
    color: C.accent,
    flexShrink: 1,
    textAlign: 'right',
  },

  // ── Action Button ───────────────────────────────────────────────────────────
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.green,
    paddingVertical: sp.md3,
    borderRadius: br.md,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  actionButtonText: {
    fontSize: fs.md2,
    fontWeight: '800',
    color: C.white,
    letterSpacing: 0.2,
  },

  // ── Empty State ─────────────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: C.cardBg,
    borderRadius: br.xxl,
    paddingVertical: s(48),
    paddingHorizontal: sp.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  emptyEmoji: {
    fontSize: s(52),
    marginBottom: sp.lg,
  },
  emptyTitle: {
    fontSize: fs.xl,
    fontWeight: '800',
    color: C.dark,
    marginBottom: sp.sm,
  },
  emptyDesc: {
    fontSize: fs.md,
    fontWeight: '500',
    color: C.gray,
    textAlign: 'center',
    lineHeight: fs.md * 1.5,
    marginBottom: sp.xxl,
    paddingHorizontal: sp.md,
  },
});
