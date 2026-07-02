import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { s, fs, sp, br, avatarSz } from '../../theme/responsive';

interface HomeHeaderProps {
  user: any;
  insets: { top: number };
  pulseStyle: any;
  setActiveTab: (tab: 'home' | 'matches' | 'tournament' | 'profile') => void;
  getGreeting: () => string;
}

export default function HomeHeader({
  user,
  insets,
  pulseStyle,
  setActiveTab,
  getGreeting,
}: HomeHeaderProps) {
  const router = useRouter();
  const displayName = user?.displayName || 'Player';
  const avatarInitial = displayName.slice(0, 1).toUpperCase();

  return (
    <View style={[styles.headerContainer, { paddingTop: insets.top > 0 ? insets.top + 8 : 16 }]}>
      <View style={styles.headerProfileRow}>
        <TouchableOpacity 
          activeOpacity={0.8}
          onPress={() => setActiveTab('profile')}
          style={styles.headerAvatarCircle}
        >
          <Text style={styles.headerAvatarText}>{avatarInitial}</Text>
          <View style={styles.headerOnlineBadge} />
        </TouchableOpacity>
        
        <View style={styles.headerGreetingCol}>
          <Text style={styles.headerGreetingLabel}>{getGreeting()},</Text>
          <Text style={styles.headerNameText} numberOfLines={1}>{displayName}</Text>
          <Text style={styles.headerSubtitleText}>Score matches, register teams, and check stats 🏏</Text>
        </View>
        
        <TouchableOpacity 
          activeOpacity={0.75}
          onPress={() => router.push('/notification-settings')}
          style={styles.headerNotificationBtn}
        >
          <Feather name="bell" size={20} color="#1A1A1A" />
          <Animated.View style={[styles.headerBellDot, pulseStyle]} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: sp.lg,
    paddingBottom: sp.md,
  },
  headerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerAvatarCircle: {
    width: avatarSz.md2,
    height: avatarSz.md2,
    borderRadius: avatarSz.md2 / 2,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#A8CD55',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerAvatarText: {
    fontSize: fs.xl,
    fontWeight: '800',
    color: '#2D5016',
  },
  headerOnlineBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: s(12),
    height: s(12),
    borderRadius: s(6),
    backgroundColor: '#59C749',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  headerGreetingCol: {
    flex: 1,
    marginLeft: sp.md,
  },
  headerGreetingLabel: {
    fontSize: fs.sm,
    fontWeight: '600',
    color: '#8A8A8A',
  },
  headerNameText: {
    fontSize: fs.lg,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  headerSubtitleText: {
    fontSize: fs.xs - 1,
    color: '#8A8A8A',
    fontWeight: '500',
    marginTop: 2,
  },
  headerNotificationBtn: {
    width: avatarSz.md,
    height: avatarSz.md,
    borderRadius: avatarSz.md / 2,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E8E4D4',
  },
  headerBellDot: {
    position: 'absolute',
    top: sp.xs,
    right: sp.xs,
    width: s(7),
    height: s(7),
    borderRadius: s(4),
    backgroundColor: '#59C749',
    borderWidth: 1,
    borderColor: '#FFF',
  },
});
