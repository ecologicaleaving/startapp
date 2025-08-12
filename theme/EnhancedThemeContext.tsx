/**
 * Enhanced Theme Context Provider
 * Extended theme management with advanced contrast controls
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { designTokens, validateAllContrasts } from './tokens';

export type ContrastPreset = 'normal' | 'outdoor' | 'extreme';

interface ContrastSettings {
  isHighContrastMode: boolean;
  contrastBoost: boolean;
  boldTextMode: boolean;
  enhancedBorders: boolean;
}

interface EnhancedThemeContextType {
  tokens: typeof designTokens;
  // Contrast settings
  isHighContrastMode: boolean;
  setHighContrastMode: (enabled: boolean) => void;
  contrastBoost: boolean;
  setContrastBoost: (enabled: boolean) => void;
  boldTextMode: boolean;
  setBoldTextMode: (enabled: boolean) => void;
  enhancedBorders: boolean;
  setEnhancedBorders: (enabled: boolean) => void;
  // Preset management
  applyContrastPreset: (preset: ContrastPreset) => void;
  // Legacy support
  toggleHighContrast: () => void;
}

const EnhancedThemeContext = createContext<EnhancedThemeContextType | undefined>(undefined);

const STORAGE_KEYS = {
  HIGH_CONTRAST: '@RefereeApp:HighContrastMode',
  CONTRAST_BOOST: '@RefereeApp:ContrastBoost',
  BOLD_TEXT: '@RefereeApp:BoldTextMode',
  ENHANCED_BORDERS: '@RefereeApp:EnhancedBorders',
  CONTRAST_SETTINGS: '@RefereeApp:ContrastSettings',
};

interface EnhancedThemeProviderProps {
  children: React.ReactNode;
}

export function EnhancedThemeProvider({ children }: EnhancedThemeProviderProps) {
  const [isHighContrastMode, setIsHighContrastMode] = useState(false);
  const [contrastBoost, setContrastBoost] = useState(false);
  const [boldTextMode, setBoldTextMode] = useState(false);
  const [enhancedBorders, setEnhancedBorders] = useState(false);

  // Load all preferences on mount
  useEffect(() => {
    loadContrastSettings();
    // Validate contrast ratios in development
    if (__DEV__) {
      validateAllContrasts();
    }
  }, []);

  const loadContrastSettings = async () => {
    try {
      const settingsJson = await AsyncStorage.getItem(STORAGE_KEYS.CONTRAST_SETTINGS);
      if (settingsJson) {
        const settings: ContrastSettings = JSON.parse(settingsJson);
        setIsHighContrastMode(settings.isHighContrastMode);
        setContrastBoost(settings.contrastBoost);
        setBoldTextMode(settings.boldTextMode);
        setEnhancedBorders(settings.enhancedBorders);
      }
    } catch (error) {
      console.warn('Failed to load contrast settings:', error);
      // Fallback to individual settings
      loadLegacySettings();
    }
  };

  const loadLegacySettings = async () => {
    try {
      const [highContrast, boost, bold, borders] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.HIGH_CONTRAST),
        AsyncStorage.getItem(STORAGE_KEYS.CONTRAST_BOOST),
        AsyncStorage.getItem(STORAGE_KEYS.BOLD_TEXT),
        AsyncStorage.getItem(STORAGE_KEYS.ENHANCED_BORDERS),
      ]);

      if (highContrast !== null) setIsHighContrastMode(JSON.parse(highContrast));
      if (boost !== null) setContrastBoost(JSON.parse(boost));
      if (bold !== null) setBoldTextMode(JSON.parse(bold));
      if (borders !== null) setEnhancedBorders(JSON.parse(borders));
    } catch (error) {
      console.warn('Failed to load legacy contrast settings:', error);
    }
  };

  const saveContrastSettings = useCallback(async () => {
    try {
      const settings: ContrastSettings = {
        isHighContrastMode,
        contrastBoost,
        boldTextMode,
        enhancedBorders,
      };
      await AsyncStorage.setItem(STORAGE_KEYS.CONTRAST_SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save contrast settings:', error);
    }
  }, [isHighContrastMode, contrastBoost, boldTextMode, enhancedBorders]);

  // Save settings whenever they change
  useEffect(() => {
    saveContrastSettings();
  }, [saveContrastSettings]);

  const handleSetHighContrastMode = useCallback((enabled: boolean) => {
    setIsHighContrastMode(enabled);
  }, []);

  const handleSetContrastBoost = useCallback((enabled: boolean) => {
    setContrastBoost(enabled);
  }, []);

  const handleSetBoldTextMode = useCallback((enabled: boolean) => {
    setBoldTextMode(enabled);
  }, []);

  const handleSetEnhancedBorders = useCallback((enabled: boolean) => {
    setEnhancedBorders(enabled);
  }, []);

  const toggleHighContrast = useCallback(() => {
    setIsHighContrastMode(prev => !prev);
  }, []);

  const applyContrastPreset = useCallback((preset: ContrastPreset) => {
    switch (preset) {
      case 'normal':
        setIsHighContrastMode(false);
        setContrastBoost(false);
        setBoldTextMode(false);
        setEnhancedBorders(false);
        break;
      case 'outdoor':
        setIsHighContrastMode(true);
        setContrastBoost(false);
        setBoldTextMode(false);
        setEnhancedBorders(true);
        break;
      case 'extreme':
        setIsHighContrastMode(true);
        setContrastBoost(true);
        setBoldTextMode(true);
        setEnhancedBorders(true);
        break;
    }
  }, []);

  const contextValue: EnhancedThemeContextType = {
    tokens: designTokens,
    isHighContrastMode,
    setHighContrastMode: handleSetHighContrastMode,
    contrastBoost,
    setContrastBoost: handleSetContrastBoost,
    boldTextMode,
    setBoldTextMode: handleSetBoldTextMode,
    enhancedBorders,
    setEnhancedBorders: handleSetEnhancedBorders,
    applyContrastPreset,
    toggleHighContrast,
  };

  return (
    <EnhancedThemeContext.Provider value={contextValue}>
      {children}
    </EnhancedThemeContext.Provider>
  );
}

export function useEnhancedTheme(): EnhancedThemeContextType {
  const context = useContext(EnhancedThemeContext);
  if (context === undefined) {
    throw new Error('useEnhancedTheme must be used within an EnhancedThemeProvider');
  }
  return context;
}

// Convenience hooks for enhanced features
export function useContrastSettings() {
  const {
    isHighContrastMode,
    setHighContrastMode,
    contrastBoost,
    setContrastBoost,
    boldTextMode,
    setBoldTextMode,
    enhancedBorders,
    setEnhancedBorders,
    applyContrastPreset,
  } = useEnhancedTheme();

  return {
    isHighContrastMode,
    setHighContrastMode,
    contrastBoost,
    setContrastBoost,
    boldTextMode,
    setBoldTextMode,
    enhancedBorders,
    setEnhancedBorders,
    applyContrastPreset,
  };
}

export function useAccessibilityEnhanced() {
  const { tokens, isHighContrastMode, contrastBoost, boldTextMode, enhancedBorders } = useEnhancedTheme();
  
  // Return enhanced values based on accessibility settings
  return {
    colors: tokens.colors,
    typography: tokens.typography,
    spacing: tokens.spacing,
    // Enhanced values
    borderMultiplier: enhancedBorders ? 2 : 1,
    shadowOpacityMultiplier: isHighContrastMode ? 1.5 : 1,
    contrastMultiplier: contrastBoost ? 1.15 : 1,
    fontWeightBoost: boldTextMode,
  };
}

// Export for backwards compatibility
export const ThemeContext = EnhancedThemeContext;