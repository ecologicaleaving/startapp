import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface PartialDataIndicatorProps {
  missingItems?: string[];
  totalExpected?: number;
  availableCount?: number;
  dataType?: string;
  onRefresh?: () => void;
  style?: any;
}

/**
 * Component to indicate when only partial data is available offline
 * Shows what's missing and provides options to refresh when online
 */
export function PartialDataIndicator({
  missingItems = [],
  totalExpected,
  availableCount,
  dataType = 'items',
  onRefresh,
  style
}: PartialDataIndicatorProps) {
  if (missingItems.length === 0 && (!totalExpected || !availableCount)) {
    return null;
  }

  const getMissingCount = () => {
    if (missingItems.length > 0) return missingItems.length;
    if (totalExpected && availableCount) return totalExpected - availableCount;
    return 0;
  };

  const missingCount = getMissingCount();

  if (missingCount === 0) {
    return null;
  }

  const getMessageText = () => {
    if (missingItems.length > 0) {
      const itemList = missingItems.slice(0, 3).join(', ');
      const hasMore = missingItems.length > 3;
      return `Missing ${dataType}: ${itemList}${hasMore ? ` and ${missingItems.length - 3} more` : ''}`;
    }
    
    return `${missingCount} ${dataType} not available offline`;
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>Partial Data</Text>
      </View>
      
      <Text style={styles.message}>
        {getMessageText()}
      </Text>
      
      {availableCount && totalExpected && (
        <Text style={styles.stats}>
          Showing {availableCount} of {totalExpected} {dataType}
        </Text>
      )}
      
      {onRefresh && (
        <TouchableOpacity 
          style={styles.refreshButton}
          onPress={onRefresh}
          accessibilityLabel="Refresh to load missing data"
        >
          <Text style={styles.refreshButtonText}>Refresh to load missing data</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * Placeholder component for missing data items
 */
export function MissingDataPlaceholder({
  message = "Data not available offline",
  icon = "📭",
  onRetry,
  style
}: {
  message?: string;
  icon?: string;
  onRetry?: () => void;
  style?: any;
}) {
  return (
    <View style={[styles.placeholderContainer, style]}>
      <Text style={styles.placeholderIcon}>{icon}</Text>
      <Text style={styles.placeholderMessage}>{message}</Text>
      
      {onRetry && (
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={onRetry}
          accessibilityLabel="Try to load data"
        >
          <Text style={styles.retryButtonText}>Try to load</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

/**
 * List item replacement for missing tournament/match data
 */
export function MissingDataListItem({
  title,
  subtitle,
  onTryLoad,
  style
}: {
  title: string;
  subtitle?: string;
  onTryLoad?: () => void;
  style?: any;
}) {
  return (
    <View style={[styles.listItem, style]}>
      <View style={styles.listItemContent}>
        <View style={styles.listItemIcon}>
          <Text style={styles.listItemIconText}>📭</Text>
        </View>
        <View style={styles.listItemText}>
          <Text style={styles.listItemTitle}>{title}</Text>
          {subtitle && (
            <Text style={styles.listItemSubtitle}>{subtitle}</Text>
          )}
          <Text style={styles.listItemStatus}>Not available offline</Text>
        </View>
      </View>
      
      {onTryLoad && (
        <TouchableOpacity 
          style={styles.listItemButton}
          onPress={onTryLoad}
        >
          <Text style={styles.listItemButtonText}>Load</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF3E0',
    borderColor: '#FF9800',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    margin: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  icon: {
    fontSize: 16,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E65100',
  },
  message: {
    fontSize: 13,
    color: '#BF360C',
    marginBottom: 8,
    lineHeight: 18,
  },
  stats: {
    fontSize: 12,
    color: '#FF5722',
    marginBottom: 8,
    fontWeight: '500',
  },
  refreshButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  refreshButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  placeholderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  placeholderMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listItem: {
    backgroundColor: '#F5F5F5',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
  },
  listItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEEEEE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listItemIconText: {
    fontSize: 18,
  },
  listItemText: {
    flex: 1,
  },
  listItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  listItemSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  listItemStatus: {
    fontSize: 11,
    color: '#999',
    fontStyle: 'italic',
  },
  listItemButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 8,
  },
  listItemButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
});