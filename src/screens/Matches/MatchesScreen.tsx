import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated as RNAnimated,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Easing as RNEasing,
} from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { db } from '../../services/firebase';
import { doc, deleteDoc } from 'firebase/firestore';
import { s, fs, sp, br, avatarSz } from '../../theme/responsive';

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

interface MatchesScreenProps {
  matches: any[];
  user: any;
  draftAvailable: boolean;
  draftData: any;
}

export default function MatchesScreen({
  matches,
  user,
  draftAvailable,
  draftData,
}: MatchesScreenProps) {
  const router = useRouter();
  const [matchFilter, setMatchFilter] = useState<'live' | 'history'>('live');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'practice' | 'tournament' | 'won' | 'lost'>('all');
  const [searchQuery, setSearchQuery] = useState('');

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

  const radarProgress = useSharedValue(0);
  useEffect(() => {
    radarProgress.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const radarStyle1 = useAnimatedStyle(() => {
    const t = radarProgress.value;
    const scale = 1 + t * 0.8;
    const opacity = 1 - t;
    return {
      transform: [{ scale }],
      opacity: opacity * 0.5,
    };
  });

  const radarStyle2 = useAnimatedStyle(() => {
    const t = (radarProgress.value + 0.33) % 1;
    const scale = 1 + t * 0.8;
    const opacity = 1 - t;
    return {
      transform: [{ scale }],
      opacity: opacity * 0.5,
    };
  });

  const radarStyle3 = useAnimatedStyle(() => {
    const t = (radarProgress.value + 0.66) % 1;
    const scale = 1 + t * 0.8;
    const opacity = 1 - t;
    return {
      transform: [{ scale }],
      opacity: opacity * 0.5,
    };
  });

  const displayMatches = useMemo(() => {
    return historyMatches.map((m: any, index: number) => {
      let result = 'Draw';
      if (m.result) {
        result = m.result;
      } else if (m.winner) {
        result = m.winner === 'teamA' ? 'Won' : 'Lost';
      } else if (m.status === 'completed') {
        const scoreA = parseInt(m.myScore?.split('/')[0] || m.teamAScore || '0');
        const scoreB = parseInt(m.oppScore?.split('/')[0] || m.teamBScore || '0');
        if (scoreA > scoreB) result = 'Won';
        else if (scoreB > scoreA) result = 'Lost';
      }

      return {
        ...m,
        id: m.id || `m_hist_${index}`,
        result,
        date: m.date || (m.createdAt ? new Date(m.createdAt.seconds * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recent Match'),
        matchType: m.matchType || (m.format === 'practice' ? 'Practice' : 'Tournament'),
      };
    });
  }, [historyMatches]);

  const filteredHistoryMatches = useMemo(() => {
    return displayMatches.filter((m: any) => {
      if (historyFilter === 'practice' && m.matchType.toLowerCase() !== 'practice') return false;
      if (historyFilter === 'tournament' && m.matchType.toLowerCase() !== 'tournament') return false;
      if (historyFilter === 'won' && m.result !== 'Won') return false;
      if (historyFilter === 'lost' && m.result !== 'Lost') return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const myTeam = (m.myTeamName || '').toLowerCase();
        const oppTeam = (m.oppTeamName || '').toLowerCase();
        const venue = (m.venueName || '').toLowerCase();
        const status = (m.statusText || '').toLowerCase();
        const formatLabel = (m.format || '').toLowerCase();
        if (!myTeam.includes(q) && !oppTeam.includes(q) && !venue.includes(q) && !status.includes(q) && !formatLabel.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [displayMatches, historyFilter, searchQuery]);

  const totalMatchesCount = displayMatches.length;
  const winsCount = useMemo(() => displayMatches.filter((m: any) => m.result === 'Won').length, [displayMatches]);
  const winRatePct = totalMatchesCount > 0 ? Math.round((winsCount / totalMatchesCount) * 100) : 0;
  
  const totalRunsCount = useMemo(() => {
    let runs = 0;
    displayMatches.forEach((m: any) => {
      const score = parseInt(m.myScore?.split('/')[0] || '0', 10);
      if (!isNaN(score)) runs += score;
    });
    return runs;
  }, [displayMatches]);

  const totalWicketsCount = useMemo(() => {
    let wickets = 0;
    displayMatches.forEach((m: any) => {
      const wkts = parseInt(m.myScore?.split('/')[1] || '0', 10);
      if (!isNaN(wkts)) wickets += wkts;
    });
    return wickets;
  }, [displayMatches]);

  const last5Matches = useMemo(() => displayMatches.slice(0, 5), [displayMatches]);

  const getResultStyle = (res: string) => {
    if (res === 'Won') return { bg: '#F0F9EB', border: '#A8CD55', text: '#2D5016' };
    if (res === 'Lost') return { bg: '#FFF0F0', border: '#FF4D4D', text: '#FF4D4D' };
    return { bg: '#F5F5F5', border: '#CCCCCC', text: '#8A8A8A' };
  };

  const getMatchBadgeStyle = (type: string) => {
    if (type.toLowerCase() === 'practice') return { bg: '#FFF9E6', text: '#E3A85B' };
    return { bg: '#F0F4EC', text: '#2D5016' };
  };

  const handleShareMatch = async (match: any) => {
    try {
      const shareMsg = `🏏 Crickstreet Match Result!\n\n🏆 ${match.myTeamName} vs ${match.oppTeamName}\n📅 Date: ${match.date}\n📍 Venue: ${match.venueName}\n📊 Scores: ${match.myTeamName} ${match.myScore} | ${match.oppTeamName} ${match.oppScore}\n⚡ Result: ${match.statusText || match.result}\n\nScored on Crickstreet!`;
      await Share.share({
        message: shareMsg,
        title: 'Crickstreet Scorecard',
      });
    } catch (err) {
      console.error('Error sharing match scorecard:', err);
    }
  };

  const handleShowStats = (match: any) => {
    const runs = parseInt(match.myScore?.split('/')[0] || '0', 10);
    const wickets = parseInt(match.myScore?.split('/')[1] || '0', 10);
    const oppRuns = parseInt(match.oppScore?.split('/')[0] || '0', 10);
    const oppWickets = parseInt(match.oppScore?.split('/')[1] || '0', 10);
    
    Alert.alert(
      'Match Performance 📈',
      `Detailed innings statistics:\n\n` + 
      `🟢 ${match.myTeamName || 'Storm XI'}:\n` +
      `   • Runs: ${runs}\n` +
      `   • Wickets Lost: ${wickets}\n` +
      `   • Avg. Run Rate: ${(runs / 20).toFixed(1)} rpo\n\n` +
      `🔴 ${match.oppTeamName || 'Opponents'}:\n` +
      `   • Runs: ${oppRuns}\n` +
      `   • Wickets Lost: ${oppWickets}\n` +
      `   • Avg. Run Rate: ${(oppRuns / 20).toFixed(1)} rpo\n\n` +
      `🏅 Venue: ${match.venueName || 'Local Pitch'}\n` +
      `🏆 Format: ${match.format || 'T20'}`
    );
  };

  const handleDeleteMatch = (matchId: string) => {
    if (!user) return;
    Alert.alert(
      'Delete Match 🗑️',
      'Are you sure you want to permanently delete this match and all its associated scoring history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const matchRef = doc(db, 'users', user.uid, 'matches', matchId);
              await deleteDoc(matchRef);
              Alert.alert('Deleted 🎉', 'Match history record removed successfully.');
            } catch (err) {
              console.error('Error deleting match:', err);
              Alert.alert('Error', 'Could not delete the match from Firestore.');
            }
          }
        }
      ]
    );
  };

  const filterOptions: Array<{ key: typeof historyFilter; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'practice', label: 'Practice' },
    { key: 'tournament', label: 'Tournament' },
    { key: 'won', label: 'Won' },
    { key: 'lost', label: 'Lost' },
  ];

  const statsCardsData = [
    { label: 'MATCHES', value: String(totalMatchesCount), color: '#2D5016', bg: '#F0F4EC', emoji: '🏏' },
    { label: 'WIN RATE', value: `${winRatePct}%`, color: '#E3A85B', bg: '#FFF9E6', emoji: '📈' },
    { label: 'TOTAL RUNS', value: String(totalRunsCount), color: '#A8CD55', bg: '#F0F4EC', emoji: '⚡' },
    { label: 'WICKETS', value: String(totalWicketsCount), color: '#FF4D4D', bg: '#FFF0F0', emoji: '🎯' },
  ];

  function formatLastUpdated(timestamp: any) {
    if (!timestamp) return 'Just now';
    const date = timestamp.seconds ? new Date(timestamp.seconds * 1000) : new Date(timestamp);
    const diffMs = new Date().getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  return (
    <View style={styles.premiumMatchesContainer}>
      {/* Header */}
      <View style={styles.premiumHeader}>
        <Text style={styles.premiumHeaderTitle}>Matches Hub</Text>
        <Text style={styles.premiumHeaderSub}>Track live scoring, history & stats</Text>
      </View>

      {/* Tab switch bar */}
      <View style={styles.premiumTabBar}>
        <TouchableOpacity
          style={[styles.premiumTabButton, matchFilter === 'live' && styles.premiumTabActive]}
          onPress={() => setMatchFilter('live')}
        >
          <Feather name="play-circle" size={14} color={matchFilter === 'live' ? '#2D5016' : '#8A8A8A'} style={{ marginRight: 6 }} />
          <Text style={[styles.premiumTabButtonText, matchFilter === 'live' && styles.premiumTabActiveText]}>Ongoing</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.premiumTabButton, matchFilter === 'history' && styles.premiumTabActive]}
          onPress={() => setMatchFilter('history')}
        >
          <Feather name="check-square" size={14} color={matchFilter === 'history' ? '#2D5016' : '#8A8A8A'} style={{ marginRight: 6 }} />
          <Text style={[styles.premiumTabButtonText, matchFilter === 'history' && styles.premiumTabActiveText]}>Match History</Text>
        </TouchableOpacity>
      </View>

      {matchFilter === 'live' ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.premiumMatchesScroll}>
          {liveMatches.length > 0 ? (
            liveMatches.map((m: any) => (
              <View key={m.id} style={styles.premiumMatchCard}>
                <View style={styles.premiumCardHeader}>
                  <View style={styles.premiumLiveBadge}>
                    <View style={styles.premiumLiveDot} />
                    <Text style={styles.premiumLiveTxt}>LIVE</Text>
                  </View>
                  <Text style={styles.premiumTypeLabel}>{m.format || 'T20'} • {m.venueName || 'Local Pitch'}</Text>
                </View>

                <View style={styles.premiumTeamsRow}>
                  <View style={styles.premiumTeamCol}>
                    <View style={[styles.premiumTeamLogoBg, { backgroundColor: '#F0F4EC' }]}>
                      <Text style={styles.premiumTeamLogoText}>{m.myTeamName ? m.myTeamName.slice(0, 2).toUpperCase() : 'MY'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.premiumTeamName}>{m.myTeamName}</Text>
                      <Text style={styles.premiumTeamScore}>{m.myScore || '0/0'}</Text>
                    </View>
                  </View>

                  <View style={styles.premiumVsTextContainer}>
                    <Text style={styles.premiumVsText}>VS</Text>
                  </View>

                  <View style={styles.premiumTeamCol}>
                    <View style={[styles.premiumTeamLogoBg, { backgroundColor: '#FFF0F0' }]}>
                      <Text style={[styles.premiumTeamLogoText, { color: '#FF4D4D' }]}>{m.oppTeamName ? m.oppTeamName.slice(0, 2).toUpperCase() : 'OP'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.premiumTeamName}>{m.oppTeamName}</Text>
                      <Text style={styles.premiumTeamScore}>{m.oppScore || '0/0'}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.premiumDivider} />
                
                <View style={styles.premiumCardFooter}>
                  <Text style={styles.premiumStatusTxt}>🏏 {m.statusText || 'Scoring in progress'}</Text>
                  <TouchableOpacity
                    style={styles.premiumContinueBtn}
                    onPress={() => {
                      router.push({
                        pathname: '/scorecard',
                        params: {
                          myTeamName: m.myTeamName,
                          oppTeamName: m.oppTeamName,
                          myPlayers: JSON.stringify(m.myPlayers || []),
                          oppPlayers: JSON.stringify(m.oppPlayers || []),
                          matchId: m.id,
                        },
                      });
                    }}
                  >
                    <Text style={styles.premiumContinueBtnText}>Continue Scoring</Text>
                    <Feather name="chevron-right" size={13} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          ) : (
            <Animated.View
              entering={FadeInDown.duration(600).springify().damping(18)}
              style={styles.illustrationEmptyRoot}
            >
              {/* Custom Pulsing Radar Stadium Graphic */}
              <View style={styles.radarGraphicContainer}>
                <Animated.View style={[styles.radarRing, radarStyle1]} />
                <Animated.View style={[styles.radarRing, radarStyle2]} />
                <Animated.View style={[styles.radarRing, radarStyle3]} />
                
                <Animated.View style={[styles.radarCenterBadge, floatStyle]}>
                  <LinearGradient
                    colors={['#F0F4EC', '#D4E2C6']}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <MaterialCommunityIcons name="stadium" size={36} color="#2D5016" />
                </Animated.View>
              </View>

              <Text style={styles.emptyIllustrationTitle}>No Live Matches</Text>
              <Text style={styles.emptyIllustrationDesc}>
                Start scoring your live cricket matches in real-time. Manage your team roster, coordinate grounds, and track player stats automatically.
              </Text>

              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => router.push('/create-matches')}
                style={{ width: '100%', marginBottom: 24 }}
              >
                <Animated.View style={[styles.emptyIllustrationCta, buttonPulseStyle]}>
                  <LinearGradient
                    colors={['#A8CD55', '#E3A85B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.emptyIllustrationCtaGradient}
                  >
                    <Feather name="plus-circle" size={18} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.emptyIllustrationCtaText}>Start New Match</Text>
                  </LinearGradient>
                </Animated.View>
              </TouchableOpacity>

              <View style={styles.quickGridContainer}>
                <Text style={styles.quickGridTitle}>QUICK ACTION SETUP</Text>
                <View style={styles.quickGridRow}>
                  <TouchableOpacity
                    style={styles.quickActionCell}
                    onPress={() => router.push('/create-matches?flow=practice')}
                  >
                    <View style={[styles.quickCellIconBg, { backgroundColor: '#FFF9E6' }]}>
                      <Text style={styles.quickCellIcon}>⚡</Text>
                    </View>
                    <Text style={styles.quickCellTitle}>Practice Match</Text>
                    <Text style={styles.quickCellDesc}>Single team scorecard quick run</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.quickActionCell}
                    onPress={() => router.push('/create-matches?flow=tournament')}
                  >
                    <View style={[styles.quickCellIconBg, { backgroundColor: '#F0F4EC' }]}>
                      <Text style={styles.quickCellIcon}>🏆</Text>
                    </View>
                    <Text style={styles.quickCellTitle}>Tournament</Text>
                    <Text style={styles.quickCellDesc}>Two-team official league match</Text>
                  </TouchableOpacity>
                </View>

                {draftAvailable && (
                  <TouchableOpacity
                    style={styles.resumeDraftCell}
                    onPress={() => router.push('/create-matches?resume=true')}
                  >
                    <View style={[styles.quickCellIconBg, { backgroundColor: '#FFF0F0' }]}>
                      <Text style={styles.quickCellIcon}>💾</Text>
                    </View>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.resumeDraftTitle}>Resume Draft</Text>
                      <Text style={styles.resumeDraftDesc}>
                        {draftData?.myTeamName || 'Unknown Team'} vs {draftData?.oppTeamName || 'Opponent'} (Saved Draft)
                      </Text>
                    </View>
                    <Feather name="arrow-right-circle" size={18} color="#2D5016" />
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          )}
          <View style={{ height: 120 }} />
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.premiumMatchesScroll}>
          <View style={styles.searchBarWrapper}>
            <Feather name="search" size={16} color="#8A8A8A" style={styles.searchBarIcon} />
            <TextInput
              style={styles.searchBarInput}
              placeholder="Search team, venue or result..."
              placeholderTextColor="#A1A1A1"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Feather name="x" size={16} color="#8A8A8A" style={{ padding: 4 }} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollRow}>
            {filterOptions.map(option => {
              const isActive = historyFilter === option.key;
              return (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.historyFilterChip, isActive && styles.historyFilterChipActive]}
                  onPress={() => setHistoryFilter(option.key)}
                >
                  <Text style={[styles.historyFilterChipText, isActive && styles.historyFilterChipTextActive]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.historyStatsCard}>
            <Text style={styles.historyStatsCardHeader}>📊 SUMMARY DASHBOARD</Text>
            <View style={styles.historyStatsGrid}>
              {statsCardsData.map((item, index) => (
                <View key={index} style={styles.historyStatsGridItem}>
                  <View style={[styles.historyStatsIconBg, { backgroundColor: item.bg }]}>
                    <Text style={{ fontSize: 16 }}>{item.emoji}</Text>
                  </View>
                  <View>
                    <Text style={styles.historyStatsItemLabel}>{item.label}</Text>
                    <Text style={[styles.historyStatsItemVal, { color: item.color }]}>{item.value}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.recentFormContainer}>
              <Text style={styles.recentFormLabel}>L5 RECENT FORM</Text>
              <View style={styles.recentFormDotsRow}>
                {last5Matches.length > 0 ? (
                  last5Matches.map((m: any) => {
                    const style = getResultStyle(m.result);
                    return (
                      <View key={m.id} style={[styles.recentFormDot, { backgroundColor: style.bg, borderColor: style.border }]}>
                        <Text style={[styles.recentFormDotText, { color: style.text }]}>
                          {m.result.slice(0, 1)}
                        </Text>
                      </View>
                    );
                  })
                ) : (
                  <Text style={styles.noFormText}>No recent matches to display form history</Text>
                )}
              </View>
            </View>
          </View>

          {filteredHistoryMatches.length > 0 ? (
            filteredHistoryMatches.map((match: any) => {
              const style = getResultStyle(match.result);
              const badgeStyle = getMatchBadgeStyle(match.matchType);
              return (
                <View key={match.id} style={[styles.premiumMatchCard, { borderLeftWidth: 4, borderLeftColor: style.border }]}>
                  <View style={styles.premiumCardHeader}>
                    <View style={[styles.premiumTypeBadge, { backgroundColor: badgeStyle.bg }]}>
                      <Text style={[styles.premiumTypeBadgeTxt, { color: badgeStyle.text }]}>
                        {match.matchType.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.premiumTypeLabel}>{match.date} • {match.venueName || 'Local Pitch'}</Text>
                  </View>

                  <View style={styles.premiumTeamsRow}>
                    <View style={styles.premiumTeamCol}>
                      <View style={[styles.premiumTeamLogoBg, { backgroundColor: '#F0F4EC' }]}>
                        <Text style={styles.premiumTeamLogoText}>{match.myTeamName ? match.myTeamName.slice(0, 2).toUpperCase() : 'MY'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.premiumTeamName} numberOfLines={1}>{match.myTeamName}</Text>
                        <Text style={styles.premiumTeamScore}>{match.myScore || '0/0'}</Text>
                      </View>
                    </View>

                    <View style={styles.premiumVsTextContainer}>
                      <Text style={styles.premiumVsText}>VS</Text>
                    </View>

                    <View style={styles.premiumTeamCol}>
                      <View style={[styles.premiumTeamLogoBg, { backgroundColor: '#FFF0F0' }]}>
                        <Text style={[styles.premiumTeamLogoText, { color: '#FF4D4D' }]}>{match.oppTeamName ? match.oppTeamName.slice(0, 2).toUpperCase() : 'OP'}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.premiumTeamName} numberOfLines={1}>{match.oppTeamName}</Text>
                        <Text style={styles.premiumTeamScore}>{match.oppScore || '0/0'}</Text>
                      </View>
                    </View>

                    <View style={[styles.historyResultBadge, { backgroundColor: style.bg, borderColor: style.border }]}>
                      <Text style={[styles.historyResultText, { color: style.text }]}>{match.result}</Text>
                    </View>
                  </View>

                  <View style={styles.premiumDivider} />

                  <Text style={styles.historyStatusFinishedText}>{match.statusText || 'Match completed'}</Text>

                  <View style={styles.premiumDivider} />

                  <View style={styles.historyActionButtonsRow}>
                    <TouchableOpacity
                      style={styles.historyCardActionBtn}
                      onPress={() => {
                        router.push({
                          pathname: '/scorecard',
                          params: {
                            myTeamName: match.myTeamName,
                            oppTeamName: match.oppTeamName,
                            myPlayers: JSON.stringify(match.myPlayers || []),
                            oppPlayers: JSON.stringify(match.oppPlayers || []),
                            matchId: match.id,
                          },
                        });
                      }}
                    >
                      <Feather name="file-text" size={13} color="#2D5016" />
                      <Text style={styles.historyCardActionBtnText}>Scorecard</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.historyCardActionBtn}
                      onPress={() => handleShowStats(match)}
                    >
                      <Feather name="bar-chart-2" size={13} color="#2D5016" />
                      <Text style={styles.historyCardActionBtnText}>Statistics</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.historyCardActionBtnSquare}
                      onPress={() => handleShareMatch(match)}
                    >
                      <Feather name="share-2" size={13} color="#2D5016" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.historyCardActionBtnSquare, { backgroundColor: '#FFF0F0' }]}
                      onPress={() => handleDeleteMatch(match.id)}
                    >
                      <Feather name="trash-2" size={13} color="#FF4D4D" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })
          ) : (
            <Animated.View
              entering={FadeInDown.duration(600).springify().damping(18)}
              style={styles.illustrationEmptyRoot}
            >
              <View style={[styles.emptyIllustrationRing, { backgroundColor: '#F5F5F5' }]}>
                <Feather name="archive" size={28} color="#8A8A8A" />
              </View>
              <Text style={styles.emptyIllustrationTitle}>No Match History</Text>
              <Text style={styles.emptyIllustrationDesc}>
                No matches were found matching the filters or search query. Play more matches or clear the filters.
              </Text>
            </Animated.View>
          )}
          <View style={{ height: 120 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  premiumMatchesContainer: {
    flex: 1,
    backgroundColor: '#F3F4F1',
  },
  premiumHeader: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 48 : 28,
    paddingBottom: 16,
  },
  premiumHeaderTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  premiumHeaderSub: {
    fontSize: 13,
    color: '#8A8A8A',
  },
  premiumTabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  premiumTabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  premiumTabActive: {
    backgroundColor: '#F0F4EC',
  },
  premiumTabButtonText: {
    color: '#8A8A8A',
    fontSize: 13,
    fontWeight: '600',
  },
  premiumTabActiveText: {
    color: '#2D5016',
    fontWeight: '800',
  },
  premiumMatchesScroll: {
    paddingHorizontal: 20,
  },
  premiumMatchCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  premiumCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  premiumLiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    borderWidth: 0.5,
    borderColor: '#FF4D4D',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  premiumLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4D4D',
    marginRight: 4,
  },
  premiumLiveTxt: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FF4D4D',
  },
  premiumTypeLabel: {
    fontSize: 12,
    color: '#8A8A8A',
    fontWeight: '600',
  },
  premiumTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  premiumTeamCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  premiumTeamLogoBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0E0E0',
  },
  premiumTeamLogoText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2D5016',
  },
  premiumTeamName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  premiumTeamScore: {
    fontSize: 13,
    color: '#8A8A8A',
    fontWeight: '600',
  },
  premiumVsTextContainer: {
    paddingHorizontal: 6,
    alignItems: 'center',
  },
  premiumVsText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#A8CD55',
  },
  premiumDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  premiumCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  premiumStatusTxt: {
    fontSize: 12,
    color: '#2D5016',
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  premiumContinueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D5016',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  premiumContinueBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
    marginRight: 4,
  },
  illustrationEmptyRoot: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyIllustrationRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F0F4EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyIllustrationTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  emptyIllustrationDesc: {
    fontSize: 13,
    color: '#8A8A8A',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  emptyIllustrationCta: {
    borderRadius: 100,
    overflow: 'hidden',
    width: '100%',
    marginBottom: 24,
  },
  emptyIllustrationCtaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  emptyIllustrationCtaText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '800',
  },
  quickGridContainer: {
    width: '100%',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 20,
  },
  quickGridTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A8A8A',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  quickGridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionCell: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 16,
    padding: 12,
    alignItems: 'flex-start',
    gap: 4,
  },
  quickCellIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  quickCellIcon: {
    fontSize: 14,
  },
  quickCellTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  quickCellDesc: {
    fontSize: 9,
    color: '#8A8A8A',
    lineHeight: 12,
  },
  resumeDraftCell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 16,
    padding: 12,
    gap: 10,
    marginTop: 10,
  },
  resumeDraftTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2D5016',
  },
  resumeDraftDesc: {
    fontSize: 9,
    color: '#8A8A8A',
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  searchBarIcon: {
    marginRight: 8,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 13,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  filterScrollRow: {
    gap: 8,
    paddingVertical: 4,
    marginBottom: 16,
  },
  historyFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  historyFilterChipActive: {
    backgroundColor: '#F0F4EC',
    borderColor: '#A8CD55',
  },
  historyFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8A8A8A',
  },
  historyFilterChipTextActive: {
    color: '#2D5016',
    fontWeight: '700',
  },
  historyStatsCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 3,
  },
  historyStatsCardHeader: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A8A8A',
    letterSpacing: 0.8,
    marginBottom: 14,
  },
  historyStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  historyStatsGridItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  historyStatsIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyStatsItemLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8A8A8A',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  historyStatsItemVal: {
    fontSize: 15,
    fontWeight: '800',
  },
  recentFormContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 14,
  },
  recentFormLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#8A8A8A',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  recentFormDotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  recentFormDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentFormDotText: {
    fontSize: 10,
    fontWeight: '800',
  },
  noFormText: {
    fontSize: 11,
    color: '#8A8A8A',
    fontStyle: 'italic',
  },
  premiumTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  premiumTypeBadgeTxt: {
    fontSize: 9,
    fontWeight: '800',
  },
  historyResultBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'center',
  },
  historyResultText: {
    fontSize: 11,
    fontWeight: '800',
  },
  historyStatusFinishedText: {
    fontSize: 12,
    color: '#8A8A8A',
    fontWeight: '500',
    marginVertical: 4,
  },
  historyActionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  historyCardActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#F0F4EC',
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 0.5,
    borderColor: 'rgba(168,205,85,0.3)',
  },
  historyCardActionBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2D5016',
  },
  historyCardActionBtnSquare: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  radarGraphicContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  radarRing: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: '#59C749',
  },
  radarCenterBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#59C749',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
});
