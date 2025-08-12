import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NetworkState, ConnectionQuality, ConnectionStrategy } from '../../services/NetworkStateManager';
import { useNetworkState } from '../../hooks/useNetworkState';

interface NetworkQualityIndicatorProps {
  networkState?: NetworkState | null;
  connectionQuality?: ConnectionQuality | null;
  showDetails?: boolean;
  compact?: boolean;
  autoRefresh?: boolean;
}

const NetworkQualityIndicator: React.FC<NetworkQualityIndicatorProps> = ({
  networkState: propNetworkState,
  connectionQuality: propConnectionQuality,
  showDetails = true,
  compact = false,
  autoRefresh = false,
}) => {
  const hookData = useNetworkState();
  
  // Use hook data if autoRefresh is enabled and no props provided
  const networkState = autoRefresh 
    ? (propNetworkState || hookData.networkState)
    : propNetworkState;
  const connectionQuality = autoRefresh 
    ? (propConnectionQuality || hookData.connectionQuality)
    : propConnectionQuality;

  if (!networkState || !connectionQuality) {
    if (autoRefresh && !hookData.isInitialized) {
      return (
        <View style={[styles.container, compact && styles.compactContainer]}>
          <Text style={styles.loadingText}>Assessing network quality...</Text>
        </View>
      );
    }
    return null;
  }

  const getNetworkIcon = (type: string) => {
    switch (type) {
      case 'wifi':
        return '📶';
      case 'cellular':
        return '📱';
      case 'ethernet':
        return '🔌';
      default:
        return '❓';
    }
  };

  const getQualityColor = (level: string) => {
    switch (level) {
      case 'excellent':
        return '#4CAF50';
      case 'good':
        return '#8BC34A';
      case 'fair':
        return '#FF9800';
      case 'poor':
        return '#F44336';
      case 'offline':
        return '#9E9E9E';
      default:
        return '#9E9E9E';
    }
  };

  const getQualityBars = (score: number) => {
    const bars = Math.ceil(score / 20); // 5 bars total
    return Array.from({ length: 5 }, (_, i) => (
      <View
        key={i}
        style={[
          styles.qualityBar,
          {
            backgroundColor: i < bars ? getQualityColor(connectionQuality.level) : '#E0E0E0',
            height: (i + 1) * 3 + 2, // Progressive height
          },
        ]}
      />
    ));
  };

  const getConnectionModeText = (strategy: ConnectionStrategy) => {
    switch (strategy) {
      case ConnectionStrategy.AGGRESSIVE_WEBSOCKET:
        return 'Fast Mode';
      case ConnectionStrategy.CONSERVATIVE_WEBSOCKET:
        return 'Stable Mode';
      case ConnectionStrategy.HYBRID_MODE:
        return 'Hybrid Mode';
      case ConnectionStrategy.POLLING_ONLY:
        return 'Polling Mode';
      case ConnectionStrategy.OFFLINE_MODE:
        return 'Offline';
      default:
        return 'Standard';
    }
  };

  const getCellularGenerationText = (generation: string | undefined) => {
    if (!generation) return '';
    return generation.toUpperCase();
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <Text style={styles.networkIcon}>{getNetworkIcon(networkState.type)}</Text>
        <View style={styles.compactBarsContainer}>{getQualityBars(connectionQuality.score)}</View>
        <Text style={[styles.qualityScore, { color: getQualityColor(connectionQuality.level) }]}>
          {connectionQuality.score}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.networkInfo}>
          <Text style={styles.networkIcon}>{getNetworkIcon(networkState.type)}</Text>
          <View style={styles.networkDetails}>
            <Text style={styles.networkType}>
              {networkState.type.toUpperCase()}
              {networkState.type === 'cellular' && networkState.details.cellularGeneration && (
                <Text style={styles.cellularGen}>
                  {' '}({getCellularGenerationText(networkState.details.cellularGeneration)})
                </Text>
              )}
            </Text>
            {networkState.details.ssid && (
              <Text style={styles.ssid}>{networkState.details.ssid}</Text>
            )}
            {networkState.details.carrier && (
              <Text style={styles.carrier}>{networkState.details.carrier}</Text>
            )}
          </View>
        </View>

        <View style={styles.qualityIndicator}>
          <View style={styles.barsContainer}>{getQualityBars(connectionQuality.score)}</View>
          <Text style={[styles.qualityScore, { color: getQualityColor(connectionQuality.level) }]}>
            {connectionQuality.score}
          </Text>
        </View>
      </View>

      {showDetails && (
        <View style={styles.details}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quality:</Text>
            <Text style={[styles.detailValue, { color: getQualityColor(connectionQuality.level) }]}>
              {connectionQuality.level.toUpperCase()}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Mode:</Text>
            <Text style={styles.detailValue}>
              {getConnectionModeText(connectionQuality.recommendation)}
            </Text>
          </View>

          <View style={styles.metrics}>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Latency</Text>
              <Text style={styles.metricValue}>{connectionQuality.latency}ms</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Stability</Text>
              <Text style={styles.metricValue}>{Math.round(connectionQuality.stability)}%</Text>
            </View>
            <View style={styles.metric}>
              <Text style={styles.metricLabel}>Throughput</Text>
              <Text style={styles.metricValue}>{Math.round(connectionQuality.throughput)}%</Text>
            </View>
          </View>

          <View style={styles.statusIndicator}>
            <View style={[styles.statusDot, { backgroundColor: getQualityColor(connectionQuality.level) }]} />
            <Text style={styles.statusText}>
              {networkState.isInternetReachable ? 'Internet Available' : 'Limited Connection'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    margin: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  networkInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  networkIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  networkDetails: {
    flex: 1,
  },
  networkType: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  cellularGen: {
    fontSize: 12,
    fontWeight: '400',
    color: '#666666',
  },
  ssid: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  carrier: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  qualityIndicator: {
    alignItems: 'center',
  },
  barsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 20,
    marginBottom: 4,
  },
  compactBarsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 12,
    marginHorizontal: 6,
  },
  qualityBar: {
    width: 4,
    marginHorizontal: 1,
    borderRadius: 1,
  },
  qualityScore: {
    fontSize: 14,
    fontWeight: '700',
  },
  details: {
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingTop: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333333',
  },
  metrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 12,
  },
  metric: {
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#666666',
  },
  loadingText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default NetworkQualityIndicator;