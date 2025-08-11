import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SwitchTournament() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Switch Tournament</Text>
      <Text style={styles.subtitle}>Tournament switching functionality coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
});