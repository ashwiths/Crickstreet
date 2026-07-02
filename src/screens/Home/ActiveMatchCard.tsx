import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { s, fs, sp, br } from '../../theme/responsive';

export default function ActiveMatchCard() {
  const router = useRouter();

  return (
    <View style={styles.quickMatchCardsRow}>
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.quickMatchCard}
        onPress={() => router.push('/create-matches?flow=practice')}
      >
        <View style={styles.quickMatchIconCircle}>
          <Text style={{ fontSize: 20 }}>🏏</Text>
        </View>
        <Text style={styles.quickMatchTitle}>Street Cricket</Text>
        <Text style={styles.quickMatchDesc}>Solo or casual practice</Text>
        <View style={styles.quickMatchBtn}>
          <Text style={styles.quickMatchBtnText}>Start</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.quickMatchCard}
        onPress={() => router.push('/create-matches?flow=tournament')}
      >
        <View style={[styles.quickMatchIconCircle, { backgroundColor: '#FFF9E6' }]}>
          <Text style={{ fontSize: 20 }}>🏆</Text>
        </View>
        <Text style={styles.quickMatchTitle}>Official Match</Text>
        <Text style={styles.quickMatchDesc}>Create tournament/series</Text>
        <View style={styles.quickMatchBtnOutline}>
          <Text style={styles.quickMatchBtnOutlineText}>Create</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  quickMatchCardsRow: {
    flexDirection: 'row',
    paddingHorizontal: sp.lg,
    gap: sp.md,
    marginBottom: sp.lg,
  },
  quickMatchCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: br.xxl,
    padding: sp.lg,
    alignItems: 'center',
    shadowColor: 'rgba(0,0,0,0.06)',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E8E4D4',
  },
  quickMatchIconCircle: {
    width: s(40),
    height: s(40),
    borderRadius: br.md3,
    backgroundColor: '#F0F4EC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: sp.md,
  },
  quickMatchTitle: {
    fontSize: fs.md2,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: sp.xs,
  },
  quickMatchDesc: {
    fontSize: fs.sm,
    color: '#8A8A8A',
    textAlign: 'center',
    marginBottom: sp.lg,
    lineHeight: fs.sm * 1.3,
  },
  quickMatchBtn: {
    backgroundColor: '#59C749',
    paddingVertical: sp.sm,
    paddingHorizontal: sp.xl,
    borderRadius: br.full,
    width: '100%',
    alignItems: 'center',
  },
  quickMatchBtnText: {
    fontSize: fs.md,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  quickMatchBtnOutline: {
    borderWidth: 1.5,
    borderColor: '#A8CD55',
    paddingVertical: sp.sm - 1.5,
    paddingHorizontal: sp.xl,
    borderRadius: br.full,
    width: '100%',
    alignItems: 'center',
  },
  quickMatchBtnOutlineText: {
    fontSize: fs.md,
    fontWeight: '800',
    color: '#2D5016',
  },
});
