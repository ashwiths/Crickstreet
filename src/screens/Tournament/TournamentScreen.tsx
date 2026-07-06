import React, { useState, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, fs, sp, br, avatarSz } from '../../theme/responsive';
import { useAuth } from '../../hooks/useAuth';
import { db } from '../../services/firebase';
import { deleteDoc, doc } from 'firebase/firestore';

interface HistoryScreenProps {
  onBack?: () => void;
  matches?: any[];
  userStats?: any;
}

export default function TournamentScreen({
  onBack,
  matches = [],
  userStats,
}: HistoryScreenProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState<'all' | 'tournament' | 'practice' | 'won' | 'lost'>('all');
  const { user } = useAuth();

  const handleDeleteMatch = async (matchId: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'matches', matchId));
    } catch (err) {
      console.error('Error deleting match:', err);
    }
  };

  const displayMatches = useMemo(() => {
    return matches.map((m: any, index: number) => {
      let result = 'Draw';
      if (m.result) {
        result = m.result;
      } else if (m.winner) {
        if (m.winner === 'my' || m.winner === 'teamA') {
          result = 'Won';
        } else if (m.winner === 'opp' || m.winner === 'teamB') {
          result = 'Lost';
        } else {
          result = 'Draw';
        }
      } else if (m.status === 'completed') {
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
        matchType: m.matchType || (m.status === 'live' ? 'Live' : 'Practice'),
        myTeam: m.myTeamName || 'Storm XI',
        oppTeam: m.oppTeamName || 'Opp Team',
        result: result,
        myScore: m.myScore || `${m.teamAScore || 0}/${m.teamAWickets || 0}`,
        oppScore: m.oppScore || `${m.teamBScore || 0}/${m.teamBWickets || 0}`,
        overs: m.overs || m.format || '20 Ov',
        potm: m.potm || 'N/A',
        venue: m.venueName || m.venue || 'Local',
        statusText: m.statusText || '',
      };
    });
  }, [matches]);

  const filterChips: Array<{ key: typeof filter; label: string }> = [
    { key: 'all', label: 'All Matches' },
    { key: 'tournament', label: 'Tournament' },
    { key: 'practice', label: 'Practice' },
    { key: 'won', label: 'Won' },
    { key: 'lost', label: 'Lost' },
  ];

  const filteredMatches = useMemo(() => {
    return displayMatches.filter((m) => {
      if (filter === 'all') return true;
      if (filter === 'tournament') return m.matchType?.toLowerCase().includes('tournament');
      if (filter === 'practice') return m.matchType?.toLowerCase().includes('practice');
      if (filter === 'won') return m.result === 'Won';
      if (filter === 'lost') return m.result === 'Lost';
      return true;
    });
  }, [displayMatches, filter]);

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

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#E5F2D9', '#F9E5C8', '#F3F4F1']}
        locations={[0, 0.4, 0.8]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { height: 180 + insets.top }]}
      />

      <View style={styles.safeArea}>
        <Animated.View
          entering={FadeInDown.duration(400)}
          style={[styles.header, { paddingTop: insets.top > 0 ? insets.top + 8 : 16 }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>History</Text>
            <Text style={styles.pageSubtitle}>Your past matches and game records.</Text>
          </View>
        </Animated.View>

        {/* Filter Chips Row */}
        <View style={styles.filtersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipsScroll}
          >
            {filterChips.map((chip) => {
              const active = filter === chip.key;
              return (
                <TouchableOpacity
                  key={chip.key}
                  activeOpacity={0.8}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setFilter(chip.key)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        >
          <Animated.View entering={FadeInDown.delay(150).duration(400)}>
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
                        <Text style={styles.matchDate}>{m.date} • {m.ground}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <TouchableOpacity
                          activeOpacity={0.7}
                          onPress={(e) => {
                            e.stopPropagation();
                            Alert.alert(
                              'Delete Match 🗑️',
                              'Are you sure you want to permanently delete this match scorecard and its stats history?',
                              [
                                { text: 'Cancel', style: 'cancel' },
                                { text: 'Delete', style: 'destructive', onPress: () => handleDeleteMatch(m.id) }
                              ]
                            );
                          }}
                          style={styles.trashBtn}
                        >
                          <Feather name="trash-2" size={15} color="#EF4444" />
                        </TouchableOpacity>

                        <View style={[styles.matchTypeBadge, { backgroundColor: badge.bg }]}>
                          <Text style={[styles.matchTypeTxt, { color: badge.text }]}>
                            {m.matchType}
                          </Text>
                        </View>
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
                      <View style={[styles.matchMeta, { flex: 1, marginRight: 8 }]}>
                        <Feather name="award" size={12} color="#8A8A8A" />
                        <Text style={styles.metaTxt} numberOfLines={1}>
                          {m.statusText ? `${m.statusText} (POM: ${m.potm})` : `POM: ${m.potm}`}
                        </Text>
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
    paddingHorizontal: sp.xl,
    paddingBottom: sp.md,
  },
  pageTitle: {
    fontSize: fs.h2,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: sp.xs,
  },
  pageSubtitle: {
    fontSize: fs.md,
    color: '#8A8A8A',
    lineHeight: fs.md * 1.4,
  },
  filtersContainer: {
    marginBottom: sp.md,
    paddingVertical: sp.xs,
  },
  chipsScroll: {
    paddingHorizontal: sp.xl,
    gap: sp.sm,
  },
  chip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: sp.md,
    paddingVertical: 8,
    borderRadius: br.full,
    borderWidth: 1,
    borderColor: '#E8E4D4',
  },
  chipActive: {
    backgroundColor: '#59C749',
    borderColor: '#59C749',
  },
  chipText: {
    fontSize: fs.sm,
    fontWeight: '700',
    color: '#6B7280',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: sp.xl,
  },
  matchCard: {
    backgroundColor: '#FFF',
    borderRadius: br.xxl,
    padding: sp.lg,
    marginBottom: sp.md,
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
    marginBottom: sp.md,
  },
  matchTournament: {
    fontSize: fs.md2,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  matchDate: {
    fontSize: fs.sm,
    color: '#8A8A8A',
  },
  matchTypeBadge: {
    paddingHorizontal: sp.md2,
    paddingVertical: sp.xs,
    borderRadius: br.sm,
  },
  matchTypeTxt: {
    fontSize: fs.sm,
    fontWeight: '800',
  },
  trashBtn: {
    padding: 6,
    borderRadius: br.sm,
    backgroundColor: '#FEF2F2',
    borderWidth: 0.5,
    borderColor: '#FEE2E2',
  },
  vsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: sp.xs,
  },
  vsTeamCol: {
    flex: 1,
    alignItems: 'center',
  },
  teamLogo: {
    width: avatarSz.md2,
    height: avatarSz.md2,
    borderRadius: br.md3,
    backgroundColor: '#F0F4EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sp.sm2,
  },
  teamLogoTxt: {
    fontSize: fs.md2,
    fontWeight: '800',
    color: '#2D5016',
  },
  teamName: {
    fontSize: fs.base,
    fontWeight: '600',
    color: '#1A1A1A',
    textAlign: 'center',
    maxWidth: s(80),
  },
  vsScoreCol: {
    alignItems: 'center',
    paddingHorizontal: sp.sm,
  },
  vsSmall: {
    fontSize: fs.xs,
    color: '#CCCCCC',
    marginVertical: 1,
  },
  scoreTextA: {
    fontSize: fs.md2,
    fontWeight: '800',
    color: '#2D5016',
  },
  scoreTextB: {
    fontSize: fs.md2,
    fontWeight: '600',
    color: '#8A8A8A',
  },
  resultBadge: {
    paddingHorizontal: sp.md2,
    paddingVertical: sp.sm2,
    borderRadius: br.md2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: s(54),
  },
  resultTxt: {
    fontSize: fs.sm,
    fontWeight: '800',
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: sp.md,
  },
  matchBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
  },
  matchMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.xs,
    flex: 1,
  },
  metaTxt: {
    fontSize: fs.sm,
    color: '#8A8A8A',
    fontWeight: '500',
  },
  chevronBtn: {
    width: s(28),
    height: s(28),
    borderRadius: s(14),
    backgroundColor: '#F0F4EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    backgroundColor: '#FFF',
    borderRadius: br.xxl,
    padding: sp.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: sp.md,
  },
  emptyText: {
    fontSize: fs.md,
    color: '#8A8A8A',
    textAlign: 'center',
  },
});
