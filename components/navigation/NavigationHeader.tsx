import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { GlobalStatusBar } from './GlobalStatusBar';
import WhistleLogo from '../WhistleLogo';

interface NavigationHeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightComponent?: React.ReactNode;
  backgroundColor?: string;
  titleColor?: string;
  showStatusBar?: boolean;
  onStatusPress?: () => void;
  showLogo?: boolean;
}

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  title,
  showBackButton = false,
  onBackPress,
  rightComponent,
  backgroundColor = '#1B365D',
  titleColor = '#FFFFFF',
  showStatusBar = true,
  onStatusPress,
  showLogo = true,
}) => {
  const router = useRouter();

  const handleBackPress = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      // Check if we can go back before calling router.back()
      if (router.canGoBack()) {
        router.back();
      } else {
        // No previous screen - could navigate to home or show a message
        console.log('No previous screen to navigate back to');
      }
    }
  };

  const handleLogoPress = () => {
    router.push('/tournament-selection');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]}>
      {/* Global Status Bar Integration */}
      {showStatusBar && (
        <GlobalStatusBar 
          onStatusPress={onStatusPress} 
          compact={false}
        />
      )}
      
      <View style={[styles.container, { backgroundColor }]}>
        <View style={styles.leftSection}>
          {showLogo && (
            <TouchableOpacity 
              onPress={handleLogoPress}
              activeOpacity={0.8}
              style={styles.logoButton}
            >
              <WhistleLogo size={32} style={styles.logoImage} />
            </TouchableOpacity>
          )}
          {showBackButton && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBackPress}
              activeOpacity={0.7}
            >
              <Text style={[styles.backButtonText, { color: titleColor }]}>
                ← Back
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        <View style={styles.centerSection}>
          <Text style={[styles.title, { color: titleColor }]} numberOfLines={1}>
            {title}
          </Text>
        </View>
        
        <View style={styles.rightSection}>
          {rightComponent}
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#1B365D',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 56,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  centerSection: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backButton: {
    padding: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  logoButton: {
    padding: 4,
    borderRadius: 6,
    marginRight: 12,
  },
  logoImage: {
    borderRadius: 6,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});

export default NavigationHeader;