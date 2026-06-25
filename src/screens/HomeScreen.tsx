/**
 * HomeScreen.tsx — Crickstreet v3
 * Compact hero + visible content cards, matching fintech reference layout
 */

import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert } from 'react-native';
import ProfileScreen from '@/app/(tabs)/profile';
import { useTour, TourHighlight } from '../hooks/useTour';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  hero:    '#1B3F14',
  green:   '#59C749',
  greenDim:'rgba(89,199,73,0.15)',
  milky:   '#FFFDF1',
  navBg:   '#111510',
  white:   '#FFFFFF',
  black:   '#0A0A0A',
  gray1:   '#F5F3E8',
  gray2:   '#E8E4D4',
  gray3:   '#9CA3AF',
  gray4:   '#6B7280',
  heroText:'rgba(255,255,255,0.65)',
  shadowG: 'rgba(89,199,73,0.35)',
  shadowC: 'rgba(0,0,0,0.06)',
} as const;

const { width: W } = Dimensions.get('window');

// ─── Quick Action ─────────────────────────────────────────────────────────────
function QuickAction({
  icon, label, bg, delay = 0,
}: { icon: React.ReactNode; label: string; bg: string; delay?: number }) {
  const s = useSharedValue(0.7);
  const o = useSharedValue(0);
  useEffect(() => {
    s.value = withDelay(delay, withSpring(1, { damping: 14, stiffness: 140 }));
    o.value = withDelay(delay, withTiming(1, { duration: 350 }));
  }, [delay, s, o]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: o.value }));

  return (
    <Animated.View style={[styles.qaWrap, anim]}>
      <Pressable style={[styles.qaBtn, { backgroundColor: bg }]}>
        {icon}
      </Pressable>
      <Text style={styles.qaLabel}>{label}</Text>
    </Animated.View>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, note, delay = 0,
}: { icon: React.ReactNode; label: string; value: string; note: string; delay?: number }) {
  const y = useSharedValue(10);
  const o = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withSpring(0, { damping: 16, stiffness: 140 }));
    o.value = withDelay(delay, withTiming(1, { duration: 400 }));
  }, [delay, y, o]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }], opacity: o.value }));

  return (
    <Animated.View style={[styles.statCard, anim]}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statNote}>{note}</Text>
    </Animated.View>
  );
}

// ─── Activity Row ─────────────────────────────────────────────────────────────
function ActivityRow({
  emoji, title, desc, badge, time, badgeGreen = false, delay = 0,
}: {
  emoji: string; title: string; desc: string;
  badge: string; time: string; badgeGreen?: boolean; delay?: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400).springify().damping(18)}
      style={styles.actRow}
    >
      <View style={styles.actEmoji}>
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
      </View>
      <View style={styles.actBody}>
        <Text style={styles.actTitle}>{title}</Text>
        <Text style={styles.actDesc} numberOfLines={1}>{desc}</Text>
      </View>
      <View style={styles.actRight}>
        <View style={[styles.actBadge, badgeGreen && styles.actBadgeGreen]}>
          <Text style={[styles.actBadgeText, badgeGreen && styles.actBadgeTextGreen]}>
            {badge}
          </Text>
        </View>
        <Text style={styles.actTime}>{time}</Text>
      </View>
    </Animated.View>
  );
}



export default function HomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<'home' | 'matches' | 'tournament' | 'profile'>('home');
  const [matchFilter, setMatchFilter] = useState<'live' | 'history'>('live');

  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [loadingDb, setLoadingDb] = useState(true);

  // Floating Help bubble popup
  const handleShowHelp = () => {
    Alert.alert(
      'Welcome to Crickstreet! 🏏',
      'Learn how Crickstreet works:\n\n1. 👥 Create your playing XI under "Create Team".\n2. 📍 Register your local pitch details in "Add Ground".\n3. 🏏 Press "Start New Match" to launch scoring!\n4. 📊 View automatic player stats and charts inside profiles.'
    );
  };

  useEffect(() => {
    if (!user) {
      setMatches([]);
      setUserStats(null);
      setLoadingDb(false);
      return;
    }

    setLoadingDb(true);

    // 1. Listen to matches subcollection
    const mQuery = query(
      collection(db, 'users', user.uid, 'matches'),
      orderBy('createdAt', 'desc')
    );

    const unsubMatches = onSnapshot(mQuery, (snapshot) => {
      const fetchedMatches: any[] = [];
      snapshot.forEach((docSnap) => {
        fetchedMatches.push({ id: docSnap.id, ...docSnap.data() });
      });
      setMatches(fetchedMatches);
      setLoadingDb(false);
    }, (err) => {
      console.error('Error loading matches:', err);
      setLoadingDb(false);
    });

    // 2. Listen to user profile document stats
    const userDocRef = doc(db, 'users', user.uid);
    const unsubStats = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserStats(data.stats || null);
      }
    });

    return () => {
      unsubMatches();
      unsubStats();
    };
  }, [user]);

  const liveMatches = useMemo(() => matches.filter((m: any) => m.status === 'live'), [matches]);
  const historyMatches = useMemo(() => matches.filter((m: any) => m.status === 'completed'), [matches]);

  // Floating animations for Empty State
  const floatAnim = useSharedValue(0);
  useEffect(() => {
    floatAnim.value = withRepeat(
      withSequence(
        withTiming(-12, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatAnim.value }],
  }));

  const pulseAnim = useSharedValue(1);
  useEffect(() => {
    pulseAnim.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withDelay(3000, withTiming(1, { duration: 0 }))
      ),
      -1,
      false
    );
  }, []);
  const buttonPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const previewFeatures = [
    { title: '🏆 Rankings', desc: 'Global player leaderboard' },
    { title: '📈 Statistics', desc: 'In-depth performance analytics' },
    { title: '🔥 Recent Form', desc: 'L5 match trend graphs' },
    { title: '⭐ Man of the Match', desc: 'MVP award counts' },
  ];

  // Handle active tab updates via router params
  useEffect(() => {
    if (params.tab === 'matches') {
      setActiveTab('matches');
      setMatchFilter('live');
    } else if (params.tab === 'tournament') {
      setActiveTab('tournament');
    } else if (params.tab === 'profile') {
      setActiveTab('profile');
    } else if (params.tab === 'home') {
      setActiveTab('home');
    }
  }, [params.tab]);

  // Notification dot pulse
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 800, easing: Easing.inOut(Easing.sin) }),
        withTiming(1,   { duration: 800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, false,
    );
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const renderMatchesTab = () => {
    return (
      <View style={styles.tabContent}>
        {/* Header */}
        <View style={styles.tabHeader}>
          <Text style={styles.tabHeaderTitle}>Matches</Text>
          <Text style={styles.tabHeaderSub}>Track scores & results</Text>
        </View>

        {/* Filters */}
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterBtn, matchFilter === 'live' && styles.filterBtnActive]}
            onPress={() => setMatchFilter('live')}
          >
            <Text style={[styles.filterBtnTxt, matchFilter === 'live' && styles.filterBtnTxtActive]}>Ongoing</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterBtn, matchFilter === 'history' && styles.filterBtnActive]}
            onPress={() => setMatchFilter('history')}
          >
            <Text style={[styles.filterBtnTxt, matchFilter === 'history' && styles.filterBtnTxtActive]}>Match History</Text>
          </TouchableOpacity>
        </View>

        {/* Match cards list */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {matchFilter === 'live' ? (
            liveMatches.length > 0 ? (
              liveMatches.map((m: any) => (
                <View key={m.id} style={styles.matchCard}>
                  <View style={styles.matchCardHeader}>
                    <View style={styles.liveBadge}>
                      <View style={styles.livePulseDot} />
                      <Text style={styles.liveBadgeTxt}>LIVE</Text>
                    </View>
                    <Text style={styles.matchTypeLabel}>{m.format || 'T20'} • {m.venueName || 'Local Ground'}</Text>
                  </View>

                  <View style={styles.matchTeamsRow}>
                    <View style={styles.teamRow}>
                      <View style={[styles.teamLogoContainer, { backgroundColor: '#3B82F6' }]}>
                        <Text style={styles.teamLogoText}>{m.myTeamName ? m.myTeamName.slice(0, 2).toUpperCase() : 'MY'}</Text>
                      </View>
                      <Text style={styles.teamNameText}>{m.myTeamName}</Text>
                      <Text style={styles.teamScoreText}>{m.myScore || '0/0'}</Text>
                    </View>

                    <View style={styles.teamRow}>
                      <View style={[styles.teamLogoContainer, { backgroundColor: '#EF4444' }]}>
                        <Text style={styles.teamLogoText}>{m.oppTeamName ? m.oppTeamName.slice(0, 2).toUpperCase() : 'OP'}</Text>
                      </View>
                      <Text style={styles.teamNameText}>{m.oppTeamName}</Text>
                      <Text style={styles.teamScoreText}>{m.oppScore || '0/0'}</Text>
                    </View>
                  </View>

                  <View style={styles.matchCardDivider} />
                  <Text style={styles.matchStatusText}>{m.statusText || 'Scoring in progress'}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyFeedCard}>
                <Feather name="activity" size={32} color="rgba(255,255,255,0.2)" style={{ marginBottom: 8 }} />
                <Text style={styles.emptyFeedText}>No active live matches right now.</Text>
                <TouchableOpacity style={styles.createMatchMiniBtn} onPress={() => router.push('/create-matches')}>
                  <Text style={styles.createMatchMiniBtnText}>Start Match</Text>
                </TouchableOpacity>
              </View>
            )
          ) : (
            historyMatches.length > 0 ? (
              historyMatches.map((m: any) => (
                <View key={m.id} style={styles.matchCard}>
                  <View style={styles.matchCardHeader}>
                    <Text style={styles.finishedLabel}>FINISHED</Text>
                    <Text style={styles.matchTypeLabel}>{m.format || 'T20'} • {m.venueName || 'Local Ground'}</Text>
                  </View>

                  <View style={styles.matchTeamsRow}>
                    <View style={styles.teamRow}>
                      <View style={[styles.teamLogoContainer, { backgroundColor: '#8B5CF6' }]}>
                        <Text style={styles.teamLogoText}>{m.myTeamName ? m.myTeamName.slice(0, 2).toUpperCase() : 'MY'}</Text>
                      </View>
                      <Text style={styles.teamNameText}>{m.myTeamName}</Text>
                      <Text style={styles.teamScoreText}>{m.myScore || '0/0'}</Text>
                    </View>

                    <View style={styles.teamRow}>
                      <View style={[styles.teamLogoContainer, { backgroundColor: '#F59E0B' }]}>
                        <Text style={styles.teamLogoText}>{m.oppTeamName ? m.oppTeamName.slice(0, 2).toUpperCase() : 'OP'}</Text>
                      </View>
                      <Text style={styles.teamNameText}>{m.oppTeamName}</Text>
                      <Text style={styles.teamScoreText}>{m.oppScore || '0/0'}</Text>
                    </View>
                  </View>

                  <View style={styles.matchCardDivider} />
                  <Text style={styles.matchStatusFinishedText}>{m.statusText || 'Match completed'}</Text>
                </View>
              ))
            ) : (
              <View style={styles.emptyFeedCard}>
                <Feather name="archive" size={32} color="rgba(255,255,255,0.2)" style={{ marginBottom: 8 }} />
                <Text style={styles.emptyFeedText}>No match history records found.</Text>
              </View>
            )
          )}
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  };

  const renderTournamentTab = () => {
    const standings = [
      { rank: 1, name: 'Crickstreet CC', p: 6, w: 5, l: 1, nrr: '+1.842', pts: 10 },
      { rank: 2, name: 'Dubai Gladiators', p: 6, w: 4, l: 2, nrr: '+0.912', pts: 8 },
      { rank: 3, name: 'Sharjah Kings', p: 6, w: 3, l: 3, nrr: '-0.124', pts: 6 },
      { rank: 4, name: 'Abu Dhabi Falcons', p: 6, w: 2, l: 4, nrr: '-0.854', pts: 4 },
      { rank: 5, name: 'Royal Strikers', p: 6, w: 1, l: 5, nrr: '-1.450', pts: 2 },
    ];

    return (
      <View style={styles.tabContent}>
        {/* Header */}
        <View style={styles.tabHeader}>
          <Text style={styles.tabHeaderTitle}>Tournaments</Text>
          <Text style={styles.tabHeaderSub}>Leagues, standings & stats</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.tabScroll}>
          {/* Active Tournament Card */}
          <View style={styles.leagueFeaturedCard}>
            <Text style={styles.leagueTag}>ONGOING LEAGUE</Text>
            <Text style={styles.leagueTitle}>Crickstreet Premier League 2026</Text>
            <Text style={styles.leagueDetails}>Dubai • 8 Teams • Season 3</Text>
          </View>

          {/* Standings Table Card */}
          <View style={styles.tableCard}>
            <Text style={styles.tableCardTitle}>Team Standings</Text>
            
            {/* Table Header */}
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.thText, { width: 30 }]}>Pos</Text>
              <Text style={[styles.thText, { flex: 1 }]}>Team</Text>
              <Text style={[styles.thText, { width: 30, textAlign: 'center' }]}>P</Text>
              <Text style={[styles.thText, { width: 30, textAlign: 'center' }]}>W</Text>
              <Text style={[styles.thText, { width: 50, textAlign: 'center' }]}>NRR</Text>
              <Text style={[styles.thText, { width: 40, textAlign: 'right' }]}>Pts</Text>
            </View>

            {/* Table Rows */}
            {standings.map((team, idx) => (
              <View key={team.name} style={[styles.tableRow, idx === standings.length - 1 && { borderBottomWidth: 0 }]}>
                <Text style={[styles.tdRankText, { width: 30 }]}>{team.rank}</Text>
                <Text style={[styles.tdNameText, { flex: 1 }]} numberOfLines={1}>{team.name}</Text>
                <Text style={[styles.tdText, { width: 30, textAlign: 'center' }]}>{team.p}</Text>
                <Text style={[styles.tdText, { width: 30, textAlign: 'center' }]}>{team.w}</Text>
                <Text style={[styles.tdText, { width: 50, textAlign: 'center', color: team.nrr.startsWith('+') ? '#10B981' : '#EF4444' }]}>
                  {team.nrr}
                </Text>
                <Text style={[styles.tdPtsText, { width: 40, textAlign: 'right' }]}>{team.pts}</Text>
              </View>
            ))}
          </View>

          {/* Individual leaders stats */}
          <View style={styles.leadersRow}>
            {/* Orange Cap */}
            <View style={styles.leaderCard}>
              <View style={[styles.capIconBg, { backgroundColor: '#F59E0B' }]}>
                <MaterialCommunityIcons name="cricket" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.leaderLabel}>ORANGE CAP (RUNS)</Text>
              <Text style={styles.leaderName}>Virat Kohli</Text>
              <Text style={styles.leaderStats}>482 Runs • avg 68.8</Text>
            </View>

            {/* Purple Cap */}
            <View style={styles.leaderCard}>
              <View style={[styles.capIconBg, { backgroundColor: '#8B5CF6' }]}>
                <MaterialCommunityIcons name="bowling" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.leaderLabel}>PURPLE CAP (WKTS)</Text>
              <Text style={styles.leaderName}>Jasprit Bumrah</Text>
              <Text style={styles.leaderStats}>16 Wickets • econ 5.4</Text>
            </View>
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      </View>
    );
  };

  const renderProfileTab = () => {
    return <ProfileScreen onBack={() => setActiveTab('home')} />;
  };

  const settingRowStyle = (title: string) => {
    return styles.settingLeft;
  };

  const renderEmptyState = () => {
    return (
      <View style={styles.emptyRoot}>
        <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.emptyBody}
          showsVerticalScrollIndicator={false}
        >
          {/* Welcome Header */}
          <Animated.View entering={FadeInDown.duration(500)} style={styles.emptyHeaderRow}>
            <View style={styles.headerLeft}>
              <View style={[styles.avatar, { backgroundColor: '#111827' }]}>
                <Text style={styles.avatarTxt}>{user?.displayName ? user.displayName.slice(0, 1).toUpperCase() : 'P'}</Text>
                <View style={styles.emptyOnlineDot} />
              </View>
              <View>
                <Text style={styles.emptyHelloTxt}>Welcome back to</Text>
                <Text style={styles.emptyNameTxt}>{user?.displayName || 'Player'} 👋</Text>
              </View>
            </View>
            <Pressable style={styles.emptyBellBtn}>
              <Feather name="bell" size={18} color="#111827" />
              <Animated.View style={[styles.emptyBellDot, pulseStyle]} />
            </Pressable>
          </Animated.View>

          {/* Hero Section */}
          <Animated.View entering={FadeInDown.delay(100).duration(600)} style={styles.emptyHeroSection}>
            <Animated.View style={[styles.emptyBallContainer, floatStyle]}>
              <Text style={styles.emptyBatEmoji}>🏏</Text>
            </Animated.View>
            <Text style={styles.emptyTitleText}>No Matches Yet</Text>
            <Text style={styles.emptyDescText}>
              Start your first cricket match and begin tracking scores, player statistics, rankings, and achievements.
            </Text>
          </Animated.View>

          {/* Primary CTA Button */}
          <Animated.View entering={FadeInDown.delay(200).duration(600)} style={styles.emptyCtaWrapper}>
            <Animated.View style={buttonPulseStyle}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => router.push('/create-matches')}
                style={styles.floatingGradientBtn}
              >
                <LinearGradient
                  colors={[C.green, '#43A047']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.floatingGradientBtnGradient}
                >
                  <View style={styles.ctaIconBg}>
                    <Text style={styles.ctaIconEmoji}>➕</Text>
                  </View>
                  <Text style={styles.ctaButtonText}>Start New Match</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>

          {/* Secondary Actions: 3 stacked cards */}
          <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.emptySecondaryContainer}>
            <Text style={styles.emptySectionHeader}>Quick Start Setup</Text>
            
            {/* Action 1: Create Team */}
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => router.push('/my-teams')}
              style={styles.secondaryCard}
            >
              <View style={[styles.secondaryIconContainer, { backgroundColor: 'rgba(108, 99, 255, 0.08)' }]}>
                <Text style={styles.secondaryIconText}>👥</Text>
              </View>
              <View style={styles.secondaryCardText}>
                <Text style={styles.secondaryCardTitle}>Create Team</Text>
                <Text style={styles.secondaryCardDesc}>Create your playing XI, manage profiles, and track statistics.</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Action 2: Add Ground */}
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => router.push('/my-grounds')}
              style={[styles.secondaryCard, { marginTop: 12 }]}
            >
              <View style={[styles.secondaryIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.08)' }]}>
                <Text style={styles.secondaryIconText}>📍</Text>
              </View>
              <View style={styles.secondaryCardText}>
                <Text style={styles.secondaryCardTitle}>Add Ground</Text>
                <Text style={styles.secondaryCardDesc}>Register local grounds, coordinate maps, and manage bookings.</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Action 3: Scan Player QR */}
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => router.push('/qr-scanner')}
              style={[styles.secondaryCard, { marginTop: 12 }]}
            >
              <View style={[styles.secondaryIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.08)' }]}>
                <Text style={styles.secondaryIconText}>🔍</Text>
              </View>
              <View style={styles.secondaryCardText}>
                <Text style={styles.secondaryCardTitle}>Scan Player QR</Text>
                <Text style={styles.secondaryCardDesc}>Instantly add new players to your team roster via camera scan.</Text>
              </View>
              <Feather name="chevron-right" size={16} color="#9CA3AF" />
            </TouchableOpacity>
          </Animated.View>

          {/* Spacer for bottom navigation */}
          <View style={{ height: 120 }} />
        </ScrollView>
      </View>
    );
  };

  const renderHomeTab = () => {
    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* ═══════════════════════════════════════════
            HERO  (dark green)
        ═══════════════════════════════════════════ */}
        <View style={styles.hero}>
          {/* Deco circles */}
          <View style={styles.deco1} />
          <View style={styles.deco2} />

          {/* Safe-area top */}
          <View style={{ height: Platform.OS === 'ios' ? 48 : 28 }} />

          {/* ── Row 1: Header ── */}
          <Animated.View
            entering={FadeInDown.delay(60).duration(500).springify()}
            style={styles.headerRow}
          >
            {/* Avatar + Greeting */}
            <View style={styles.headerLeft}>
              <View style={styles.avatar}>
                <Text style={styles.avatarTxt}>{user?.displayName ? user.displayName.slice(0, 1).toUpperCase() : 'P'}</Text>
                <View style={styles.onlineDot} />
              </View>
              <View>
                <Text style={styles.helloTxt}>Hello,</Text>
                <Text style={styles.nameTxt}>{user?.displayName || 'Player'} 👋</Text>
              </View>
            </View>

            {/* Bell */}
            <Pressable style={styles.bellBtn}>
              <Feather name="bell" size={18} color={C.white} />
              <Animated.View style={[styles.bellDot, pulseStyle]} />
            </Pressable>
          </Animated.View>

          {/* ── Row 2: Balance-style hero block ── */}
          <Animated.View
            entering={FadeIn.delay(180).duration(550)}
            style={styles.heroCenter}
          >
            <Text style={styles.heroSub}>Welcome back to</Text>
            <Text style={styles.heroTitle}>Crickstreet</Text>

            {/* CTA Buttons */}
            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.btnSolid} onPress={() => setActiveTab('matches')}>
                <Text style={styles.btnSolidTxt}>Explore</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnGhost} onPress={() => router.push('/create-matches')}>
                <Text style={styles.btnGhostTxt}>Go Live</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── Row 3: Sport filter pills ── */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(400)}
            style={styles.pillsSection}
          >
            <Text style={styles.pillsLabel}>YOUR FEED</Text>
            <View style={styles.pillsRow}>
              {['Cricket', 'Football', 'Tennis', '+ Add'].map((p, i) => (
                <View key={p} style={[styles.pill, i === 0 && styles.pillActive]}>
                  <Text style={[styles.pillTxt, i === 0 && styles.pillTxtActive]}>{p}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* Curved bottom transition */}
          <View style={styles.curve} />
        </View>





        {/* ═══════════════════════════════════════════
            OVERVIEW  (3 stat cards)
        ═══════════════════════════════════════════ */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Overview</Text>
            <Pressable><Text style={styles.seeAll}>See all</Text></Pressable>
          </View>
          <View style={styles.statsRow}>
            <StatCard
              icon={<MaterialCommunityIcons name="trophy-outline" size={18} color={C.green} />}
              label="MATCHES" value={String(userStats?.matches || 0)} note="Total Matches" delay={420}
            />
            <StatCard
              icon={<Feather name="trending-up" size={18} color="#F59E0B" />}
              label="RUNS" value={String(userStats?.runs || 0)} note="Total Runs" delay={500}
            />
            <StatCard
              icon={<Feather name="award" size={18} color="#6C63FF" />}
              label="WICKETS" value={String(userStats?.wickets || 0)} note="Total Wickets" delay={580}
            />
          </View>
        </View>

        {/* ═══════════════════════════════════════════
            RECENT UPDATES  (activity list)
        ═══════════════════════════════════════════ */}
        <View style={[styles.section, { marginBottom: 8 }]}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Recent Updates</Text>
            <Pressable><Text style={styles.seeAll}>See all</Text></Pressable>
          </View>

          <View style={styles.actCard}>
            <ActivityRow emoji="🏏" title="Match Highlight"
              desc="India vs Australia — 3rd Test posted"
              badge="NEW" time="2m ago" badgeGreen delay={560} />
            <View style={styles.divider} />
            <ActivityRow emoji="🎯" title="Top Performer"
              desc="Virat Kohli named Player of the Series"
              badge="UPDATE" time="1h ago" delay={640} />
            <View style={styles.divider} />
            <ActivityRow emoji="📊" title="Stats Updated"
              desc="ICC rankings refreshed after latest results"
              badge="INFO" time="3h ago" delay={720} />
            <View style={styles.divider} />
            <ActivityRow emoji="🔔" title="Tour Alert"
              desc="Australia tour schedule confirmed next month"
              badge="HOT" time="5h ago" badgeGreen delay={800} />
          </View>
        </View>

        {/* Spacer for nav bar */}
        <View style={{ height: 120 }} />
      </ScrollView>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={activeTab === 'home' ? C.hero : '#0A0D0A'} />

      {activeTab === 'home' && (
        loadingDb ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#59C749" />
          </View>
        ) : (
          matches.length === 0 ? renderEmptyState() : renderHomeTab()
        )
      )}
      {activeTab === 'matches' && renderMatchesTab()}
      {activeTab === 'tournament' && renderTournamentTab()}
      {activeTab === 'profile' && renderProfileTab()}

      {/* ═══════════════════════════════════════════
          FLOATING BOTTOM NAV (Redesigned)
      ═══════════════════════════════════════════ */}
      <View style={styles.navOuter}>
        <View style={styles.navBar}>
          {/* Tab 1: Home */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('home')}
            activeOpacity={0.75}
          >
            <Ionicons
              name={activeTab === 'home' ? 'home' : 'home-outline'}
              size={20}
              color={activeTab === 'home' ? C.green : 'rgba(255,255,255,0.42)'}
            />
            <Text style={[styles.navLabel, activeTab === 'home' && styles.navLabelActive]}>Home</Text>
            {activeTab === 'home' && <View style={styles.activeDot} />}
          </TouchableOpacity>

          {/* Tab 2: Matches */}
          <TourHighlight id="matches-tab" style={{ flex: 1 }}>
            <TouchableOpacity
              style={[styles.navItem, { width: '100%' }]}
              onPress={() => setActiveTab('matches')}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons
                name={activeTab === 'matches' ? 'scoreboard' : 'scoreboard-outline'}
                size={20}
                color={activeTab === 'matches' ? C.green : 'rgba(255,255,255,0.42)'}
              />
              <Text style={[styles.navLabel, activeTab === 'matches' && styles.navLabelActive]}>Matches</Text>
              {activeTab === 'matches' && <View style={styles.activeDot} />}
            </TouchableOpacity>
          </TourHighlight>

          {/* Tab 3: Center FAB (Cricket Ball Image) */}
          <View style={styles.navCenter}>
            <TourHighlight id="create-match">
              <TouchableOpacity
                style={styles.navCenterBtn}
                onPress={() => router.push('/create-matches')}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: 'https://cdn-icons-png.flaticon.com/512/3076/3076935.png' }}
                  style={styles.cricketBallImage}
                />
              </TouchableOpacity>
            </TourHighlight>
          </View>

          {/* Tab 4: Tournament */}
          <TourHighlight id="tournament-tab" style={{ flex: 1 }}>
            <TouchableOpacity
              style={[styles.navItem, { width: '100%' }]}
              onPress={() => setActiveTab('tournament')}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons
                name={activeTab === 'tournament' ? 'trophy' : 'trophy-outline'}
                size={20}
                color={activeTab === 'tournament' ? C.green : 'rgba(255,255,255,0.42)'}
              />
              <Text style={[styles.navLabel, activeTab === 'tournament' && styles.navLabelActive]}>Tourney</Text>
              {activeTab === 'tournament' && <View style={styles.activeDot} />}
            </TouchableOpacity>
          </TourHighlight>

          {/* Tab 5: Profile */}
          <TourHighlight id="profile-tab" style={{ flex: 1 }}>
            <TouchableOpacity
              style={[styles.navItem, { width: '100%' }]}
              onPress={() => setActiveTab('profile')}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons
                name={activeTab === 'profile' ? 'account' : 'account-outline'}
                size={20}
                color={activeTab === 'profile' ? C.green : 'rgba(255,255,255,0.42)'}
              />
              <Text style={[styles.navLabel, activeTab === 'profile' && styles.navLabelActive]}>Profile</Text>
              {activeTab === 'profile' && <View style={styles.activeDot} />}
            </TouchableOpacity>
          </TourHighlight>
        </View>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: C.milky },
  scroll:{ flex: 1 },
  body:  { /* no global padding — sections own it */ },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    backgroundColor: C.hero,
    paddingHorizontal: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  deco1: {
    position: 'absolute',
    width: W * 0.60,
    height: W * 0.60,
    borderRadius: W * 0.30,
    backgroundColor: 'rgba(89,199,73,0.07)',
    top: -W * 0.18,
    right: -W * 0.14,
  },
  deco2: {
    position: 'absolute',
    width: W * 0.38,
    height: W * 0.38,
    borderRadius: W * 0.19,
    backgroundColor: 'rgba(255,255,255,0.03)',
    bottom: 30,
    left: -W * 0.10,
  },
  curve: {
    height: 28,
    backgroundColor: C.milky,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: 20,
  },

  // Header row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: C.shadowG,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarTxt: {
    fontSize: 16,
    fontWeight: '800',
    color: C.white,
  },
  onlineDot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#34D399',
    bottom: 1,
    right: 1,
    borderWidth: 1.5,
    borderColor: C.hero,
  },
  helloTxt: {
    fontSize: 11,
    color: C.heroText,
    fontWeight: '500',
    lineHeight: 14,
  },
  nameTxt: {
    fontSize: 16,
    fontWeight: '800',
    color: C.white,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.green,
    borderWidth: 1,
    borderColor: C.hero,
  },

  // Hero center block
  heroCenter: {
    marginBottom: 20,
  },
  heroSub: {
    fontSize: 12,
    color: C.heroText,
    fontWeight: '500',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: C.white,
    letterSpacing: -0.8,
    marginBottom: 16,
  },

  // CTA buttons
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnSolid: {
    flex: 1,
    backgroundColor: C.green,
    paddingVertical: 13,
    borderRadius: 100,
    alignItems: 'center',
    shadowColor: C.shadowG,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 7,
  },
  btnSolidTxt: {
    color: C.white,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  btnGhost: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 100,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  btnGhostTxt: {
    color: C.white,
    fontSize: 14,
    fontWeight: '700',
  },

  // Pills
  pillsSection: {
    gap: 8,
  },
  pillsLabel: {
    fontSize: 10,
    color: C.heroText,
    fontWeight: '700',
    letterSpacing: 1.0,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  pillActive: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  pillTxt: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.68)',
    fontWeight: '600',
  },
  pillTxtActive: {
    color: C.white,
  },

  // ── Sections ───────────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.black,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: C.green,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    shadowColor: C.shadowC,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: C.gray2,
  },

  // ── Quick Actions ──────────────────────────────────────────────────────────
  qaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  qaWrap: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  qaBtn: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.gray4,
    textAlign: 'center',
  },

  // ── Stats ──────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 12,
    gap: 3,
    shadowColor: C.shadowC,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: C.gray2,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.gray1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: C.gray3,
    letterSpacing: 0.6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: C.black,
    letterSpacing: -0.4,
  },
  statNote: {
    fontSize: 9,
    fontWeight: '500',
    color: C.gray3,
  },

  // ── Activity ───────────────────────────────────────────────────────────────
  actCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    paddingVertical: 4,
    shadowColor: C.shadowC,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: C.gray2,
    overflow: 'hidden',
  },
  actRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: C.gray2,
    marginHorizontal: 14,
  },
  actEmoji: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.gray1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actBody: {
    flex: 1,
    gap: 2,
  },
  actTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.black,
    lineHeight: 17,
  },
  actDesc: {
    fontSize: 11,
    fontWeight: '400',
    color: C.gray3,
    lineHeight: 15,
  },
  actRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  actBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 100,
    backgroundColor: '#F3F4F6',
  },
  actBadgeGreen: {
    backgroundColor: 'rgba(89,199,73,0.14)',
  },
  actBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.gray4,
  },
  actBadgeTextGreen: {
    color: C.green,
  },
  actTime: {
    fontSize: 10,
    color: C.gray3,
    fontWeight: '500',
  },

  // ── Bottom Nav ─────────────────────────────────────────────────────────────
  navOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    paddingTop: 6,
    zIndex: 999,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 21, 16, 0.88)', // glassmorphism dark forest green background
    borderRadius: 32,
    paddingVertical: 10,
    paddingHorizontal: 10,
    shadowColor: C.green, // subtle green glow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(89, 199, 73, 0.15)',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
    position: 'relative',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  navLabelActive: {
    color: C.green,
    fontWeight: '700',
  },
  navCenter: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
  },
  navCenterBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#C53A33', // Cricket ball leather red/maroon is great, or green, but here it's housing the ball image
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 15,
    borderWidth: 3,
    borderColor: 'rgba(17, 21, 16, 0.95)',
  },
  cricketBallImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.green,
    marginTop: 2,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },

  // ── Tab Content & Headers ──────────────────────────────────────────────────
  tabContent: {
    flex: 1,
    backgroundColor: '#0A0D0A', // Dark theme for tabs matching the cricket theme
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
  },
  tabHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabHeaderTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: C.white,
    letterSpacing: -0.5,
  },
  tabHeaderSub: {
    fontSize: 12,
    color: '#828880',
    fontWeight: '500',
    marginTop: 2,
  },
  tabScroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120, // offset bottom nav
  },

  // ── Filters ─────────────────────────────────────────────────────────────────
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterBtnActive: {
    backgroundColor: 'rgba(89, 199, 73, 0.15)',
    borderColor: C.green,
  },
  filterBtnTxt: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  filterBtnTxtActive: {
    color: C.green,
    fontWeight: '700',
  },

  // ── Match Cards ────────────────────────────────────────────────────────────
  matchCard: {
    backgroundColor: '#131713',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  matchCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveBadgeTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  finishedLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#828880',
    backgroundColor: 'rgba(130, 136, 128, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    letterSpacing: 0.5,
  },
  matchTypeLabel: {
    fontSize: 11,
    color: '#828880',
    fontWeight: '500',
  },
  matchTeamsRow: {
    gap: 12,
    marginBottom: 12,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  teamLogoContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLogoText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '800',
  },
  teamNameText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: C.white,
  },
  teamScoreText: {
    fontSize: 14,
    fontWeight: '800',
    color: C.green,
  },
  matchCardDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 12,
  },
  matchStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    lineHeight: 16,
  },
  matchStatusFinishedText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 16,
  },

  // ── Tournament Standings ───────────────────────────────────────────────────
  leagueFeaturedCard: {
    backgroundColor: 'rgba(89, 199, 73, 0.08)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(89, 199, 73, 0.25)',
    marginBottom: 16,
  },
  leagueTag: {
    fontSize: 9,
    fontWeight: '800',
    color: C.green,
    letterSpacing: 1,
    marginBottom: 6,
  },
  leagueTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: C.white,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  leagueDetails: {
    fontSize: 12,
    color: '#828880',
    fontWeight: '500',
  },
  tableCard: {
    backgroundColor: '#131713',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 16,
  },
  tableCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: C.white,
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 4,
  },
  thText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#828880',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  tdRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#828880',
  },
  tdNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.white,
  },
  tdText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  tdPtsText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.green,
  },
  leadersRow: {
    flexDirection: 'row',
    gap: 10,
  },
  leaderCard: {
    flex: 1,
    backgroundColor: '#131713',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  capIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  leaderLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#828880',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  leaderName: {
    fontSize: 13,
    fontWeight: '800',
    color: C.white,
    marginBottom: 2,
  },
  leaderStats: {
    fontSize: 10,
    color: C.green,
    fontWeight: '600',
  },

  // ── Profile & Settings (Redesigned) ────────────────────────────────────────
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  profileHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  profileHeaderBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  profileScroll: {
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  profileIdentityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  profileAvatarSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginRight: 14,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  profileAvatarSmallTxt: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  profileOnlineDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34D399',
    bottom: 1,
    right: 1,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileIdentityInfo: {
    flex: 1,
  },
  profileIdentityName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  profileIdentityEmail: {
    fontSize: 13,
    color: '#8A8A8A',
    fontWeight: '500',
  },
  profileEditBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  profileMenuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 4,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  profileMenuIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3F4F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  profileMenuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  profileMenuDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 72,
    marginRight: 16,
  },
  profileLogoutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // kept for other components that reference these
  profileBioCard: { backgroundColor: '#131713', borderRadius: 24, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 20 },
  profileAvatarLarge: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 12 },
  profileAvatarTxt: { fontSize: 28, fontWeight: '900', color: C.white },
  onlineBadge: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: '#34D399', bottom: 2, right: 2, borderWidth: 2, borderColor: '#131713' },
  profileName: { fontSize: 20, fontWeight: '900', color: C.white, letterSpacing: -0.3, marginBottom: 2 },
  profileRole: { fontSize: 11, color: '#828880', fontWeight: '500', marginBottom: 16 },
  profileStatsSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  profileStatItem: { flex: 1, alignItems: 'center' },
  profileStatVal: { fontSize: 18, fontWeight: '800', color: C.white },
  profileStatLbl: { fontSize: 10, color: '#828880', fontWeight: '600', marginTop: 2 },
  verticalDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.08)' },
  profileSectionTitle: { fontSize: 14, fontWeight: '800', color: C.white, letterSpacing: -0.2, marginBottom: 10, marginTop: 8 },
  teamsHorizontalScroll: { gap: 12, paddingBottom: 4, marginBottom: 16 },
  teamManagedCard: { width: 140, backgroundColor: '#131713', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  teamManagedIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  teamManagedIconText: { color: C.white, fontSize: 14, fontWeight: '800' },
  teamManagedName: { fontSize: 12, fontWeight: '800', color: C.white, marginBottom: 2, textAlign: 'center' },
  teamManagedCount: { fontSize: 9, color: '#828880', fontWeight: '500', textAlign: 'center' },
  settingsCard: { backgroundColor: '#131713', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingTitle: { fontSize: 12, fontWeight: '700', color: C.white },
  settingValue: { fontSize: 11, color: C.green, fontWeight: '600' },


  // ── Create Match Modal ─────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0E110E',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '88%',
    borderWidth: 1.5,
    borderColor: 'rgba(89, 199, 73, 0.15)',
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: C.white,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#828880',
    fontWeight: '500',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#828880',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: C.white,
    fontSize: 13,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  oversRowSelect: {
    flexDirection: 'row',
    gap: 8,
  },
  overOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  overOptionActive: {
    backgroundColor: 'rgba(89, 199, 73, 0.15)',
    borderColor: C.green,
  },
  overOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  overOptionTextActive: {
    color: C.green,
    fontWeight: '800',
  },
  typeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  typeSelectorText: {
    color: C.white,
    fontSize: 13,
    fontWeight: '700',
  },
  venueInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  venueInput: {
    flex: 1,
    paddingVertical: 12,
    color: C.white,
    fontSize: 13,
    fontWeight: '600',
  },
  startScoringBtn: {
    backgroundColor: C.green,
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 12,
  },
  startScoringBtnTxt: {
    color: C.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cancelBtn: {
    paddingVertical: 12,
    borderRadius: 100,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelBtnTxt: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '700',
  },
  
  // ── Playground Map Card ──────────────────────────────────────────────────
  mapCard: {
    backgroundColor: '#151715',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  mapCardHeader: {
    marginBottom: 12,
  },
  mapCardSub: {
    fontSize: 11,
    color: '#828880',
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  mapCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.white,
    letterSpacing: -0.4,
  },
  mapContainer: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E201E',
  },
  permissionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(21, 23, 21, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  permissionText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.white,
    marginBottom: 2,
  },
  permissionSub: {
    fontSize: 11,
    color: '#828880',
    textAlign: 'center',
  },
  mapCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  participantsLeft: {
    gap: 2,
  },
  participantsSub: {
    fontSize: 11,
    color: '#828880',
    fontWeight: '500',
  },
  participantsMain: {
    fontSize: 16,
    fontWeight: '800',
    color: C.white,
    letterSpacing: -0.2,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#151715',
  },
  participantBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#282C28',
    borderWidth: 2,
    borderColor: '#151715',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: '#828880',
  },

  // ── Empty State Redesign Styles ─────────────────────────────────────────────
  emptyRoot: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBody: {
    flexGrow: 1,
    paddingBottom: 140,
    alignItems: 'center',
    paddingHorizontal: 20,
    position: 'relative',
    backgroundColor: '#F8F9FA',
  },
  emptyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: Platform.OS === 'ios' ? 48 : 28,
    marginBottom: 24,
    width: '100%',
  },
  emptyHelloTxt: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    lineHeight: 14,
  },
  emptyNameTxt: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  emptyOnlineDot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#34D399',
    bottom: 1,
    right: 1,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  emptyBellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyBellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#59C749',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  emptyHeroSection: {
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
  },
  emptyBallContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyBatEmoji: {
    fontSize: 38,
  },
  emptyTitleText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyDescText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  emptyCtaWrapper: {
    alignItems: 'center',
    marginVertical: 24,
    width: '100%',
  },
  floatingGradientBtn: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#59C749',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  floatingGradientBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    gap: 12,
  },
  ctaIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaIconEmoji: {
    fontSize: 14,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  emptySecondaryContainer: {
    width: '100%',
    paddingHorizontal: 4,
    marginBottom: 24,
  },
  emptySectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 1.0,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  secondaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  secondaryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryIconText: {
    fontSize: 20,
  },
  secondaryCardText: {
    flex: 1,
    gap: 2,
  },
  secondaryCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  secondaryCardDesc: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    lineHeight: 14,
  },
  floatingHelpBubble: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 90,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#A8CD55',
    shadowColor: '#A8CD55',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 1000,
  },
  emptyFeedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168, 205, 85, 0.18)',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyFeedText: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 14,
  },
  createMatchMiniBtn: {
    backgroundColor: '#59C749',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 100,
  },
  createMatchMiniBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },

});
