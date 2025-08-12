import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface OfflineIndicatorProps {
  isOfflineData?: boolean;
  size?: 'small' | 'medium' | 'large';
  style?: any;
  showLabel?: boolean;
}

/**
 * Visual indicator for offline data
 * Shows when data is being displayed from cache/offline storage
 */
export function OfflineIndicator({ 
  isOfflineData = false, 
  size = 'small',
  showLabel = true,
  style 
}: OfflineIndicatorProps) {
  if (!isOfflineData) {
    return null;
  }

  const sizeStyles = {
    small: styles.small,
    medium: styles.medium,
    large: styles.large,
  };

  const textSizes = {
    small: 10,
    medium: 12,
    large: 14,
  };

  const iconSizes = {
    small: 12,
    medium: 14,
    large: 16,
  };

  return (
    <View style={[styles.container, sizeStyles[size], style]}>
      <Text style={[styles.icon, { fontSize: iconSizes[size] }]}>📵</Text>
      {showLabel && (
        <Text style={[styles.label, { fontSize: textSizes[size] }]}>
          Cached
        </Text>
      )}
    </View>
  );
}

/**
 * Badge version for corner placement on cards
 */
export function OfflineBadge({ 
  isOfflineData = false, 
  style 
}: { 
  isOfflineData?: boolean; 
  style?: any; 
}) {
  if (!isOfflineData) {
    return null;
  }

  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.badgeIcon}>📵</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF5722',
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  small: {
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  medium: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  large: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  icon: {
    color: '#FFFFFF',
    marginRight: 3,
  },
  label: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF5722',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  badgeIcon: {
    fontSize: 10,
  },
});