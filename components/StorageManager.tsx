import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { CacheService } from '../services/CacheService';

interface StorageInfo {
  totalSize: number;
  offlineSize: number;
  cacheSize: number;
  isNearLimit: boolean;
}

/**
 * Storage management component
 * Allows users to monitor and manage offline storage usage
 */
export function StorageManager({ style }: { style?: any }) {
  const [storageInfo, setStorageInfo] = useState<StorageInfo>({
    totalSize: 0,
    offlineSize: 0,
    cacheSize: 0,
    isNearLimit: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [lastCleanup, setLastCleanup] = useState<Date | null>(null);

  useEffect(() => {
    loadStorageInfo();
  }, []);

  const loadStorageInfo = async () => {
    try {
      setIsLoading(true);
      const usage = await CacheService.getStorageUsage();
      setStorageInfo(usage);
    } catch (error) {
      console.error('Failed to load storage info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUsagePercentage = (): number => {
    const maxStorage = 6 * 1024 * 1024; // 6MB typical limit
    return Math.min((storageInfo.totalSize / maxStorage) * 100, 100);
  };

  const getUsageColor = (): string => {
    const percentage = getUsagePercentage();
    if (percentage < 50) return '#4CAF50';
    if (percentage < 80) return '#FF9800';
    return '#F44336';
  };

  const handleClearOfflineCache = () => {
    Alert.alert(
      'Clear Offline Cache',
      'This will remove all offline tournament data. You can reload it when connected to the internet. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await CacheService.clearOfflineStorage();
              await loadStorageInfo();
              Alert.alert('Success', 'Offline cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear offline cache');
            }
          },
        },
      ]
    );
  };

  const handleClearAllCache = () => {
    Alert.alert(
      'Clear All Cache',
      'This will remove all cached data. The app will need to reload everything from the internet. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              await CacheService.clearLocalStorage();
              await CacheService.clearOfflineStorage();
              await loadStorageInfo();
              Alert.alert('Success', 'All cache cleared successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache');
            }
          },
        },
      ]
    );
  };

  const handleEnforceQuota = async () => {
    try {
      const removedCount = await CacheService.enforceStorageQuota();
      setLastCleanup(new Date());
      await loadStorageInfo();
      
      if (removedCount > 0) {
        Alert.alert(
          'Storage Optimized',
          `Removed ${removedCount} old cache entries to free up space.`
        );
      } else {
        Alert.alert('No Cleanup Needed', 'Storage usage is within acceptable limits.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to optimize storage');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.title}>Storage Management</Text>
        <Text style={styles.loading}>Loading storage information...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, style]}>
      <Text style={styles.title}>Storage Management</Text>
      
      {/* Storage Usage Overview */}
      <View style={styles.usageCard}>
        <View style={styles.usageHeader}>
          <Text style={styles.usageTitle}>Storage Usage</Text>
          <Text style={[styles.usagePercentage, { color: getUsageColor() }]}>
            {getUsagePercentage().toFixed(1)}%
          </Text>
        </View>
        
        <View style={styles.usageBar}>
          <View 
            style={[
              styles.usageBarFill, 
              { 
                width: `${getUsagePercentage()}%`,
                backgroundColor: getUsageColor()
              }
            ]} 
          />
        </View>
        
        <View style={styles.usageDetails}>
          <View style={styles.usageRow}>
            <Text style={styles.usageLabel}>Total:</Text>
            <Text style={styles.usageValue}>{formatBytes(storageInfo.totalSize)}</Text>
          </View>
          <View style={styles.usageRow}>
            <Text style={styles.usageLabel}>Offline Data:</Text>
            <Text style={styles.usageValue}>{formatBytes(storageInfo.offlineSize)}</Text>
          </View>
          <View style={styles.usageRow}>
            <Text style={styles.usageLabel}>Cache Data:</Text>
            <Text style={styles.usageValue}>{formatBytes(storageInfo.cacheSize)}</Text>
          </View>
        </View>

        {storageInfo.isNearLimit && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningIcon}>⚠️</Text>
            <Text style={styles.warningText}>
              Storage usage is high. Consider clearing some cached data.
            </Text>
          </View>
        )}
      </View>

      {/* Management Actions */}
      <View style={styles.actionsCard}>
        <Text style={styles.actionsTitle}>Storage Actions</Text>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleEnforceQuota}
        >
          <Text style={styles.actionIcon}>🧹</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Optimize Storage</Text>
            <Text style={styles.actionDescription}>
              Remove old cached data to free up space
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={handleClearOfflineCache}
        >
          <Text style={styles.actionIcon}>📭</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Clear Offline Cache</Text>
            <Text style={styles.actionDescription}>
              Remove offline tournament data ({formatBytes(storageInfo.offlineSize)})
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.actionButton, styles.dangerButton]}
          onPress={handleClearAllCache}
        >
          <Text style={styles.actionIcon}>🗑️</Text>
          <View style={styles.actionContent}>
            <Text style={styles.actionTitle}>Clear All Cache</Text>
            <Text style={styles.actionDescription}>
              Remove all cached data - requires internet to reload
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Last Cleanup Info */}
      {lastCleanup && (
        <View style={styles.infoCard}>
          <Text style={styles.infoText}>
            Last cleanup: {lastCleanup.toLocaleString()}
          </Text>
        </View>
      )}

      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={loadStorageInfo}
      >
        <Text style={styles.refreshButtonText}>Refresh Storage Info</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

/**
 * Compact storage indicator for showing in other components
 */
export function StorageIndicator({ 
  style, 
  onPress 
}: { 
  style?: any; 
  onPress?: () => void; 
}) {
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null);

  useEffect(() => {
    const loadInfo = async () => {
      try {
        const usage = await CacheService.getStorageUsage();
        setStorageInfo(usage);
      } catch (error) {
        console.error('Failed to load storage indicator info:', error);
      }
    };

    loadInfo();
  }, []);

  if (!storageInfo) {
    return null;
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + sizes[i];
  };

  const getColor = () => {
    if (storageInfo.isNearLimit) return '#F44336';
    const maxStorage = 6 * 1024 * 1024;
    const percentage = (storageInfo.totalSize / maxStorage) * 100;
    if (percentage > 60) return '#FF9800';
    return '#4CAF50';
  };

  return (
    <TouchableOpacity 
      style={[styles.indicator, style]}
      onPress={onPress}
      accessibilityLabel="Storage usage indicator"
    >
      <Text style={styles.indicatorIcon}>💾</Text>
      <Text style={[styles.indicatorText, { color: getColor() }]}>
        {formatBytes(storageInfo.totalSize)}
      </Text>
      {storageInfo.isNearLimit && (
        <Text style={styles.warningDot}>⚠️</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 16,
    color: '#333',
  },
  loading: {
    textAlign: 'center',
    color: '#666',
    marginTop: 32,
  },
  usageCard: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  usageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  usageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  usagePercentage: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  usageBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 12,
    overflow: 'hidden',
  },
  usageBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  usageDetails: {
    gap: 4,
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  usageLabel: {
    fontSize: 14,
    color: '#666',
  },
  usageValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
    borderWidth: 1,
    borderRadius: 6,
    padding: 8,
    marginTop: 12,
  },
  warningIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#E65100',
  },
  actionsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  actionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  dangerButton: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
  },
  actionIcon: {
    fontSize: 24,
    marginRight: 12,
    width: 32,
    textAlign: 'center',
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  actionDescription: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  infoCard: {
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  infoText: {
    fontSize: 12,
    color: '#1976D2',
    textAlign: 'center',
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginHorizontal: 16,
    marginBottom: 32,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  indicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  indicatorIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  indicatorText: {
    fontSize: 11,
    fontWeight: '500',
  },
  warningDot: {
    fontSize: 10,
    marginLeft: 4,
  },
});