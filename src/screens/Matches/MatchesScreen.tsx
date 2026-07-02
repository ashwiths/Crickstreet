import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { s, fs, sp, br, avatarSz } from '../../theme/responsive';

interface MatchesScreenProps {
  matches: any[];
  user: any;
  draftAvailable: boolean;
  draftData: any;
}

export default function MatchesScreen({
  matches = [],
}: MatchesScreenProps) {
  const insets = useSafeAreaInsets();
  const [analyzing, setAnalyzing] = useState(false);
  const [aiReport, setAiReport] = useState<string | null>(null);

  // Filter completed matches
  const completedMatches = useMemo(() => {
    return matches.filter((m: any) => m.status === 'completed');
  }, [matches]);

  // Aggregate statistics
  const stats = useMemo(() => {
    const total = completedMatches.length;
    const wins = completedMatches.filter((m: any) => {
      if (m.result === 'Won') return true;
      if (m.winner === 'teamA') return true;
      // Compare scores
      const scoreA = parseInt(m.myScore?.split('/')[0] || m.teamAScore || '0', 10);
      const scoreB = parseInt(m.oppScore?.split('/')[0] || m.teamBScore || '0', 10);
      return scoreA > scoreB;
    }).length;

    const losses = completedMatches.filter((m: any) => {
      if (m.result === 'Lost') return true;
      if (m.winner === 'teamB') return true;
      // Compare scores
      const scoreA = parseInt(m.myScore?.split('/')[0] || m.teamAScore || '0', 10);
      const scoreB = parseInt(m.oppScore?.split('/')[0] || m.teamBScore || '0', 10);
      return scoreB > scoreA;
    }).length;

    const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

    let totalRuns = 0;
    let totalWickets = 0;
    let highestScore = 0;
    let highestScoreStr = '0/0';
    let lowestScore = 9999;
    let lowestScoreStr = '0/0';

    completedMatches.forEach((m: any) => {
      const scoreStr = m.myScore || `${m.teamAScore || 0}/${m.teamAWickets || 0}`;
      const parts = scoreStr.split('/');
      const runs = parseInt(parts[0], 10) || 0;
      const wickets = parseInt(parts[1], 10) || 0;

      totalRuns += runs;
      totalWickets += wickets;

      if (runs > highestScore) {
        highestScore = runs;
        highestScoreStr = scoreStr;
      }
      if (runs < lowestScore && runs > 0) {
        lowestScore = runs;
        lowestScoreStr = scoreStr;
      }
    });

    if (lowestScore === 9999) {
      lowestScoreStr = '0/0';
    }

    const averageScore = total > 0 ? Math.round((totalRuns / total) * 10) / 10 : 0.0;

    return {
      total,
      wins,
      losses,
      winRate,
      totalRuns,
      totalWickets,
      highestScoreStr,
      lowestScoreStr,
      averageScore,
    };
  }, [completedMatches]);

  // Triggers Team Analysis AI Report
  const handleAnalyze = () => {
    setAnalyzing(true);
    setAiReport(null);
    setTimeout(() => {
      if (stats.total === 0) {
        setAiReport(
          `🤖 **Crickstreet AI Team Analysis:**\n\n` +
          `📊 **Squad Stats Summary:**\n` +
          `• Total Matches: **0**\n` +
          `• Win Rate: **0%**\n` +
          `• Runs Scored: **0**\n\n` +
          `💡 **AI Suggestion:**\n` +
          `• Currently, your team analytics are at zero because no match records have been added yet.\n` +
          `• Go ahead and score your first cricket game using the "Create Match" button on the home screen to unlock AI strategic insights!`
        );
      } else {
        const report = `🤖 **Crickstreet AI Team Analysis:**\n\n` +
          `📊 **Performance Metrics:**\n` +
          `• Completed Matches: **${stats.total}**\n` +
          `• Win / Loss Record: **${stats.wins} Won - ${stats.losses} Lost**\n` +
          `• Win Rate: **${stats.winRate}%**\n` +
          `• Avg Score: **${stats.averageScore} runs/innings**\n\n` +
          `💡 **AI Tactical Insights:**\n` +
          `• Your team average innings score of **${stats.averageScore}** indicates a steady batting group. ${stats.winRate >= 50 ? 'You have a positive win momentum.' : 'Focus on middle-overs strike rotation to improve your win rate.'}\n` +
          `• Highest recorded total is **${stats.highestScoreStr}**. Try to match this consistency across games.`;
        setAiReport(report);
      }
      setAnalyzing(false);
    }, 1500);
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
            <Text style={styles.pageTitle}>Stats</Text>
            <Text style={styles.pageSubtitle}>AI-powered squad metrics and team analysis.</Text>
          </View>
        </Animated.View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 140 }]}
        >
          {/* Section: Team Performance Overview */}
          <Animated.View entering={FadeInDown.delay(100).duration(450)}>
            <Text style={styles.sectionHeader}>Performance Overview 📈</Text>
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: '#F0F4EC' }]}>
                  <Text style={{ fontSize: 18 }}>🏏</Text>
                </View>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>Matches Played</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: '#FFF9E6' }]}>
                  <Text style={{ fontSize: 18 }}>🏆</Text>
                </View>
                <Text style={styles.statValue}>{stats.winRate}%</Text>
                <Text style={styles.statLabel}>Win Rate</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: '#FFF0F0' }]}>
                  <Text style={{ fontSize: 18 }}>🔥</Text>
                </View>
                <Text style={styles.statValue}>{stats.wins} - {stats.losses}</Text>
                <Text style={styles.statLabel}>Won / Lost</Text>
              </View>

              <View style={styles.statCard}>
                <View style={[styles.statIconBg, { backgroundColor: '#E5F2D9' }]}>
                  <Text style={{ fontSize: 18 }}>⚡</Text>
                </View>
                <Text style={styles.statValue}>{stats.averageScore}</Text>
                <Text style={styles.statLabel}>Average Score</Text>
              </View>
            </View>
          </Animated.View>

          {/* Section: Records */}
          <Animated.View entering={FadeInDown.delay(200).duration(450)}>
            <Text style={styles.sectionHeader}>Team Records 📝</Text>

            <View style={styles.recordCard}>
              <View style={[styles.recordIconCircle, { backgroundColor: '#F0F4EC' }]}>
                <Feather name="trending-up" size={18} color="#2D5016" />
              </View>
              <View style={styles.recordTextCol}>
                <Text style={styles.recordTitleText}>Highest Team Total</Text>
                <Text style={styles.recordValueText}>{stats.highestScoreStr}</Text>
              </View>
            </View>

            <View style={styles.recordCard}>
              <View style={[styles.recordIconCircle, { backgroundColor: '#FFF0F0' }]}>
                <Feather name="trending-down" size={18} color="#FF4D4D" />
              </View>
              <View style={styles.recordTextCol}>
                <Text style={styles.recordTitleText}>Lowest Team Total</Text>
                <Text style={styles.recordValueText}>{stats.lowestScoreStr}</Text>
              </View>
            </View>

            <View style={styles.recordCard}>
              <View style={[styles.recordIconCircle, { backgroundColor: '#FFF9E6' }]}>
                <Feather name="award" size={18} color="#E3A85B" />
              </View>
              <View style={styles.recordTextCol}>
                <Text style={styles.recordTitleText}>Total Runs Scored</Text>
                <Text style={styles.recordValueText}>{stats.totalRuns} Runs</Text>
              </View>
            </View>

            <View style={styles.recordCard}>
              <View style={[styles.recordIconCircle, { backgroundColor: '#E5F2D9' }]}>
                <Feather name="shield" size={18} color="#59C749" />
              </View>
              <View style={styles.recordTextCol}>
                <Text style={styles.recordTitleText}>Total Wickets Taken</Text>
                <Text style={styles.recordValueText}>{stats.totalWickets} Wkts</Text>
              </View>
            </View>
          </Animated.View>

          {/* AI Team Analysis Panel */}
          <Animated.View entering={FadeInDown.delay(300).duration(450)} style={styles.aiPanelCard}>
            <View style={styles.aiHeaderRow}>
              <View style={styles.aiIconBadge}>
                <Feather name="zap" size={18} color="#FFFFFF" />
              </View>
              <Text style={styles.aiPanelTitle}>Crickstreet AI Team Analyst</Text>
            </View>
            <Text style={styles.aiPanelDesc}>
              Tap the button to run an AI diagnostics scan on your match records and receive team recommendations.
            </Text>

            {analyzing ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#59C749" />
                <Text style={styles.loadingText}>AI is calculating win rates, run averages, and economies...</Text>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.85}
                style={styles.aiBtn}
                onPress={handleAnalyze}
              >
                <Feather name="cpu" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.aiBtnText}>Analyze Team with AI</Text>
              </TouchableOpacity>
            )}

            {aiReport && (
              <Animated.View entering={FadeInDown.duration(400)} style={styles.reportBox}>
                <Text style={styles.reportText}>{aiReport}</Text>
              </Animated.View>
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
  scrollContent: {
    paddingHorizontal: sp.xl,
  },
  aiPanelCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: br.xxl,
    padding: sp.lg,
    marginBottom: sp.xl,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E8E4D4',
  },
  aiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    marginBottom: sp.sm,
  },
  aiIconBadge: {
    width: s(36),
    height: s(36),
    borderRadius: br.md,
    backgroundColor: '#59C749',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiPanelTitle: {
    fontSize: fs.md2,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  aiPanelDesc: {
    fontSize: fs.sm,
    color: '#6B7280',
    lineHeight: fs.sm * 1.45,
    marginBottom: sp.lg,
  },
  aiBtn: {
    backgroundColor: '#59C749',
    paddingVertical: 12,
    borderRadius: br.full,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBtnText: {
    fontSize: fs.sm,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: sp.sm,
  },
  loadingText: {
    fontSize: fs.xs,
    color: '#8A8A8A',
    marginTop: sp.xs,
    textAlign: 'center',
  },
  reportBox: {
    backgroundColor: '#F0F4EC',
    borderRadius: br.lg,
    borderWidth: 1,
    borderColor: 'rgba(168,205,85,0.3)',
    padding: sp.md,
    marginTop: sp.md,
  },
  reportText: {
    fontSize: fs.sm,
    color: '#2D5016',
    lineHeight: fs.sm * 1.45,
  },
  sectionHeader: {
    fontSize: fs.xl,
    fontWeight: '800',
    color: '#1A1A1A',
    marginTop: sp.lg,
    marginBottom: sp.md,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: sp.md,
  },
  statCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: br.xxl,
    padding: sp.lg,
    marginBottom: s(12),
    shadowColor: 'rgba(0,0,0,0.03)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E8E4D4',
  },
  statIconBg: {
    width: avatarSz.md,
    height: avatarSz.md,
    borderRadius: br.md3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sp.md,
  },
  statValue: {
    fontSize: fs.xxl,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: sp.xs,
  },
  statLabel: {
    fontSize: fs.base,
    color: '#8A8A8A',
    fontWeight: '600',
  },
  recordCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: br.xxl,
    padding: sp.lg,
    marginBottom: sp.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E4D4',
    shadowColor: 'rgba(0,0,0,0.03)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 2,
  },
  recordIconCircle: {
    width: s(40),
    height: s(40),
    borderRadius: br.md3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: sp.md,
  },
  recordTextCol: {
    flex: 1,
  },
  recordTitleText: {
    fontSize: fs.md2,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  recordValueText: {
    fontSize: fs.sm,
    color: '#8A8A8A',
    fontWeight: '700',
    marginTop: 2,
  },
});
