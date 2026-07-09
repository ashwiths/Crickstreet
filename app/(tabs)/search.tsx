import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ScrollView,
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

interface SearchItem {
  id: string;
  type: 'Player' | 'Team' | 'Ground';
  title: string;
  subtitle: string;
  icon: string;
}

const SEARCH_DATA: SearchItem[] = [
  { id: '1', type: 'Player', title: 'Rohit Sharma', subtitle: 'Batsman • #45', icon: '👤' },
  { id: '2', type: 'Player', title: 'Jasprit Bumrah', subtitle: 'Bowler • #93', icon: '👤' },
  { id: '3', type: 'Player', title: 'Hardik Pandya', subtitle: 'All-Rounder • #33', icon: '👤' },
  { id: '4', type: 'Team', title: 'Storm XI', subtitle: '11 Players • Captain: Rohit', icon: '👥' },
  { id: '5', type: 'Team', title: 'Tigers Club', subtitle: '9 Players • Captain: Bumrah', icon: '👥' },
  { id: '6', type: 'Team', title: 'Royal Strikers', subtitle: '12 Players • Captain: Hardik', icon: '👥' },
  { id: '7', type: 'Ground', title: 'Green Valley Turf', subtitle: 'Chennai • Turf Pitch', icon: '📍' },
  { id: '8', type: 'Ground', title: 'Kensington Oval', subtitle: 'Bangalore • Grass Pitch', icon: '📍' },
  { id: '9', type: 'Ground', title: 'Lord\'s Pitch', subtitle: 'Mumbai • Concrete Pitch', icon: '📍' },
];

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeChip, setActiveChip] = useState<'All' | 'Player' | 'Team' | 'Ground'>('All');

  const filteredData = useMemo(() => {
    return SEARCH_DATA.filter((item) => {
      // Filter by chip type
      if (activeChip !== 'All' && item.type !== activeChip) {
        return false;
      }
      // Filter by search query
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const matchesTitle = item.title.toLowerCase().includes(query);
        const matchesSubtitle = item.subtitle.toLowerCase().includes(query);
        return matchesTitle || matchesSubtitle;
      }
      return true;
    });
  }, [searchQuery, activeChip]);

  const renderItem = ({ item }: { item: SearchItem }) => {
    let iconBg = '#F5F5F5';
    let typeColor = '#8A8A8A';
    if (item.type === 'Player') {
      iconBg = '#FFF0F0';
      typeColor = '#FF4D4D';
    } else if (item.type === 'Team') {
      iconBg = '#F0F4EC';
      typeColor = C.green;
    } else if (item.type === 'Ground') {
      iconBg = '#FFF9E6';
      typeColor = '#E3A85B';
    }

    return (
      <View style={styles.card}>
        <View style={[styles.avatarCircle, { backgroundColor: iconBg }]}>
          <Text style={styles.avatarEmoji}>{item.icon}</Text>
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <View style={[styles.typeBadge, { backgroundColor: iconBg }]}>
              <Text style={[styles.typeBadgeText, { color: typeColor }]}>{item.type.toUpperCase()}</Text>
            </View>
          </View>
          <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
        </View>
      </View>
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
          <Text style={styles.headerTitle}>Search Hub</Text>
          <Text style={styles.headerSubtitle}>Find players, teams & grounds</Text>
        </View>

        {/* Search Input Box */}
        <View style={styles.searchContainer}>
          <Feather name="search" size={20} color="#8A8A8A" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search here..."
            placeholderTextColor="#A1A1A1"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn}>
              <Feather name="x" size={18} color="#8A8A8A" />
            </TouchableOpacity>
          )}
        </View>

        {/* Categories Horizontal Chips */}
        <View style={styles.chipsContainer}>
          {(['All', 'Player', 'Team', 'Ground'] as const).map((chip) => {
            const isActive = activeChip === chip;
            return (
              <TouchableOpacity
                key={chip}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setActiveChip(chip)}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {chip === 'All' ? 'All Results' : `${chip}s`}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* FlatList of Results */}
        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Feather name="search" size={32} color="#8A8A8A" />
              </View>
              <Text style={styles.emptyTitle}>No Results Found</Text>
              <Text style={styles.emptyDesc}>
                {"We couldn't find any players, teams or grounds matching \"" + searchQuery + "\"."}
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
    paddingBottom: 16,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#1A1A1A',
    fontWeight: '600',
  },
  clearBtn: {
    padding: 2,
  },
  chipsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarEmoji: {
    fontSize: 20,
  },
  cardContent: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 8,
    fontWeight: '800',
  },
  cardSubtitle: {
    fontSize: 11,
    color: '#8A8A8A',
    fontWeight: '600',
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
