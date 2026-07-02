import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { s, fs, sp, br } from '../../theme/responsive';

export default function ActiveMatchCard() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.createCard}>
        <View style={styles.cardHeader}>
          <View style={styles.iconCircle}>
            <Text style={{ fontSize: 20 }}>🏏</Text>
          </View>
          <View style={styles.headerTextCol}>
            <Text style={styles.cardTitle}>Create Match</Text>
            <Text style={styles.cardSubtitle}>Start scoring a new cricket match</Text>
          </View>
        </View>

        <Text style={styles.cardDescription}>
          Set up teams, customize overs, locate local grounds, and start scoring live balls instantly.
        </Text>

        <TouchableOpacity
          activeOpacity={0.85}
          style={styles.actionBtn}
          onPress={() => router.push('/create-matches')}
        >
          <Text style={styles.actionBtnText}>Create Match</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: sp.lg,
    marginBottom: sp.lg,
  },
  createCard: {
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: sp.md,
    marginBottom: sp.sm,
  },
  iconCircle: {
    width: s(40),
    height: s(40),
    borderRadius: br.md3,
    backgroundColor: '#F0F4EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: fs.md2,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  cardSubtitle: {
    fontSize: fs.xs,
    color: '#8A8A8A',
    fontWeight: '500',
    marginTop: 2,
  },
  cardDescription: {
    fontSize: fs.sm,
    color: '#6B7280',
    lineHeight: fs.sm * 1.4,
    marginBottom: sp.lg,
  },
  actionBtn: {
    backgroundColor: '#59C749',
    paddingVertical: 14,
    borderRadius: br.full,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#59C749',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 2,
  },
  actionBtnText: {
    fontSize: fs.md,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
