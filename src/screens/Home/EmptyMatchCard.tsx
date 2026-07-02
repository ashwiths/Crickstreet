import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { s, fs, sp, br } from '../../theme/responsive';

export default function EmptyMatchCard() {
  return (
    <View style={styles.container}>
      {/* Welcome Illustration & Message */}
      <View style={styles.welcomeIllustrationCardSmall}>
        <LinearGradient
          colors={['#E5F2D9', '#F9E5C8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <Text style={styles.welcomeTitleTextSmall}>Welcome to Crickstreet</Text>
      </View>

      {/* Dashboard Feature Highlights */}
      <View style={styles.dashboardSection}>
        <Text style={styles.dashboardSectionTitle}>YOUR CRICKET JOURNEY STARTS HERE</Text>
        <View style={styles.featuresCard}>
          {[
            { icon: '🏏', text: 'Ball-by-ball live scoring' },
            { icon: '📊', text: 'Detailed player statistics' },
            { icon: '👥', text: 'Team & player management' },
            { icon: '🏆', text: 'Tournament management' },
            { icon: '🤖', text: 'Cricket AI Assistant' },
          ].map((feature, idx) => (
            <View key={idx} style={styles.featureListItem}>
              <View style={styles.featureIconCircle}>
                <Text style={styles.featureIconEmoji}>{feature.icon}</Text>
              </View>
              <Text style={styles.featureListText}>{feature.text}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Recent Activity empty placeholder */}
      <View style={styles.dashboardSection}>
        <Text style={styles.dashboardSectionTitle}>RECENT ACTIVITY</Text>
        <View style={styles.emptyActivityCard}>
          <Text style={styles.emptyActivityEmoji}>🕒</Text>
          <Text style={styles.emptyActivityText}>No matches played yet. Start your first match to build your cricket history.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  welcomeIllustrationCardSmall: {
    marginHorizontal: sp.lg,
    borderRadius: br.xxl,
    height: s(100),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sp.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8E4D4',
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  welcomeTitleTextSmall: {
    fontSize: fs.xl2,
    fontWeight: '900',
    color: '#2D5016',
    letterSpacing: -0.4,
  },
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
  featuresCard: {
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
  featureListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: sp.md,
  },
  featureIconCircle: {
    width: s(32),
    height: s(32),
    borderRadius: br.md2,
    backgroundColor: '#F5F3E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: sp.md,
  },
  featureIconEmoji: {
    fontSize: 16,
  },
  featureListText: {
    fontSize: fs.md,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  emptyActivityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: br.xxl,
    padding: sp.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E8E4D4',
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  emptyActivityEmoji: {
    fontSize: 32,
    marginBottom: sp.sm,
  },
  emptyActivityText: {
    fontSize: fs.sm,
    color: '#8A8A8A',
    textAlign: 'center',
    lineHeight: fs.sm * 1.4,
  },
});
