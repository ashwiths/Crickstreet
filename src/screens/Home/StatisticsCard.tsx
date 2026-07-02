import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { s, fs, sp, br, avatarSz } from '../../theme/responsive';

// ─── Dashboard Subcomponents ──────────────────────────────────────────────────

function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [displayVal, setDisplayVal] = useState(0);
  
  useEffect(() => {
    let start = 0;
    const end = value;
    if (end === 0) {
      setDisplayVal(0);
      return;
    }
    const duration = 800; // 0.8 seconds duration
    const range = end - start;
    let current = start;
    const increment = end > start ? 1 : -1;
    const stepTime = Math.abs(Math.floor(duration / range));
    const timer = setInterval(() => {
      current += increment;
      setDisplayVal(current);
      if (current === end) {
        clearInterval(timer);
      }
    }, Math.max(stepTime, 16)); // max 60fps
    
    return () => clearInterval(timer);
  }, [value]);

  return <Text>{displayVal}{suffix}</Text>;
}

interface StatisticsCardProps {
  totalMatchesCount: number;
  totalRunsCount: number;
  totalWicketsCount: number;
  winRatePct: number;
  dashboardAchievements: {
    badges: Array<{ id: string; emoji: string; title: string; unlocked: boolean; progressText: string; color: string }>;
    nextBadge: string;
    progressPercent: number;
  };
  recentActivities: Array<{ type: string; title: string; desc: string; timestamp: Date; emoji: string }>;
  tipOfTheDay: string;
}

export default function StatisticsCard({
  totalMatchesCount,
  totalRunsCount,
  totalWicketsCount,
  winRatePct,
  dashboardAchievements,
  recentActivities,
  tipOfTheDay,
}: StatisticsCardProps) {

  const renderRecentActivitySection = () => (
    <View style={styles.dashboardSection}>
      <Text style={styles.dashboardSectionTitle}>RECENT ACTIVITY</Text>
      <View style={styles.activitiesContainerCard}>
        {recentActivities.length > 0 ? (
          recentActivities.map((act, index) => (
            <View key={index} style={styles.activityTimelineItem}>
              <View style={styles.activityLeftLineCol}>
                <View style={styles.activityEmojiCircle}>
                  <Text style={styles.activityEmojiText}>{act.emoji}</Text>
                </View>
                {index < recentActivities.length - 1 && (
                  <View style={styles.activityConnectorLine} />
                )}
              </View>
              <View style={styles.activityTextContent}>
                <View style={styles.activityRowHeader}>
                  <Text style={styles.activityItemTitle}>{act.title}</Text>
                  <Text style={styles.activityItemTime}>
                    {act.timestamp.toLocaleDateString([], {month: 'short', day: 'numeric'})}
                  </Text>
                </View>
                <Text style={styles.activityItemDesc}>{act.desc}</Text>
              </View>
            </View>
          ))
        ) : (
           <View style={styles.emptyActivitiesPlaceholder}>
              <Feather name="bell-off" size={24} color="#8A8A8A" style={{ marginBottom: 8 }} />
              <Text style={styles.emptyActivitiesTitle}>No recent activities yet</Text>
              <Text style={styles.emptyActivitiesDesc}>
                Your activity feed will automatically populate as you play matches, register teams, and scan player cards.
              </Text>
            </View>
        )}
      </View>
    </View>
  );

  const renderPremiumFooter = () => (
    <View style={styles.premiumFooterContainer}>
      <Text style={styles.footerVersion}>Crickstreet v1.0</Text>
      <Text style={styles.footerTagline}>Built for every street cricketer.</Text>
      <Text style={styles.footerCopyright}>© 2026 Crickstreet. All rights reserved.</Text>
      <View style={{ height: s(140) }} />
    </View>
  );

  return (
    <View style={{ width: '100%' }}>
      {/* 1. Statistics Grid */}
      <View style={styles.dashboardSection}>
        <Text style={styles.dashboardSectionTitle}>MY CRICKET STATISTICS</Text>
        <View style={styles.statsDashboardGrid}>
          <View style={styles.statGridCard}>
            <View style={[styles.statIconBg, { backgroundColor: '#F0F4EC' }]}>
              <Text style={styles.statIconEmoji}>🏏</Text>
            </View>
            <Text style={styles.statCardValue}>
              <AnimatedNumber value={totalMatchesCount} />
            </Text>
            <Text style={styles.statCardLabel}>Matches Played</Text>
          </View>

          <View style={styles.statGridCard}>
            <View style={[styles.statIconBg, { backgroundColor: '#FFF9E6' }]}>
              <Text style={styles.statIconEmoji}>⚡</Text>
            </View>
            <Text style={styles.statCardValue}>
              <AnimatedNumber value={totalRunsCount} />
            </Text>
            <Text style={styles.statCardLabel}>Total Runs</Text>
          </View>

          <View style={styles.statGridCard}>
            <View style={[styles.statIconBg, { backgroundColor: '#FFF0F0' }]}>
              <Text style={styles.statIconEmoji}>🎯</Text>
            </View>
            <Text style={styles.statCardValue}>
              <AnimatedNumber value={totalWicketsCount} />
            </Text>
            <Text style={styles.statCardLabel}>Total Wickets</Text>
          </View>

          <View style={styles.statGridCard}>
            <View style={[styles.statIconBg, { backgroundColor: '#F0F4EC' }]}>
              <Text style={styles.statIconEmoji}>📈</Text>
            </View>
            <Text style={styles.statCardValue}>
              <AnimatedNumber value={winRatePct} suffix="%" />
            </Text>
            <Text style={styles.statCardLabel}>Win Rate</Text>
          </View>
        </View>
      </View>

      {/* 2. Achievements Card */}
      <View style={styles.dashboardSection}>
        <Text style={styles.dashboardSectionTitle}>🏆 EARNED ACHIEVEMENTS</Text>
        <View style={styles.achievementsCard}>
          <View style={styles.badgesHorizontalRow}>
            {dashboardAchievements.badges.map(badge => (
              <View
                key={badge.id}
                style={[
                  styles.badgeWrapperCell,
                  !badge.unlocked && { opacity: 0.45 }
                ]}
              >
                <View style={[styles.badgeIconCircle, { backgroundColor: badge.unlocked ? '#F0F4EC' : '#F5F5F5', borderColor: badge.unlocked ? badge.color : '#CCCCCC' }]}>
                  <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                  {!badge.unlocked && (
                    <View style={styles.badgeLockContainer}>
                      <Feather name="lock" size={9} color="#8A8A8A" />
                    </View>
                  )}
                </View>
                <Text style={styles.badgeTitleText} numberOfLines={1}>{badge.title}</Text>
                <Text style={styles.badgeProgressText}>{badge.progressText}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.badgeProgressWrapper}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.progressNextText}>Next Milestone: {dashboardAchievements.nextBadge}</Text>
              <Text style={styles.progressPercentText}>{dashboardAchievements.progressPercent}%</Text>
            </View>
            <View style={styles.progressBarBackground}>
              <View
                style={[
                  styles.progressBarFill,
                  { width: `${dashboardAchievements.progressPercent}%` }
                ]}
              />
            </View>
          </View>
        </View>
      </View>

      {/* 3. Recent Activity */}
      {renderRecentActivitySection()}

      {/* 4. Tip of the Day */}
      <View style={styles.dashboardSection}>
        <View style={styles.tipCardContainer}>
          <LinearGradient
            colors={['#F0F4EC', '#FFF9E6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View style={styles.tipHeaderRow}>
            <Text style={styles.tipHeaderEmoji}>💡</Text>
            <Text style={styles.tipHeaderTitle}>TIP OF THE DAY</Text>
          </View>
          <Text style={styles.tipBodyText}>&quot;{tipOfTheDay}&quot;</Text>
        </View>
      </View>

      {/* 5. Footer */}
      {renderPremiumFooter()}
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
  statsDashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: s(10),
  },
  statGridCard: {
    width: '48%',
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
  statIconBg: {
    width: s(36),
    height: s(36),
    borderRadius: br.md3,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sp.md,
  },
  statIconEmoji: {
    fontSize: 18,
  },
  statCardValue: {
    fontSize: fs.xxl,
    fontWeight: '900',
    color: '#0A0A0A',
    letterSpacing: -0.4,
    marginBottom: sp.xs,
  },
  statCardLabel: {
    fontSize: fs.base,
    color: '#8A8A8A',
    fontWeight: '600',
  },
  achievementsCard: {
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
  badgesHorizontalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: sp.xl,
  },
  badgeWrapperCell: {
    alignItems: 'center',
    width: '23%',
    gap: sp.xs,
  },
  badgeIconCircle: {
    width: s(46),
    height: s(46),
    borderRadius: s(23),
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  badgeEmoji: {
    fontSize: 20,
  },
  badgeLockContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: s(16),
    height: s(16),
    borderRadius: s(8),
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CCCCCC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTitleText: {
    fontSize: fs.xs,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  badgeProgressText: {
    fontSize: 9,
    color: '#8A8A8A',
    fontWeight: '600',
  },
  badgeProgressWrapper: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: sp.md,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: sp.xs,
  },
  progressNextText: {
    fontSize: fs.sm,
    fontWeight: '700',
    color: '#8A8A8A',
  },
  progressPercentText: {
    fontSize: fs.sm,
    fontWeight: '800',
    color: '#2D5016',
  },
  progressBarBackground: {
    height: s(6),
    backgroundColor: '#F3F4F1',
    borderRadius: s(3),
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#59C749',
    borderRadius: s(3),
  },
  activitiesContainerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: br.xxl,
    paddingVertical: sp.md,
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E8E4D4',
  },
  activityTimelineItem: {
    flexDirection: 'row',
    paddingHorizontal: sp.lg,
  },
  activityLeftLineCol: {
    alignItems: 'center',
    marginRight: sp.md,
  },
  activityEmojiCircle: {
    width: s(36),
    height: s(36),
    borderRadius: s(18),
    backgroundColor: '#F5F3E8',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  activityEmojiText: {
    fontSize: 16,
  },
  activityConnectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E8E4D4',
    marginVertical: sp.xs,
  },
  activityTextContent: {
    flex: 1,
    paddingBottom: sp.lg,
    paddingTop: sp.xs,
  },
  activityRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: sp.px2,
  },
  activityItemTitle: {
    fontSize: fs.sm2,
    fontWeight: '700',
    color: '#0A0A0A',
  },
  activityItemTime: {
    fontSize: fs.xs,
    color: '#8A8A8A',
    fontWeight: '600',
  },
  activityItemDesc: {
    fontSize: fs.sm,
    color: '#6B7280',
  },
  emptyActivitiesPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: sp.xxl,
    paddingHorizontal: sp.lg,
  },
  emptyActivitiesTitle: {
    fontSize: fs.md,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: sp.xs,
  },
  emptyActivitiesDesc: {
    fontSize: fs.sm,
    color: '#8A8A8A',
    textAlign: 'center',
    lineHeight: fs.sm * 1.4,
  },
  tipCardContainer: {
    borderRadius: br.xxl,
    padding: sp.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E4D4',
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  tipHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.sm,
    marginBottom: sp.sm,
  },
  tipHeaderEmoji: {
    fontSize: 18,
  },
  tipHeaderTitle: {
    fontSize: fs.xs,
    fontWeight: '800',
    color: '#2D5016',
    letterSpacing: 0.8,
  },
  tipBodyText: {
    fontSize: fs.md,
    color: '#6B7280',
    fontStyle: 'italic',
    lineHeight: fs.md * 1.4,
  },
  premiumFooterContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: sp.xl,
  },
  footerVersion: {
    fontSize: fs.xs,
    fontWeight: '700',
    color: '#6B7280',
    marginBottom: sp.xs,
  },
  footerTagline: {
    fontSize: fs.sm,
    color: '#8A8A8A',
    marginBottom: sp.xs,
  },
  footerCopyright: {
    fontSize: fs.xs,
    color: '#9CA3AF',
  },
});
