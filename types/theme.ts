/**
 * Design Token Type Definitions
 * Outdoor-Optimized Visual Design System
 */

export interface ColorToken {
  primary: string;
  secondary: string;
  accent: string;
  success: string;
  warning: string;
  error: string;
  textPrimary: string;
  textSecondary: string;
  background: string;
}

export interface BrandColors {
  fivbPrimary: string;
  fivbSecondary: string;
  fivbAccent: string;
  fivbSuccess: string;
  fivbWarning: string;
  fivbError: string;
  primaryLight: string;
  secondaryLight: string;
  accentLight: string;
}

export interface ColorContrast {
  ratio: number;
  wcagAA: boolean;
  wcagAAA: boolean;
}

export interface ContrastValidation {
  [key: string]: {
    onBackground: ColorContrast;
    onPrimary: ColorContrast;
    onSecondary: ColorContrast;
  };
}

export interface TypographyToken {
  fontSize: number;
  fontWeight: string;
  lineHeight: number;
  letterSpacing?: number;
}

export interface TypographyScale {
  hero: TypographyToken;
  h1: TypographyToken;
  h2: TypographyToken;
  bodyLarge: TypographyToken;
  body: TypographyToken;
  caption: TypographyToken;
}

export interface SpacingToken {
  xs: number;
  sm: number;
  md: number;
  lg: number;
  xl: number;
  xxl: number;
}

// Status-specific color mappings for tournament referees
export interface StatusColors {
  current: string;      // Current/Active assignments (High-visibility alert orange)
  upcoming: string;     // Upcoming assignments (Professional blue)
  completed: string;    // Completed assignments (Success green)
  cancelled: string;    // Cancelled/Changed assignments (Warning indicators)
  emergency: string;    // Emergency/Urgent states (Maximum visibility)
}

// Icon system configuration for outdoor visibility
export interface IconTokens {
  sizes: {
    small: number;    // 24px - Non-interactive icons
    medium: number;   // 32px - Semi-interactive icons
    large: number;    // 44px - Interactive icons (touch target compliant)
  };
  strokeWidths: {
    small: number;    // Stroke width for small outlined icons
    medium: number;   // Stroke width for medium outlined icons
    large: number;    // Stroke width for large outlined icons
  };
  colors: {
    primary: string;      // Primary icon color
    secondary: string;    // Secondary icon color
    accent: string;       // Accent icon color
    muted: string;        // Muted/disabled icon color
    emergency: string;    // Emergency state icon color
  };
  accessibility: {
    minimumContrastRatio: number;  // WCAG AAA requirement (7:1)
    minimumTouchTarget: number;    // Minimum interactive icon size (44px)
  };
}

export interface DesignTokens {
  colors: ColorToken;
  brandColors: BrandColors;
  statusColors: StatusColors;
  iconTokens: IconTokens;
  typography: TypographyScale;
  spacing: SpacingToken;
  contrast: ContrastValidation;
}

export interface ThemeContextType {
  tokens: DesignTokens;
  isHighContrastMode: boolean;
  toggleHighContrast: () => void;
}