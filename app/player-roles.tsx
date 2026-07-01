import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { s, fs, sp, br } from '../src/theme/responsive';

type PlayerRole = 'Batter' | 'Bowler' | 'All-Rounder' | 'WK';
const ROLES: PlayerRole[] = ['Batter', 'Bowler', 'All-Rounder', 'WK'];
const ROLE_ICONS: Record<PlayerRole, string> = {
  Batter: '🏏',
  Bowler: '⚡',
  'All-Rounder': '⭐',
  WK: '🧤',
};
const ROLE_SHORT: Record<PlayerRole, string> = {
  Batter: 'BAT',
  Bowler: 'BWL',
  'All-Rounder': 'AR',
  WK: 'WK',
};

const C = {
  bg: '#0A0D0A',
  green: '#59C749',
  white: '#FFFFFF',
  gray: '#9CA3AF',
  border: 'rgba(255,255,255,0.08)',
  card: 'rgba(255,255,255,0.04)',
};

export default function PlayerRolesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    myTeamName?: string;
    oppTeamName?: string;
    myPlayers?: string;
    oppPlayers?: string;
    matchId?: string;
    format?: string;
    customOvers?: string;
  }>();

  const myTeamName = params.myTeamName || 'My Team';
  const oppTeamName = params.oppTeamName || 'Opponent';
  const matchId = params.matchId || '';
  const format = params.format || 'T20';
  const customOvers = params.customOvers || '20';

  const myPlayers: string[] = params.myPlayers ? JSON.parse(params.myPlayers) : [];
  const oppPlayers: string[] = params.oppPlayers ? JSON.parse(params.oppPlayers) : [];

  const initRoles = (players: string[]): Record<string, PlayerRole> => {
    const r: Record<string, PlayerRole> = {};
    players.forEach((p) => { r[p] = 'Batter'; });
    return r;
  };

  const [myRoles, setMyRoles] = useState<Record<string, PlayerRole>>(initRoles(myPlayers));
  const [oppRoles, setOppRoles] = useState<Record<string, PlayerRole>>(initRoles(oppPlayers));
  const [battingFirst, setBattingFirst] = useState<'my' | 'opp'>('my');
  const [striker, setStriker] = useState<string>(myPlayers[0] || '');
  const [nonStriker, setNonStriker] = useState<string>(myPlayers[1] || '');
  const [openingBowler, setOpeningBowler] = useState<string>(oppPlayers[0] || '');

  const battingPlayers = battingFirst === 'my' ? myPlayers : oppPlayers;
  const fieldingPlayers = battingFirst === 'my' ? oppPlayers : myPlayers;
  const battingTeamName = battingFirst === 'my' ? myTeamName : oppTeamName;
  const fieldingTeamName = battingFirst === 'my' ? oppTeamName : myTeamName;

  const switchBattingFirst = (team: 'my' | 'opp') => {
    setBattingFirst(team);
    if (team === 'my') {
      setStriker(myPlayers[0] || '');
      setNonStriker(myPlayers[1] || '');
      setOpeningBowler(oppPlayers[0] || '');
    } else {
      setStriker(oppPlayers[0] || '');
      setNonStriker(oppPlayers[1] || '');
      setOpeningBowler(myPlayers[0] || '');
    }
  };

  const handleStartMatch = () => {
    router.replace({
      pathname: '/live-scoring',
      params: {
        myTeamName,
        oppTeamName,
        myPlayers: params.myPlayers || JSON.stringify(myPlayers),
        oppPlayers: params.oppPlayers || JSON.stringify(oppPlayers),
        myRoles: JSON.stringify(myRoles),
        oppRoles: JSON.stringify(oppRoles),
        battingFirst,
        striker,
        nonStriker,
        openingBowler,
        matchId,
        format,
        customOvers,
      },
    });
  };

  const renderRoleRow = (
    player: string,
    roles: Record<string, PlayerRole>,
    setRoles: React.Dispatch<React.SetStateAction<Record<string, PlayerRole>>>,
    isLast: boolean
  ) => (
    <View key={player} style={[styles.playerRoleRow, !isLast && styles.playerRoleRowBorder]}>
      <Text style={styles.playerName} numberOfLines={1}>{player}</Text>
      <View style={styles.roleButtonsRow}>
        {ROLES.map((role) => {
          const isActive = roles[player] === role;
          return (
            <TouchableOpacity
              key={role}
              style={[styles.roleBtn, isActive && styles.roleBtnActive]}
              onPress={() => setRoles((prev) => ({ ...prev, [player]: role }))}
              activeOpacity={0.7}
            >
              <Text style={styles.roleBtnIcon}>{ROLE_ICONS[role]}</Text>
              <Text style={[styles.roleBtnText, isActive && styles.roleBtnTextActive]}>
                {ROLE_SHORT[role]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="#0A0D0A" />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="chevron-left" size={22} color={C.white} />
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle}>Match Setup</Text>
            <Text style={styles.headerSub}>{format} · {myTeamName} vs {oppTeamName}</Text>
          </View>
          <View style={{ width: s(40) }} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

          {/* ── WHO BATS FIRST ── */}
          <Text style={styles.sectionLabel}>🏆 WHO BATS FIRST?</Text>
          <View style={styles.tossRow}>
            {(['my', 'opp'] as const).map((team) => {
              const teamName = team === 'my' ? myTeamName : oppTeamName;
              const isActive = battingFirst === team;
              return (
                <TouchableOpacity
                  key={team}
                  style={[styles.tossBtn, isActive && styles.tossBtnActive]}
                  onPress={() => switchBattingFirst(team)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.tossBtnEmoji}>🏏</Text>
                  <Text style={[styles.tossBtnText, isActive && styles.tossBtnTextActive]}
                    numberOfLines={1}>
                    {teamName}
                  </Text>
                  {isActive && (
                    <View style={styles.tossActiveBadge}>
                      <Text style={styles.tossActiveBadgeText}>BATTING</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── OPENING BATSMEN ── */}
          <Text style={styles.sectionLabel}>🏏 OPENING BATSMEN · {battingTeamName}</Text>
          <View style={styles.openersCard}>
            <View style={styles.openerSection}>
              <View style={styles.openerLabelRow}>
                <View style={styles.strikerDot} />
                <Text style={styles.openerLabel}>Striker</Text>
              </View>
              <View style={styles.openerPills}>
                {battingPlayers.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.openerPill, striker === p && styles.openerPillActive]}
                    onPress={() => {
                      setStriker(p);
                      if (nonStriker === p) setNonStriker('');
                    }}
                  >
                    <Text style={[styles.openerPillText, striker === p && styles.openerPillTextActive]}
                      numberOfLines={1}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.openerDivider} />

            <View style={styles.openerSection}>
              <View style={styles.openerLabelRow}>
                <View style={styles.nonStrikerDot} />
                <Text style={styles.openerLabel}>Non-Striker</Text>
              </View>
              <View style={styles.openerPills}>
                {battingPlayers.filter((p) => p !== striker).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.openerPill, nonStriker === p && styles.openerPillActive]}
                    onPress={() => setNonStriker(p)}
                  >
                    <Text style={[styles.openerPillText, nonStriker === p && styles.openerPillTextActive]}
                      numberOfLines={1}>
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* ── OPENING BOWLER ── */}
          <Text style={styles.sectionLabel}>⚡ OPENING BOWLER · {fieldingTeamName}</Text>
          <View style={styles.openersCard}>
            <View style={styles.openerPills}>
              {fieldingPlayers.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.openerPill, openingBowler === p && styles.openerPillActive]}
                  onPress={() => setOpeningBowler(p)}
                >
                  <Text style={[styles.openerPillText, openingBowler === p && styles.openerPillTextActive]}
                    numberOfLines={1}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* ── MY TEAM ROLES ── */}
          <Text style={styles.sectionLabel}>👥 {myTeamName.toUpperCase()} — ROLES</Text>
          <View style={styles.teamCard}>
            {myPlayers.map((player, idx) =>
              renderRoleRow(player, myRoles, setMyRoles, idx === myPlayers.length - 1)
            )}
          </View>

          {/* ── OPP TEAM ROLES ── */}
          <Text style={styles.sectionLabel}>👥 {oppTeamName.toUpperCase()} — ROLES</Text>
          <View style={styles.teamCard}>
            {oppPlayers.map((player, idx) =>
              renderRoleRow(player, oppRoles, setOppRoles, idx === oppPlayers.length - 1)
            )}
          </View>

          <View style={{ height: s(16) }} />
        </ScrollView>

        {/* ── CTA ── */}
        <View style={styles.ctaContainer}>
          <TouchableOpacity
            style={{ borderRadius: br.full, overflow: 'hidden' }}
            onPress={handleStartMatch}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#59C749', '#3E8E31']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaBtn}
            >
              <Ionicons name="play" size={s(22)} color="#0A0D0A" />
              <Text style={styles.ctaBtnText}>Start Match</Text>
              <Text style={styles.ctaBtnSub}>{battingTeamName} to bat first</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0A0D0A' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: sp.xl, paddingVertical: sp.lg,
  },
  backBtn: {
    width: s(40), height: s(40), borderRadius: s(20),
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  headerTitle: { fontSize: fs.lg, fontWeight: '800', color: '#FFF', textAlign: 'center' },
  headerSub: { fontSize: fs.sm, color: '#9CA3AF', textAlign: 'center', marginTop: 2 },

  scroll: { paddingHorizontal: sp.lg, paddingBottom: s(24) },

  sectionLabel: {
    fontSize: fs.sm, fontWeight: '800', color: '#9CA3AF',
    letterSpacing: 0.6, marginTop: sp.xl, marginBottom: sp.md,
  },

  // Toss
  tossRow: { flexDirection: 'row', gap: sp.md },
  tossBtn: {
    flex: 1, padding: sp.md, borderRadius: br.xl,
    backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', gap: sp.xs,
    minHeight: s(80),
  },
  tossBtnActive: {
    backgroundColor: 'rgba(89,199,73,0.08)',
    borderColor: '#59C749',
  },
  tossBtnEmoji: { fontSize: s(28) },
  tossBtnText: {
    fontSize: fs.md2, fontWeight: '700',
    color: 'rgba(255,255,255,0.55)', textAlign: 'center',
  },
  tossBtnTextActive: { color: '#59C749', fontWeight: '800' },
  tossActiveBadge: {
    backgroundColor: '#59C749', borderRadius: br.full,
    paddingHorizontal: sp.sm, paddingVertical: 2, marginTop: sp.xs,
  },
  tossActiveBadgeText: { fontSize: fs.xs, fontWeight: '900', color: '#0A0D0A' },

  // Openers card
  openersCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: br.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: sp.md,
  },
  openerSection: { marginVertical: sp.xs },
  openerLabelRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, marginBottom: sp.sm },
  strikerDot: { width: s(8), height: s(8), borderRadius: s(4), backgroundColor: '#59C749' },
  nonStrikerDot: { width: s(8), height: s(8), borderRadius: s(4), backgroundColor: 'rgba(255,255,255,0.3)' },
  openerLabel: { fontSize: fs.sm, fontWeight: '700', color: '#9CA3AF' },
  openerDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.06)', marginVertical: sp.md },
  openerPills: { flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm },
  openerPill: {
    paddingHorizontal: sp.md, paddingVertical: sp.sm, borderRadius: br.full,
    backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  openerPillActive: { backgroundColor: 'rgba(89,199,73,0.15)', borderColor: '#59C749' },
  openerPillText: { fontSize: fs.sm, fontWeight: '600', color: 'rgba(255,255,255,0.55)' },
  openerPillTextActive: { color: '#59C749', fontWeight: '800' },

  // Team roles card
  teamCard: {
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: br.xl,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    padding: sp.md, gap: sp.md,
  },
  playerRoleRow: {
    flexDirection: 'row', alignItems: 'center', gap: sp.md,
    paddingBottom: sp.md,
  },
  playerRoleRowBorder: {
    borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  playerName: { flex: 1, fontSize: fs.md, fontWeight: '600', color: '#FFF' },
  roleButtonsRow: { flexDirection: 'row', gap: s(5) },
  roleBtn: {
    paddingHorizontal: s(8), paddingVertical: s(5),
    borderRadius: br.sm, backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', minWidth: s(40),
  },
  roleBtnActive: { backgroundColor: 'rgba(89,199,73,0.15)', borderColor: '#59C749' },
  roleBtnIcon: { fontSize: s(11) },
  roleBtnText: {
    fontSize: fs.xs, fontWeight: '700',
    color: 'rgba(255,255,255,0.45)', marginTop: 1,
  },
  roleBtnTextActive: { color: '#59C749' },

  // CTA
  ctaContainer: {
    paddingHorizontal: sp.lg, paddingTop: sp.md, paddingBottom: sp.md,
    borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: '#0A0D0A',
  },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: sp.md, gap: sp.sm, borderRadius: br.full,
  },
  ctaBtnText: { fontSize: fs.lg, fontWeight: '900', color: '#0A0D0A' },
  ctaBtnSub: {
    fontSize: fs.sm, fontWeight: '700', color: 'rgba(10,13,10,0.6)', marginLeft: sp.xs,
  },
});
