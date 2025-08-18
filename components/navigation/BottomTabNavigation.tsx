import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useAssignmentStatus } from '../../hooks/useAssignmentStatus';
import { designTokens } from '../../theme/tokens';

export type TabRoute = 'assignments' | 'results' | 'tournament' | 'settings';

interface Tab {
  key: TabRoute;
  label: string;
  icon: string;
  route: string;
}

interface BottomTabNavigationProps {
  currentTab?: TabRoute;
  onTabPress?: (tab: TabRoute) => void;
}

const tabs: Tab[] = [
  {
    key: 'assignments',
    label: 'My Assignments',
    icon: '📋',
    route: '/my-assignments',
  },
  {
    key: 'results',
    label: 'Results',
    icon: '🏆',
    route: '/match-results',
  },
  {
    key: 'tournament',
    label: 'Tournament',
    icon: '🏐',
    route: '/referee-dashboard',
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: '⚙️',
    route: '/referee-settings',
  },
];

export const BottomTabNavigation: React.FC<BottomTabNavigationProps> = ({
  currentTab,
  onTabPress,
}) => {
  const router = useRouter();
  const pathname = usePathname();

  // Assignment status context for tab badges
  const { 
    currentAssignmentStatus,
    statusCounts,
    isOnline,
    syncStatus,
  } = useAssignmentStatus();

  const determineActiveTab = (): TabRoute => {
    if (currentTab) return currentTab;
    
    // Auto-detect based on current pathname
    if (pathname.includes('my-assignments')) return 'assignments';
    if (pathname.includes('match-results')) return 'results';
    if (pathname.includes('referee-settings')) return 'settings';
    return 'tournament'; // Default
  };

  const activeTab = determineActiveTab();

  // Get badge count for each tab based on assignment status
  const getBadgeCount = (tabKey: TabRoute): number => {
    switch (tabKey) {
      case 'assignments':
        // Show total active assignments (current + upcoming)
        return (statusCounts.current || 0) + (statusCounts.upcoming || 0);
      case 'results':
        // Show completed matches that need attention
        return statusCounts.completed || 0;
      case 'tournament':
        // Show emergency or critical assignments
        return statusCounts.emergency || 0;
      case 'settings':
        // Show sync issues or offline status
        return (!isOnline || syncStatus !== 'synced') ? 1 : 0;
      default:
        return 0;
    }
  };

  // Get badge color for each tab
  const getBadgeColor = (tabKey: TabRoute): string => {
    switch (tabKey) {
      case 'assignments':
        return statusCounts.current > 0 ? designTokens.colors.success : designTokens.colors.secondary;
      case 'results':
        return designTokens.colors.accent;
      case 'tournament':
        return designTokens.colors.error; // Emergency indicator
      case 'settings':
        return !isOnline ? designTokens.colors.error : designTokens.colors.warning;
      default:
        return designTokens.colors.secondary;
    }
  };

  const handleTabPress = (tab: Tab) => {
    if (onTabPress) {
      onTabPress(tab.key);
    } else {
      router.push(tab.route);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          const badgeCount = getBadgeCount(tab.key);
          const badgeColor = getBadgeColor(tab.key);
          
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, isActive && styles.activeTabButton]}
              onPress={() => handleTabPress(tab)}
              activeOpacity={0.7}
            >
              <View style={styles.tabIconContainer}>
                <Text style={[styles.tabIcon, isActive && styles.activeTabIcon]}>
                  {tab.icon}
                </Text>
                {/* Assignment Status Badge */}
                {badgeCount > 0 && (
                  <View style={[styles.badge, { backgroundColor: badgeColor }]}>
                    <Text style={styles.badgeText}>
                      {badgeCount > 99 ? '99+' : badgeCount.toString()}
                    </Text>
                  </View>
                )}
                
                {/* Critical Status Pulse Animation for Emergency */}
                {tab.key === 'tournament' && statusCounts.emergency > 0 && (
                  <View style={[styles.pulseBadge, { backgroundColor: designTokens.colors.error }]} />
                )}
                
                {/* Offline Indicator for Settings */}
                {tab.key === 'settings' && !isOnline && (
                  <View style={[styles.offlineDot, { backgroundColor: designTokens.colors.error }]} />
                )}
              </View>
              <Text
                style={[styles.tabLabel, isActive && styles.activeTabLabel]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingBottom: 8,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  activeTabButton: {
    // No background change, just content styling
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  activeTabIcon: {
    // Icons stay the same
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  activeTabLabel: {
    color: '#1B365D',
    fontWeight: '600',
  },
  
  // Status Integration Styles
  tabIconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  
  badge: {
    position: 'absolute',
    top: -6,
    right: -12,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  
  badgeText: {
    color: designTokens.colors.background,
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  
  pulseBadge: {
    position: 'absolute',
    top: -8,
    right: -14,
    width: 12,
    height: 12,
    borderRadius: 6,
    opacity: 0.8,
    // Note: For production, add animation using Animated API
  },
  
  offlineDot: {
    position: 'absolute',
    top: -4,
    right: -8,
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 1,
    elevation: 2,
  },
});

export default BottomTabNavigation;