/**
 * HomeScreen.tsx — Crickstreet v3
 * Compact hero + visible content cards, matching fintech reference layout
 */

import {
  Feather,
  Ionicons,
  MaterialCommunityIcons,
} from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { collection, query, orderBy, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ProfileScreen from '@/app/(tabs)/profile';
import TournamentScreen from './TournamentScreen';
import { useTour, TourHighlight } from '../hooks/useTour';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { s, vs, ms, fs, sp, br, iconSz, avatarSz, gridCardWidth, isTablet } from '../theme/responsive';

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

// ─── Dashboard Helpers & Sub-Components ───────────────────────────────────────

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'Good Morning';
  if (hour >= 12 && hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

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

const CRICKET_TIPS = [
  "Update every ball to keep player statistics accurate.",
  "Assign vice-captain and captain roles to track leadership achievements.",
  "Register your local pitch in 'Grounds' to load auto-coordinates next time.",
  "Scan player QR codes at the pitch to add them to your squad instantly.",
  "Check out your profile page for advanced statistics graphs and run rates.",
  "A practice match is perfect for informal games with no tournament restrictions."
];

// W is available from responsive.ts screen.width — no static Dimensions needed

// ─── Quick Action ─────────────────────────────────────────────────────────────
function QuickAction({
  icon, label, bg, delay = 0,
}: { icon: React.ReactNode; label: string; bg: string; delay?: number }) {
  const s = useSharedValue(0.7);
  const o = useSharedValue(0);
  useEffect(() => {
    s.value = withDelay(delay, withSpring(1, { damping: 14, stiffness: 140 }));
    o.value = withDelay(delay, withTiming(1, { duration: 350 }));
  }, [delay, s, o]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }], opacity: o.value }));

  return (
    <Animated.View style={[styles.qaWrap, anim]}>
      <Pressable style={[styles.qaBtn, { backgroundColor: bg }]}>
        {icon}
      </Pressable>
      <Text style={styles.qaLabel}>{label}</Text>
    </Animated.View>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, note, delay = 0,
}: { icon: React.ReactNode; label: string; value: string; note: string; delay?: number }) {
  const y = useSharedValue(10);
  const o = useSharedValue(0);
  useEffect(() => {
    y.value = withDelay(delay, withSpring(0, { damping: 16, stiffness: 140 }));
    o.value = withDelay(delay, withTiming(1, { duration: 400 }));
  }, [delay, y, o]);
  const anim = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }], opacity: o.value }));

  return (
    <Animated.View style={[styles.statCard, anim]}>
      <View style={styles.statIcon}>{icon}</View>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statNote}>{note}</Text>
    </Animated.View>
  );
}

// ─── Activity Row ─────────────────────────────────────────────────────────────
function ActivityRow({
  emoji, title, desc, badge, time, badgeGreen = false, delay = 0,
}: {
  emoji: string; title: string; desc: string;
  badge: string; time: string; badgeGreen?: boolean; delay?: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(400).springify().damping(18)}
      style={styles.actRow}
    >
      <View style={styles.actEmoji}>
        <Text style={{ fontSize: 22 }}>{emoji}</Text>
      </View>
      <View style={styles.actBody}>
        <Text style={styles.actTitle}>{title}</Text>
        <Text style={styles.actDesc} numberOfLines={1}>{desc}</Text>
      </View>
      <View style={styles.actRight}>
        <View style={[styles.actBadge, badgeGreen && styles.actBadgeGreen]}>
          <Text style={[styles.actBadgeText, badgeGreen && styles.actBadgeTextGreen]}>
            {badge}
          </Text>
        </View>
        <Text style={styles.actTime}>{time}</Text>
      </View>
    </Animated.View>
  );
}



export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<'home' | 'matches' | 'tournament' | 'profile'>('home');
  const [matchFilter, setMatchFilter] = useState<'live' | 'history'>('live');
  const [historyFilter, setHistoryFilter] = useState<'all' | 'practice' | 'tournament' | 'won' | 'lost'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [draftAvailable, setDraftAvailable] = useState<boolean>(false);
  const [draftData, setDraftData] = useState<any>(null);

  useEffect(() => {
    const checkDraft = async () => {
      try {
        const stored = await AsyncStorage.getItem('@crickstreet:match_draft');
        if (stored) {
          setDraftAvailable(true);
          setDraftData(JSON.parse(stored));
        } else {
          setDraftAvailable(false);
          setDraftData(null);
        }
      } catch (e) {
        console.error('Error checking draft:', e);
      }
    };
    checkDraft();
  }, [activeTab, matchFilter]);

  const { user } = useAuth();
  const [matches, setMatches] = useState<any[]>([]);
  const [userStats, setUserStats] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [grounds, setGrounds] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loadingDb, setLoadingDb] = useState(true);

  // Floating Help bubble popup
  const handleShowHelp = () => {
    Alert.alert(
      'Welcome to Crickstreet! 🏏',
      'Learn how Crickstreet works:\n\n1. 👥 Create your playing XI under "Create Team".\n2. 📍 Register your local pitch details in "Add Ground".\n3. 🏏 Press "Start New Match" to launch scoring!\n4. 📊 View automatic player stats and charts inside profiles.'
    );
  };

  useEffect(() => {
    if (!user) {
      setMatches([]);
      setUserStats(null);
      setTeams([]);
      setGrounds([]);
      setPlayers([]);
      setLoadingDb(false);
      return;
    }

    setLoadingDb(true);

    // 1. Listen to matches subcollection
    const mQuery = query(
      collection(db, 'users', user.uid, 'matches'),
      orderBy('createdAt', 'desc')
    );

    const unsubMatches = onSnapshot(mQuery, (snapshot) => {
      const fetchedMatches: any[] = [];
      snapshot.forEach((docSnap) => {
        fetchedMatches.push({ id: docSnap.id, ...docSnap.data() });
      });
      setMatches(fetchedMatches);
      setLoadingDb(false);
    }, (err) => {
      console.error('Error loading matches:', err);
      setLoadingDb(false);
    });

    // 2. Listen to user profile document stats
    const userDocRef = doc(db, 'users', user.uid);
    const unsubStats = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUserStats(data.stats || null);
      }
    });

    // 3. Listen to teams subcollection
    const unsubTeams = onSnapshot(collection(db, 'users', user.uid, 'teams'), (snapshot) => {
      const fetched: any[] = [];
      snapshot.forEach((docSnap) => {
        fetched.push({ id: docSnap.id, ...docSnap.data() });
      });
      setTeams(fetched);
    });

    // 4. Listen to grounds subcollection
    const unsubGrounds = onSnapshot(collection(db, 'users', user.uid, 'grounds'), (snapshot) => {
      const fetched: any[] = [];
      snapshot.forEach((docSnap) => {
        fetched.push({ id: docSnap.id, ...docSnap.data() });
      });
      setGrounds(fetched);
    });

    // 5. Listen to players subcollection
    const unsubPlayers = onSnapshot(collection(db, 'users', user.uid, 'players'), (snapshot) => {
      const fetched: any[] = [];
      snapshot.forEach((docSnap) => {
        fetched.push({ id: docSnap.id, ...docSnap.data() });
      });
      setPlayers(fetched);
    });

    return () => {
      unsubMatches();
      unsubStats();
      unsubTeams();
      unsubGrounds();
      unsubPlayers();
    };
  }, [user]);

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


  const previewFeatures = [
    { title: '🏆 Rankings', desc: 'Global player leaderboard' },
    { title: '📈 Statistics', desc: 'In-depth performance analytics' },
    { title: '🔥 Recent Form', desc: 'L5 match trend graphs' },
    { title: '⭐ Man of the Match', desc: 'MVP award counts' },
  ];

  // Handle active tab updates via router params
  useEffect(() => {
    if (params.tab === 'matches') {
      setActiveTab('matches');
      setMatchFilter('live');
    } else if (params.tab === 'tournament') {
      setActiveTab('tournament');
    } else if (params.tab === 'profile') {
      setActiveTab('profile');
    } else if (params.tab === 'home') {
      setActiveTab('home');
    }
  }, [params.tab]);

  // Notification dot pulse
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.5, { duration: 800, easing: Easing.inOut(Easing.sin) }),
        withTiming(1,   { duration: 800, easing: Easing.inOut(Easing.sin) }),
      ),
      -1, false,
    );
  }, [pulse]);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  // --- Dashboard Real-Data Calculations ---
  const totalMatchesCount = matches.length;
  const completedMatches = useMemo(() => matches.filter((m: any) => m.status === 'completed'), [matches]);
  
  const winsCount = useMemo(() => {
    return completedMatches.filter((m: any) => {
      let res = m.result;
      if (!res && m.winner) {
        res = m.winner === 'teamA' ? 'Won' : 'Lost';
      } else if (!res && m.status === 'completed') {
        const scoreA = parseInt(m.myScore?.split('/')[0] || m.teamAScore || '0', 10);
        const scoreB = parseInt(m.oppScore?.split('/')[0] || m.teamBScore || '0', 10);
        if (scoreA > scoreB) res = 'Won';
        else if (scoreB > scoreA) res = 'Lost';
      }
      return res === 'Won';
    }).length;
  }, [completedMatches]);

  const winRatePct = useMemo(() => {
    return totalMatchesCount > 0 ? Math.round((winsCount / totalMatchesCount) * 100) : 0;
  }, [winsCount, totalMatchesCount]);

  const totalRunsCount = useMemo(() => {
    let runs = 0;
    completedMatches.forEach((m: any) => {
      const scoreA = parseInt(m.myScore?.split('/')[0] || m.teamAScore || '0', 10);
      if (!isNaN(scoreA)) runs += scoreA;
    });
    if (userStats && typeof userStats.runs === 'number') {
      runs = userStats.runs;
    }
    return runs;
  }, [completedMatches, userStats]);

  const totalWicketsCount = useMemo(() => {
    let wickets = 0;
    completedMatches.forEach((m: any) => {
      const wkts = parseInt(m.myScore?.split('/')[1] || m.teamAWickets || '0', 10);
      if (!isNaN(wkts)) wickets += wkts;
    });
    if (userStats && typeof userStats.wickets === 'number') {
      wickets = userStats.wickets;
    }
    return wickets;
  }, [completedMatches, userStats]);

  const dashboardAchievements = useMemo(() => {
    const badges = [
      { id: 'first_win', emoji: '🥇', title: 'First Victory', unlocked: winsCount >= 1, progressText: winsCount >= 1 ? '1/1 Won' : '0/1 Won', color: '#E3A85B' },
      { id: 'century', emoji: '💯', title: 'Century Club', unlocked: totalRunsCount >= 100, progressText: totalRunsCount >= 100 ? '100+ Runs' : `${totalRunsCount}/100 Runs`, color: '#A8CD55' },
      { id: 'winning_streak', emoji: '🔥', title: 'Streak Master', unlocked: winsCount >= 3, progressText: winsCount >= 3 ? '3+ Streak' : `${winsCount}/3 Wins`, color: '#FF4D4D' },
      { id: 'run_machine', emoji: '⚡', title: 'Run Machine', unlocked: totalRunsCount >= 500, progressText: totalRunsCount >= 500 ? '500+ Runs' : `${totalRunsCount}/500 Runs`, color: '#A8CD55' }
    ];
    let nextBadge = 'All Badges Unlocked!';
    let progressPercent = 100;
    if (winsCount < 1) {
      nextBadge = 'First Victory';
      progressPercent = 0;
    } else if (totalRunsCount < 100) {
      nextBadge = 'Century Club';
      progressPercent = Math.min(Math.round((totalRunsCount / 100) * 100), 100);
    } else if (winsCount < 3) {
      nextBadge = 'Streak Master';
      progressPercent = Math.min(Math.round((winsCount / 3) * 100), 100);
    } else if (totalRunsCount < 500) {
      nextBadge = 'Run Machine';
      progressPercent = Math.min(Math.round((totalRunsCount / 500) * 100), 100);
    }
    return { badges, nextBadge, progressPercent };
  }, [winsCount, totalRunsCount]);

  const recentActivities = useMemo(() => {
    const list: Array<{ type: string; title: string; desc: string; timestamp: Date; emoji: string }> = [];
    matches.forEach((m: any) => {
      const date = m.createdAt?.seconds ? new Date(m.createdAt.seconds * 1000) : (m.createdAt ? new Date(m.createdAt) : new Date());
      if (m.status === 'completed') {
        list.push({
          type: 'match_completed',
          title: 'Match Completed 🏆',
          desc: `${m.myTeamName} vs ${m.oppTeamName} • ${m.statusText || 'Scored'}`,
          timestamp: date,
          emoji: '🏆',
        });
      } else {
        list.push({
          type: 'match_created',
          title: 'Match Created 🏏',
          desc: `${m.myTeamName} vs ${m.oppTeamName} • Ready to score`,
          timestamp: date,
          emoji: '🏏',
        });
      }
    });
    teams.forEach((t: any) => {
      const date = t.createdAt?.seconds ? new Date(t.createdAt.seconds * 1000) : (t.createdAt ? new Date(t.createdAt) : new Date());
      list.push({
        type: 'team_created',
        title: 'Team Created 👥',
        desc: `Registered squad "${t.teamName}"`,
        timestamp: date,
        emoji: '👥',
      });
    });
    grounds.forEach((g: any) => {
      const date = g.createdAt?.seconds ? new Date(g.createdAt.seconds * 1000) : (g.createdAt ? new Date(g.createdAt) : new Date());
      list.push({
        type: 'ground_added',
        title: 'Ground Registered 📍',
        desc: `Added home pitch "${g.groundName}"`,
        timestamp: date,
        emoji: '📍',
      });
    });
    players.forEach((p: any) => {
      const date = p.createdAt?.seconds ? new Date(p.createdAt.seconds * 1000) : (p.createdAt ? new Date(p.createdAt) : new Date());
      list.push({
        type: 'player_added',
        title: 'Player Joined 👤',
        desc: `Added player "${p.name}"`,
        timestamp: date,
        emoji: '👤',
      });
    });
    list.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return list.slice(0, 5);
  }, [matches, teams, grounds, players]);

  const tipOfTheDay = useMemo(() => {
    const day = new Date().getDate();
    return CRICKET_TIPS[day % CRICKET_TIPS.length];
  }, []);

  const renderMatchesTab = () => {
    const displayMatches = historyMatches.map((m: any, index: number) => {
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

    const filteredHistoryMatches = displayMatches.filter((m: any) => {
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

    const totalMatchesCount = displayMatches.length;
    const winsCount = displayMatches.filter((m: any) => m.result === 'Won').length;
    const winRatePct = totalMatchesCount > 0 ? Math.round((winsCount / totalMatchesCount) * 100) : 0;
    
    let totalRunsCount = 0;
    displayMatches.forEach((m: any) => {
      const runs = parseInt(m.myScore?.split('/')[0] || '0', 10);
      if (!isNaN(runs)) totalRunsCount += runs;
    });

    let totalWicketsCount = 0;
    displayMatches.forEach((m: any) => {
      const wickets = parseInt(m.myScore?.split('/')[1] || '0', 10);
      if (!isNaN(wickets)) totalWicketsCount += wickets;
    });

    const last5Matches = displayMatches.slice(0, 5);

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
                  {/* Radar waves */}
                  <Animated.View style={[styles.radarRing, radarStyle1]} />
                  <Animated.View style={[styles.radarRing, radarStyle2]} />
                  <Animated.View style={[styles.radarRing, radarStyle3]} />
                  
                  {/* Central floating stadium badge */}
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
  };

  const renderTournamentTab = () => {
    return (
      <TournamentScreen
        onBack={() => setActiveTab('home')}
        matches={matches}
        userStats={userStats}
      />
    );
  };


  const renderProfileTab = () => {
    return <ProfileScreen onBack={() => setActiveTab('home')} />;
  };

  const settingRowStyle = (title: string) => {
    return styles.settingLeft;
  };

  const renderEmptyState = () => {
    const headerGreeting = getGreeting();
    const displayName = user?.displayName || 'Player';
    const avatarInitial = displayName.slice(0, 1).toUpperCase();

    return (
      <View style={styles.emptyContainerFull}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
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
                <Text style={styles.headerGreetingLabel}>{headerGreeting},</Text>
                <Text style={styles.headerNameText} numberOfLines={1}>{displayName}</Text>
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

          {/* Welcome Illustration & Message */}
          <View style={styles.welcomeIllustrationCard}>
            <LinearGradient
              colors={['#E5F2D9', '#F9E5C8']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFillObject}
            />
            <Animated.View style={[styles.welcomeBatIconContainer, floatStyle]}>
              <Text style={{ fontSize: 72 }}>🏏</Text>
            </Animated.View>
            <Text style={styles.welcomeTitleText}>Welcome to Crickstreet</Text>
            <Text style={styles.welcomeSubtitleText}>
              Start your first Practice Match or Tournament Match to begin your cricket journey.
            </Text>
          </View>

          {/* Buttons Stack directly below the illustration */}
          <View style={styles.welcomeButtonsContainer}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.welcomeBtnSolid}
              onPress={() => router.push('/create-matches?flow=practice')}
            >
              <Text style={styles.welcomeBtnSolidText}>🏏 Start Practice Match</Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.welcomeBtnOutline}
              onPress={() => router.push('/create-matches?flow=tournament')}
            >
              <Text style={styles.welcomeBtnOutlineText}>🏆 Start Tournament Match</Text>
            </TouchableOpacity>
          </View>

          {/* Setup checklist cards to help them set up */}
          <View style={styles.dashboardSection}>
            <Text style={styles.dashboardSectionTitle}>QUICK SETUP</Text>
            <View style={styles.quickActionsGridContainer}>
              {[
                { label: 'Create Team', icon: '👥', color: '#F0F4EC', onPress: () => router.push('/my-teams') },
                { label: 'Add Ground', icon: '📍', color: '#FFF9E6', onPress: () => router.push('/my-grounds') },
                { label: 'Scan Player', icon: '📷', color: '#FFF0F0', onPress: () => router.push('/qr-scanner') }
              ].map((action) => (
                <TouchableOpacity
                  key={action.label}
                  activeOpacity={0.85}
                  onPress={action.onPress}
                  style={[styles.quickActionCardCell, { width: '30%' }]}
                >
                  <View style={[styles.quickActionIconBg, { backgroundColor: action.color }]}>
                    <Text style={styles.quickActionEmoji}>{action.icon}</Text>
                  </View>
                  <Text style={styles.quickActionLabelText}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ height: 140 }} />
        </ScrollView>
      </View>
    );
  };

  const renderHomeTab = () => {
    const headerGreeting = getGreeting();
    const displayName = user?.displayName || 'Player';
    const avatarInitial = displayName.slice(0, 1).toUpperCase();
    const unfinishedMatch = liveMatches[0] || null;

    return (
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* Header */}
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
              <Text style={styles.headerGreetingLabel}>{headerGreeting},</Text>
              <Text style={styles.headerNameText} numberOfLines={1}>{displayName}</Text>
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

        {/* Hero Section */}
        <View style={styles.dashHeroCardContainer}>
          <LinearGradient
            colors={['#1B3F14', '#0E1E0B']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.dashHeroCardGradient}
          >
            <View style={styles.dashHeroDecoCircle1} />
            <View style={styles.dashHeroDecoCircle2} />
            
            <View style={styles.dashHeroContent}>
              <View style={styles.dashHeroBadgeRow}>
                <View style={styles.dashHeroBadge}>
                  <Text style={styles.dashHeroBadgeText}>🏏 CRICKSTREET PRO</Text>
                </View>
              </View>
              <Text style={styles.dashHeroTitle}>Ready for Today&apos;s Match?</Text>
              <Text style={styles.dashHeroSubtitle}>Start live scoring or setup tournament games instantly.</Text>
              
              <View style={styles.dashHeroButtonsRow}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.dashHeroBtnSolid}
                  onPress={() => router.push('/create-matches?flow=practice')}
                >
                  <Text style={styles.dashHeroBtnSolidText}>🏏 Practice Match</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.9}
                  style={styles.dashHeroBtnOutline}
                  onPress={() => router.push('/create-matches?flow=tournament')}
                >
                  <Text style={styles.dashHeroBtnOutlineText}>🏆 Tournament</Text>
                </TouchableOpacity>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Resume Match Card */}
        {unfinishedMatch && (
          <View style={styles.dashboardSection}>
            <Text style={styles.dashboardSectionTitle}>CONTINUE SCORES</Text>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => router.push({ pathname: '/scorecard', params: { matchId: unfinishedMatch.id, myTeamName: unfinishedMatch.myTeamName, oppTeamName: unfinishedMatch.oppTeamName } })}
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
        )}

        {/* Quick Actions Grid */}
        <View style={styles.dashboardSection}>
          <Text style={styles.dashboardSectionTitle}>QUICK ACTIONS</Text>
          <View style={styles.quickActionsGridContainer}>
            {[
              { label: 'My Teams', icon: '👥', color: '#F0F4EC', onPress: () => router.push('/my-teams') },
              { label: 'Grounds', icon: '📍', color: '#FFF9E6', onPress: () => router.push('/my-grounds') },
              { label: 'Scan QR', icon: '📷', color: '#FFF0F0', onPress: () => router.push('/qr-scanner') },
              { label: 'Tournament', icon: '🏆', color: '#F0F4EC', onPress: () => setActiveTab('tournament') },
              { label: 'Match History', icon: '📊', color: '#FFF9E6', onPress: () => { setActiveTab('matches'); setMatchFilter('history'); } },
              { label: 'Settings', icon: '⚙️', color: '#F0F4EC', onPress: () => router.push('/notification-settings') }
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

        {/* My Cricket Statistics Section */}
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

        {/* Achievements Card */}
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

        {/* Recent Activity Timeline */}
        <View style={styles.dashboardSection}>
          <Text style={styles.dashboardSectionTitle}>🕒 RECENT ACTIVITY</Text>
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

        {/* Tip of the Day */}
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

        {/* Spacer for bottom navigation */}
        <View style={{ height: 140 }} />
      </ScrollView>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar 
        barStyle={activeTab === 'home' ? 'dark-content' : 'light-content'} 
        backgroundColor={activeTab === 'home' ? 'transparent' : '#0A0D0A'} 
        translucent={activeTab === 'home'}
      />

      {activeTab === 'home' && (
        <LinearGradient
          colors={['#E5F2D9', '#F9E5C8', '#F3F4F1']}
          locations={[0, 0.4, 0.8]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.headerGradient, { height: Math.max(300, 300 + insets.top) }]}
        />
      )}

      {activeTab === 'home' && (
        loadingDb ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#59C749" />
          </View>
        ) : (
          matches.length === 0 ? renderEmptyState() : renderHomeTab()
        )
      )}
      {activeTab === 'matches' && renderMatchesTab()}
      {activeTab === 'tournament' && renderTournamentTab()}
      {activeTab === 'profile' && renderProfileTab()}

      {/* ═══════════════════════════════════════════
          FLOATING BOTTOM NAV (Redesigned)
      ═══════════════════════════════════════════ */}
      <View style={styles.navOuter}>
        <View style={styles.navBar}>
          {/* Tab 1: Home */}
          <TouchableOpacity
            style={styles.navItem}
            onPress={() => setActiveTab('home')}
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
              onPress={() => setActiveTab('matches')}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons
                name={activeTab === 'matches' ? 'scoreboard' : 'scoreboard-outline'}
                size={20}
                color={activeTab === 'matches' ? C.green : 'rgba(255,255,255,0.42)'}
              />
              <Text style={[styles.navLabel, activeTab === 'matches' && styles.navLabelActive]}>Matches</Text>
              {activeTab === 'matches' && <View style={styles.activeDot} />}
            </TouchableOpacity>
          </TourHighlight>

          {/* Tab 3: Center FAB (Cricket Ball Image) */}
          <View style={styles.navCenter}>
            <TourHighlight id="create-match">
              <TouchableOpacity
                style={styles.navCenterBtn}
                onPress={() => router.push('/create-matches')}
                activeOpacity={0.85}
              >
                <Image
                  source={require('@/assets/images/cricket-ball.png')}
                  style={styles.cricketBallImage}
                />
              </TouchableOpacity>
            </TourHighlight>
          </View>

          {/* Tab 4: Tournament */}
          <TourHighlight id="tournament-tab" style={{ flex: 1 }}>
            <TouchableOpacity
              style={[styles.navItem, { width: '100%' }]}
              onPress={() => setActiveTab('tournament')}
              activeOpacity={0.75}
            >
              <MaterialCommunityIcons
                name={activeTab === 'tournament' ? 'trophy' : 'trophy-outline'}
                size={20}
                color={activeTab === 'tournament' ? C.green : 'rgba(255,255,255,0.42)'}
              />
              <Text style={[styles.navLabel, activeTab === 'tournament' && styles.navLabelActive]}>Tournament</Text>
              {activeTab === 'tournament' && <View style={styles.activeDot} />}
            </TouchableOpacity>
          </TourHighlight>

          {/* Tab 5: Profile */}
          <TourHighlight id="profile-tab" style={{ flex: 1 }}>
            <TouchableOpacity
              style={[styles.navItem, { width: '100%' }]}
              onPress={() => setActiveTab('profile')}
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
      </View>
    </View>
  );
}

// ─── Responsive layout pre-compute (module level) ────────────────────────────
const _W = Math.min(s(375), 600);
const CARD_2COL_HOME = gridCardWidth(2, s(10), sp.lg);
const CARD_3COL_HOME = gridCardWidth(3, s(10), sp.lg);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root:  { flex: 1, backgroundColor: '#F3F4F1' },
  scroll:{ flex: 1 },
  body:  { /* no global padding — sections own it */ },

  // ── Hero ──────────────────────────────────────────────────────────────────
  hero: {
    backgroundColor: C.hero,
    paddingHorizontal: sp.lg,
    position: 'relative',
    overflow: 'hidden',
  },
  deco1: {
    position: 'absolute',
    width: _W * 0.60,
    height: _W * 0.60,
    borderRadius: _W * 0.30,
    backgroundColor: 'rgba(89,199,73,0.07)',
    top: -_W * 0.18,
    right: -_W * 0.14,
  },
  deco2: {
    position: 'absolute',
    width: _W * 0.38,
    height: _W * 0.38,
    borderRadius: _W * 0.19,
    backgroundColor: 'rgba(255,255,255,0.03)',
    bottom: sp.lg,
    left: -_W * 0.10,
  },
  curve: {
    height: s(28),
    backgroundColor: C.milky,
    borderTopLeftRadius: s(28),
    borderTopRightRadius: s(28),
    marginTop: sp.xl,
  },

  // Header row
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: sp.xl,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: C.shadowG,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
  },
  avatarTxt: {
    fontSize: 16,
    fontWeight: '800',
    color: C.white,
  },
  onlineDot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#34D399',
    bottom: 1,
    right: 1,
    borderWidth: 1.5,
    borderColor: C.hero,
  },
  helloTxt: {
    fontSize: 11,
    color: C.heroText,
    fontWeight: '500',
    lineHeight: 14,
  },
  nameTxt: {
    fontSize: 16,
    fontWeight: '800',
    color: C.white,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  bellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.green,
    borderWidth: 1,
    borderColor: C.hero,
  },

  // Hero center block
  heroCenter: {
    marginBottom: 20,
  },
  heroSub: {
    fontSize: 12,
    color: C.heroText,
    fontWeight: '500',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: C.white,
    letterSpacing: -0.8,
    marginBottom: 16,
  },

  // CTA buttons
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  btnSolid: {
    flex: 1,
    backgroundColor: C.green,
    paddingVertical: 13,
    borderRadius: 100,
    alignItems: 'center',
    shadowColor: C.shadowG,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 7,
  },
  btnSolidTxt: {
    color: C.white,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  btnGhost: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 100,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  btnGhostTxt: {
    color: C.white,
    fontSize: 14,
    fontWeight: '700',
  },

  // Pills
  pillsSection: {
    gap: 8,
  },
  pillsLabel: {
    fontSize: 10,
    color: C.heroText,
    fontWeight: '700',
    letterSpacing: 1.0,
  },
  pillsRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  pill: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  pillActive: {
    backgroundColor: C.green,
    borderColor: C.green,
  },
  pillTxt: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.68)',
    fontWeight: '600',
  },
  pillTxtActive: {
    color: C.white,
  },

  // ── Sections ───────────────────────────────────────────────────────────────
  section: {
    paddingHorizontal: 16,
    marginBottom: 14,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.black,
    letterSpacing: -0.3,
  },
  seeAll: {
    fontSize: 13,
    fontWeight: '600',
    color: C.green,
  },
  card: {
    backgroundColor: C.white,
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 12,
    shadowColor: C.shadowC,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: C.gray2,
  },

  // ── Quick Actions ──────────────────────────────────────────────────────────
  qaRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  qaWrap: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  qaBtn: {
    width: 54,
    height: 54,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.gray4,
    textAlign: 'center',
  },

  // ── Stats ──────────────────────────────────────────────────────────────────
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 18,
    padding: 12,
    gap: 3,
    shadowColor: C.shadowC,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: C.gray2,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.gray1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: C.gray3,
    letterSpacing: 0.6,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '900',
    color: C.black,
    letterSpacing: -0.4,
  },
  statNote: {
    fontSize: 9,
    fontWeight: '500',
    color: C.gray3,
  },

  // ── Activity ───────────────────────────────────────────────────────────────
  actCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    paddingVertical: 4,
    shadowColor: C.shadowC,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: C.gray2,
    overflow: 'hidden',
  },
  actRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: C.gray2,
    marginHorizontal: 14,
  },
  actEmoji: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: C.gray1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actBody: {
    flex: 1,
    gap: 2,
  },
  actTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.black,
    lineHeight: 17,
  },
  actDesc: {
    fontSize: 11,
    fontWeight: '400',
    color: C.gray3,
    lineHeight: 15,
  },
  actRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  actBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 100,
    backgroundColor: '#F3F4F6',
  },
  actBadgeGreen: {
    backgroundColor: 'rgba(89,199,73,0.14)',
  },
  actBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.gray4,
  },
  actBadgeTextGreen: {
    color: C.green,
  },
  actTime: {
    fontSize: 10,
    color: C.gray3,
    fontWeight: '500',
  },

  // ── Bottom Nav ─────────────────────────────────────────────────────────────
  navOuter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    paddingTop: 6,
    zIndex: 999,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17, 21, 16, 0.88)', // glassmorphism dark forest green background
    borderRadius: 32,
    paddingVertical: 10,
    paddingHorizontal: 10,
    shadowColor: C.green, // subtle green glow
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(89, 199, 73, 0.15)',
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 4,
    position: 'relative',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  navLabelActive: {
    color: C.green,
    fontWeight: '700',
  },
  navCenter: {
    flex: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -28,
  },
  navCenterBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: C.green, // Housing the ball image with green background
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 15,
    borderWidth: 3,
    borderColor: 'rgba(17, 21, 16, 0.95)',
  },
  cricketBallImage: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.green,
    marginTop: 2,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 2,
  },

  // ── Tab Content & Headers ──────────────────────────────────────────────────
  tabContent: {
    flex: 1,
    backgroundColor: '#0A0D0A', // Dark theme for tabs matching the cricket theme
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
  },
  tabHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  tabHeaderTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: C.white,
    letterSpacing: -0.5,
  },
  tabHeaderSub: {
    fontSize: 12,
    color: '#828880',
    fontWeight: '500',
    marginTop: 2,
  },
  tabScroll: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 120, // offset bottom nav
  },

  // ── Filters ─────────────────────────────────────────────────────────────────
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  filterBtnActive: {
    backgroundColor: 'rgba(89, 199, 73, 0.15)',
    borderColor: C.green,
  },
  filterBtnTxt: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  filterBtnTxtActive: {
    color: C.green,
    fontWeight: '700',
  },

  // ── Match Cards ────────────────────────────────────────────────────────────
  matchCard: {
    backgroundColor: '#131713',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 3,
  },
  matchCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 6,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
  liveBadgeTxt: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EF4444',
    letterSpacing: 0.5,
  },
  finishedLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#828880',
    backgroundColor: 'rgba(130, 136, 128, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    letterSpacing: 0.5,
  },
  matchTypeLabel: {
    fontSize: 11,
    color: '#828880',
    fontWeight: '500',
  },
  matchTeamsRow: {
    gap: 12,
    marginBottom: 12,
  },
  teamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  teamLogoContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamLogoText: {
    color: C.white,
    fontSize: 12,
    fontWeight: '800',
  },
  teamNameText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: C.white,
  },
  teamScoreText: {
    fontSize: 14,
    fontWeight: '800',
    color: C.green,
  },
  matchCardDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 12,
  },
  matchStatusText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F59E0B',
    lineHeight: 16,
  },
  matchStatusFinishedText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
    lineHeight: 16,
  },

  // ── Tournament Standings ───────────────────────────────────────────────────
  leagueFeaturedCard: {
    backgroundColor: 'rgba(89, 199, 73, 0.08)',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1.5,
    borderColor: 'rgba(89, 199, 73, 0.25)',
    marginBottom: 16,
  },
  leagueTag: {
    fontSize: 9,
    fontWeight: '800',
    color: C.green,
    letterSpacing: 1,
    marginBottom: 6,
  },
  leagueTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: C.white,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  leagueDetails: {
    fontSize: 12,
    color: '#828880',
    fontWeight: '500',
  },
  tableCard: {
    backgroundColor: '#131713',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    marginBottom: 16,
  },
  tableCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: C.white,
    marginBottom: 14,
    letterSpacing: -0.2,
  },
  tableHeaderRow: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 4,
  },
  thText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#828880',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  tdRankText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#828880',
  },
  tdNameText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.white,
  },
  tdText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  tdPtsText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.green,
  },
  leadersRow: {
    flexDirection: 'row',
    gap: 10,
  },
  leaderCard: {
    flex: 1,
    backgroundColor: '#131713',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    alignItems: 'center',
  },
  capIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  leaderLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: '#828880',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  leaderName: {
    fontSize: 13,
    fontWeight: '800',
    color: C.white,
    marginBottom: 2,
  },
  leaderStats: {
    fontSize: 10,
    color: C.green,
    fontWeight: '600',
  },

  // ── Profile & Settings (Redesigned) ────────────────────────────────────────
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 20,
    backgroundColor: 'transparent',
  },
  profileHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
    letterSpacing: -0.3,
  },
  profileHeaderBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  profileScroll: {
    paddingHorizontal: 18,
    paddingBottom: 20,
  },
  profileIdentityCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  profileAvatarSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginRight: 14,
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  profileAvatarSmallTxt: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  profileOnlineDot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#34D399',
    bottom: 1,
    right: 1,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  profileIdentityInfo: {
    flex: 1,
  },
  profileIdentityName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 3,
    letterSpacing: -0.2,
  },
  profileIdentityEmail: {
    fontSize: 13,
    color: '#8A8A8A',
    fontWeight: '500',
  },
  profileEditBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.green,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  profileMenuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 4,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  profileMenuIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F3F4F1',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  profileMenuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  profileMenuDivider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: 72,
    marginRight: 16,
  },
  profileLogoutCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // kept for other components that reference these
  profileBioCard: { backgroundColor: '#131713', borderRadius: 24, padding: 20, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', marginBottom: 20 },
  profileAvatarLarge: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.green, alignItems: 'center', justifyContent: 'center', position: 'relative', marginBottom: 12 },
  profileAvatarTxt: { fontSize: 28, fontWeight: '900', color: C.white },
  onlineBadge: { position: 'absolute', width: 14, height: 14, borderRadius: 7, backgroundColor: '#34D399', bottom: 2, right: 2, borderWidth: 2, borderColor: '#131713' },
  profileName: { fontSize: 20, fontWeight: '900', color: C.white, letterSpacing: -0.3, marginBottom: 2 },
  profileRole: { fontSize: 11, color: '#828880', fontWeight: '500', marginBottom: 16 },
  profileStatsSummary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', width: '100%', paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  profileStatItem: { flex: 1, alignItems: 'center' },
  profileStatVal: { fontSize: 18, fontWeight: '800', color: C.white },
  profileStatLbl: { fontSize: 10, color: '#828880', fontWeight: '600', marginTop: 2 },
  verticalDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.08)' },
  profileSectionTitle: { fontSize: 14, fontWeight: '800', color: C.white, letterSpacing: -0.2, marginBottom: 10, marginTop: 8 },
  teamsHorizontalScroll: { gap: 12, paddingBottom: 4, marginBottom: 16 },
  teamManagedCard: { width: 140, backgroundColor: '#131713', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center' },
  teamManagedIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  teamManagedIconText: { color: C.white, fontSize: 14, fontWeight: '800' },
  teamManagedName: { fontSize: 12, fontWeight: '800', color: C.white, marginBottom: 2, textAlign: 'center' },
  teamManagedCount: { fontSize: 9, color: '#828880', fontWeight: '500', textAlign: 'center' },
  settingsCard: { backgroundColor: '#131713', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingTitle: { fontSize: 12, fontWeight: '700', color: C.white },
  settingValue: { fontSize: 11, color: C.green, fontWeight: '600' },


  // ── Create Match Modal ─────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#0E110E',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '88%',
    borderWidth: 1.5,
    borderColor: 'rgba(89, 199, 73, 0.15)',
    borderBottomWidth: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: C.white,
    letterSpacing: -0.3,
  },
  modalSubtitle: {
    fontSize: 11,
    color: '#828880',
    fontWeight: '500',
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalScrollBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#828880',
    letterSpacing: 0.8,
    marginBottom: 8,
    marginTop: 12,
  },
  textInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    color: C.white,
    fontSize: 13,
    fontWeight: '600',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  formRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 4,
  },
  oversRowSelect: {
    flexDirection: 'row',
    gap: 8,
  },
  overOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  overOptionActive: {
    backgroundColor: 'rgba(89, 199, 73, 0.15)',
    borderColor: C.green,
  },
  overOptionText: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  overOptionTextActive: {
    color: C.green,
    fontWeight: '800',
  },
  typeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    height: 42,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  typeSelectorText: {
    color: C.white,
    fontSize: 13,
    fontWeight: '700',
  },
  venueInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  venueInput: {
    flex: 1,
    paddingVertical: 12,
    color: C.white,
    fontSize: 13,
    fontWeight: '600',
  },
  startScoringBtn: {
    backgroundColor: C.green,
    paddingVertical: 14,
    borderRadius: 100,
    alignItems: 'center',
    shadowColor: C.green,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    marginTop: 12,
  },
  startScoringBtnTxt: {
    color: C.white,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  cancelBtn: {
    paddingVertical: 12,
    borderRadius: 100,
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  cancelBtnTxt: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '700',
  },
  
  // ── Playground Map Card ──────────────────────────────────────────────────
  mapCard: {
    backgroundColor: '#151715',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 4,
  },
  mapCardHeader: {
    marginBottom: 12,
  },
  mapCardSub: {
    fontSize: 11,
    color: '#828880',
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  mapCardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.white,
    letterSpacing: -0.4,
  },
  mapContainer: {
    height: 180,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1E201E',
  },
  permissionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(21, 23, 21, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  permissionText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.white,
    marginBottom: 2,
  },
  permissionSub: {
    fontSize: 11,
    color: '#828880',
    textAlign: 'center',
  },
  mapCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  participantsLeft: {
    gap: 2,
  },
  participantsSub: {
    fontSize: 11,
    color: '#828880',
    fontWeight: '500',
  },
  participantsMain: {
    fontSize: 16,
    fontWeight: '800',
    color: C.white,
    letterSpacing: -0.2,
  },
  avatarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantImg: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#151715',
  },
  participantBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#282C28',
    borderWidth: 2,
    borderColor: '#151715',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTxt: {
    fontSize: 10,
    fontWeight: '700',
    color: '#828880',
  },

  // ── Empty State Redesign Styles ─────────────────────────────────────────────
  emptyRoot: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyBody: {
    flexGrow: 1,
    paddingBottom: 140,
    alignItems: 'center',
    paddingHorizontal: 20,
    position: 'relative',
    backgroundColor: '#F8F9FA',
  },
  emptyHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    paddingTop: Platform.OS === 'ios' ? 48 : 28,
    marginBottom: 24,
    width: '100%',
  },
  emptyHelloTxt: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
    lineHeight: 14,
  },
  emptyNameTxt: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  emptyOnlineDot: {
    position: 'absolute',
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#34D399',
    bottom: 1,
    right: 1,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
  },
  emptyBellBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  emptyBellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#59C749',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  emptyHeroSection: {
    alignItems: 'center',
    marginVertical: 12,
    paddingHorizontal: 20,
    width: '100%',
  },
  emptyBallContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyBatEmoji: {
    fontSize: 38,
  },
  emptyTitleText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  emptyDescText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#4B5563',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 8,
  },
  emptyCtaWrapper: {
    alignItems: 'center',
    marginVertical: 24,
    width: '100%',
  },
  floatingGradientBtn: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#59C749',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  floatingGradientBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 30,
    gap: 12,
  },
  ctaIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaIconEmoji: {
    fontSize: 14,
  },
  ctaButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  emptySecondaryContainer: {
    width: '100%',
    paddingHorizontal: 4,
    marginBottom: 24,
  },
  emptySectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 1.0,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  secondaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 10,
    elevation: 2,
  },
  secondaryIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryIconText: {
    fontSize: 20,
  },
  secondaryCardText: {
    flex: 1,
    gap: 2,
  },
  secondaryCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  secondaryCardDesc: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    lineHeight: 14,
  },
  emptyFeedCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(168, 205, 85, 0.18)',
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  emptyFeedText: {
    fontSize: 13,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 14,
  },
  createMatchMiniBtn: {
    backgroundColor: '#59C749',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 100,
  },
  createMatchMiniBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
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
  emptyIllustrationEmoji: {
    fontSize: 32,
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

  // ─── Redesigned Dashboard Styles ──────────────────────────────────────────
  emptyContainerFull: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  headerProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
    fontSize: 18,
    fontWeight: '800',
    color: '#2D5016',
  },
  headerOnlineBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#59C749',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  headerGreetingCol: {
    flex: 1,
    marginLeft: 12,
  },
  headerGreetingLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8A8A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  headerNotificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  headerBellDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4D4D',
  },
  dashHeroCardContainer: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  dashHeroCardGradient: {
    borderRadius: 24,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  dashHeroDecoCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  dashHeroDecoCircle2: {
    position: 'absolute',
    bottom: -60,
    left: -40,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
  },
  dashHeroContent: {
    zIndex: 2,
  },
  dashHeroBadgeRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dashHeroBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  dashHeroBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#A8CD55',
    letterSpacing: 0.8,
  },
  dashHeroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFF',
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  dashHeroSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
    lineHeight: 16,
  },
  dashHeroButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dashHeroBtnSolid: {
    flex: 1,
    backgroundColor: '#A8CD55',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  dashHeroBtnSolidText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1B3F14',
  },
  dashHeroBtnOutline: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dashHeroBtnOutlineText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
  dashboardSection: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  dashboardSectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8A8A8A',
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  quickActionsGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  quickActionCardCell: {
    width: '31%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  quickActionIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionEmoji: {
    fontSize: 18,
  },
  quickActionLabelText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  statsDashboardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statGridCard: {
    width: '48%',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statIconEmoji: {
    fontSize: 13,
  },
  statCardValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  statCardLabel: {
    fontSize: 11,
    color: '#8A8A8A',
    fontWeight: '600',
  },
  continueMatchCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  continueMatchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  liveIndicatorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 0.5,
    borderColor: '#FFC1C1',
  },
  liveIndicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4D4D',
    marginRight: 6,
  },
  liveIndicatorText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FF4D4D',
  },
  continueMatchTime: {
    fontSize: 10,
    color: '#8A8A8A',
    fontWeight: '600',
  },
  continueMatchTeamsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F1',
    marginBottom: 10,
  },
  continueMatchTeamCol: {
    flex: 1.2,
  },
  continueMatchTeamName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  continueMatchTeamScore: {
    fontSize: 13,
    color: '#2D5016',
    fontWeight: '700',
  },
  continueMatchVsText: {
    flex: 0.3,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: '#8A8A8A',
  },
  continueMatchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  continueMatchFormatText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8A8A8A',
  },
  continueActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2D5016',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 4,
  },
  continueActionBtnText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFF',
  },
  achievementsCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  badgesHorizontalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  badgeWrapperCell: {
    alignItems: 'center',
    width: '23%',
  },
  badgeIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    position: 'relative',
  },
  badgeEmoji: {
    fontSize: 20,
  },
  badgeLockContainer: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#FFF',
  },
  badgeTitleText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 2,
    textAlign: 'center',
  },
  badgeProgressText: {
    fontSize: 8,
    color: '#8A8A8A',
    fontWeight: '600',
    textAlign: 'center',
  },
  badgeProgressWrapper: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F1',
    paddingTop: 12,
  },
  progressLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  progressNextText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#2D5016',
  },
  progressPercentText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#8A8A8A',
  },
  progressBarBackground: {
    height: 6,
    backgroundColor: '#F3F4F1',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#A8CD55',
    borderRadius: 3,
  },
  activitiesContainerCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  activityTimelineItem: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  activityLeftLineCol: {
    width: 32,
    alignItems: 'center',
  },
  activityEmojiCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0F4EC',
    borderWidth: 1,
    borderColor: 'rgba(168,205,85,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  activityEmojiText: {
    fontSize: 13,
  },
  activityConnectorLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#F3F4F1',
    marginVertical: 4,
  },
  activityTextContent: {
    flex: 1,
    marginLeft: 10,
    justifyContent: 'center',
  },
  activityRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  activityItemTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  activityItemTime: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8A8A8A',
  },
  activityItemDesc: {
    fontSize: 10,
    color: '#8A8A8A',
    fontWeight: '600',
    lineHeight: 14,
  },
  emptyActivitiesPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyActivitiesTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  emptyActivitiesDesc: {
    fontSize: 10,
    color: '#8A8A8A',
    textAlign: 'center',
    lineHeight: 14,
    paddingHorizontal: 12,
  },
  tipCardContainer: {
    borderRadius: 20,
    padding: 14,
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tipHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    zIndex: 2,
  },
  tipHeaderEmoji: {
    fontSize: 14,
    marginRight: 6,
  },
  tipHeaderTitle: {
    fontSize: 10,
    fontWeight: '900',
    color: '#2D5016',
    letterSpacing: 0.8,
  },
  tipBodyText: {
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '600',
    lineHeight: 16,
    zIndex: 2,
  },
  welcomeIllustrationCard: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  welcomeBatIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  welcomeTitleText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#1B3F14',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitleText: {
    fontSize: 12,
    color: '#2D5016',
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 12,
  },
  welcomeButtonsContainer: {
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  welcomeBtnSolid: {
    backgroundColor: '#2D5016',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  welcomeBtnSolidText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFF',
  },
  welcomeBtnOutline: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#2D5016',
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  welcomeBtnOutlineText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2D5016',
  },
  radarGraphicContainer: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  radarRing: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1.5,
    borderColor: '#A8CD55',
    backgroundColor: 'rgba(168, 205, 85, 0.08)',
  },
  radarCenterBadge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#FFF',
    shadowColor: '#2D5016',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 10,
  },
});

