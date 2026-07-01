import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FloatingBottomNav from '@/src/components/FloatingBottomNav';
import { s, fs, sp, br, avatarSz } from '@/src/theme/responsive';

// Theme constants matching Home
const C = {
  hero:    '#1B3F14',
  green:   '#59C749',
  greenDim:'rgba(89,199,73,0.15)',
  milky:   '#FFFDF1',
  white:   '#FFFFFF',
  black:   '#0A0A0A',
  gray1:   '#F5F3E8',
  gray2:   '#E8E4D4',
  gray3:   '#9CA3AF',
  gray4:   '#6B7280',
  heroText:'rgba(255,255,255,0.65)',
  shadowC: 'rgba(0,0,0,0.06)',
} as const;

interface NotificationItem {
  id: string;
  type: 'Match' | 'Tournament' | 'Achievement' | 'System';
  title: string;
  body: string;
  time: string;
  emoji: string;
  read: boolean;
}

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  { id: '1', type: 'Match', title: 'Match Invite 🏏', body: 'Tigers Club has invited you to play a T20 match this Saturday.', time: '2 hours ago', emoji: '🏏', read: false },
  { id: '2', type: 'Tournament', title: 'Summer League Registration 🏆', body: 'Registration is now open for the Cricstreet Summer League 2026.', time: '1 day ago', emoji: '🏆', read: false },
  { id: '3', type: 'Achievement', title: 'Milestone Unlocked! ⭐', body: 'Congratulations! You have crossed 1,000 career runs scored.', time: '2 days ago', emoji: '⭐', read: true },
  { id: '4', type: 'System', title: 'Team Captain Designated 👤', body: 'You have been appointed Captain of Storm XI.', time: '3 days ago', emoji: '👤', read: true },
  { id: '5', type: 'System', title: 'Ground Registered 📍', body: 'Green Valley Turf has been successfully verified.', time: '5 days ago', emoji: '📍', read: true },
];

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);
  const [activeTab, setActiveTab] = useState<'All' | 'Match' | 'Tournament' | 'Achievement' | 'System'>('All');

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notif) => {
      if (activeTab === 'All') return true;
      return notif.type === activeTab;
    });
  }, [notifications, activeTab]);

  const markAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((notif) => ({ ...notif, read: true }))
    );
  };

  const handleNotifPress = (id: string) => {
    setNotifications((prev) =>
      prev.map((notif) => (notif.id === id ? { ...notif, read: true } : notif))
    );
  };

  const renderItem = ({ item }: { item: NotificationItem }) => {
    let iconBg = '#F5F5F5';
    let themeColor = '#8A8A8A';
    if (item.type === 'Match') {
      iconBg = '#F0F4EC';
      themeColor = C.green;
    } else if (item.type === 'Tournament') {
      iconBg = '#FFF9E6';
      themeColor = '#E3A85B';
    } else if (item.type === 'Achievement') {
      iconBg = '#FFF0F0';
      themeColor = '#FF4D4D';
    } else if (item.type === 'System') {
      iconBg = '#E6F4FF';
      themeColor = '#1890FF';
    }

    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => handleNotifPress(item.id)}
        style={[styles.card, !item.read && styles.cardUnread]}
      >
        <View style={[styles.iconCircle, { backgroundColor: iconBg }]}>
          <Text style={styles.iconEmoji}>{item.emoji}</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, !item.read && styles.cardTitleBold]}>{item.title}</Text>
            <Text style={styles.cardTime}>{item.time}</Text>
          </View>
          <Text style={styles.cardBody} numberOfLines={2}>{item.body}</Text>
        </View>
        {!item.read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.root}>
      {/* Top Gradient Background */}
      <LinearGradient
        colors={['#E5F2D9', '#F9E5C8', '#F3F4F1']}
        locations={[0, 0.4, 0.8]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.headerGradient, { height: 260 + insets.top }]}
      />

      <View style={styles.container}>
        {/* Header Row */}
        <View style={[styles.headerRow, { paddingTop: insets.top > 0 ? insets.top + 8 : 16 }]}>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Notifications</Text>
            <Text style={styles.headerSubtitle}>Stay updated on matches & stats</Text>
          </View>
          {notifications.some((n) => !n.read) && (
            <TouchableOpacity onPress={markAllAsRead} style={styles.readAllBtn}>
              <Text style={styles.readAllText}>Mark Read</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Tabs Chips */}
        <View style={styles.chipsContainer}>
          {(['All', 'Match', 'Tournament', 'Achievement', 'System'] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {tab === 'All' ? 'All' : tab}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* List of Notifications */}
        <FlatList
          data={filteredNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Feather name="bell-off" size={32} color="#8A8A8A" />
              </View>
              <Text style={styles.emptyTitle}>All caught up!</Text>
              <Text style={styles.emptyDesc}>
                You have no notifications in this category.
              </Text>
            </View>
          }
        />
      </View>

      {/* Floating Bottom Nav */}
      <FloatingBottomNav activeTab="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#F3F4F1',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 16,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#1A1A1A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  readAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  readAllText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#2D5016',
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#2D5016',
    borderColor: '#2D5016',
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  chipTextActive: {
    color: '#FFF',
  },
  listContent: {
    paddingBottom: 120,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardUnread: {
    borderColor: 'rgba(89,199,73,0.3)',
    backgroundColor: '#FAFDF6',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  iconEmoji: {
    fontSize: 20,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  cardTitleBold: {
    fontWeight: '800',
    color: '#111827',
  },
  cardTime: {
    fontSize: 9,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  cardBody: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    lineHeight: 16,
  },
  unreadDot: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4D4D',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  emptyDesc: {
    fontSize: 12,
    color: '#8A8A8A',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 20,
  },
});
