import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { s, fs, sp, br } from '../../theme/responsive';

interface ContinueScoreCardProps {
  unfinishedMatch: any;
}

export default function ContinueScoreCard({ unfinishedMatch }: ContinueScoreCardProps) {
  const router = useRouter();

  if (!unfinishedMatch) return null;

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
    <View style={styles.dashboardSection}>
      <Text style={styles.dashboardSectionTitle}>CONTINUE SCORES</Text>
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => router.push({
          pathname: '/scorecard',
          params: {
            matchId: unfinishedMatch.id,
            myTeamName: unfinishedMatch.myTeamName,
            oppTeamName: unfinishedMatch.oppTeamName
          }
        })}
        style={styles.continueMatchCard}
      >
        <View style={styles.continueMatchHeader}>
          <View style={styles.liveIndicatorBadge}>
            <View style={styles.liveIndicatorDot} />
            <Text style={styles.liveIndicatorText}>LIVE</Text>
          </View>
          <Text style={styles.continueMatchTime}>{formatLastUpdated(unfinishedMatch.updatedAt || unfinishedMatch.createdAt)}</Text>
        </View>
        
        <View style={styles.continueMatchTeamsRow}>
          <View style={styles.continueMatchTeamCol}>
            <Text style={styles.continueMatchTeamName} numberOfLines={1}>{unfinishedMatch.myTeamName || 'My Team'}</Text>
            <Text style={styles.continueMatchTeamScore}>{unfinishedMatch.myScore || '0/0'}</Text>
          </View>
          <Text style={styles.continueMatchVsText}>vs</Text>
          <View style={styles.continueMatchTeamCol}>
            <Text style={styles.continueMatchTeamName} numberOfLines={1}>{unfinishedMatch.oppTeamName || 'Opp Team'}</Text>
            <Text style={styles.continueMatchTeamScore}>{unfinishedMatch.oppScore || '0/0'}</Text>
          </View>
        </View>
        
        <View style={styles.continueMatchFooter}>
          <Text style={styles.continueMatchFormatText}>🏏 Format: {unfinishedMatch.format || 'Overs'}</Text>
          <View style={styles.continueActionBtn}>
            <Text style={styles.continueActionBtnText}>Resume</Text>
            <Feather name="arrow-right" size={14} color="#FFF" />
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  dashboardSection: {
    paddingHorizontal: sp.lg,
    marginBottom: sp.lg,
  },
  dashboardSectionTitle: {
    fontSize: fs.sm2,
    fontWeight: '800',
    color: '#8A8A8A',
    letterSpacing: 1.0,
    marginBottom: sp.md,
  },
  continueMatchCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: br.xxl,
    padding: sp.lg,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E8E4D4',
  },
  continueMatchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp.md,
  },
  liveIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    borderWidth: 0.5,
    borderColor: '#FF4D4D',
    paddingHorizontal: sp.sm,
    paddingVertical: sp.xs,
    borderRadius: br.sm,
  },
  liveIndicatorDot: {
    width: s(6),
    height: s(6),
    borderRadius: s(3),
    backgroundColor: '#FF4D4D',
    marginRight: 6,
  },
  liveIndicatorText: {
    fontSize: fs.xxs,
    fontWeight: '800',
    color: '#FF4D4D',
    letterSpacing: 0.5,
  },
  continueMatchTime: {
    fontSize: fs.sm,
    color: '#8A8A8A',
    fontWeight: '600',
  },
  continueMatchTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    marginBottom: sp.lg,
  },
  continueMatchTeamCol: {
    flex: 1,
    gap: sp.px2,
  },
  continueMatchTeamName: {
    fontSize: fs.md2,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  continueMatchTeamScore: {
    fontSize: fs.lg,
    fontWeight: '800',
    color: '#2D5016',
  },
  continueMatchVsText: {
    fontSize: fs.sm,
    fontWeight: '800',
    color: '#A8CD55',
    paddingHorizontal: sp.xs,
  },
  continueMatchFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: sp.md,
  },
  continueMatchFormatText: {
    fontSize: fs.sm,
    color: '#8A8A8A',
    fontWeight: '700',
  },
  continueActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D5016',
    paddingVertical: sp.sm2,
    paddingHorizontal: sp.md,
    borderRadius: br.md2,
    gap: sp.xs,
  },
  continueActionBtnText: {
    fontSize: fs.sm,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
