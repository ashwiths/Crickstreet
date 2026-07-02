import React from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { s, fs, sp, br, avatarSz } from '../theme/responsive';
import { TourHighlight } from '../hooks/useTour';

const C = {
  green: '#59C749',
} as const;

export type TabName = 'home' | 'matches' | 'tournament' | 'profile';

interface FloatingBottomNavProps {
  activeTab: TabName | 'none';
  onTabPress?: (tab: TabName) => void;
}

export default function FloatingBottomNav({
  activeTab,
  onTabPress,
}: FloatingBottomNavProps) {
  const router = useRouter();

  const handleTabPress = (tab: TabName) => {
    if (onTabPress) {
      onTabPress(tab);
    } else {
      // Default Expo Router navigation
      if (tab === 'home') {
        router.replace({ pathname: '/' });
      } else if (tab === 'matches') {
        router.replace({ pathname: '/', params: { tab: 'matches' } });
      } else if (tab === 'tournament') {
        router.replace({ pathname: '/', params: { tab: 'tournament' } });
      } else if (tab === 'profile') {
        router.replace({ pathname: '/', params: { tab: 'profile' } });
      }
    }
  };

  return (
    <View style={styles.navOuter}>
      <View style={styles.navBar}>
        {/* Tab 1: Home */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => handleTabPress('home')}
          activeOpacity={0.75}
        >
          <Ionicons
            name={activeTab === 'home' ? 'home' : 'home-outline'}
            size={20}
            color={activeTab === 'home' ? C.green : 'rgba(255,255,255,0.42)'}
          />
          <Text style={[styles.navLabel, activeTab === 'home' && styles.navLabelActive]}>Home</Text>
          {activeTab === 'home' && <View style={styles.activeDot} />}
        </TouchableOpacity>

        {/* Tab 2: Matches */}
        <TourHighlight id="matches-tab" style={{ flex: 1 }}>
          <TouchableOpacity
            style={[styles.navItem, { width: '100%' }]}
            onPress={() => handleTabPress('matches')}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons
              name="chart-bar"
              size={20}
              color={activeTab === 'matches' ? C.green : 'rgba(255,255,255,0.42)'}
            />
            <Text style={[styles.navLabel, activeTab === 'matches' && styles.navLabelActive]}>Stats</Text>
            {activeTab === 'matches' && <View style={styles.activeDot} />}
          </TouchableOpacity>
        </TourHighlight>

        {/* Tab 3: Center FAB Placeholder */}
        <View style={styles.navCenter} />

        {/* Tab 4: Tournament */}
        <TourHighlight id="tournament-tab" style={{ flex: 1 }}>
          <TouchableOpacity
            style={[styles.navItem, { width: '100%' }]}
            onPress={() => handleTabPress('tournament')}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons
              name="history"
              size={20}
              color={activeTab === 'tournament' ? C.green : 'rgba(255,255,255,0.42)'}
            />
            <Text style={[styles.navLabel, activeTab === 'tournament' && styles.navLabelActive]}>History</Text>
            {activeTab === 'tournament' && <View style={styles.activeDot} />}
          </TouchableOpacity>
        </TourHighlight>

        {/* Tab 5: Profile */}
        <TourHighlight id="profile-tab" style={{ flex: 1 }}>
          <TouchableOpacity
            style={[styles.navItem, { width: '100%' }]}
            onPress={() => handleTabPress('profile')}
            activeOpacity={0.75}
          >
            <MaterialCommunityIcons
              name={activeTab === 'profile' ? 'account' : 'account-outline'}
              size={20}
              color={activeTab === 'profile' ? C.green : 'rgba(255,255,255,0.42)'}
            />
            <Text style={[styles.navLabel, activeTab === 'profile' && styles.navLabelActive]}>Profile</Text>
            {activeTab === 'profile' && <View style={styles.activeDot} />}
          </TouchableOpacity>
        </TourHighlight>
      </View>

      {/* Floating Action Button - Positioned absolutely outside navBar to prevent clipping */}
      <View style={styles.absoluteFabWrapper} pointerEvents="box-none">
        <TourHighlight id="create-match">
          <TouchableOpacity
            style={styles.navCenterBtn}
            onPress={() => router.push('/create-matches')}
            activeOpacity={0.85}
          >
            <Image
              source={require('@/assets/images/cricket-ball.png')}
              style={styles.cricketBallImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </TourHighlight>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  navOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    paddingTop: 6,
    zIndex: 999,
    overflow: 'visible',
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 21, 16, 0.88)',
    borderRadius: s(32),
    paddingVertical: sp.md2,
    paddingHorizontal: sp.md2,
    shadowColor: '#59C749',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(89, 199, 73, 0.15)',
    overflow: 'visible',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.px2,
    paddingVertical: sp.xs,
    position: 'relative',
    overflow: 'visible',
  },
  navLabel: {
    fontSize: fs.xs,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  navLabelActive: {
    color: '#59C749',
    fontWeight: '700',
  },
  navCenter: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  absoluteFabWrapper: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -s(30) }],
    bottom: Platform.OS === 'ios' ? 40 : 25,
    zIndex: 1000,
    elevation: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCenterBtn: {
    width: s(60),
    height: s(60),
    borderRadius: s(30),
    backgroundColor: '#59C749',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#59C749',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 15,
    borderWidth: 3,
    borderColor: 'rgba(17, 21, 16, 0.95)',
  },
  cricketBallImage: {
    width: s(54),
    height: s(54),
    borderRadius: s(27),
  },
  activeDot: {
    width: s(4),
    height: s(4),
    borderRadius: s(2),
    backgroundColor: '#59C749',
    marginTop: sp.px2,
    shadowColor: '#59C749',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },
});
