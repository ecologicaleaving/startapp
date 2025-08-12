import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';

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

  const determineActiveTab = (): TabRoute => {
    if (currentTab) return currentTab;
    
    // Auto-detect based on current pathname
    if (pathname.includes('my-assignments')) return 'assignments';
    if (pathname.includes('match-results')) return 'results';
    if (pathname.includes('referee-settings')) return 'settings';
    return 'tournament'; // Default
  };

  const activeTab = determineActiveTab();

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
          
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, isActive && styles.activeTabButton]}
              onPress={() => handleTabPress(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabIcon, isActive && styles.activeTabIcon]}>
                {tab.icon}
              </Text>
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
});

export default BottomTabNavigation;