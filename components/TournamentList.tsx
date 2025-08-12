import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Text, H1Text, H2Text, BodyText, CaptionText } from './Typography';
import { Tournament } from '../types/tournament';
import { TournamentType } from '../services/visApi';
import { testSupabaseConnection } from '../services/supabase';
import { CacheService } from '../services/CacheService';
import { CacheResult } from '../types/cache';
import { NetworkStatus, OfflineBanner, OfflineBadge } from './offline';
import { DataFreshness } from './DataFreshness';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { useIsOfflineData } from '../hooks/useOfflineStatus';
import { useDataFreshness } from '../hooks/useDataFreshness';
import { useAutoSync } from '../hooks/useSyncManager';
import { SyncStatus } from './SyncStatus';
import { StorageAlert, StorageStatusIndicator } from './StorageAlert';
import { useStorageMonitoring } from '../hooks/useStorageManager';
import { CompactTournamentStatusIndicator, TournamentStatusLegend } from './tournament/TournamentStatusIndicator';
import MinimalTournamentDetail from './MinimalTournamentDetail';
import { StatusBadge, StatusCard } from './Status';
import { getStatusColor, getStatusColorWithText, determineTournamentStatus } from '../utils/statusColors';

interface TournamentItemProps {
  tournament: Tournament;
  onPress: () => void;
  isOfflineData?: boolean;
  isRecentlyChanged?: boolean;
  subscriptionActive?: boolean;
}

const TournamentItem: React.FC<TournamentItemProps> = ({ 
  tournament, 
  onPress, 
  isOfflineData = false,
  isRecentlyChanged = false,
  subscriptionActive = false
}) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getLocation = () => {
    if (tournament.City && tournament.CountryName) {
      return `${tournament.City}, ${tournament.CountryName}`;
    }
    return tournament.Location || tournament.City || tournament.CountryName;
  };

  const getDateRange = () => {
    if (tournament.Dates) {
      return tournament.Dates;
    }
    if (tournament.StartDate && tournament.EndDate) {
      const start = formatDate(tournament.StartDate);
      const end = formatDate(tournament.EndDate);
      if (start === end) return start;
      return `${start} - ${end}`;
    }
    return formatDate(tournament.StartDate) || formatDate(tournament.EndDate);
  };

  // Determine tournament status for color coding
  const tournamentStatus = determineTournamentStatus(tournament);
  const statusColors = getStatusColorWithText(tournamentStatus);
  
  return (
    <TouchableOpacity 
      style={[
        styles.tournamentItem,
        isRecentlyChanged && styles.recentlyChangedItem,
        { borderLeftWidth: 4, borderLeftColor: statusColors.backgroundColor }
      ]} 
      onPress={onPress} 
      activeOpacity={0.7}
    >
      <OfflineBadge isOfflineData={isOfflineData} />
      <View style={styles.tournamentHeader}>
        <View style={styles.tournamentHeaderLeft}>
          <CaptionText style={styles.tournamentNumber}>#{tournament.No}</CaptionText>
          {tournament.Code && (
            <CaptionText style={styles.tournamentCode}>{tournament.Code}</CaptionText>
          )}
        </View>
        <View style={styles.tournamentHeaderRight}>
          <StatusBadge 
            status={tournamentStatus}
            variant="solid"
            size="small"
            showIcon={false}
          />
          <CompactTournamentStatusIndicator 
            tournament={tournament}
            isRecentlyChanged={isRecentlyChanged}
            subscriptionActive={subscriptionActive}
          />
        </View>
      </View>
      
      <H2Text style={styles.tournamentName}>
        {tournament.Title || tournament.Name || `Tournament ${tournament.No}`}
      </H2Text>
      
      {getLocation() && (
        <BodyText style={styles.tournamentLocation}>📍 {getLocation()}</BodyText>
      )}
      
      {getDateRange() && (
        <CaptionText style={styles.tournamentDate}>📅 {getDateRange()}</CaptionText>
      )}
    </TouchableOpacity>
  );
};

const TournamentList: React.FC = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<TournamentType>('BPT');
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
  const [cacheResult, setCacheResult] = useState<CacheResult<Tournament[]> | null>(null);
  const [showOfflineBanner, setShowOfflineBanner] = useState(false);
  const [showStatusLegend, setShowStatusLegend] = useState(false);
  
  const { isConnected, isOffline } = useNetworkStatus();
  const isOfflineData = useIsOfflineData(cacheResult);
  const freshnessInfo = useDataFreshness(cacheResult);
  const { forceSyncNow } = useAutoSync({ currentlyActive: true, tournamentType: selectedType });
  const { shouldShowAlert } = useStorageMonitoring();
  // Temporarily disable problematic tournament status hook to prevent infinite re-renders
  const tournamentsWithStatus = tournaments;
  const recentlyChangedTournaments = new Set();
  const subscriptionActive = false;
  const statusError = null;
  const statusLastUpdate = null;
  const clearRecentChanges = () => {};

  const checkSupabaseConnection = useCallback(async () => {
    try {
      const isConnected = await testSupabaseConnection();
      setSupabaseConnected(isConnected);
    } catch (err) {
      console.error('Failed to test Supabase connection:', err);
      setSupabaseConnected(false);
    }
  }, []);

  const loadTournaments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Initialize cache service
      CacheService.initialize();
      
      // Use offline-first strategy when network is unavailable
      let result: CacheResult<Tournament[]>;
      if (isOffline) {
        console.log('Network offline, using offline-first strategy');
        result = await CacheService.getTournamentsOffline({ 
          currentlyActive: true, 
          tournamentType: selectedType,
          year: 2025  // Only this year's tournaments for performance
        });
      } else {
        result = await CacheService.getTournaments({ 
          currentlyActive: true, 
          tournamentType: selectedType,
          year: 2025  // Only this year's tournaments for performance
        });
      }
      
      setTournaments(result.data);
      setCacheResult(result);
      
      // Show offline banner if data is from offline sources
      if (result.source === 'offline' || result.source === 'localStorage') {
        setShowOfflineBanner(true);
      }
      
      // Hide offline banner if we got fresh data from API/Supabase
      if (result.source === 'api' || result.source === 'supabase') {
        setShowOfflineBanner(false);
      }
      
      console.log(`Loaded ${result.data.length} tournaments from ${result.source}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      
      // Show different error message for offline vs online
      if (isOffline) {
        Alert.alert('Offline', 'No cached tournament data available. Connect to the internet to load tournaments.');
      } else {
        Alert.alert('Error', 'Failed to load tournaments');
      }
    } finally {
      setLoading(false);
    }
  }, [selectedType, isOffline]);

  useEffect(() => {
    loadTournaments();
    checkSupabaseConnection();
  }, [selectedType, isOffline, loadTournaments, checkSupabaseConnection]);

  const renderTournament = ({ item }: { item: Tournament }) => {
    // Use tournament with status updates if available
    const tournamentWithStatus = tournamentsWithStatus.find(t => t.No === item.No) || item;
    const isRecentlyChanged = recentlyChangedTournaments.has(item.No);
    
    return (
      <TournamentItem 
        tournament={tournamentWithStatus} 
        onPress={() => setSelectedTournament(tournamentWithStatus)}
        isOfflineData={isOfflineData}
        isRecentlyChanged={isRecentlyChanged}
        subscriptionActive={subscriptionActive}
      />
    );
  };

  const renderFilterTabs = () => {
    const filterTypes: TournamentType[] = ['ALL', 'FIVB', 'CEV', 'BPT'];
    
    return (
      <View style={styles.filterContainer}>
        {filterTypes.map((type) => (
          <TouchableOpacity
            key={type}
            style={[
              styles.filterButton,
              selectedType === type && styles.activeFilterButton
            ]}
            onPress={() => setSelectedType(type)}
          >
            <BodyText style={[
              styles.filterButtonText,
              selectedType === type && styles.activeFilterButtonText
            ]}>
              {type}
            </BodyText>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Show tournament detail if a tournament is selected
  if (selectedTournament) {
    return (
      <MinimalTournamentDetail 
        tournament={selectedTournament} 
        onBack={() => setSelectedTournament(null)} 
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066cc" />
        <BodyText style={styles.loadingText}>Loading tournaments...</BodyText>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <NetworkStatus style={styles.networkStatus} />
        <H2Text style={styles.errorText}>Error: {error}</H2Text>
        <BodyText style={styles.errorSubtext}>
          {isOffline 
            ? 'No cached tournament data available offline'
            : 'Please check your internet connection'
          }
        </BodyText>
        <TouchableOpacity 
          style={styles.retryButton} 
          onPress={loadTournaments}
        >
          <BodyText style={styles.retryButtonText}>Try Again</BodyText>
        </TouchableOpacity>
        
        {isConnected && (
          <TouchableOpacity 
            style={[styles.retryButton, styles.forceSyncButton]} 
            onPress={() => forceSyncNow().catch(console.error)}
          >
            <BodyText style={styles.retryButtonText}>Force Sync</BodyText>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  const getSubtitle = () => {
    if (tournaments.length === 0) {
      return isOffline 
        ? 'No cached tournaments available offline.'
        : 'No active tournaments found. Showing upcoming tournaments when available.';
    }
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Check if any tournaments are actually happening today
    const happeningNow = tournaments.filter(t => {
      if (!t.StartDate || !t.EndDate) return false;
      try {
        const start = new Date(t.StartDate);
        const end = new Date(t.EndDate);
        return start <= today && today <= end;
      } catch {
        return false;
      }
    });
    
    if (happeningNow.length > 0) {
      return `${happeningNow.length} tournament${happeningNow.length > 1 ? 's' : ''} happening now`;
    }
    
    // Check if these are future tournaments
    const futureTournaments = tournaments.filter(t => {
      if (!t.StartDate) return false;
      try {
        const start = new Date(t.StartDate);
        return start > today;
      } catch {
        return false;
      }
    });
    
    if (futureTournaments.length > 0) {
      return `${futureTournaments.length} upcoming tournament${futureTournaments.length > 1 ? 's' : ''}`;
    }
    
    return `${tournaments.length} tournament${tournaments.length > 1 ? 's' : ''}`;
  };

  return (
    <View style={styles.container}>
      <NetworkStatus compact style={styles.networkStatusCompact} />
      
      <StorageAlert autoShow={shouldShowAlert} />
      
      {showOfflineBanner && (
        <OfflineBanner 
          onDismiss={() => setShowOfflineBanner(false)}
          showWhenOnline={isConnected && cacheResult?.source === 'offline'}
        />
      )}
      
      <View style={styles.titleRow}>
        <H1Text>Active Tournaments</H1Text>
        <TouchableOpacity 
          style={styles.statusLegendButton}
          onPress={() => setShowStatusLegend(!showStatusLegend)}
        >
          <Text style={styles.statusLegendIcon}>ℹ️</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.subtitleContainer}>
        <BodyText style={styles.subtitle}>
          {getSubtitle()}
          {cacheResult && (
            <CaptionText style={styles.dataSourceText}>
              {' '}(from {cacheResult.source})
            </CaptionText>
          )}
        </BodyText>
        
        {/* Real-time status information */}
        {subscriptionActive && (
          <View style={styles.realtimeStatus}>
            <CaptionText style={styles.realtimeStatusText}>
              📡 Real-time updates active
            </CaptionText>
            {recentlyChangedTournaments.size > 0 && (
              <TouchableOpacity 
                style={styles.clearChangesButton}
                onPress={clearRecentChanges}
              >
                <CaptionText style={styles.clearChangesText}>
                  Clear {recentlyChangedTournaments.size} changes
                </CaptionText>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {statusError && (
          <CaptionText style={styles.statusError}>
            ⚠️ Status subscription error: {statusError}
          </CaptionText>
        )}
        
        {statusLastUpdate && (
          <CaptionText style={styles.statusLastUpdate}>
            Last status update: {statusLastUpdate.toLocaleTimeString()}
          </CaptionText>
        )}
      </View>
      
      <View style={styles.statusRow}>
        {cacheResult && (
          <View style={styles.freshnessContainer}>
            <DataFreshness 
              timestamp={cacheResult.timestamp}
              size="medium"
              style={styles.freshness}
            />
            {freshnessInfo && (
              <CaptionText style={styles.freshnessText}>
                Data {freshnessInfo.relativeTime}
              </CaptionText>
            )}
          </View>
        )}
        
        <View style={styles.statusIndicators}>
          <SyncStatus 
            compact 
            style={styles.syncStatus}
            onForceSync={() => forceSyncNow().catch(console.error)}
          />
          <StorageStatusIndicator style={styles.storageStatus} />
        </View>
      </View>
      
      {supabaseConnected !== null && (
        <View style={styles.connectionStatus}>
          <CaptionText style={[
            styles.connectionText,
            supabaseConnected ? styles.connectedText : styles.disconnectedText
          ]}>
            🗄️ Supabase: {supabaseConnected ? 'Connected' : 'Disconnected'}
          </CaptionText>
        </View>
      )}
      
      {renderFilterTabs()}
      
      {showStatusLegend && (
        <TournamentStatusLegend 
          onClose={() => setShowStatusLegend(false)}
        />
      )}
      
      <FlatList
        data={tournaments}
        renderItem={renderTournament}
        keyExtractor={(item) => item.No}
        style={styles.list}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={true}
        extraData={{
          recentlyChangedTournaments,
          subscriptionActive,
          tournamentsWithStatus
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 50,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
    color: '#333',
  },
  statusLegendButton: {
    marginLeft: 12,
    padding: 4,
  },
  statusLegendIcon: {
  },
  subtitleContainer: {
    marginBottom: 20,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#666',
  },
  realtimeStatus: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  realtimeStatusText: {
    color: '#4caf50',
    fontWeight: '600',
  },
  clearChangesButton: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: '#ff9800',
    borderRadius: 4,
  },
  clearChangesText: {
    color: 'white',
    fontWeight: '600',
  },
  statusError: {
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 4,
  },
  statusLastUpdate: {
    color: '#999',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 16,
    color: '#666',
  },
  errorText: {
    color: '#d32f2f',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    color: '#666',
    textAlign: 'center',
  },
  list: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  tournamentItem: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tournamentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tournamentHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tournamentHeaderRight: {
    alignItems: 'center',
  },
  recentlyChangedItem: {
    borderLeftWidth: 4,
    borderLeftColor: '#ff9800',
    shadowColor: '#ff9800',
    shadowOpacity: 0.2,
  },
  tournamentNumber: {
    color: '#0066cc',
    fontWeight: 'bold',
  },
  tournamentCode: {
    color: '#999',
    fontFamily: 'monospace',
  },
  tournamentName: {
    color: '#333',
    marginBottom: 4,
  },
  tournamentLocation: {
    color: '#666',
    marginBottom: 2,
  },
  tournamentDate: {
    color: '#999',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  filterButton: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#0066cc',
    backgroundColor: 'transparent',
  },
  activeFilterButton: {
    backgroundColor: '#0066cc',
  },
  filterButtonText: {
    color: '#0066cc',
    fontWeight: '500',
  },
  activeFilterButtonText: {
    color: '#fff',
  },
  connectionStatus: {
    alignItems: 'center',
    marginBottom: 16,
  },
  connectionText: {
    fontWeight: '500',
  },
  connectedText: {
    color: '#4caf50',
  },
  disconnectedText: {
    color: '#f44336',
  },
  networkStatus: {
    marginBottom: 16,
  },
  networkStatusCompact: {
    position: 'absolute',
    top: 60,
    right: 16,
    zIndex: 1,
  },
  dataSourceText: {
    color: '#999',
    fontStyle: 'italic',
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#0066cc',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  freshnessContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  freshness: {
    marginRight: 8,
  },
  freshnessText: {
    color: '#666',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  syncStatus: {
    marginLeft: 8,
  },
  forceSyncButton: {
    backgroundColor: '#4CAF50',
    marginTop: 8,
  },
  statusIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  storageStatus: {
    marginLeft: 4,
  },
});

export default TournamentList;