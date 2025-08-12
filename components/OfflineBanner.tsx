import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useNetworkStatus } from '../hooks/useNetworkStatus';

interface OfflineBannerProps {
  onDismiss?: () => void;
  showWhenOnline?: boolean;
  style?: any;
}

/**
 * Offline mode notification banner
 * Displays prominent notification when app is offline
 */
export function OfflineBanner({ 
  onDismiss, 
  showWhenOnline = false, 
  style 
}: OfflineBannerProps) {
  const { isConnected, isOffline, isInitialized } = useNetworkStatus();

  if (!isInitialized || (isConnected && !showWhenOnline)) {
    return null;
  }

  const backgroundColor = isConnected ? '#4CAF50' : '#FF5722';
  const message = isConnected 
    ? 'Back online - data will sync automatically'
    : 'You\'re offline - showing cached tournament data';
  const icon = isConnected ? '✅' : '⚠️';

  return (
    <Pressable 
      style={[styles.banner, { backgroundColor }, style]}
      onPress={onDismiss}
      accessibilityRole="alert"
      accessibilityLabel={message}
    >
      <View style={styles.content}>
        <Text style={styles.icon}>{icon}</Text>
        <View style={styles.textContainer}>
          <Text style={styles.message}>{message}</Text>
          {isOffline && (
            <Text style={styles.subtitle}>
              Some features may be limited
            </Text>
          )}
        </View>
        {onDismiss && (
          <Text style={styles.dismissText}>Tap to dismiss</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  message: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  subtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
  },
  dismissText: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.8,
    marginLeft: 8,
  },
});