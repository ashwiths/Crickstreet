import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SearchScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.center}>
        <Feather name="search" size={48} color="#59C749" />
        <Text style={styles.title}>Search</Text>
        <Text style={styles.sub}>Coming soon</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFDF1' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  title: { fontSize: 24, fontWeight: '800', color: '#000000' },
  sub: { fontSize: 14, color: '#9B9880', fontWeight: '500' },
});
