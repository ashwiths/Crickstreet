import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';



interface TournamentScreenProps {
  onBack?: () => void;
  matches?: any[];
  userStats?: any;
}

export default function TournamentScreen({
  onBack,
  matches = [],
  userStats,
}: TournamentScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'all' | 'tournament' | 'practice' | 'won' | 'lost' | 'newest' | 'oldest'>('all');
  // Map real matches if available
  const displayMatches = matches.length > 0 ? matches.map((m: any, index: number) => {
    let result = 'Draw';
    if (m.result) {
      result = m.result;
    } else if (m.winner) {
      result = m.winner === 'teamA' ? 'Won' : 'Lost';
    } else if (m.status === 'completed') {
      // Basic fallback logic
      const scoreA = parseInt(m.myScore?.split('/')[0] || m.teamAScore || '0');
      const scoreB = parseInt(m.oppScore?.split('/')[0] || m.teamBScore || '0');
      if (scoreA > scoreB) result = 'Won';
      else if (scoreB > scoreA) result = 'Lost';
    }

    return {
      id: m.id || `m_${index}`,
      tournamentName: m.tournamentName || m.matchName || 'Crickstreet Match',
      date: m.date || (m.createdAt ? new Date(m.createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent Match'),
      ground: m.venueName || m.ground || 'Local Pitch',
      matchType: m.matchType || (m.status === 'live' ? 'Live' : 'Tournament'),
      myTeam: m.myTeamName || 'Storm XI',
      oppTeam: m.oppTeamName || 'Opp Team',
      result: result,
      myScore: m.myScore || `${m.teamAScore || 0}/${m.teamAWickets || 0}`,
      oppScore: m.oppScore || `${m.teamBScore || 0}/${m.teamBWickets || 0}`,
      overs: m.overs || m.format || '20 Ov',
      potm: m.potm || 'N/A',
      venue: m.venueName || m.venue || 'Local',
    };
  }) : [];

  const filterChips: Array<{ key: typeof filter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'tournament', label: 'Tournament' },
    { key: 'practice', label: 'Practice' },
    { key: 'won', label: 'Won' },
    { key: 'lost', label: 'Lost' },
    { key: 'newest', label: 'Newest' },
    { key: 'oldest', label: 'Oldest' },
  ];

  const filteredMatches = displayMatches.filter((m) => {
    if (filter === 'all' || filter === 'newest' || filter === 'oldest') return true;
    if (filter === 'tournament') return m.matchType?.toLowerCase().includes('tournament');
    if (filter === 'practice') return m.matchType?.toLowerCase().includes('practice');
    if (filter === 'won') return m.result === 'Won';
    if (filter === 'lost') return m.result === 'Lost';
    return true;
  });

  // Sort if needed
  if (filter === 'newest') {
    // Already matches order by desc typically, but can sort
  } else if (filter === 'oldest') {
    filteredMatches.reverse();
  }

  const getResultColor = (result: string) => {
    if (result === 'Won') return { bg: '#F0F9EB', border: '#A8CD55', text: '#2D5016' };
    if (result === 'Lost') return { bg: '#FFF0F0', border: '#FF4D4D', text: '#FF4D4D' };
    return { bg: '#F5F5F5', border: '#CCCCCC', text: '#8A8A8A' };
  };

  const getMatchTypeBadge = (type: string) => {
    if (type === 'Tournament' || type === 'Live') return { bg: '#F0F4EC', text: '#2D5016' };
    if (type === 'Practice') return { bg: '#FFF9E6', text: '#E3A85B' };
    return { bg: '#F5F5F5', text: '#8A8A8A' };
  };

  // --- Real dynamic data calculations ---
  const totalMatches = displayMatches.length;
  const wins = displayMatches.filter((m) => m.result === 'Won').length;
  const losses = displayMatches.filter((m) => m.result === 'Lost').length;
  const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

  let totalRuns = 0;
  displayMatches.forEach((m) => {
    const runs = parseInt(m.myScore?.split('/')[0] || '0', 10);
    if (!isNaN(runs)) totalRuns += runs;
  });
  if (userStats && typeof userStats.runs === 'number') {
    totalRuns = userStats.runs;
  }

  const statsCards = [
    { icon: '🏏', label: 'Matches Played', value: String(totalMatches), color: '#2D5016', iconBg: '#F0F4EC' },
    { icon: '🏆', label: 'Tournament Wins', value: String(wins), color: '#E3A85B', iconBg: '#FFF9E6' },
    { icon: '📈', label: 'Win Rate', value: `${winRate}%`, color: '#A8CD55', iconBg: '#F0F4EC' },
    { icon: '⚡', label: 'Runs Scored', value: String(totalRuns), color: '#A8CD55', iconBg: '#FFF9E6' },
  ];

  const achievements = [
    { emoji: '🏆', title: 'First Tournament Win', color: '#E3A85B', bg: '#FFF9E6', unlocked: wins >= 1 },
    { emoji: '🔥', title: '5 Match Win Streak', color: '#FF4D4D', bg: '#FFF0F0', unlocked: wins >= 5 },
    { emoji: '💯', title: 'First Century', color: '#A8CD55', bg: '#F0F4EC', unlocked: (userStats?.centuries || 0) >= 1 || displayMatches.some(m => {
        const runs = parseInt(m.myScore?.split('/')[0] || '0', 10);
        return runs >= 100;
      })
    },
    { emoji: '🎯', title: '100 Wickets', color: '#A8CD55', bg: '#F0F4EC', unlocked: (userStats?.wickets || 0) >= 100 },
    { emoji: '🥇', title: 'MVP Award', color: '#E3A85B', bg: '#FFF9E6', unlocked: wins >= 3 },
  ];

  // Current Season calculations
  let highestScoreStr = 'N/A';
  let lowestScoreStr = 'N/A';
  let highestVal = 0;
  let lowestVal = 999;
  
  displayMatches.forEach((m) => {
    const runs = parseInt(m.myScore?.split('/')[0] || '0', 10);
    if (!isNaN(runs) && runs > 0) {
      if (runs > highestVal) {
        highestVal = runs;
        highestScoreStr = m.myScore;
      }
      if (runs < lowestVal) {
        lowestVal = runs;
        lowestScoreStr = m.myScore;
      }
    }
  });
  if (lowestVal === 999) lowestVal = 0;

  const seasonPoints = wins * 2 + (totalMatches - wins - losses) * 1;
  const simulatedNRR = totalMatches > 0 ? (wins >= losses ? `+${((wins - losses) * 0.22).toFixed(2)}` : `${((wins - losses) * 0.22).toFixed(2)}`) : '0.00';

  const seasonRow1 = [
    { label: 'Matches', value: String(totalMatches) },
    { label: 'Wins', value: String(wins) },
    { label: 'Losses', value: String(losses) },
    { label: 'Points', value: String(seasonPoints) },
  ];

  const seasonRow2 = [
    { label: 'NRR', value: simulatedNRR, hi: true },
    { label: 'Highest', value: highestScoreStr, hi: false },
    { label: 'Lowest', value: lowestScoreStr, hi: false },
  ];

  // Group matches by month dynamically for graph
  const last6Months: Array<{ label: string; wins: number; losses: number }> = [];
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const currentDate = new Date();
  
  for (let i = 5; i >= 0; i--) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    last6Months.push({
      label: monthLabels[d.getMonth()],
      wins: 0,
      losses: 0,
    });
  }

  displayMatches.forEach((m) => {
    const dateStr = String(m.date);
    last6Months.forEach((mon) => {
      if (dateStr.includes(mon.label)) {
        if (m.result === 'Won') {
          mon.wins += 1;
        } else if (m.result === 'Lost') {
          mon.losses += 1;
        }
      }
    });
  });

  let maxWinsLosses = 1;
  last6Months.forEach((m) => {
    if (m.wins > maxWinsLosses) maxWinsLosses = m.wins;
    if (m.losses > maxWinsLosses) maxWinsLosses = m.losses;
  });
  const barHeightFactor = 65 / maxWinsLosses;

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={['#E5F2D9', '#F9E5C8', '#F3F4F1']}
        locations={[0, 0.4, 0.8]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { height: 260 + insets.top }]}
      />

      <View style={styles.safeArea}>
        {/* Header */}
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 8 : 16 }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Tournament</Text>
            <Text style={styles.pageSubtitle}>Your cricket journey, match history & achievements.</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.iconButton}>
              <Feather name="filter" size={18} color="#1A1A1A" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Feather name="search" size={18} color="#1A1A1A" />
            </TouchableOpacity>
          </View>
        </Animated.View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        >
          {/* Stats Cards 2x2 */}
          <Animated.View entering={FadeInDown.delay(80).duration(400)} style={styles.statsGrid}>
            {statsCards.map((s, i) => (
              <Animated.View
                key={s.label}
                entering={FadeInDown.delay(80 + i * 50).duration(400)}
                style={styles.statCard}
              >
                <View style={[styles.statIconBg, { backgroundColor: s.iconBg }]}>
                  <Text style={{ fontSize: 18 }}>{s.icon}</Text>
                </View>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </Animated.View>
            ))}
          </Animated.View>



          {/* Section: Current Season */}
          <Animated.View entering={FadeInDown.delay(450).duration(400)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Current Season</Text>
            </View>
            <View style={styles.seasonCard}>
              <LinearGradient
                colors={['rgba(168,205,85,0.12)', 'rgba(227,168,91,0.08)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.seasonGradient}
              >
                <View style={styles.seasonRow}>
                  {seasonRow1.map((item) => (
                    <View key={item.label} style={styles.seasonItem}>
                      <Text style={styles.seasonVal}>{item.value}</Text>
                      <Text style={styles.seasonLbl}>{item.label}</Text>
                    </View>
                  ))}
                </View>
                <View style={styles.cardDivider} />
                <View style={styles.seasonRow}>
                  {seasonRow2.map((item) => (
                    <View key={item.label} style={styles.seasonItem}>
                      <Text style={[styles.seasonVal, item.hi && { color: '#2D5016' }]}>{item.value}</Text>
                      <Text style={styles.seasonLbl}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </View>
          </Animated.View>

          {/* Section: Achievements */}
          <Animated.View entering={FadeInDown.delay(520).duration(400)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Achievements</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>See all</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.achievementsScroll}
            >
               {achievements.map((ach, i) => (
                <Animated.View
                  key={ach.title}
                  entering={FadeInDown.delay(540 + i * 50).duration(350)}
                  style={[styles.achievementCard, { borderColor: ach.unlocked ? ach.color + '40' : 'rgba(0,0,0,0.08)', opacity: ach.unlocked ? 1 : 0.65 }]}
                >
                  <View style={[styles.achIconBg, { backgroundColor: ach.bg }]}>
                    <Text style={{ fontSize: 24 }}>{ach.emoji}</Text>
                  </View>
                  <Text style={styles.achTitle} numberOfLines={2}>{ach.title}</Text>
                  <View style={[styles.achBadge, { backgroundColor: ach.unlocked ? ach.color + '18' : 'rgba(0,0,0,0.05)' }]}>
                    <Text style={[styles.achBadgeTxt, { color: ach.unlocked ? ach.color : '#8A8A8A' }]}>
                      {ach.unlocked ? 'Unlocked' : 'Locked'}
                    </Text>
                  </View>
                </Animated.View>
              ))}
            </ScrollView>
          </Animated.View>

          {/* Section: Performance Graph */}
          <Animated.View entering={FadeInDown.delay(600).duration(400)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Performance Graph</Text>
            </View>
            <View style={styles.graphCard}>
              <View style={styles.graphBars}>
                {last6Months.map((m) => (
                  <View key={m.label} style={styles.barGroup}>
                    <View style={[styles.graphBar, { height: Math.max(m.wins * barHeightFactor, m.wins > 0 ? 6 : 0), backgroundColor: '#A8CD55' }]} />
                    <View style={[styles.graphBar, { height: Math.max(m.losses * barHeightFactor, m.losses > 0 ? 6 : 0), backgroundColor: '#FF4D4D', opacity: 0.4 }]} />
                    <Text style={styles.barLabel}>{m.label}</Text>
                  </View>
                ))}
              </View>
              <View style={styles.graphLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#A8CD55' }]} />
                  <Text style={styles.legendTxt}>Wins</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#FF4D4D', opacity: 0.5 }]} />
                  <Text style={styles.legendTxt}>Losses</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Section: Match History */}
          <Animated.View entering={FadeInDown.delay(650).duration(400)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Match History</Text>
            </View>
            {filteredMatches.length > 0 ? (
              filteredMatches.map((m) => {
                const colors = getResultColor(m.result);
                const badge = getMatchTypeBadge(m.matchType);
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.matchCard, { borderLeftColor: colors.border }]}
                    activeOpacity={0.85}
                    onPress={() => {
                      router.push({
                        pathname: '/scorecard',
                        params: {
                          matchId: m.id,
                          myTeamName: m.myTeam,
                          oppTeamName: m.oppTeam,
                        },
                      });
                    }}
                  >
                    <View style={styles.matchTop}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.matchTournament}>{m.tournamentName}</Text>
                        <Text style={styles.matchDate}>{m.date} • {m.venue}</Text>
                      </View>
                      <View style={[styles.matchTypeBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.matchTypeTxt, { color: badge.text }]}>
                          {m.matchType}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.vsRow}>
                      <View style={styles.vsTeamCol}>
                        <View style={styles.teamLogo}>
                          <Text style={styles.teamLogoTxt}>
                            {m.myTeam.slice(0, 2).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.teamName} numberOfLines={1}>{m.myTeam}</Text>
                      </View>

                      <View style={styles.vsScoreCol}>
                        <Text style={styles.scoreTextA}>{m.myScore}</Text>
                        <Text style={styles.vsSmall}>vs</Text>
                        <Text style={styles.scoreTextB}>{m.oppScore}</Text>
                      </View>

                      <View style={styles.vsTeamCol}>
                        <View style={[styles.teamLogo, { backgroundColor: '#FFF0F0' }]}>
                          <Text style={[styles.teamLogoTxt, { color: '#FF4D4D' }]}>
                            {m.oppTeam.slice(0, 2).toUpperCase()}
                          </Text>
                        </View>
                        <Text style={styles.teamName} numberOfLines={1}>{m.oppTeam}</Text>
                      </View>

                      <View style={[styles.resultBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
                        <Text style={[styles.resultTxt, { color: colors.text }]}>{m.result}</Text>
                      </View>
                    </View>

                    <View style={styles.cardDivider} />

                    <View style={styles.matchBottom}>
                      <View style={styles.matchMeta}>
                        <Feather name="award" size={12} color="#8A8A8A" />
                        <Text style={styles.metaTxt}>POM: {m.potm}</Text>
                      </View>
                      <View style={styles.chevronBtn}>
                        <Feather name="chevron-right" size={14} color="#2D5016" />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No matches found in history.</Text>
              </View>
            )}
          </Animated.View>

          {/* Section: Quick Actions */}
          <Animated.View entering={FadeInDown.delay(680).duration(400)}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Quick Actions</Text>
            </View>
            <View style={styles.quickActionsGrid}>
              {[
                { emoji: '🏆', label: 'Create Tournament', colors: ['rgba(168,205,85,0.15)', 'rgba(227,168,91,0.08)'] as const, onPress: () => router.push('/create-matches') },
                { emoji: '🏏', label: 'Start New Match', colors: ['rgba(168,205,85,0.12)', 'rgba(89,199,73,0.06)'] as const, onPress: () => router.push('/create-matches') },
                { emoji: '📊', label: 'View Statistics', colors: ['rgba(168,205,85,0.15)', 'rgba(227,168,91,0.08)'] as const, onPress: () => {} },
                { emoji: '📄', label: 'Export Scorecards', colors: ['rgba(168,205,85,0.12)', 'rgba(227,168,91,0.06)'] as const, onPress: () => {} },
              ].map((qa) => (
                <TouchableOpacity key={qa.label} style={styles.quickActionCard} onPress={qa.onPress}>
                  <LinearGradient colors={qa.colors} style={styles.quickActionGradient}>
                    <Text style={{ fontSize: 24, marginBottom: 8 }}>{qa.emoji}</Text>
                    <Text style={styles.quickActionLabel}>{qa.label}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F1',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 13,
    color: '#8A8A8A',
    lineHeight: 18,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#8A8A8A',
    fontWeight: '500',
  },
  filterScrollContainer: {
    marginBottom: 16,
  },
  filterChipsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterChipActive: {
    backgroundColor: '#F0F4EC',
    borderColor: '#A8CD55',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8A8A8A',
  },
  filterChipTextActive: {
    color: '#2D5016',
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#A8CD55',
  },
  matchCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  matchTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  matchTournament: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  matchDate: {
    fontSize: 11,
    color: '#8A8A8A',
  },
  matchTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  matchTypeTxt: {
    fontSize: 11,
    fontWeight: '800',
  },
  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  vsTeamCol: {
    flex: 1,
    alignItems: 'center',
  },
  teamLogo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F0F4EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  teamLogoTxt: {
    fontSize: 14,
    fontWeight: '800',
    color: '#2D5016',
  },
  teamName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    maxWidth: 72,
  },
  vsScoreCol: {
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  vsText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#CCCCCC',
    marginBottom: 2,
  },
  vsSmall: {
    fontSize: 10,
    color: '#CCCCCC',
    marginVertical: 1,
  },
  scoreTextA: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2D5016',
  },
  scoreTextB: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8A8A8A',
  },
  resultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 54,
  },
  resultTxt: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  matchBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  matchMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  metaTxt: {
    fontSize: 11,
    color: '#8A8A8A',
    fontWeight: '500',
  },
  chevronBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F0F4EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#8A8A8A',
    textAlign: 'center',
  },
  seasonCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  seasonGradient: {
    padding: 16,
  },
  seasonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  seasonItem: {
    alignItems: 'center',
    flex: 1,
  },
  seasonVal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  seasonLbl: {
    fontSize: 11,
    color: '#8A8A8A',
    fontWeight: '500',
  },
  achievementsScroll: {
    gap: 12,
    paddingRight: 20,
    paddingVertical: 4,
  },
  achievementCard: {
    width: 120,
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  achIconBg: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  achTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginBottom: 8,
    height: 32,
    lineHeight: 16,
  },
  achBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  achBadgeTxt: {
    fontSize: 10,
    fontWeight: '800',
  },
  graphCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#FFF',
  },
  graphBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 80,
    marginBottom: 16,
  },
  barGroup: {
    alignItems: 'center',
    gap: 3,
  },
  graphBar: {
    width: 8,
    borderRadius: 4,
  },
  barLabel: {
    fontSize: 10,
    color: '#8A8A8A',
    fontWeight: '600',
    marginTop: 4,
  },
  graphLegend: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendTxt: {
    fontSize: 12,
    color: '#8A8A8A',
    fontWeight: '500',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickActionCard: {
    width: '48%',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  quickActionGradient: {
    padding: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D5016',
    textAlign: 'center',
  },
});
