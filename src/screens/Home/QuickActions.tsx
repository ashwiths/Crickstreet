import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { s, fs, sp, br } from '../../theme/responsive';

export default function QuickActions() {
  const router = useRouter();

  return (
    <View style={styles.dashboardSection}>
      <Text style={styles.dashboardSectionTitle}>QUICK ACTIONS</Text>
      <View style={styles.quickActionsGridContainer}>
        {[
          { label: 'Create Team', icon: '👥', color: '#F0F4EC', onPress: () => router.push('/my-teams') },
          { label: 'Add Ground', icon: '📍', color: '#FFF9E6', onPress: () => router.push('/my-grounds') },
          { label: 'Scan Player', icon: '📷', color: '#FFF0F0', onPress: () => router.push('/qr-scanner') },
          { label: 'AI Chat', icon: '✨', color: '#E5F2D9', onPress: () => router.push('/ai-chat') }
        ].map((action) => (
          <TouchableOpacity
            key={action.label}
            activeOpacity={0.85}
            onPress={action.onPress}
            style={styles.quickActionCardCell}
          >
            <View style={[styles.quickActionIconBg, { backgroundColor: action.color }]}>
              <Text style={styles.quickActionEmoji}>{action.icon}</Text>
            </View>
            <Text style={styles.quickActionLabelText}>{action.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
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
  quickActionsGridContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCardCell: {
    width: '23%',
    alignItems: 'center',
    gap: sp.sm2,
  },
  quickActionIconBg: {
    width: s(54),
    height: s(54),
    borderRadius: br.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionEmoji: {
    fontSize: 22,
  },
  quickActionLabelText: {
    fontSize: fs.xs,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'center',
  },
});
