import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface NetworkStatusProps {
  compact?: boolean;
  style?: any;
}

/**
 * Network connectivity status indicator component
 * Shows online/offline state with visual indicators
 */
export function NetworkStatus({ compact = false, style }: NetworkStatusProps) {
  const { isConnected, isOffline, isInitialized } = useNetworkStatus();

  if (!isInitialized) {
    return null; // Don't show until network status is determined
  }

  if (isConnected && compact) {
    return null; // Don't show when online in compact mode
  }

  const statusColor = isConnected ? '#4CAF50' : '#FF5722';
  const statusText = isConnected ? 'Online' : 'Offline';
  const statusIcon = isConnected ? '🌐' : '📵';

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: statusColor }, style]}>
        <Text style={styles.compactIcon}>{statusIcon}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: statusColor }, style]}>
      <Text style={styles.icon}>{statusIcon}</Text>
      <Text style={styles.text}>{statusText}</Text>
      {isOffline && (
        <Text style={styles.subtitle}>Using cached data</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginVertical: 4,
  },
  compactContainer: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 16,
    marginRight: 6,
  },
  compactIcon: {
    fontSize: 12,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    marginRight: 8,
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.9,
  },
});