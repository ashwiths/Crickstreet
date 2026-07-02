import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { s, fs, sp, br } from '../src/theme/responsive';

const C = {
  bg: '#F3F4F1',
  green: '#59C749',
  white: '#FFFFFF',
  textDark: '#1A1A1A',
  textGray: '#6B7280',
  border: '#E8E4D4',
  btnGray: '#F9F8F3',
};

export default function RulesConditionsScreen() {
  const router = useRouter();

  const rulesList = [
    {
      num: '1',
      title: 'Single Active Match Limit',
      desc: 'To maintain the integrity of statistics, only one match can be scored live at any time. You cannot create a new scorecard or match setup until the current active match is either marked completed, abandoned, or deleted.',
    },
    {
      num: '2',
      title: 'Live Dashboard Updates',
      desc: 'Every run, extra, wicket, or ball you enter will synchronize with our servers in real-time. This immediately updates the live dashboards, user statistics, and notifications for all followers of either team.',
    },
    {
      num: '3',
      title: 'Match Cannot Be Edited',
      desc: 'Once the match is initialized and the first ball is bowled, key parameters such as the match format, team names, overs count, and initial squad rosters are locked. Ensure all configurations are double-checked.',
    },
    {
      num: '4',
      title: 'Live Scoring Responsibility',
      desc: 'As a scorer, your entries are official. Enter balls, runs, and extras with care. Misrepresenting scores or inputting inaccurate results ruins the fair-play experience for both participating squads.',
    },
    {
      num: '5',
      title: 'Internet Connection',
      desc: 'A reliable internet connection is highly recommended. If you go offline, scores will accumulate locally, but real-time notifications, viewer dashboards, and database sync will pause until connectivity is restored.',
    },
    {
      num: '6',
      title: 'Fair Play',
      desc: 'Crickstreet promotes clean, honest cricket. Scoring decisions such as leg-byes, wide lines, and run-outs must align with standard ICC/local laws. Score matches with neutrality and high precision.',
    },
    {
      num: '7',
      title: 'Complete Match',
      desc: 'Always complete matches properly through the scorecard interface. Exiting a match prematurely without completing the final innings creates unfinished states in both players stats histories.',
    },
  ];

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          activeOpacity={0.8} 
          style={styles.backButton} 
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={20} color={C.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rules & Conditions</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.introText}>
          Please read the official Crickstreet match scoring terms of service and rules below. By scoring a match, you accept these terms.
        </Text>

        <View style={styles.list}>
          {rulesList.map((item) => (
            <View key={item.num} style={styles.card}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.num}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    height: s(56),
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: sp.md,
    backgroundColor: C.white,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backButton: {
    width: s(40),
    height: s(40),
    borderRadius: s(20),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.btnGray,
    borderWidth: 1,
    borderColor: C.border,
  },
  headerTitle: {
    fontSize: fs.md2,
    fontWeight: '900',
    color: C.textDark,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: sp.lg,
  },
  introText: {
    fontSize: fs.sm,
    color: C.textGray,
    lineHeight: fs.sm * 1.4,
    marginBottom: sp.lg,
  },
  list: {
    gap: sp.md,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: C.white,
    borderRadius: br.lg,
    borderWidth: 1.5,
    borderColor: '#CCD4C5',
    padding: sp.md,
    gap: sp.md,
    shadowColor: 'rgba(0,0,0,0.02)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 1,
  },
  badge: {
    width: s(24),
    height: s(24),
    borderRadius: s(12),
    backgroundColor: 'rgba(89,199,73,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(89,199,73,0.3)',
    marginTop: 2,
  },
  badgeText: {
    fontSize: fs.xs,
    fontWeight: '900',
    color: C.green,
  },
  cardBody: {
    flex: 1,
  },
  cardTitle: {
    fontSize: fs.sm,
    fontWeight: '800',
    color: C.textDark,
    marginBottom: 6,
  },
  cardDesc: {
    fontSize: fs.xs,
    color: C.textGray,
    lineHeight: fs.xs * 1.4,
  },
});
