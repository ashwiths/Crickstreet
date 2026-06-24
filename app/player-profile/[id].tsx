import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/src/services/firebase';

const { width } = Dimensions.get('window');

function SkeletonView({ style }: { style: any }) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  return <Animated.View style={[style, { opacity: pulseAnim, backgroundColor: 'rgba(255,255,255,0.06)' }]} />;
}

const ACHIEVEMENT_DEFS = {
  mvp: { label: 'MVP', icon: 'award' as const, colors: ['#FFD700', '#FFA500'] as [string, string] },
  top_scorer: { label: 'Top Scorer', icon: 'trending-up' as const, colors: ['#A8CD55', '#4CAF50'] as [string, string] },
  match_winner: { label: 'Match Winner', icon: 'zap' as const, colors: ['#00B4DB', '#0083B0'] as [string, string] },
  champion: { label: 'Tournament Champion', icon: 'star' as const, colors: ['#f953c6', '#b91d73'] as [string, string] }
};

function calculateLevel(runs: number, wickets: number) {
  return Math.floor(runs / 150) + Math.floor(wickets * 2) + 1;
}

function calculateRank(level: number) {
  if (level >= 50) return 'Diamond';
  if (level >= 35) return 'Platinum';
  if (level >= 20) return 'Gold';
  if (level >= 10) return 'Silver';
  if (level >= 5) return 'Bronze';
  return 'Rookie';
}

const MAX_BAR_HEIGHT = 80;

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
  const [error, setError] = useState<string | null>(null);

  // Entrance animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;
  const perfAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!id) {
      setError('No player ID provided.');
      setLoading(false);
      return;
    }

    async function fetchPlayer() {
      try {
        const userRef = doc(db, 'users', id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          const stats = data.stats || {};
          const totalRuns = stats.runs || 0;
          const totalWickets = stats.wickets || 0;
          const level = calculateLevel(totalRuns, totalWickets);
          const rank = calculateRank(level);
          
          setPlayerData({
            displayName: data.displayName || 'Player',
            photoURL: data.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.displayName || 'Player')}&background=A8CD55&color=0A1628&size=150&bold=true`,
            playerId: `CSPL-${id.slice(0, 8).toUpperCase()}`,
            rank: rank,
            level: level,
            followers: stats.followers || 0,
            following: stats.following || 0,
            teamsJoined: stats.teams || 0,
            totalMatches: stats.matches || 0,
            totalRuns: totalRuns,
            totalWickets: totalWickets,
            highestScore: stats.highestScore || 0,
            winPercentage: stats.winPercentage || 0,
            matchesWon: stats.matchesWon || 0,
            momAwards: stats.momAwards || 0,
            battingAverage: stats.battingAverage || 0,
            strikeRate: stats.strikeRate || 0,
            achievements: stats.achievements || [],
            last5: stats.last5 || [],
          });
        } else {
          setError('Player not found in database.');
        }
      } catch (err) {
        console.error('Error fetching player data:', err);
        setError('Error connecting to database.');
      } finally {
        setLoading(false);
      }
    }

    fetchPlayer();
  }, [id]);

  useEffect(() => {
    if (!loading && !error) {
      Animated.stagger(180, [
        Animated.spring(headerAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
        Animated.spring(statsAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
        Animated.spring(perfAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      ]).start();
    }
  }, [loading, error]);

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
        <LinearGradient colors={['#0A1628', '#0D1F3C', '#111A2E']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={{ flex: 1 }}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color="#FFF" />
            </TouchableOpacity>
            <Text style={styles.headerLabel}>Player Profile</Text>
            <View style={{ width: 44 }} />
          </View>
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Banner skeleton */}
            <View style={[styles.heroBanner, { backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.05)' }]}>
              <SkeletonView style={{ width: 98, height: 98, borderRadius: 49, marginBottom: 16 }} />
              <SkeletonView style={{ width: 160, height: 24, borderRadius: 8, marginBottom: 8 }} />
              <SkeletonView style={{ width: 100, height: 14, borderRadius: 4, marginBottom: 16 }} />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                <SkeletonView style={{ width: 80, height: 26, borderRadius: 13 }} />
                <SkeletonView style={{ width: 80, height: 26, borderRadius: 13 }} />
              </View>
              <SkeletonView style={{ width: '100%', height: 60, borderRadius: 16 }} />
            </View>
            {/* Stats skeleton */}
            <SkeletonView style={{ width: 150, height: 20, borderRadius: 6, marginBottom: 14 }} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {Array.from({ length: 9 }).map((_, i) => (
                <SkeletonView key={i} style={{ width: (width - 32 - 20) / 3, height: 74, borderRadius: 16 }} />
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  if (error || !playerData) {
    return (
      <View style={styles.container}>
        <LinearGradient colors={['#0A1628', '#0D1F3C', '#111A2E']} style={StyleSheet.absoluteFillObject} />
        <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <View style={styles.errorCard}>
            <Feather name="alert-circle" size={56} color="#FF6B6B" style={{ marginBottom: 16 }} />
            <Text style={styles.errorTitle}>Player Not Found</Text>
            <Text style={styles.errorText}>
              The player profile you scanned does not exist in Crickstreet. The user may have deleted their account or the QR link is incorrect.
            </Text>
            <TouchableOpacity style={styles.errorBtn} onPress={() => router.back()}>
              <LinearGradient colors={['#A8CD55', '#E3A85B']} style={styles.errorBtnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <Text style={styles.errorBtnText}>Go Back</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const player = playerData;

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
              {player.achievements.length > 0 ? (
                player.achievements.map((achKey: string) => {
                  const ach = (ACHIEVEMENT_DEFS as any)[achKey];
                  if (!ach) return null;
                  return (
                    <AchievementBadge
                      key={achKey}
                      label={ach.label}
                      icon={ach.icon}
                      colors={ach.colors}
                    />
                  );
                })
              ) : (
                <Text style={styles.emptyText}>No achievements unlocked yet</Text>
              )}
            </View>
          </Animated.View>

          {/* ── PERFORMANCE ── */}
          <Animated.View style={[styles.section, perfStyle]}>
            <SectionTitle icon="activity" title="Last 5 Matches" />
            <View style={styles.glassCard}>
              <View style={styles.barGraph}>
                {player.last5.length > 0 ? (
                  (() => {
                    const maxRuns = Math.max(10, ...player.last5.map((m: any) => m.runs || 0));
                    return player.last5.map((m: any, idx: number) => {
                      const barH = Math.max(8, ((m.runs || 0) / maxRuns) * MAX_BAR_HEIGHT);
                      return (
                        <View key={m.match || idx} style={styles.barWrapper}>
                          <Text style={styles.barRunsLabel}>{m.runs || 0}</Text>
                          <LinearGradient
                            colors={m.won ? ['#A8CD55', '#4CAF50'] : ['#FF6B6B', '#E53935']}
                            style={[styles.bar, { height: barH }]}
                          />
                          <Text style={styles.barMatchLabel}>{m.match || `M${idx + 1}`}</Text>
                          <Feather
                            name={m.won ? 'chevrons-up' : 'chevrons-down'}
                            size={12}
                            color={m.won ? '#A8CD55' : '#FF6B6B'}
                          />
                        </View>
                      );
                    });
                  })()
                ) : (
                  <Text style={[styles.emptyText, { paddingVertical: 20 }]}>
                    No matches played recently
                  </Text>
                )}
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
  emptyText: {
    color: '#8A9BA8',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    width: '100%',
    paddingVertical: 12,
  },
  errorCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#8A9BA8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  errorBtn: {
    width: '100%',
    borderRadius: 14,
    overflow: 'hidden',
  },
  errorBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBtnText: {
    color: '#0A1628',
    fontSize: 15,
    fontWeight: '800',
  },
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
