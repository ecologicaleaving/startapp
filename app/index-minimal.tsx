import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MinimalIndex() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Hello from Minimal App!</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontSize: 18,
    color: '#000000',
  },
});