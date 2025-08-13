/**
 * StatusIntegrations Component
 * Story 2.4: Professional Status Indicator System
 * 
 * Integration components for existing Assignment Cards, Match Result Cards, and Tournament Panels
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { StatusType } from '../../types/status';
import { StatusIndicator } from './StatusIndicator';
import { ProfessionalStatusBadge } from './ProfessionalStatusBadge';
import { AccessibilityStatusIndicator } from './AccessibilityStatusIndicator';
import { getGlobalStatusUpdateService } from '../../services/StatusUpdateService';
import { designTokens } from '../../theme/tokens';

// Enhanced Assignment Card with status integration
export interface AssignmentCardStatusProps {
  assignmentId: string;
  currentStatus?: StatusType;
  showBadge?: boolean;
  badgePosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  enableRealTimeUpdates?: boolean;
  accessibilityMode?: boolean;
  onStatusChange?: (newStatus: StatusType, previousStatus?: StatusType) => void;
  testID?: string;
}

export const AssignmentCardStatus = React.memo<AssignmentCardStatusProps>(({
  assignmentId,
  currentStatus = 'upcoming',
  showBadge = true,
  badgePosition = 'top-right',
  enableRealTimeUpdates = true,
  accessibilityMode = false,
  onStatusChange,
  testID = 'assignment-card-status',
}) => {
  const [status, setStatus] = React.useState<StatusType>(currentStatus);
  const statusService = React.useMemo(() => getGlobalStatusUpdateService(), []);
  
  // Subscribe to real-time status updates
  React.useEffect(() => {
    if (!enableRealTimeUpdates) return;
    
    const unsubscribe = statusService.subscribeToUpdates(assignmentId, (update) => {
      const previousStatus = status;
      setStatus(update.type);
      onStatusChange?.(update.type, previousStatus);
    });
    
    return unsubscribe;
  }, [assignmentId, enableRealTimeUpdates, status, statusService, onStatusChange]);
  
  // Update service when status changes locally
  React.useEffect(() => {
    if (status !== currentStatus) {
      statusService.updateStatus(assignmentId, status);
    }
  }, [assignmentId, status, currentStatus, statusService]);
  
  if (showBadge) {
    return (
      <ProfessionalStatusBadge
        type={status}
        size="small"
        position={badgePosition}
        animated={status === 'current' || status === 'changed'}
        testID={testID}
      />
    );
  }
  
  const StatusComponent = accessibilityMode ? AccessibilityStatusIndicator : StatusIndicator;
  
  return (
    <StatusComponent
      type={status}
      size="small"
      variant="badge"
      colorBlindSupport={accessibilityMode}
      testID={testID}
    />
  );
});

// Enhanced Match Result Card with status integration
export interface MatchResultCardStatusProps {
  matchId: string;
  currentStatus?: StatusType;
  variant?: 'inline' | 'prominent' | 'badge';
  enableRealTimeUpdates?: boolean;
  accessibilityMode?: boolean;
  onStatusChange?: (newStatus: StatusType, previousStatus?: StatusType) => void;
  testID?: string;
}

export const MatchResultCardStatus = React.memo<MatchResultCardStatusProps>(({
  matchId,
  currentStatus = 'pre-match',
  variant = 'inline',
  enableRealTimeUpdates = true,
  accessibilityMode = false,
  onStatusChange,
  testID = 'match-result-card-status',
}) => {
  const [status, setStatus] = React.useState<StatusType>(currentStatus);
  const statusService = React.useMemo(() => getGlobalStatusUpdateService(), []);
  
  // Subscribe to real-time status updates
  React.useEffect(() => {
    if (!enableRealTimeUpdates) return;
    
    const unsubscribe = statusService.subscribeToUpdates(matchId, (update) => {
      const previousStatus = status;
      setStatus(update.type);
      onStatusChange?.(update.type, previousStatus);
    });
    
    return unsubscribe;
  }, [matchId, enableRealTimeUpdates, status, statusService, onStatusChange]);
  
  // Update service when status changes locally
  React.useEffect(() => {
    if (status !== currentStatus) {
      statusService.updateStatus(matchId, status);
    }
  }, [matchId, status, currentStatus, statusService]);
  
  const getVariantConfig = () => {
    switch (variant) {
      case 'badge':
        return {
          size: 'small' as const,
          variant: 'badge' as const,
          showIcon: true,
          showText: false,
        };
      case 'prominent':
        return {
          size: 'medium' as const,
          variant: 'prominent' as const,
          showIcon: true,
          showText: true,
        };
      case 'inline':
      default:
        return {
          size: 'small' as const,
          variant: 'full' as const,
          showIcon: true,
          showText: true,
        };
    }
  };
  
  const config = getVariantConfig();
  const StatusComponent = accessibilityMode ? AccessibilityStatusIndicator : StatusIndicator;
  
  return (
    <StatusComponent
      type={status}
      size={config.size}
      variant={config.variant}
      showIcon={config.showIcon}
      showText={config.showText}
      animated={status === 'in-progress' || status === 'delayed'}
      colorBlindSupport={accessibilityMode}
      testID={testID}
    />
  );
});

// Enhanced Tournament Panel with system status integration
export interface TournamentPanelStatusProps {
  tournamentId: string;
  systemStatus?: StatusType;
  connectionStatus?: 'online' | 'offline' | 'sync-pending' | 'error';
  showConnectionIndicator?: boolean;
  enableRealTimeUpdates?: boolean;
  accessibilityMode?: boolean;
  onStatusChange?: (newStatus: StatusType, previousStatus?: StatusType) => void;
  testID?: string;
}

export const TournamentPanelStatus = React.memo<TournamentPanelStatusProps>(({
  tournamentId,
  systemStatus = 'online',
  connectionStatus = 'online',
  showConnectionIndicator = true,
  enableRealTimeUpdates = true,
  accessibilityMode = false,
  onStatusChange,
  testID = 'tournament-panel-status',
}) => {
  const [status, setStatus] = React.useState<StatusType>(systemStatus);
  const [connStatus, setConnStatus] = React.useState<StatusType>(connectionStatus);
  const statusService = React.useMemo(() => getGlobalStatusUpdateService(), []);
  
  // Subscribe to real-time status updates
  React.useEffect(() => {
    if (!enableRealTimeUpdates) return;
    
    const unsubscribeSystem = statusService.subscribeToUpdates(`${tournamentId}-system`, (update) => {
      const previousStatus = status;
      setStatus(update.type);
      onStatusChange?.(update.type, previousStatus);
    });
    
    const unsubscribeConnection = statusService.subscribeToUpdates(`${tournamentId}-connection`, (update) => {
      setConnStatus(update.type);
    });
    
    return () => {
      unsubscribeSystem();
      unsubscribeConnection();
    };
  }, [tournamentId, enableRealTimeUpdates, status, statusService, onStatusChange]);
  
  // Update service when status changes locally
  React.useEffect(() => {
    if (status !== systemStatus) {
      statusService.updateStatus(`${tournamentId}-system`, status);
    }
  }, [tournamentId, status, systemStatus, statusService]);
  
  React.useEffect(() => {
    if (connStatus !== connectionStatus) {
      statusService.updateStatus(`${tournamentId}-connection`, connStatus);
    }
  }, [tournamentId, connStatus, connectionStatus, statusService]);
  
  const StatusComponent = accessibilityMode ? AccessibilityStatusIndicator : StatusIndicator;
  
  return (
    <View style={styles.tournamentStatusContainer} testID={testID}>
      {/* System Status */}
      <StatusComponent
        type={status}
        size="small"
        variant="full"
        animated={status === 'sync-pending' || status === 'error'}
        colorBlindSupport={accessibilityMode}
        accessibilityLabel={`Tournament system status: ${status}`}
        testID={`${testID}-system`}
      />
      
      {/* Connection Status */}
      {showConnectionIndicator && (
        <View style={styles.connectionStatus}>
          <StatusComponent
            type={connStatus}
            size="small"
            variant="icon-only"
            animated={connStatus === 'sync-pending'}
            colorBlindSupport={accessibilityMode}
            accessibilityLabel={`Connection status: ${connStatus}`}
            testID={`${testID}-connection`}
          />
        </View>
      )}
    </View>
  );
});

// Real-time status change animation wrapper
export interface RealTimeStatusWrapperProps {
  children: React.ReactNode;
  statusId: string;
  onStatusChange?: (newStatus: StatusType, previousStatus?: StatusType) => void;
  animateChanges?: boolean;
  testID?: string;
}

export const RealTimeStatusWrapper = React.memo<RealTimeStatusWrapperProps>(({
  children,
  statusId,
  onStatusChange,
  animateChanges = true,
  testID = 'realtime-status-wrapper',
}) => {
  const [isChanging, setIsChanging] = React.useState(false);
  const statusService = React.useMemo(() => getGlobalStatusUpdateService(), []);
  
  React.useEffect(() => {
    const unsubscribe = statusService.subscribeToUpdates(statusId, (update) => {
      if (animateChanges) {
        setIsChanging(true);
        setTimeout(() => setIsChanging(false), 300);
      }
      onStatusChange?.(update.type, update.previousStatus);
    });
    
    return unsubscribe;
  }, [statusId, statusService, onStatusChange, animateChanges]);
  
  return (
    <View 
      style={[
        styles.wrapper,
        isChanging && animateChanges && styles.changing
      ]} 
      testID={testID}
    >
      {children}
    </View>
  );
});

// Status integration hook for custom components
export const useStatusIntegration = (
  statusId: string,
  initialStatus?: StatusType,
  enableRealTimeUpdates = true
) => {
  const [status, setStatus] = React.useState<StatusType>(initialStatus || 'upcoming');
  const statusService = React.useMemo(() => getGlobalStatusUpdateService(), []);
  
  React.useEffect(() => {
    if (!enableRealTimeUpdates) return;
    
    const unsubscribe = statusService.subscribeToUpdates(statusId, (update) => {
      setStatus(update.type);
    });
    
    return unsubscribe;
  }, [statusId, enableRealTimeUpdates, statusService]);
  
  const updateStatus = React.useCallback((newStatus: StatusType, metadata?: Record<string, any>) => {
    statusService.updateStatus(statusId, newStatus, metadata);
    setStatus(newStatus);
  }, [statusId, statusService]);
  
  const getCurrentStatus = React.useCallback(() => {
    return statusService.getStatus(statusId) || status;
  }, [statusId, statusService, status]);
  
  return {
    status,
    updateStatus,
    getCurrentStatus,
    isConnected: statusService.isServiceConnected(),
  };
};

// Set display names for better debugging
AssignmentCardStatus.displayName = 'AssignmentCardStatus';
MatchResultCardStatus.displayName = 'MatchResultCardStatus';
TournamentPanelStatus.displayName = 'TournamentPanelStatus';
RealTimeStatusWrapper.displayName = 'RealTimeStatusWrapper';

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  
  changing: {
    opacity: 0.8,
    transform: [{ scale: 1.02 }],
  },
  
  tournamentStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  connectionStatus: {
    marginLeft: designTokens.spacing.sm,
  },
});

export default {
  AssignmentCardStatus,
  MatchResultCardStatus,
  TournamentPanelStatus,
  RealTimeStatusWrapper,
  useStatusIntegration,
};