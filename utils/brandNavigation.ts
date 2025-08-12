/**
 * Brand Navigation Utilities
 * FIVB brand styling for navigation elements
 */

import { colors } from '../theme/tokens';

/**
 * Standard brand navigation options for consistent styling
 */
export const brandNavigationOptions = {
  headerStyle: {
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  headerTintColor: colors.background,
  headerTitleStyle: {
    fontWeight: 'bold' as const,
    fontSize: 18,
    color: colors.background,
  },
  headerBackTitleStyle: {
    color: colors.background,
  },
  contentStyle: {
    backgroundColor: colors.background,
  },
} as const;

/**
 * Tab navigation brand styling
 */
export const brandTabOptions = {
  tabBarStyle: {
    backgroundColor: colors.primary,
    borderTopColor: colors.secondary,
    borderTopWidth: 1,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  tabBarActiveTintColor: colors.accent,
  tabBarInactiveTintColor: colors.background,
  tabBarLabelStyle: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  tabBarIconStyle: {
    marginTop: 4,
  },
} as const;

/**
 * Brand status bar configuration
 */
export const brandStatusBarConfig = {
  style: 'light' as const,
  backgroundColor: colors.primary,
  translucent: false,
} as const;

/**
 * Get brand-styled header options with custom title
 */
export function getBrandHeaderOptions(title?: string) {
  return {
    ...brandNavigationOptions,
    title,
    headerShown: true,
  };
}

/**
 * Get modal presentation styling with brand colors
 */
export const brandModalOptions = {
  presentation: 'modal' as const,
  headerStyle: {
    backgroundColor: colors.background,
    shadowColor: colors.textSecondary,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTintColor: colors.primary,
  headerTitleStyle: {
    fontWeight: 'bold' as const,
    fontSize: 18,
    color: colors.textPrimary,
  },
} as const;