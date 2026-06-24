import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/src/services/firebase';

const { width } = Dimensions.get('window');

// ── Mock player stats (replace with Firestore reads when ready) ──────────────
const MOCK_STATS = {
  displayName: 'Galangal Richard',
  photoURL: 'https://i.pravatar.cc/200?img=11',
  rank: 'Diamond',
  level: 42,
  playerId: 'CSPL-00A1',
  totalMatches: 187,
  totalRuns: 6842,
  totalWickets: 94,
  highestScore: 142,
  winPercentage: 68,
  matchesWon: 127,
  momAwards: 23,
  battingAverage: 48.5,
  strikeRate: 134.7,
  followers: 3210,
  following: 847,
  teamsJoined: 6,
  last5: [
    { match: 'M1', runs: 78, won: true },
    { match: 'M2', runs: 12, won: false },
    { match: 'M3', runs: 95, won: true },
    { match: 'M4', runs: 44, won: true },
    { match: 'M5', runs: 102, won: false },
  ],
  achievements: [
    { id: 'mvp', label: 'MVP', icon: 'award' as const, colors: ['#FFD700', '#FFA500'] },
    { id: 'top_scorer', label: 'Top Scorer', icon: 'trending-up' as const, colors: ['#A8CD55', '#4CAF50'] },
    { id: 'match_winner', label: 'Match Winner', icon: 'zap' as const, colors: ['#00B4DB', '#0083B0'] },
    { id: 'champion', label: 'Tournament Champion', icon: 'star' as const, colors: ['#f953c6', '#b91d73'] },
  ],
};

const MAX_BAR_HEIGHT = 80;
const MAX_RUNS = Math.max(...MOCK_STATS.last5.map(m => m.runs));

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, icon }: { label: string; value: string | number; icon: keyof typeof Feather.glyphMap }) {
  return (
    <View style={statStyles.card}>
      <LinearGradient
        colors={['rgba(168,205,85,0.12)', 'rgba(227,168,91,0.06)']}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <Feather name={icon} size={16} color="#A8CD55" />
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

function AchievementBadge({
  label,
  icon,
  colors,
}: {
  label: string;
  icon: keyof typeof Feather.glyphMap;
  colors: [string, string];
}) {
  return (
    <View style={badgeStyles.wrapper}>
      <LinearGradient colors={colors} style={badgeStyles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Feather name={icon} size={16} color="#FFF" />
      </LinearGradient>
      <Text style={badgeStyles.label}>{label}</Text>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────

export default function PlayerProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [playerData, setPlayerData] = useState<any>(null);

  // Entrance animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const perfAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!id) {
      setPlayerData({
        ...MOCK_STATS,
      });
      setLoading(false);
      return;
    }

    async function fetchPlayer() {
      try {
        const userRef = doc(db, 'users', id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setPlayerData({
            ...MOCK_STATS,
            displayName: data.displayName || MOCK_STATS.displayName,
            photoURL: data.photoURL || MOCK_STATS.photoURL,
            playerId: `CSPL-${id.slice(0, 8).toUpperCase()}`,
          });
        } else {
          setPlayerData({
            ...MOCK_STATS,
            playerId: `CSPL-${id.slice(0, 8).toUpperCase()}`,
          });
        }
      } catch (err) {
        console.error('Error fetching player data:', err);
        setPlayerData({
          ...MOCK_STATS,
          playerId: `CSPL-${id.slice(0, 8).toUpperCase()}`,
        });
      } finally {
        setLoading(false);
      }
    }

    fetchPlayer();
  }, [id]);

  useEffect(() => {
    if (!loading) {
      Animated.stagger(180, [
        Animated.spring(headerAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
        Animated.spring(statsAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
        Animated.spring(perfAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      ]).start();
    }
  }, [loading]);

  const headerStyle = {
    opacity: headerAnim,
    transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-30, 0] }) }],
  };
  const statsStyle = {
    opacity: statsAnim,
    transform: [{ translateY: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
  };
  const perfStyle = {
    opacity: perfAnim,
    transform: [{ translateY: perfAnim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }],
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0A1628', '#0D1F3C', '#111A2E']}
          style={StyleSheet.absoluteFillObject}
        />
        <SafeAreaView style={styles.centered}>
          <ActivityIndicator size="large" color="#A8CD55" />
          <Text style={{ color: '#8A9BA8', marginTop: 12, fontSize: 14, fontWeight: '600' }}>
            Loading player card...
          </Text>
        </SafeAreaView>
      </View>
    );
  }

  const player = playerData || MOCK_STATS;

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={['#0A1628', '#0D1F3C', '#111A2E']}
        style={StyleSheet.absoluteFillObject}
      />

      <SafeAreaView style={{ flex: 1 }}>
        {/* Back button */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Feather name="arrow-left" size={20} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.headerLabel}>Player Profile</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ── HERO BANNER ── */}
          <Animated.View style={[styles.heroBanner, headerStyle]}>
            <LinearGradient
              colors={['#1A3A2A', '#0D2B1F', '#162A40']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heroGradient}
            />
            {/* Decorative circles */}
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />

            {/* Avatar */}
            <View style={styles.avatarContainer}>
              <LinearGradient
                colors={['#A8CD55', '#E3A85B']}
                style={styles.avatarRing}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Image source={{ uri: player.photoURL }} style={styles.avatar} />
              </LinearGradient>
            </View>

            {/* Name & ID */}
            <Text style={styles.playerName}>{player.displayName}</Text>
            <Text style={styles.playerIdText}>🏏 {player.playerId}</Text>

            {/* Badges row */}
            <View style={styles.badgesRow}>
              <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.rankBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Feather name="award" size={12} color="#FFF" />
                <Text style={styles.rankBadgeText}>{player.rank}</Text>
              </LinearGradient>
              <LinearGradient colors={['#00B4DB', '#0083B0']} style={styles.rankBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                <Feather name="layers" size={12} color="#FFF" />
                <Text style={styles.rankBadgeText}>Level {player.level}</Text>
              </LinearGradient>
            </View>

            {/* Community stats */}
            <View style={styles.communityRow}>
              <CommunityStatItem value={player.followers.toLocaleString()} label="Followers" />
              <View style={styles.commDivider} />
              <CommunityStatItem value={player.following.toLocaleString()} label="Following" />
              <View style={styles.commDivider} />
              <CommunityStatItem value={player.teamsJoined} label="Teams" />
            </View>
          </Animated.View>

          {/* ── PLAYER STATISTICS ── */}
          <Animated.View style={[styles.section, statsStyle]}>
            <SectionTitle icon="bar-chart-2" title="Player Statistics" />
            <View style={styles.statsGrid}>
              <StatCard label="Matches" value={player.totalMatches} icon="calendar" />
              <StatCard label="Total Runs" value={player.totalRuns.toLocaleString()} icon="trending-up" />
              <StatCard label="Wickets" value={player.totalWickets} icon="activity" />
              <StatCard label="Highest Score" value={player.highestScore} icon="zap" />
              <StatCard label="Win %" value={`${player.winPercentage}%`} icon="percent" />
              <StatCard label="Matches Won" value={player.matchesWon} icon="check-circle" />
              <StatCard label="MoM Awards" value={player.momAwards} icon="star" />
              <StatCard label="Batting Avg" value={player.battingAverage} icon="target" />
              <StatCard label="Strike Rate" value={player.strikeRate} icon="crosshair" />
            </View>
          </Animated.View>

          {/* ── ACHIEVEMENTS ── */}
          <Animated.View style={[styles.section, statsStyle]}>
            <SectionTitle icon="award" title="Achievements" />
            <View style={styles.achievementsGrid}>
              {player.achievements.map((a: any) => (
                <AchievementBadge
                  key={a.id}
                  label={a.label}
                  icon={a.icon}
                  colors={a.colors as [string, string]}
                />
              ))}
            </View>
          </Animated.View>

          {/* ── PERFORMANCE ── */}
          <Animated.View style={[styles.section, perfStyle]}>
            <SectionTitle icon="activity" title="Last 5 Matches" />
            <View style={styles.glassCard}>
              <View style={styles.barGraph}>
                {player.last5.map((m: any) => {
                  const barH = Math.max(8, (m.runs / MAX_RUNS) * MAX_BAR_HEIGHT);
                  return (
                    <View key={m.match} style={styles.barWrapper}>
                      <Text style={styles.barRunsLabel}>{m.runs}</Text>
                      <LinearGradient
                        colors={m.won ? ['#A8CD55', '#4CAF50'] : ['#FF6B6B', '#E53935']}
                        style={[styles.bar, { height: barH }]}
                      />
                      <Text style={styles.barMatchLabel}>{m.match}</Text>
                      <Feather
                        name={m.won ? 'chevrons-up' : 'chevrons-down'}
                        size={12}
                        color={m.won ? '#A8CD55' : '#FF6B6B'}
                      />
                    </View>
                  );
                })}
              </View>
              {/* Win/Loss legend */}
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#A8CD55' }]} />
                  <Text style={styles.legendText}>Won</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#FF6B6B' }]} />
                  <Text style={styles.legendText}>Lost</Text>
                </View>
                <View style={{ flex: 1 }} />
                <Text style={styles.winRatioText}>
                  Win Ratio: <Text style={{ color: '#A8CD55' }}>{player.winPercentage}%</Text>
                </Text>
              </View>
            </View>
          </Animated.View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ── Helper components ─────────────────────────────────────────────────────────

function CommunityStatItem({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.commStatItem}>
      <Text style={styles.commStatValue}>{value}</Text>
      <Text style={styles.commStatLabel}>{label}</Text>
    </View>
  );
}

function SectionTitle({ icon, title }: { icon: keyof typeof Feather.glyphMap; title: string }) {
  return (
    <View style={styles.sectionTitle}>
      <LinearGradient colors={['#A8CD55', '#E3A85B']} style={styles.sectionIconBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <Feather name={icon} size={14} color="#FFF" />
      </LinearGradient>
      <Text style={styles.sectionTitleText}>{title}</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A1628' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerLabel: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },

  // Hero
  heroBanner: {
    borderRadius: 24,
    overflow: 'hidden',
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(168,205,85,0.2)',
  },
  heroGradient: { ...StyleSheet.absoluteFillObject },
  decorCircle1: {
    position: 'absolute', top: -60, right: -60,
    width: 200, height: 200, borderRadius: 100,
    backgroundColor: 'rgba(168,205,85,0.07)',
  },
  decorCircle2: {
    position: 'absolute', bottom: -40, left: -40,
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: 'rgba(227,168,91,0.07)',
  },
  avatarContainer: { marginBottom: 16 },
  avatarRing: {
    width: 104, height: 104, borderRadius: 52,
    padding: 3,
    shadowColor: '#A8CD55',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 12,
  },
  avatar: { width: 98, height: 98, borderRadius: 49, backgroundColor: '#1A2332' },
  playerName: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  playerIdText: {
    color: '#8A9BA8',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 14,
  },
  badgesRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  rankBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  rankBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  communityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16,
    paddingVertical: 14,
  },
  commDivider: { width: 1, height: 32, backgroundColor: 'rgba(255,255,255,0.12)' },
  commStatItem: { flex: 1, alignItems: 'center' },
  commStatValue: { color: '#FFF', fontSize: 20, fontWeight: '800' },
  commStatLabel: { color: '#8A9BA8', fontSize: 11, marginTop: 2 },

  // Sections
  section: { marginBottom: 20 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  sectionIconBg: {
    width: 28, height: 28, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitleText: { color: '#FFF', fontSize: 17, fontWeight: '700' },

  // Stats grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  // Glass card
  glassCard: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    padding: 16,
  },

  // Bar graph
  barGraph: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: MAX_BAR_HEIGHT + 50,
    marginBottom: 12,
  },
  barWrapper: { alignItems: 'center', gap: 4, flex: 1 },
  barRunsLabel: { color: '#E8E8E8', fontSize: 11, fontWeight: '600' },
  bar: { width: 28, borderRadius: 6, minHeight: 8 },
  barMatchLabel: { color: '#8A9BA8', fontSize: 11 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { color: '#8A9BA8', fontSize: 12 },
  winRatioText: { color: '#8A9BA8', fontSize: 12 },

  // Achievements
  achievementsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
});

const statStyles = StyleSheet.create({
  card: {
    width: (width - 32 - 20) / 3,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(168,205,85,0.15)',
    padding: 12,
    alignItems: 'center',
    gap: 6,
    overflow: 'hidden',
  },
  value: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  label: { color: '#8A9BA8', fontSize: 10, textAlign: 'center', lineHeight: 14 },
});

const badgeStyles = StyleSheet.create({
  wrapper: { alignItems: 'center', gap: 8, width: (width - 32 - 36) / 4 },
  gradient: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  label: { color: '#C0C8D4', fontSize: 10, textAlign: 'center', lineHeight: 13 },
});
