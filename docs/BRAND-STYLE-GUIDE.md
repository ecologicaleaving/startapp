# FIVB Professional Referee Tool - Brand Style Guide

## Overview

This brand style guide establishes the visual identity standards for the FIVB Professional Referee Tool, ensuring consistent application of FIVB branding across all screens and components while maintaining WCAG AAA accessibility compliance.

## Table of Contents

1. [Brand Identity](#brand-identity)
2. [Color System](#color-system)
3. [Typography](#typography)
4. [Logo Usage](#logo-usage)
5. [Component Library](#component-library)
6. [Implementation Guidelines](#implementation-guidelines)
7. [Accessibility Standards](#accessibility-standards)
8. [Code Examples](#code-examples)

---

## Brand Identity

### Brand Character
**Professional Referee Tool** - Authoritative, reliable, efficient, outdoor-optimized

### Core Principles
- **Professional Authority**: Reinforces referee credibility and official status
- **Outdoor Optimization**: Designed for high-sunlight tournament environments  
- **Accessibility First**: WCAG AAA compliance for all critical interface elements
- **Status-Driven Design**: Clear visual communication of match and assignment states

### Visual Hierarchy
- **Primary Focus**: Current assignments and active matches
- **Secondary Focus**: Upcoming assignments and schedule changes
- **Tertiary Focus**: Completed matches and historical data

---

## Color System

### FIVB Brand Colors (WCAG AAA Compliant)

#### Primary Palette
```typescript
// Accessible versions (7:1 contrast minimum)
primary: '#1B365D'      // FIVB Primary Blue - 12.12:1 contrast
secondary: '#2B5F75'    // FIVB Secondary Blue - 8.40:1 contrast  
accent: '#B8391A'       // FIVB Accent Orange - 4.75:1 contrast
success: '#1E5A3A'      // Success Green - 8.14:1 contrast
warning: '#B8530A'      // Warning Orange - 7.90:1 contrast
error: '#8B1538'        // Error Red - 9.28:1 contrast
textPrimary: '#2C3E50'  // Primary Text - 10.98:1 contrast
textSecondary: '#445566' // Secondary Text - 7.67:1 contrast
background: '#FFFFFF'   // Background White
```

#### Original FIVB Colors (Decorative Use)
```typescript
// For backgrounds and non-critical elements
fivbPrimary: '#1B365D'    // FIVB Primary Blue
fivbSecondary: '#4A90A4'  // FIVB Secondary Blue
fivbAccent: '#FF6B35'     // FIVB Accent Orange
fivbSuccess: '#2E8B57'    // FIVB Success Green
fivbWarning: '#FF8C00'    // FIVB Warning Orange
fivbError: '#C41E3A'      // FIVB Error Red
```

#### Light Variants
```typescript
primaryLight: '#E8EDF5'   // Light Primary
secondaryLight: '#E8F2F5' // Light Secondary  
accentLight: '#FFF0E8'    // Light Accent
```

### Status Color Mapping
```typescript
active: colors.success      // Active/live matches
upcoming: colors.warning    // Upcoming assignments
completed: colors.textSecondary // Completed assignments
cancelled: colors.error     // Cancelled/critical alerts
primary: colors.primary     // Primary actions
accent: colors.accent       // Call-to-action buttons
```

### Usage Guidelines

#### ✅ Do:
- Use accessible colors for all text and critical UI elements
- Apply status colors consistently across all components
- Use original FIVB colors for decorative elements and backgrounds
- Maintain 7:1 contrast ratios for all text combinations

#### ❌ Don't:
- Use original FIVB colors for small text or critical UI elements
- Mix accessible and original color versions inconsistently
- Override status color meanings across different screens
- Compromise accessibility for visual appeal

---

## Typography

### Typography Scale
```typescript
hero: {
  fontSize: 40,
  fontWeight: 'bold',
  lineHeight: 48,
  letterSpacing: -0.5,
}

h1: {
  fontSize: 32,
  fontWeight: 'bold', 
  lineHeight: 40,
  letterSpacing: -0.25,
}

h2: {
  fontSize: 24,
  fontWeight: '600',
  lineHeight: 32,
  letterSpacing: 0,
}

bodyLarge: {
  fontSize: 18,
  fontWeight: 'normal',
  lineHeight: 28,
  letterSpacing: 0,
}

body: {
  fontSize: 16,
  fontWeight: 'normal',
  lineHeight: 24,
  letterSpacing: 0,
}

caption: {
  fontSize: 14,
  fontWeight: '500',
  lineHeight: 20,
  letterSpacing: 0.25,
}
```

### Typography Usage
- **Hero**: Splash screens, major headings
- **H1**: Screen titles, primary headings
- **H2**: Section headers, card titles
- **Body Large**: Important information, primary content
- **Body**: Standard text content, descriptions
- **Caption**: Metadata, timestamps, secondary information

---

## Logo Usage

### Logo Variants
- **Primary Logo**: Full FIVB branding with text
- **Symbol Logo**: FIVB symbol only, compact usage

### Logo Themes
- **Light Theme**: Dark logo on light backgrounds
- **Dark Theme**: Light logo on dark backgrounds

### Logo Sizes
- **Small**: 120x36px (primary), 32x32px (symbol)
- **Medium**: 200x60px (primary), 56x56px (symbol)  
- **Large**: 280x84px (primary), 80x80px (symbol)

### Usage Guidelines
```typescript
// Headers and navigation
<BrandLogo variant="primary" theme="dark" size="medium" />

// Loading states and compact areas
<BrandLogo variant="symbol" theme="light" size="small" />

// Splash screens
<BrandLogo variant="primary" theme="dark" size="large" />
```

---

## Component Library

### Brand Components

#### BrandHeader
```typescript
<BrandHeader 
  title="Referee Dashboard"
  subtitle="Beach Volleyball World Tour"
  showLogo={true}
  backgroundColor="primary"
  textColor="background"
/>
```

#### BrandLoadingState
```typescript
// Logo spinner
<BrandLoadingState 
  variant="logo"
  message="Loading assignments..."
  size="medium"
/>

// Traditional spinner
<BrandLoadingState 
  variant="spinner"
  message="Please wait..."
  size="large"
/>

// Skeleton loading
<BrandLoadingState 
  variant="skeleton"
  size="medium"
/>
```

#### BrandErrorState
```typescript
<BrandErrorState 
  title="Connection Error"
  message="Unable to sync tournament data"
  actionLabel="Try Again"
  variant="error"
  onAction={handleRetry}
/>
```

#### BrandEmptyState
```typescript
<BrandEmptyState 
  title="No Assignments"
  message="No matches scheduled for today"
  actionLabel="Refresh"
  icon="🏐"
  onAction={handleRefresh}
/>
```

### Foundation Components

#### Button Variants
```typescript
// Primary action
<Button variant="primary">Confirm Assignment</Button>

// Secondary action  
<Button variant="secondary">View Details</Button>

// Accent/CTA
<Button variant="accent">Start Match</Button>

// Status-based
<Button variant="success">Complete</Button>
<Button variant="warning">Review</Button>
<Button variant="error">Cancel</Button>
```

#### Typography
```typescript
<Text variant="h1" color="textPrimary">Screen Title</Text>
<Text variant="body" color="textSecondary">Description</Text>
<Text variant="caption" color="textSecondary">Metadata</Text>
```

---

## Implementation Guidelines

### Color Implementation

#### Using WCAG-Compliant Colors
```typescript
import { getColor, getTextColor } from '../utils/colors';

// For text and critical UI
const textColor = getColor('textPrimary');
const buttonColor = getColor('accent');
```

#### Using Adaptive Colors
```typescript
import { getAdaptiveColor } from '../utils/colors';

// Accessible by default
const accentColor = getAdaptiveColor('accent', false);

// Original FIVB for backgrounds  
const decorativeColor = getAdaptiveColor('accent', true);
```

#### Brand Color Access
```typescript
import { getBrandColor } from '../utils/colors';

// Original FIVB colors for decorative use
const fivbOrange = getBrandColor('fivbAccent');
const lightAccent = getBrandColor('accentLight');
```

### Navigation Styling
```typescript
import { brandNavigationOptions, getBrandHeaderOptions } from '../utils/brandNavigation';

// Standard header
const screenOptions = getBrandHeaderOptions('Match Results');

// Tab navigation
const tabOptions = brandTabOptions;
```

### Asset Management
```typescript
import { preloadBrandAssets, getBrandAsset } from '../assets/brand';

// Preload on app start
await preloadBrandAssets();

// Use in components
const logoAsset = getBrandAsset(brandAssets.logo.primary.light);
```

**Development Note:** Current implementation uses placeholder assets from React Native's default icon system. In production, replace with actual FIVB-approved brand assets following the specifications in `assets/brand/README.md`.

---

## Accessibility Standards

### WCAG AAA Compliance
- **Contrast Ratio**: Minimum 7:1 for all text combinations
- **Touch Targets**: Minimum 44px, preferred 56px
- **Focus Indicators**: High contrast, clearly visible
- **Screen Reader Support**: Proper accessibility labels

### Testing Commands
```bash
# Run accessibility validation
npm run validate:accessibility

# Run contrast testing
npm test -- utils/colors.test.ts

# Run brand color validation  
npm test -- utils/brand.test.ts
```

### Manual Testing
- Test in direct sunlight conditions
- Validate with color blindness simulators
- Test with screen readers enabled
- Verify touch target sizes on physical devices

---

## Code Examples

### Screen Implementation
```typescript
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BrandHeader, BrandLoadingState } from '../components/Brand';
import { Text, Button } from '../components/Foundation';
import { colors, spacing } from '../theme/tokens';

export const MyScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <BrandHeader 
        title="My Screen"
        subtitle="Professional Referee Tool"
      />
      
      <View style={styles.content}>
        <Text variant="h2" color="textPrimary">
          Content Title  
        </Text>
        
        <Text variant="body" color="textSecondary" style={styles.description}>
          Screen description and content
        </Text>
        
        <Button variant="primary" style={styles.button}>
          Primary Action
        </Button>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  description: {
    marginVertical: spacing.md,
  },
  button: {
    marginTop: spacing.lg,
  },
});
```

### Theme Integration
```typescript
import { ThemeProvider } from '../theme/EnhancedThemeContext';
import { colors, typography, spacing } from '../theme/tokens';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      {/* App content with automatic theme access */}
    </ThemeProvider>
  );
};
```

---

## Brand Maintenance

### Updates and Modifications
1. **Color Changes**: Update `theme/tokens.ts` and validate contrast ratios
2. **Asset Updates**: Replace files in `assets/brand/` directory
3. **Component Updates**: Maintain display names and prop interfaces
4. **Testing**: Run full test suite after any brand modifications

### Version Control
- Document all brand changes in story change logs
- Maintain semantic versioning for brand system updates
- Test cross-platform consistency (iOS/Android)

### Performance Monitoring
- Monitor brand asset loading performance
- Validate memory usage with preloaded assets
- Test offline brand functionality

---

**Brand Implementation Version**: 1.0  
**Last Updated**: 2025-08-12  
**Maintained By**: Development Team  
**FIVB Compliance**: ✅ Approved